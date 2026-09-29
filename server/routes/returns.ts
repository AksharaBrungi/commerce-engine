import { Router } from 'express';
import { db } from '../db/index.ts';
import { returns, orders, orderItems, products, sellerProfiles } from '../db/schema.ts';
import { eq, and, desc } from 'drizzle-orm';
import { authenticateToken } from '../middleware/auth.ts';

const router = Router();

// POST /api/returns - Customer requests a return
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { orderId, orderItemId, reason, comments } = req.body;
    const customerId = req.user!.id;

    if (!orderId || !orderItemId || !reason) {
      return res.status(400).json({ error: 'Order, item, and reason are required.' });
    }

    // 1. Verify order belongs to customer & is DELIVERED
    const orderRows = await db.select().from(orders).where(
      and(eq(orders.id, orderId), eq(orders.customerId, customerId))
    ).limit(1);

    if (orderRows.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    if (orderRows[0].status !== 'DELIVERED') {
      return res.status(400).json({ error: 'Only delivered orders are eligible for return requests.' });
    }

    // 2. Verify order item
    const itemRows = await db.select().from(orderItems).where(
      and(eq(orderItems.id, orderItemId), eq(orderItems.orderId, orderId))
    ).limit(1);

    if (itemRows.length === 0) {
      return res.status(404).json({ error: 'Order item not found.' });
    }
    const item = itemRows[0];

    // Find seller ID
    const prodRows = await db.select({ sellerId: products.sellerId }).from(products).where(eq(products.id, item.productId)).limit(1);
    const sellerId = prodRows[0]?.sellerId;

    // Check if return request already exists
    const existing = await db.select().from(returns).where(eq(returns.orderItemId, orderItemId)).limit(1);
    if (existing.length > 0) {
      return res.status(400).json({
        error: `A return request has already been filed for this item (Status: ${existing[0].status}).`,
      });
    }

    const returnId = `ret-${Date.now()}`;
    const now = new Date().toISOString();

    await db.insert(returns).values({
      id: returnId,
      orderId,
      orderItemId,
      customerId,
      sellerId: sellerId || 'sel-prof-1',
      reason,
      comments: comments || null,
      status: 'REQUESTED',
      requestedAt: now,
    });

    return res.status(201).json({
      message: 'Return request submitted successfully. The seller will review your request.',
      returnId,
    });
  } catch (err: any) {
    console.error('Return request error:', err);
    return res.status(500).json({ error: 'Unable to submit return request.' });
  }
});

// GET /api/returns - Customer's return requests
router.get('/', authenticateToken, async (req, res) => {
  try {
    const customerId = req.user!.id;
    const userReturns = await db.select().from(returns)
      .where(eq(returns.customerId, customerId))
      .orderBy(desc(returns.requestedAt));

    const enriched = await Promise.all(
      userReturns.map(async (r) => {
        const item = await db.select().from(orderItems).where(eq(orderItems.id, r.orderItemId)).limit(1);
        const order = await db.select().from(orders).where(eq(orders.id, r.orderId)).limit(1);
        return {
          ...r,
          orderNumber: order[0]?.orderNumber || 'N/A',
          item: item[0] || null,
        };
      })
    );

    return res.json({ returns: enriched });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load return requests.' });
  }
});

export default router;

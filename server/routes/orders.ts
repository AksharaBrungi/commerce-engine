import { Router } from 'express';
import { db } from '../db/index.ts';
import {
  orders,
  orderItems,
  sellerOrders,
  shipments,
  shipmentEvents,
  payments,
  products,
  productVariants,
  productImages,
  sellerProfiles,
} from '../db/schema.ts';
import { eq, and, desc, sql } from 'drizzle-orm';
import { authenticateToken } from '../middleware/auth.ts';

const router = Router();

// GET /api/orders - List customer orders
router.get('/', authenticateToken, async (req, res) => {
  try {
    const customerId = req.user!.id;
    const { status, page = '1', limit = '10' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(30, Math.max(1, parseInt(limit as string) || 10));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [eq(orders.customerId, customerId)];
    if (status) {
      conditions.push(eq(orders.status, String(status)));
    }

    const whereClause = and(...conditions);

    const countRes = await db.select({ count: sql<number>`count(*)` }).from(orders).where(whereClause);
    const totalCount = Number(countRes[0]?.count || 0);

    const orderRows = await db.select().from(orders)
      .where(whereClause)
      .orderBy(desc(orders.createdAt))
      .limit(limitNum)
      .offset(offset);

    const enrichedOrders = await Promise.all(
      orderRows.map(async (ord) => {
        const items = await db.select().from(orderItems).where(eq(orderItems.orderId, ord.id));
        const itemCount = items.reduce((acc, i) => acc + i.quantity, 0);

        // First item image preview
        let previewImage = null;
        if (items.length > 0) {
          const img = await db.select().from(productImages)
            .where(eq(productImages.productId, items[0].productId))
            .limit(1);
          previewImage = img[0]?.url || null;
        }

        return {
          ...ord,
          itemCount,
          previewImage,
          itemNames: items.map(i => i.productName),
        };
      })
    );

    return res.json({
      orders: enrichedOrders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
      },
    });
  } catch (err) {
    console.error('Customer orders error:', err);
    return res.status(500).json({ error: 'Unable to load orders.' });
  }
});

// GET /api/orders/:id - Order details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const customerId = req.user!.id;

    // Verify order belongs to this customer (or user is ADMIN)
    const orderRows = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (orderRows.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const ord = orderRows[0];
    if (ord.customerId !== customerId && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'You are not authorized to view this order.' });
    }

    // Get order items
    const rawItems = await db.select().from(orderItems).where(eq(orderItems.orderId, ord.id));

    const enrichedItems = await Promise.all(
      rawItems.map(async (item) => {
        const img = await db.select().from(productImages)
          .where(eq(productImages.productId, item.productId))
          .limit(1);

        const sOrder = await db.select().from(sellerOrders)
          .where(eq(sellerOrders.id, item.sellerOrderId))
          .limit(1);

        let sellerName = 'Seller';
        if (sOrder.length > 0) {
          const sProf = await db.select().from(sellerProfiles).where(eq(sellerProfiles.id, sOrder[0].sellerId)).limit(1);
          sellerName = sProf[0]?.storeName || sellerName;
        }

        return {
          ...item,
          image: img[0]?.url || '',
          sellerName,
        };
      })
    );

    // Get shipments and events
    const shipmentRows = await db.select().from(shipments).where(eq(shipments.orderId, ord.id));
    const enrichedShipments = await Promise.all(
      shipmentRows.map(async (shp) => {
        const events = await db.select().from(shipmentEvents)
          .where(eq(shipmentEvents.shipmentId, shp.id))
          .orderBy(desc(shipmentEvents.eventTime));
        return {
          ...shp,
          events,
        };
      })
    );

    // Get payment details
    const paymentRows = await db.select().from(payments).where(eq(payments.orderId, ord.id)).limit(1);

    let shippingAddress = {};
    try {
      shippingAddress = JSON.parse(ord.shippingAddressJson);
    } catch {}

    return res.json({
      order: {
        ...ord,
        shippingAddress,
        items: enrichedItems,
        shipments: enrichedShipments,
        payment: paymentRows[0] || null,
      },
    });
  } catch (err: any) {
    console.error('Order detail error:', err);
    return res.status(500).json({ error: 'Unable to load order details.' });
  }
});

// POST /api/orders/:id/cancel - Cancel order and restore stock
router.post('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const customerId = req.user!.id;

    const orderRows = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (orderRows.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const ord = orderRows[0];
    if (ord.customerId !== customerId && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized to cancel this order.' });
    }

    // Check cancellation eligibility: can only cancel if not already shipped/delivered/cancelled
    const nonCancellable = ['SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED', 'REFUNDED'];
    if (nonCancellable.includes(ord.status)) {
      return res.status(400).json({
        error: `Order cannot be cancelled in "${ord.status}" status.`,
      });
    }

    const now = new Date().toISOString();

    // 1. Restore product & variant stock
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, ord.id));
    for (const item of items) {
      // Restore product stock
      const prodRows = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
      if (prodRows.length > 0) {
        await db.update(products)
          .set({ stock: prodRows[0].stock + item.quantity, updatedAt: now })
          .where(eq(products.id, item.productId));
      }

      // Restore variant stock if applicable
      if (item.variantId) {
        const varRows = await db.select().from(productVariants).where(eq(productVariants.id, item.variantId)).limit(1);
        if (varRows.length > 0) {
          await db.update(productVariants)
            .set({ stock: varRows[0].stock + item.quantity })
            .where(eq(productVariants.id, item.variantId));
        }
      }
    }

    // 2. Update order status
    await db.update(orders).set({ status: 'CANCELLED', updatedAt: now }).where(eq(orders.id, ord.id));

    // 3. Update seller orders status
    await db.update(sellerOrders).set({ status: 'CANCELLED', updatedAt: now }).where(eq(sellerOrders.orderId, ord.id));

    return res.json({ message: 'Order has been successfully cancelled and inventory restored.' });
  } catch (err: any) {
    console.error('Order cancellation error:', err);
    return res.status(500).json({ error: 'Failed to cancel order.' });
  }
});

export default router;

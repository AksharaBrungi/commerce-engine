import { Router } from 'express';
import { db } from '../db/index.ts';
import { reviews, orders, orderItems, products } from '../db/schema.ts';
import { eq, and, sql } from 'drizzle-orm';
import { authenticateToken } from '../middleware/auth.ts';

const router = Router();

// POST /api/reviews - Submit review for delivered product
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { productId, orderId, orderItemId, rating, title, comment } = req.body;
    const userId = req.user!.id;

    if (!productId || !orderId || !rating || !title || !comment) {
      return res.status(400).json({ error: 'Please provide rating, title, and comments.' });
    }

    const numRating = parseInt(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ error: 'Rating must be an integer between 1 and 5 stars.' });
    }

    // 1. Verify user purchased this item and order is DELIVERED
    const orderRows = await db.select().from(orders).where(
      and(eq(orders.id, orderId), eq(orders.customerId, userId))
    ).limit(1);

    if (orderRows.length === 0) {
      return res.status(403).json({ error: 'You have not placed this order.' });
    }

    if (orderRows[0].status !== 'DELIVERED') {
      return res.status(400).json({
        error: `Only delivered items can be reviewed. Your order is currently "${orderRows[0].status}".`,
      });
    }

    // 2. Verify item exists in order
    let targetItemId = orderItemId;
    if (!targetItemId) {
      const itemRows = await db.select().from(orderItems).where(
        and(eq(orderItems.orderId, orderId), eq(orderItems.productId, productId))
      ).limit(1);
      if (itemRows.length === 0) {
        return res.status(400).json({ error: 'Product not found in this order.' });
      }
      targetItemId = itemRows[0].id;
    }

    // 3. Check for duplicate review on this order item
    const existing = await db.select().from(reviews).where(
      and(eq(reviews.userId, userId), eq(reviews.productId, productId), eq(reviews.orderItemId, targetItemId))
    ).limit(1);

    if (existing.length > 0) {
      return res.status(400).json({ error: 'You have already submitted a review for this purchase.' });
    }

    // 4. Insert Review
    const reviewId = `rev-${Date.now()}`;
    const now = new Date().toISOString();

    await db.insert(reviews).values({
      id: reviewId,
      productId,
      userId,
      orderId,
      orderItemId: targetItemId,
      rating: numRating,
      title: title.trim(),
      comment: comment.trim(),
      createdAt: now,
    });

    // Mark item as reviewed
    await db.update(orderItems).set({ isReviewed: 1 }).where(eq(orderItems.id, targetItemId));

    // 5. Recalculate average rating & review count for the product
    const allReviews = await db.select({ rating: reviews.rating }).from(reviews).where(eq(reviews.productId, productId));
    const count = allReviews.length;
    const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / count;
    const roundedAvg = Number(avg.toFixed(1));

    await db.update(products).set({
      rating: roundedAvg,
      reviewCount: count,
      updatedAt: now,
    }).where(eq(products.id, productId));

    return res.status(201).json({
      message: 'Review submitted successfully! Thank you for your feedback.',
      review: { id: reviewId, rating: numRating, title, comment, createdAt: now },
    });
  } catch (err: any) {
    console.error('Review submission error:', err);
    return res.status(500).json({ error: 'Failed to submit review.' });
  }
});

// GET /api/reviews/product/:productId - List reviews
router.get('/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const prodReviews = await db.select().from(reviews).where(eq(reviews.productId, productId));
    return res.json({ reviews: prodReviews });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load reviews.' });
  }
});

export default router;

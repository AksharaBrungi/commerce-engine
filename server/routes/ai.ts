import { Router } from 'express';
import { db } from '../db/index.ts';
import {
  aiConversations,
  aiMessages,
  aiAnalyticsLogs,
  carts,
  cartItems,
  products,
  productVariants,
} from '../db/schema.ts';
import { eq, desc, sql, and } from 'drizzle-orm';
import { optionalAuth, authenticateToken, requireRole } from '../middleware/auth.ts';
import { processAiChat } from '../services/aiService.ts';

const router = Router();

// POST /api/ai/chat - Main conversational AI assistant endpoint
router.post('/chat', optionalAuth, async (req, res) => {
  try {
    const { message, conversationId, imageBase64, imageMimeType, currency = 'INR', exchangeRate = 1 } = req.body;

    if (!message && !imageBase64) {
      return res.status(400).json({ error: 'Please provide a message or an image.' });
    }

    const guestSessionId = req.headers['x-guest-session'] as string || undefined;
    const userContext = {
      userId: req.user?.id,
      guestSessionId,
    };

    const aiResponse = await processAiChat(
      {
        message: message || '',
        conversationId,
        imageBase64,
        imageMimeType,
        currency,
        exchangeRate,
      },
      userContext
    );

    return res.json(aiResponse);
  } catch (err: any) {
    console.error('AI Chat endpoint error:', err);
    return res.status(500).json({
      error: 'Commerce Assistant is temporarily unavailable. Please try again shortly.',
      fallback: true,
    });
  }
});

// GET /api/ai/conversations/:id/messages - Retrieve conversation history
router.get('/conversations/:id/messages', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const msgRows = await db
      .select()
      .from(aiMessages)
      .where(eq(aiMessages.conversationId, id))
      .orderBy(aiMessages.createdAt);

    const parsed = msgRows.map((m) => {
      let structuredData = null;
      try {
        if (m.structuredDataJson) structuredData = JSON.parse(m.structuredDataJson);
      } catch {}
      return {
        id: m.id,
        role: m.role,
        content: m.content,
        structuredData,
        feedback: m.feedback,
        feedbackComment: m.feedbackComment,
        createdAt: m.createdAt,
      };
    });

    return res.json({ messages: parsed });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load conversation messages.' });
  }
});

// POST /api/ai/feedback - Submit user feedback on AI response (👍 / 👎)
router.post('/feedback', optionalAuth, async (req, res) => {
  try {
    const { messageId, feedback, comment } = req.body;

    if (!messageId || !['positive', 'negative'].includes(feedback)) {
      return res.status(400).json({ error: 'Invalid feedback data.' });
    }

    await db
      .update(aiMessages)
      .set({
        feedback,
        feedbackComment: comment || null,
      })
      .where(eq(aiMessages.id, messageId));

    return res.json({ message: 'Thank you for your feedback!' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to record feedback.' });
  }
});

// POST /api/ai/action/add-to-cart - Confirmed execution of adding item to cart
router.post('/action/add-to-cart', optionalAuth, async (req, res) => {
  try {
    const { productId, variantId, quantity = 1 } = req.body;
    const userId = req.user?.id;
    const guestSessionId = (req.headers['x-guest-session'] as string) || `guest-${Date.now()}`;

    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required.' });
    }

    // 1. Validate Product & Stock in database
    const prodRows = await db.select().from(products).where(eq(products.id, productId)).limit(1);
    if (prodRows.length === 0) {
      return res.status(404).json({ error: 'Product not found.' });
    }
    const prod = prodRows[0];
    let availableStock = prod.stock;

    if (variantId) {
      const varRows = await db.select().from(productVariants).where(eq(productVariants.id, variantId)).limit(1);
      if (varRows.length > 0) {
        availableStock = varRows[0].stock;
      }
    }

    if (availableStock < quantity) {
      return res.status(400).json({
        error: `Sorry! Only ${availableStock} units of "${prod.name}" are available in stock.`,
      });
    }

    // 2. Find or Create Cart
    const now = new Date().toISOString();
    let cartId: string;

    if (userId) {
      const userCarts = await db.select().from(carts).where(eq(carts.userId, userId)).limit(1);
      if (userCarts.length > 0) {
        cartId = userCarts[0].id;
      } else {
        cartId = `cart-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        await db.insert(carts).values({
          id: cartId,
          userId,
          createdAt: now,
          updatedAt: now,
        });
      }
    } else {
      const guestCarts = await db.select().from(carts).where(eq(carts.guestSessionId, guestSessionId)).limit(1);
      if (guestCarts.length > 0) {
        cartId = guestCarts[0].id;
      } else {
        cartId = `cart-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        await db.insert(carts).values({
          id: cartId,
          guestSessionId,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // 3. Add or update cart item
    const existingItem = await db
      .select()
      .from(cartItems)
      .where(
        and(
          eq(cartItems.cartId, cartId),
          eq(cartItems.productId, productId),
          variantId ? eq(cartItems.variantId, variantId) : sql`${cartItems.variantId} IS NULL`
        )
      )
      .limit(1);

    if (existingItem.length > 0) {
      const newQty = existingItem[0].quantity + quantity;
      await db
        .update(cartItems)
        .set({ quantity: newQty, updatedAt: now })
        .where(eq(cartItems.id, existingItem[0].id));
    } else {
      await db.insert(cartItems).values({
        id: `ci-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        cartId,
        productId,
        variantId: variantId || null,
        quantity,
        createdAt: now,
        updatedAt: now,
      });
    }

    return res.json({
      message: `"${prod.name}" has been added to your cart!`,
      productId,
      quantity,
    });
  } catch (err) {
    console.error('Add to cart action error:', err);
    return res.status(500).json({ error: 'Failed to add item to cart.' });
  }
});

// GET /api/ai/analytics - Admin-only assistant interaction metrics
router.get('/analytics', authenticateToken, requireRole(['ADMIN']), async (_req, res) => {
  try {
    const totalConvRes = await db.select({ count: sql<number>`count(*)` }).from(aiConversations);
    const totalMsgRes = await db.select({ count: sql<number>`count(*)` }).from(aiMessages);

    const positiveRes = await db
      .select({ count: sql<number>`count(*)` })
      .from(aiMessages)
      .where(eq(aiMessages.feedback, 'positive'));

    const negativeRes = await db
      .select({ count: sql<number>`count(*)` })
      .from(aiMessages)
      .where(eq(aiMessages.feedback, 'negative'));

    const avgLatencyRes = await db
      .select({ avg: sql<number>`avg(response_time_ms)` })
      .from(aiAnalyticsLogs);

    // Intent counts
    const intentsRows = await db
      .select({
        intent: aiAnalyticsLogs.intent,
        count: sql<number>`count(*)`,
      })
      .from(aiAnalyticsLogs)
      .groupBy(aiAnalyticsLogs.intent)
      .orderBy(desc(sql`count(*)`));

    // Recent 20 inquiry logs
    const recentLogs = await db
      .select()
      .from(aiAnalyticsLogs)
      .orderBy(desc(aiAnalyticsLogs.createdAt))
      .limit(20);

    // Recent feedback comments
    const feedbackComments = await db
      .select({
        id: aiMessages.id,
        content: aiMessages.content,
        feedback: aiMessages.feedback,
        comment: aiMessages.feedbackComment,
        createdAt: aiMessages.createdAt,
      })
      .from(aiMessages)
      .where(sql`${aiMessages.feedback} IS NOT NULL`)
      .orderBy(desc(aiMessages.createdAt))
      .limit(10);

    const totalConversations = Number(totalConvRes[0]?.count || 0);
    const totalMessages = Number(totalMsgRes[0]?.count || 0);
    const positiveFeedback = Number(positiveRes[0]?.count || 0);
    const negativeFeedback = Number(negativeRes[0]?.count || 0);
    const totalFeedback = positiveFeedback + negativeFeedback;
    const satisfactionRate = totalFeedback > 0 ? Math.round((positiveFeedback / totalFeedback) * 100) : 100;
    const avgResponseTimeMs = Math.round(Number(avgLatencyRes[0]?.avg || 0));

    return res.json({
      metrics: {
        totalConversations,
        totalMessages,
        positiveFeedback,
        negativeFeedback,
        satisfactionRate,
        avgResponseTimeMs,
      },
      intents: intentsRows.map((i) => ({ intent: i.intent, count: Number(i.count) })),
      recentLogs,
      feedbackComments,
    });
  } catch (err) {
    console.error('AI Analytics error:', err);
    return res.status(500).json({ error: 'Failed to retrieve AI analytics.' });
  }
});

export default router;

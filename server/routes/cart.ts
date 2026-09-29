import { Router } from 'express';
import { db } from '../db/index.ts';
import { carts, cartItems, products, productVariants, productImages, coupons } from '../db/schema.ts';
import { eq, and, sql } from 'drizzle-orm';
import { optionalAuth, authenticateToken } from '../middleware/auth.ts';

const router = Router();

// Helper to get or create cart for user or guest session
async function getOrCreateCart(userId?: string, guestSessionId?: string) {
  const now = new Date().toISOString();
  if (userId) {
    const existing = await db.select().from(carts).where(eq(carts.userId, userId)).limit(1);
    if (existing.length > 0) return existing[0];
    const newCartId = `cart-usr-${userId}`;
    await db.insert(carts).values({ id: newCartId, userId, createdAt: now, updatedAt: now });
    const created = await db.select().from(carts).where(eq(carts.id, newCartId)).limit(1);
    return created[0];
  } else if (guestSessionId) {
    const existing = await db.select().from(carts).where(eq(carts.guestSessionId, guestSessionId)).limit(1);
    if (existing.length > 0) return existing[0];
    const newCartId = `cart-gst-${guestSessionId}`;
    await db.insert(carts).values({ id: newCartId, guestSessionId, createdAt: now, updatedAt: now });
    const created = await db.select().from(carts).where(eq(carts.id, newCartId)).limit(1);
    return created[0];
  }
  throw new Error('Either userId or guestSessionId must be provided.');
}

// Helper to calculate totals from cart items
async function calculateCartSummary(items: any[], couponCode?: string) {
  let subtotal = 0;

  for (const item of items) {
    const price = item.variant ? item.variant.price : (item.product.discountPrice || item.product.price);
    subtotal += price * item.quantity;
  }

  let discount = 0;
  let appliedCoupon = null;

  if (couponCode && subtotal > 0) {
    const couponRows = await db.select().from(coupons).where(
      and(eq(coupons.code, couponCode.toUpperCase().trim()), eq(coupons.isActive, 1))
    ).limit(1);

    if (couponRows.length > 0) {
      const c = couponRows[0];
      const today = new Date().toISOString().split('T')[0];
      if (c.startDate <= today && c.endDate >= today && subtotal >= c.minOrderAmount) {
        if (c.type === 'PERCENTAGE') {
          discount = (subtotal * c.value) / 100;
          if (c.maxDiscount && discount > c.maxDiscount) {
            discount = c.maxDiscount;
          }
        } else {
          discount = Math.min(subtotal, c.value);
        }
        appliedCoupon = {
          code: c.code,
          discountAmount: discount,
          type: c.type,
          value: c.value,
        };
      }
    }
  }

  // Shipping rule: Free over ₹999, else ₹99
  const shippingFee = subtotal === 0 || subtotal >= 999 ? 0 : 99;
  // Standard GST / Tax rate calculation: 18% on subtotal after discount
  const taxableAmount = Math.max(0, subtotal - discount);
  const tax = Number((taxableAmount * 0.05).toFixed(2)); // 5% blended marketplace tax
  const total = Number((taxableAmount + shippingFee + tax).toFixed(2));

  return {
    subtotal,
    discount,
    shippingFee,
    tax,
    total,
    appliedCoupon,
  };
}

// GET /api/cart
router.get('/', optionalAuth, async (req, res) => {
  try {
    const guestSessionId = req.headers['x-guest-session-id'] as string;
    const userId = req.user?.id;

    if (!userId && !guestSessionId) {
      return res.json({ items: [], summary: { subtotal: 0, discount: 0, shippingFee: 0, tax: 0, total: 0 } });
    }

    const cart = await getOrCreateCart(userId, guestSessionId);

    const itemRows = await db.select().from(cartItems).where(eq(cartItems.cartId, cart.id));

    const enrichedItems = await Promise.all(
      itemRows.map(async (item) => {
        const prodRows = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
        if (prodRows.length === 0) return null;
        const prod = prodRows[0];

        let variant = null;
        if (item.variantId) {
          const varRows = await db.select().from(productVariants).where(eq(productVariants.id, item.variantId)).limit(1);
          if (varRows.length > 0) {
            variant = {
              ...varRows[0],
              attributes: JSON.parse(varRows[0].attributesJson || '{}'),
            };
          }
        }

        const imgRows = await db.select().from(productImages)
          .where(eq(productImages.productId, prod.id))
          .orderBy(sql`is_primary DESC, sort_order ASC`)
          .limit(1);

        const availableStock = variant ? variant.stock : prod.stock;

        return {
          id: item.id,
          cartId: item.cartId,
          productId: prod.id,
          variantId: item.variantId,
          quantity: item.quantity,
          availableStock,
          product: {
            id: prod.id,
            name: prod.name,
            slug: prod.slug,
            price: prod.price,
            discountPrice: prod.discountPrice,
            stock: prod.stock,
            image: imgRows[0]?.url || '',
            sellerId: prod.sellerId,
          },
          variant,
        };
      })
    );

    const validItems = enrichedItems.filter(Boolean);
    const couponCode = req.query.coupon as string;
    const summary = await calculateCartSummary(validItems, couponCode);

    return res.json({
      cartId: cart.id,
      items: validItems,
      summary,
    });
  } catch (err: any) {
    console.error('Error getting cart:', err);
    return res.status(500).json({ error: 'Unable to load shopping cart.' });
  }
});

// POST /api/cart/items - Add to cart
router.post('/items', optionalAuth, async (req, res) => {
  try {
    const { productId, variantId, quantity = 1 } = req.body;
    const guestSessionId = req.headers['x-guest-session-id'] as string;
    const userId = req.user?.id;

    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required.' });
    }

    if (!userId && !guestSessionId) {
      return res.status(400).json({ error: 'Session identifier missing.' });
    }

    // Verify product exists and active
    const prodRows = await db.select().from(products).where(eq(products.id, productId)).limit(1);
    if (prodRows.length === 0 || prodRows[0].status !== 'APPROVED') {
      return res.status(404).json({ error: 'Product is unavailable.' });
    }
    const prod = prodRows[0];

    // Check available stock
    let maxAvailable = prod.stock;
    if (variantId) {
      const varRows = await db.select().from(productVariants).where(eq(productVariants.id, variantId)).limit(1);
      if (varRows.length === 0) {
        return res.status(404).json({ error: 'Product variant not found.' });
      }
      maxAvailable = varRows[0].stock;
    }

    if (maxAvailable <= 0) {
      return res.status(400).json({ error: 'This item is currently out of stock.' });
    }

    const cart = await getOrCreateCart(userId, guestSessionId);

    // Check if item already in cart
    const existingItemConditions = [
      eq(cartItems.cartId, cart.id),
      eq(cartItems.productId, productId),
    ];
    if (variantId) {
      existingItemConditions.push(eq(cartItems.variantId, variantId));
    } else {
      existingItemConditions.push(sql`${cartItems.variantId} IS NULL`);
    }

    const existingItems = await db.select().from(cartItems).where(and(...existingItemConditions)).limit(1);

    const requestedQty = Math.max(1, parseInt(quantity) || 1);
    const now = new Date().toISOString();

    if (existingItems.length > 0) {
      const existing = existingItems[0];
      const newQty = existing.quantity + requestedQty;

      if (newQty > maxAvailable) {
        return res.status(400).json({
          error: `Cannot add more than ${maxAvailable} units of this item. You already have ${existing.quantity} in your cart.`,
        });
      }

      await db.update(cartItems)
        .set({ quantity: newQty, updatedAt: now })
        .where(eq(cartItems.id, existing.id));
    } else {
      if (requestedQty > maxAvailable) {
        return res.status(400).json({
          error: `Only ${maxAvailable} units available in stock.`,
        });
      }

      await db.insert(cartItems).values({
        id: `ci-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        cartId: cart.id,
        productId,
        variantId: variantId || null,
        quantity: requestedQty,
        createdAt: now,
        updatedAt: now,
      });
    }

    return res.status(200).json({ message: 'Product added to cart successfully.' });
  } catch (err: any) {
    console.error('Error adding to cart:', err);
    return res.status(500).json({ error: 'Failed to add product to cart.' });
  }
});

// PUT /api/cart/items/:id - Update quantity
router.put('/items/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    const newQty = parseInt(quantity);
    if (isNaN(newQty) || newQty <= 0) {
      return res.status(400).json({ error: 'Quantity must be greater than zero.' });
    }

    const itemRows = await db.select().from(cartItems).where(eq(cartItems.id, id)).limit(1);
    if (itemRows.length === 0) {
      return res.status(404).json({ error: 'Cart item not found.' });
    }
    const item = itemRows[0];

    // Check stock
    let maxAvailable = 0;
    if (item.variantId) {
      const varRows = await db.select().from(productVariants).where(eq(productVariants.id, item.variantId)).limit(1);
      if (varRows.length > 0) maxAvailable = varRows[0].stock;
    } else {
      const prodRows = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
      if (prodRows.length > 0) maxAvailable = prodRows[0].stock;
    }

    if (newQty > maxAvailable) {
      return res.status(400).json({ error: `Only ${maxAvailable} units available in stock.` });
    }

    const now = new Date().toISOString();
    await db.update(cartItems).set({ quantity: newQty, updatedAt: now }).where(eq(cartItems.id, id));

    return res.json({ message: 'Cart updated successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update cart quantity.' });
  }
});

// DELETE /api/cart/items/:id - Remove item
router.delete('/items/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(cartItems).where(eq(cartItems.id, id));
    return res.json({ message: 'Item removed from cart.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to remove item.' });
  }
});

// POST /api/cart/clear - Clear cart
router.post('/clear', optionalAuth, async (req, res) => {
  try {
    const guestSessionId = req.headers['x-guest-session-id'] as string;
    const userId = req.user?.id;

    if (!userId && !guestSessionId) {
      return res.json({ message: 'Cart cleared.' });
    }

    const cart = await getOrCreateCart(userId, guestSessionId);
    await db.delete(cartItems).where(eq(cartItems.cartId, cart.id));

    return res.json({ message: 'Shopping cart cleared.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to clear cart.' });
  }
});

// POST /api/cart/merge - Merge guest cart into user cart after login
router.post('/merge', authenticateToken, async (req, res) => {
  try {
    const { guestItems } = req.body; // Array of { productId, variantId, quantity }
    const userId = req.user!.id;

    if (!Array.isArray(guestItems) || guestItems.length === 0) {
      return res.json({ message: 'No items to merge.' });
    }

    const userCart = await getOrCreateCart(userId);
    const now = new Date().toISOString();

    for (const gItem of guestItems) {
      if (!gItem.productId) continue;

      // Find stock
      let maxStock = 0;
      if (gItem.variantId) {
        const v = await db.select().from(productVariants).where(eq(productVariants.id, gItem.variantId)).limit(1);
        if (v.length > 0) maxStock = v[0].stock;
      } else {
        const p = await db.select().from(products).where(eq(products.id, gItem.productId)).limit(1);
        if (p.length > 0) maxStock = p[0].stock;
      }

      if (maxStock <= 0) continue;

      // Check existing item in user cart
      const existing = await db.select().from(cartItems).where(
        and(
          eq(cartItems.cartId, userCart.id),
          eq(cartItems.productId, gItem.productId),
          gItem.variantId ? eq(cartItems.variantId, gItem.variantId) : sql`${cartItems.variantId} IS NULL`
        )
      ).limit(1);

      if (existing.length > 0) {
        const combinedQty = Math.min(maxStock, existing[0].quantity + (gItem.quantity || 1));
        await db.update(cartItems)
          .set({ quantity: combinedQty, updatedAt: now })
          .where(eq(cartItems.id, existing[0].id));
      } else {
        const qty = Math.min(maxStock, gItem.quantity || 1);
        await db.insert(cartItems).values({
          id: `ci-mrg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          cartId: userCart.id,
          productId: gItem.productId,
          variantId: gItem.variantId || null,
          quantity: qty,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return res.json({ message: 'Cart merged successfully.' });
  } catch (err: any) {
    console.error('Cart merge error:', err);
    return res.status(500).json({ error: 'Failed to merge cart.' });
  }
});

export default router;

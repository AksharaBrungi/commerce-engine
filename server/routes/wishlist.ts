import { Router } from 'express';
import { db } from '../db/index.ts';
import { wishlists, wishlistItems, products, productImages, categories, sellerProfiles } from '../db/schema.ts';
import { eq, and, desc, sql } from 'drizzle-orm';
import { authenticateToken } from '../middleware/auth.ts';

const router = Router();

// Helper to get or create wishlist for user
async function getOrCreateWishlist(userId: string) {
  const existing = await db.select().from(wishlists).where(eq(wishlists.userId, userId)).limit(1);
  if (existing.length > 0) return existing[0];
  const newId = `wsh-${userId}`;
  const now = new Date().toISOString();
  await db.insert(wishlists).values({ id: newId, userId, createdAt: now });
  return (await db.select().from(wishlists).where(eq(wishlists.id, newId)).limit(1))[0];
}

// GET /api/wishlist
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const wishlist = await getOrCreateWishlist(userId);

    const items = await db.select().from(wishlistItems).where(eq(wishlistItems.wishlistId, wishlist.id));

    const enriched = await Promise.all(
      items.map(async (item) => {
        const prodRows = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
        if (prodRows.length === 0) return null;
        const prod = prodRows[0];

        const imgRows = await db.select().from(productImages)
          .where(eq(productImages.productId, prod.id))
          .orderBy(desc(productImages.isPrimary))
          .limit(1);

        const seller = await db.select({ storeName: sellerProfiles.storeName })
          .from(sellerProfiles)
          .where(eq(sellerProfiles.id, prod.sellerId))
          .limit(1);

        return {
          id: item.id,
          productId: prod.id,
          name: prod.name,
          slug: prod.slug,
          price: prod.price,
          discountPrice: prod.discountPrice,
          stock: prod.stock,
          rating: prod.rating,
          reviewCount: prod.reviewCount,
          image: imgRows[0]?.url || '',
          sellerName: seller[0]?.storeName || 'Verified Store',
          addedAt: item.createdAt,
        };
      })
    );

    return res.json({ items: enriched.filter(Boolean) });
  } catch (err) {
    return res.status(500).json({ error: 'Unable to load wishlist.' });
  }
});

// POST /api/wishlist/toggle
router.post('/toggle', authenticateToken, async (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId) return res.status(400).json({ error: 'Product ID is required.' });

    const userId = req.user!.id;
    const wishlist = await getOrCreateWishlist(userId);

    const existing = await db.select().from(wishlistItems).where(
      and(eq(wishlistItems.wishlistId, wishlist.id), eq(wishlistItems.productId, productId))
    ).limit(1);

    if (existing.length > 0) {
      await db.delete(wishlistItems).where(eq(wishlistItems.id, existing[0].id));
      return res.json({ message: 'Removed from wishlist.', inWishlist: false });
    } else {
      const now = new Date().toISOString();
      await db.insert(wishlistItems).values({
        id: `wi-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        wishlistId: wishlist.id,
        productId,
        createdAt: now,
      });
      return res.json({ message: 'Added to wishlist.', inWishlist: true });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update wishlist.' });
  }
});

// DELETE /api/wishlist/:productId
router.delete('/:productId', authenticateToken, async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user!.id;
    const wishlist = await getOrCreateWishlist(userId);

    await db.delete(wishlistItems).where(
      and(eq(wishlistItems.wishlistId, wishlist.id), eq(wishlistItems.productId, productId))
    );

    return res.json({ message: 'Product removed from wishlist.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to remove from wishlist.' });
  }
});

// POST /api/wishlist/merge - Merge guest wishlist product IDs
router.post('/merge', authenticateToken, async (req, res) => {
  try {
    const { productIds } = req.body;
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.json({ message: 'No items to merge.' });
    }

    const userId = req.user!.id;
    const wishlist = await getOrCreateWishlist(userId);
    const now = new Date().toISOString();

    for (const pid of productIds) {
      const existing = await db.select().from(wishlistItems).where(
        and(eq(wishlistItems.wishlistId, wishlist.id), eq(wishlistItems.productId, pid))
      ).limit(1);

      if (existing.length === 0) {
        await db.insert(wishlistItems).values({
          id: `wi-mrg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          wishlistId: wishlist.id,
          productId: pid,
          createdAt: now,
        });
      }
    }

    return res.json({ message: 'Wishlist merged successfully.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to merge wishlist.' });
  }
});

export default router;

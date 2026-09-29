import { Router } from 'express';
import { db } from '../db/index.ts';
import { categories, products } from '../db/schema.ts';
import { eq, sql } from 'drizzle-orm';

const router = Router();

// GET /api/categories
router.get('/', async (_req, res) => {
  try {
    const catList = await db.select().from(categories).where(eq(categories.isActive, 1));

    const enriched = await Promise.all(
      catList.map(async (cat) => {
        const countRes = await db.select({ count: sql<number>`count(*)` })
          .from(products)
          .where(sql`${products.categoryId} = ${cat.id} AND ${products.status} = 'APPROVED'`);
        return {
          ...cat,
          productCount: Number(countRes[0]?.count || 0),
        };
      })
    );

    return res.json({ categories: enriched });
  } catch (err: any) {
    console.error('Error fetching categories:', err);
    return res.status(500).json({ error: 'Unable to load categories.' });
  }
});

export default router;

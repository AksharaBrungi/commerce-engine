import { Router } from 'express';
import { db } from '../db/index.ts';
import { products, productImages, productVariants, categories, sellerProfiles, reviews, users } from '../db/schema.ts';
import { eq, and, gte, lte, like, or, desc, asc, sql } from 'drizzle-orm';

const router = Router();

// GET /api/products - list with search, filter, sort, pagination
router.get('/', async (req, res) => {
  try {
    const {
      search,
      category,
      minPrice,
      maxPrice,
      rating,
      seller,
      inStock,
      sort = 'relevance',
      page = '1',
      limit = '12',
      featured,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 12));
    const offset = (pageNum - 1) * limitNum;

    // Base query conditions: Only APPROVED products
    const conditions: any[] = [eq(products.status, 'APPROVED')];

    if (featured === 'true' || featured === '1') {
      conditions.push(eq(products.isFeatured, 1));
    }

    if (category) {
      // Find category by slug or id
      const catRows = await db.select().from(categories).where(
        or(eq(categories.slug, String(category)), eq(categories.id, String(category)))
      ).limit(1);

      if (catRows.length > 0) {
        conditions.push(eq(products.categoryId, catRows[0].id));
      }
    }

    if (seller) {
      const sellerRows = await db.select().from(sellerProfiles).where(
        or(eq(sellerProfiles.id, String(seller)), like(sellerProfiles.storeName, `%${seller}%`))
      ).limit(1);

      if (sellerRows.length > 0) {
        conditions.push(eq(products.sellerId, sellerRows[0].id));
      }
    }

    if (minPrice) {
      const min = parseFloat(minPrice as string);
      if (!isNaN(min)) {
        conditions.push(gte(products.price, min));
      }
    }

    if (maxPrice) {
      const max = parseFloat(maxPrice as string);
      if (!isNaN(max)) {
        conditions.push(lte(products.price, max));
      }
    }

    if (rating) {
      const minRating = parseFloat(rating as string);
      if (!isNaN(minRating)) {
        conditions.push(gte(products.rating, minRating));
      }
    }

    if (inStock === 'true' || inStock === '1') {
      conditions.push(gte(products.stock, 1));
    }

    if (search && String(search).trim()) {
      const query = `%${String(search).trim()}%`;
      // Find sellers matching search to include their products
      const matchingSellers = await db.select({ id: sellerProfiles.id }).from(sellerProfiles).where(like(sellerProfiles.storeName, query));
      const sellerIds = matchingSellers.map(s => s.id);

      const searchConditions = [
        like(products.name, query),
        like(products.description, query),
        like(products.sku, query),
      ];

      if (sellerIds.length > 0) {
        for (const sId of sellerIds) {
          searchConditions.push(eq(products.sellerId, sId));
        }
      }

      conditions.push(or(...searchConditions));
    }

    const whereClause = and(...conditions);

    // Sorting
    let orderByClause;
    switch (sort) {
      case 'price_asc':
        orderByClause = asc(products.price);
        break;
      case 'price_desc':
        orderByClause = desc(products.price);
        break;
      case 'rating':
        orderByClause = desc(products.rating);
        break;
      case 'newest':
        orderByClause = desc(products.createdAt);
        break;
      case 'relevance':
      default:
        orderByClause = desc(products.isFeatured);
        break;
    }

    // Get count
    const countResult = await db.select({ count: sql<number>`count(*)` }).from(products).where(whereClause);
    const totalCount = Number(countResult[0]?.count || 0);

    // Get products
    const productRows = await db.select().from(products)
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limitNum)
      .offset(offset);

    // Attach primary image, seller info, and category info
    const enrichedProducts = await Promise.all(
      productRows.map(async (prod) => {
        const images = await db.select().from(productImages)
          .where(eq(productImages.productId, prod.id))
          .orderBy(desc(productImages.isPrimary), asc(productImages.sortOrder));

        const seller = await db.select({
          id: sellerProfiles.id,
          storeName: sellerProfiles.storeName,
          rating: sellerProfiles.rating,
        }).from(sellerProfiles).where(eq(sellerProfiles.id, prod.sellerId)).limit(1);

        const cat = await db.select({
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
        }).from(categories).where(eq(categories.id, prod.categoryId)).limit(1);

        return {
          ...prod,
          images: images.map(img => img.url),
          primaryImage: images[0]?.url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
          seller: seller[0] || { id: prod.sellerId, storeName: 'Verified Seller', rating: 4.8 },
          category: cat[0] || null,
        };
      })
    );

    return res.json({
      products: enrichedProducts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
      },
    });
  } catch (err: any) {
    console.error('Error fetching products:', err);
    return res.status(500).json({ error: 'Unable to load products.' });
  }
});

// GET /api/products/:id or /api/products/slug/:slug
router.get('/:idOrSlug', async (req, res) => {
  try {
    const { idOrSlug } = req.params;

    const prodRows = await db.select().from(products).where(
      or(eq(products.id, idOrSlug), eq(products.slug, idOrSlug))
    ).limit(1);

    if (prodRows.length === 0) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    const prod = prodRows[0];

    // Load images
    const images = await db.select().from(productImages)
      .where(eq(productImages.productId, prod.id))
      .orderBy(desc(productImages.isPrimary), asc(productImages.sortOrder));

    // Load variants
    const variants = await db.select().from(productVariants)
      .where(eq(productVariants.productId, prod.id));

    const parsedVariants = variants.map(v => ({
      ...v,
      attributes: JSON.parse(v.attributesJson || '{}'),
    }));

    // Load seller
    const seller = await db.select({
      id: sellerProfiles.id,
      storeName: sellerProfiles.storeName,
      description: sellerProfiles.description,
      rating: sellerProfiles.rating,
      contactEmail: sellerProfiles.contactEmail,
    }).from(sellerProfiles).where(eq(sellerProfiles.id, prod.sellerId)).limit(1);

    // Load category
    const cat = await db.select().from(categories).where(eq(categories.id, prod.categoryId)).limit(1);

    // Load reviews
    const prodReviews = await db.select({
      id: reviews.id,
      rating: reviews.rating,
      title: reviews.title,
      comment: reviews.comment,
      createdAt: reviews.createdAt,
      user: {
        id: users.id,
        name: users.name,
      },
    }).from(reviews)
      .leftJoin(users, eq(reviews.userId, users.id))
      .where(eq(reviews.productId, prod.id))
      .orderBy(desc(reviews.createdAt));

    // Specifications
    let specifications: Record<string, string> = {};
    if (prod.specificationsJson) {
      try {
        specifications = JSON.parse(prod.specificationsJson);
      } catch {}
    }

    // Related products (same category, different id)
    const relatedRows = await db.select().from(products)
      .where(and(eq(products.categoryId, prod.categoryId), sql`${products.id} != ${prod.id}`, eq(products.status, 'APPROVED')))
      .limit(4);

    const enrichedRelated = await Promise.all(
      relatedRows.map(async (r) => {
        const rImages = await db.select().from(productImages)
          .where(eq(productImages.productId, r.id))
          .orderBy(desc(productImages.isPrimary), asc(productImages.sortOrder))
          .limit(1);
        return {
          ...r,
          primaryImage: rImages[0]?.url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
        };
      })
    );

    return res.json({
      product: {
        ...prod,
        specifications,
        images: images.map(img => img.url),
        primaryImage: images[0]?.url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
        variants: parsedVariants,
        seller: seller[0] || null,
        category: cat[0] || null,
        reviews: prodReviews,
        relatedProducts: enrichedRelated,
      },
    });
  } catch (err: any) {
    console.error('Error fetching product details:', err);
    return res.status(500).json({ error: 'Unable to load product details.' });
  }
});

export default router;

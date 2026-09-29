import { Router } from 'express';
import { db } from '../db/index.ts';
import {
  products,
  productVariants,
  productImages,
  sellerProfiles,
  sellerOrders,
  orderItems,
  orders,
  shipments,
  shipmentEvents,
  returns,
  categories,
} from '../db/schema.ts';
import { eq, and, desc, sql, like, inArray } from 'drizzle-orm';
import { authenticateToken, requireApprovedSeller } from '../middleware/auth.ts';

const router = Router();

// Apply auth & seller role check to all seller endpoints
router.use(authenticateToken);
router.use(requireApprovedSeller);

// GET /api/seller/dashboard - Metrics & Analytics
router.get('/dashboard', async (req, res) => {
  try {
    const sellerId = req.user!.sellerProfileId!;

    // 1. Total products
    const prodCountRes = await db.select({ count: sql<number>`count(*)` })
      .from(products)
      .where(eq(products.sellerId, sellerId));
    const totalProducts = Number(prodCountRes[0]?.count || 0);

    // 2. Seller orders
    const sOrders = await db.select().from(sellerOrders)
      .where(eq(sellerOrders.sellerId, sellerId))
      .orderBy(desc(sellerOrders.createdAt));

    const totalOrders = sOrders.length;
    const totalSales = sOrders
      .filter(o => o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + o.total, 0);

    // 3. Units sold
    const sOrderIds = sOrders.map(o => o.id);
    let unitsSold = 0;
    if (sOrderIds.length > 0) {
      const soldRes = await db.select({ totalUnits: sql<number>`sum(quantity)` })
        .from(orderItems)
        .where(inArray(orderItems.sellerOrderId, sOrderIds));
      unitsSold = Number(soldRes[0]?.totalUnits || 0);
    }

    // 4. Low stock products (stock <= 5)
    const lowStockProducts = await db.select().from(products)
      .where(and(eq(products.sellerId, sellerId), sql`${products.stock} <= 5`))
      .limit(6);

    // 5. Recent orders
    const recentOrders = sOrders.slice(0, 5);

    // 6. Top selling products
    const topProdRes = await db.select({
      productId: orderItems.productId,
      productName: orderItems.productName,
      unitsSold: sql<number>`sum(${orderItems.quantity})`,
      totalRevenue: sql<number>`sum(${orderItems.total})`,
    })
      .from(orderItems)
      .innerJoin(sellerOrders, eq(orderItems.sellerOrderId, sellerOrders.id))
      .where(eq(sellerOrders.sellerId, sellerId))
      .groupBy(orderItems.productId)
      .orderBy(desc(sql`sum(${orderItems.quantity})`))
      .limit(5);

    return res.json({
      metrics: {
        totalSales: Number(totalSales.toFixed(2)),
        totalOrders,
        totalProducts,
        unitsSold,
      },
      lowStockProducts,
      recentOrders,
      topProducts: topProdRes,
    });
  } catch (err: any) {
    console.error('Seller dashboard error:', err);
    return res.status(500).json({ error: 'Failed to load seller dashboard.' });
  }
});

// GET /api/seller/products - List only this seller's products
router.get('/products', async (req, res) => {
  try {
    const sellerId = req.user!.sellerProfileId!;
    const { search, category, status } = req.query;

    const conditions = [eq(products.sellerId, sellerId)];

    if (status) {
      conditions.push(eq(products.status, String(status)));
    }

    if (category) {
      conditions.push(eq(products.categoryId, String(category)));
    }

    if (search) {
      conditions.push(like(products.name, `%${search}%`));
    }

    const sellerProducts = await db.select().from(products)
      .where(and(...conditions))
      .orderBy(desc(products.createdAt));

    const enriched = await Promise.all(
      sellerProducts.map(async (prod) => {
        const imgs = await db.select().from(productImages).where(eq(productImages.productId, prod.id));
        const vars = await db.select().from(productVariants).where(eq(productVariants.productId, prod.id));
        const cat = await db.select().from(categories).where(eq(categories.id, prod.categoryId)).limit(1);

        return {
          ...prod,
          images: imgs.map(i => i.url),
          primaryImage: imgs.find(i => i.isPrimary === 1)?.url || imgs[0]?.url || '',
          variantsCount: vars.length,
          categoryName: cat[0]?.name || 'General',
        };
      })
    );

    return res.json({ products: enriched });
  } catch (err) {
    console.error('Seller products error:', err);
    return res.status(500).json({ error: 'Failed to load seller products.' });
  }
});

// POST /api/seller/products - Create new product
router.post('/products', async (req, res) => {
  try {
    const sellerId = req.user!.sellerProfileId!;
    const {
      name,
      categoryId,
      description,
      sku,
      price,
      discountPrice,
      stock,
      images,
      specifications,
      shippingInfo,
      returnInfo,
      variants,
    } = req.body;

    if (!name || !categoryId || !description || !sku || price === undefined || stock === undefined) {
      return res.status(400).json({ error: 'Please provide all required product details.' });
    }

    const numPrice = parseFloat(price);
    const numStock = parseInt(stock);

    if (numPrice < 0) return res.status(400).json({ error: 'Price cannot be negative.' });
    if (numStock < 0) return res.status(400).json({ error: 'Stock cannot be negative.' });

    if (discountPrice && parseFloat(discountPrice) > numPrice) {
      return res.status(400).json({ error: 'Discount price cannot be greater than original price.' });
    }

    // Check SKU uniqueness
    const existingSku = await db.select().from(products).where(eq(products.sku, sku.trim().toUpperCase())).limit(1);
    if (existingSku.length > 0) {
      return res.status(400).json({ error: `SKU "${sku}" is already in use. Each SKU must be unique.` });
    }

    const productId = `prod-${Date.now()}`;
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString().slice(-4)}`;
    const now = new Date().toISOString();

    // Seller submitted products start as PENDING_REVIEW for admin moderation
    await db.insert(products).values({
      id: productId,
      sellerId,
      categoryId,
      name: name.trim(),
      slug,
      description: description.trim(),
      sku: sku.trim().toUpperCase(),
      price: numPrice,
      discountPrice: discountPrice ? parseFloat(discountPrice) : null,
      stock: numStock,
      status: 'PENDING_REVIEW', // Moderation workflow
      isFeatured: 0,
      specificationsJson: specifications ? JSON.stringify(specifications) : null,
      shippingInfo: shippingInfo || 'Standard tracked shipping.',
      returnInfo: returnInfo || '30-day return policy.',
      createdAt: now,
      updatedAt: now,
    });

    // Images
    const imgList = Array.isArray(images) && images.length > 0
      ? images
      : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80'];

    for (let i = 0; i < imgList.length; i++) {
      await db.insert(productImages).values({
        id: `img-${productId}-${i}`,
        productId,
        url: imgList[i],
        isPrimary: i === 0 ? 1 : 0,
        sortOrder: i,
      });
    }

    // Variants
    if (Array.isArray(variants) && variants.length > 0) {
      for (const v of variants) {
        if (!v.sku || !v.title) continue;
        await db.insert(productVariants).values({
          id: `var-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          productId,
          sku: v.sku.trim().toUpperCase(),
          title: v.title.trim(),
          price: parseFloat(v.price) || numPrice,
          stock: parseInt(v.stock) || 0,
          attributesJson: JSON.stringify(v.attributes || {}),
          createdAt: now,
        });
      }
    }

    return res.status(201).json({
      message: 'Product submitted for review! It will be publicly visible once approved by an administrator.',
      productId,
    });
  } catch (err: any) {
    console.error('Create product error:', err);
    return res.status(500).json({ error: 'Failed to create product.' });
  }
});

// PUT /api/seller/products/:id - Edit own product (Enforces tenant isolation!)
router.put('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const sellerId = req.user!.sellerProfileId!;

    // Verify ownership
    const prodRows = await db.select().from(products).where(
      and(eq(products.id, id), eq(products.sellerId, sellerId))
    ).limit(1);

    if (prodRows.length === 0) {
      return res.status(403).json({ error: 'Product not found or you do not have permission to edit it.' });
    }

    const {
      name,
      categoryId,
      description,
      price,
      discountPrice,
      stock,
      shippingInfo,
      returnInfo,
      specifications,
    } = req.body;

    const now = new Date().toISOString();
    const updateData: any = { updatedAt: now };

    if (name) updateData.name = name.trim();
    if (categoryId) updateData.categoryId = categoryId;
    if (description) updateData.description = description.trim();
    if (price !== undefined) updateData.price = parseFloat(price);
    if (discountPrice !== undefined) updateData.discountPrice = discountPrice ? parseFloat(discountPrice) : null;
    if (stock !== undefined) updateData.stock = parseInt(stock);
    if (shippingInfo) updateData.shippingInfo = shippingInfo;
    if (returnInfo) updateData.returnInfo = returnInfo;
    if (specifications) updateData.specificationsJson = JSON.stringify(specifications);

    await db.update(products).set(updateData).where(eq(products.id, id));

    return res.json({ message: 'Product updated successfully.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update product.' });
  }
});

// DELETE /api/seller/products/:id - Delete / Archive own product
router.delete('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const sellerId = req.user!.sellerProfileId!;

    const prodRows = await db.select().from(products).where(
      and(eq(products.id, id), eq(products.sellerId, sellerId))
    ).limit(1);

    if (prodRows.length === 0) {
      return res.status(403).json({ error: 'Product not found or unauthorized.' });
    }

    const now = new Date().toISOString();
    await db.update(products).set({ status: 'ARCHIVED', updatedAt: now }).where(eq(products.id, id));

    return res.json({ message: 'Product archived successfully.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to archive product.' });
  }
});

// GET /api/seller/orders - List only orders containing this seller's products
router.get('/orders', async (req, res) => {
  try {
    const sellerId = req.user!.sellerProfileId!;
    const sOrders = await db.select().from(sellerOrders)
      .where(eq(sellerOrders.sellerId, sellerId))
      .orderBy(desc(sellerOrders.createdAt));

    const enriched = await Promise.all(
      sOrders.map(async (sOrd) => {
        const parentOrder = await db.select().from(orders).where(eq(orders.id, sOrd.orderId)).limit(1);
        const items = await db.select().from(orderItems).where(eq(orderItems.sellerOrderId, sOrd.id));
        const shipment = await db.select().from(shipments).where(eq(shipments.sellerOrderId, sOrd.id)).limit(1);

        let shippingAddress = {};
        if (parentOrder.length > 0) {
          try {
            shippingAddress = JSON.parse(parentOrder[0].shippingAddressJson);
          } catch {}
        }

        return {
          ...sOrd,
          orderNumber: parentOrder[0]?.orderNumber || 'N/A',
          customerName: (shippingAddress as any).fullName || 'Customer',
          customerPhone: (shippingAddress as any).phone || 'N/A',
          paymentStatus: parentOrder[0]?.paymentStatus || 'PENDING',
          items,
          shipment: shipment[0] || null,
        };
      })
    );

    return res.json({ orders: enriched });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load seller orders.' });
  }
});

// POST /api/seller/orders/:id/status - Update fulfillment status
router.post('/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note, location = 'Seller Hub' } = req.body;
    const sellerId = req.user!.sellerProfileId!;

    const validStatuses = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid order status transition.' });
    }

    const sOrders = await db.select().from(sellerOrders).where(
      and(eq(sellerOrders.id, id), eq(sellerOrders.sellerId, sellerId))
    ).limit(1);

    if (sOrders.length === 0) {
      return res.status(404).json({ error: 'Seller order not found or unauthorized.' });
    }

    const sOrd = sOrders[0];
    const now = new Date().toISOString();

    // Prevent invalid transitions: cannot go from DELIVERED backwards to PROCESSING
    if (sOrd.status === 'DELIVERED' && status !== 'DELIVERED') {
      return res.status(400).json({ error: 'Cannot modify a delivered order.' });
    }

    // Update seller order
    await db.update(sellerOrders).set({ status, updatedAt: now }).where(eq(sellerOrders.id, sOrd.id));

    // Update shipment if exists
    const shipmentRows = await db.select().from(shipments).where(eq(shipments.sellerOrderId, sOrd.id)).limit(1);
    if (shipmentRows.length > 0) {
      await db.update(shipments).set({ status, updatedAt: now }).where(eq(shipments.id, shipmentRows[0].id));

      await db.insert(shipmentEvents).values({
        id: `ev-${Date.now()}`,
        shipmentId: shipmentRows[0].id,
        status,
        location,
        description: note || `Status progressed to ${status}.`,
        eventTime: now,
      });
    }

    // Check if all sellerOrders for parent order are delivered/shipped to advance parent order
    const allSiblings = await db.select({ status: sellerOrders.status }).from(sellerOrders).where(eq(sellerOrders.orderId, sOrd.orderId));
    const allDelivered = allSiblings.every(s => s.status === 'DELIVERED');
    const anyShipped = allSiblings.some(s => s.status === 'SHIPPED' || s.status === 'OUT_FOR_DELIVERY');

    if (allDelivered) {
      await db.update(orders).set({ status: 'DELIVERED', updatedAt: now }).where(eq(orders.id, sOrd.orderId));
    } else if (anyShipped) {
      await db.update(orders).set({ status: 'SHIPPED', updatedAt: now }).where(eq(orders.id, sOrd.orderId));
    }

    return res.json({ message: `Fulfillment status updated to ${status}.` });
  } catch (err: any) {
    console.error('Update fulfillment error:', err);
    return res.status(500).json({ error: 'Failed to update order status.' });
  }
});

// GET /api/seller/returns - Returns assigned to this seller
router.get('/returns', async (req, res) => {
  try {
    const sellerId = req.user!.sellerProfileId!;
    const sellerReturns = await db.select().from(returns)
      .where(eq(returns.sellerId, sellerId))
      .orderBy(desc(returns.requestedAt));

    const enriched = await Promise.all(
      sellerReturns.map(async (r) => {
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
    return res.status(500).json({ error: 'Failed to load seller returns.' });
  }
});

// POST /api/seller/returns/:id/status - Approve / Reject return
router.post('/returns/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const sellerId = req.user!.sellerProfileId!;

    const validStatuses = ['APPROVED', 'REJECTED', 'ITEM_RECEIVED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid return status.' });
    }

    const rRows = await db.select().from(returns).where(
      and(eq(returns.id, id), eq(returns.sellerId, sellerId))
    ).limit(1);

    if (rRows.length === 0) {
      return res.status(404).json({ error: 'Return request not found or unauthorized.' });
    }

    const now = new Date().toISOString();
    await db.update(returns).set({ status, resolvedAt: now }).where(eq(returns.id, id));

    return res.json({ message: `Return request marked as ${status}.` });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update return request.' });
  }
});

// PUT /api/seller/profile - Store settings
router.put('/profile', async (req, res) => {
  try {
    const sellerId = req.user!.sellerProfileId!;
    const { storeName, description, contactEmail, contactPhone } = req.body;

    const now = new Date().toISOString();
    await db.update(sellerProfiles).set({
      storeName: storeName ? storeName.trim() : undefined,
      description: description !== undefined ? description.trim() : undefined,
      contactEmail: contactEmail ? contactEmail.trim().toLowerCase() : undefined,
      contactPhone: contactPhone || null,
      updatedAt: now,
    }).where(eq(sellerProfiles.id, sellerId));

    return res.json({ message: 'Store profile updated successfully.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update store profile.' });
  }
});

export default router;

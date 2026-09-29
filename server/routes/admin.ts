import { Router } from 'express';
import { db } from '../db/index.ts';
import {
  users,
  sellerProfiles,
  products,
  productVariants,
  categories,
  orders,
  orderItems,
  sellerOrders,
  shipments,
  shipmentEvents,
  payments,
  returns,
  refunds,
  coupons,
  auditLogs,
} from '../db/schema.ts';
import { eq, and, desc, sql, like, or } from 'drizzle-orm';
import { authenticateToken, requireRole } from '../middleware/auth.ts';

const router = Router();

// Secure all admin routes with ADMIN role
router.use(authenticateToken);
router.use(requireRole(['ADMIN']));

// GET /api/admin/dashboard - Comprehensive marketplace metrics
router.get('/dashboard', async (_req, res) => {
  try {
    const totalProductsRes = await db.select({ count: sql<number>`count(*)` }).from(products);
    const totalCustomersRes = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, 'CUSTOMER'));
    const totalSellersRes = await db.select({ count: sql<number>`count(*)` }).from(sellerProfiles);
    const totalOrdersRes = await db.select({ count: sql<number>`count(*)` }).from(orders);

    const pendingOrdersRes = await db.select({ count: sql<number>`count(*)` }).from(orders).where(
      or(eq(orders.status, 'PENDING'), eq(orders.status, 'CONFIRMED'), eq(orders.status, 'PROCESSING'))
    );

    const deliveredOrdersRes = await db.select({ count: sql<number>`count(*)` }).from(orders).where(eq(orders.status, 'DELIVERED'));

    const salesRes = await db.select({ total: sql<number>`sum(total)` }).from(orders).where(sql`${orders.status} != 'CANCELLED'`);

    const lowStockRes = await db.select().from(products).where(sql`${products.stock} <= 5`).limit(8);

    const recentOrders = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(8);

    const pendingSellers = await db.select().from(sellerProfiles).where(eq(sellerProfiles.status, 'PENDING'));

    const pendingProductModerations = await db.select().from(products).where(eq(products.status, 'PENDING_REVIEW'));

    return res.json({
      metrics: {
        totalProducts: Number(totalProductsRes[0]?.count || 0),
        totalCustomers: Number(totalCustomersRes[0]?.count || 0),
        totalSellers: Number(totalSellersRes[0]?.count || 0),
        totalOrders: Number(totalOrdersRes[0]?.count || 0),
        pendingOrders: Number(pendingOrdersRes[0]?.count || 0),
        deliveredOrders: Number(deliveredOrdersRes[0]?.count || 0),
        totalSales: Number((salesRes[0]?.total || 0).toFixed(2)),
      },
      lowStockProducts: lowStockRes,
      recentOrders,
      pendingSellersCount: pendingSellers.length,
      pendingProductsCount: pendingProductModerations.length,
    });
  } catch (err: any) {
    console.error('Admin dashboard error:', err);
    return res.status(500).json({ error: 'Failed to load admin metrics.' });
  }
});

// GET /api/admin/users
router.get('/users', async (_req, res) => {
  try {
    const allUsers = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      phone: users.phone,
      createdAt: users.createdAt,
    }).from(users).orderBy(desc(users.createdAt));

    return res.json({ users: allUsers });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load users.' });
  }
});

// GET /api/admin/sellers - View sellers and applications
router.get('/sellers', async (_req, res) => {
  try {
    const sellersList = await db.select().from(sellerProfiles).orderBy(desc(sellerProfiles.createdAt));

    const enriched = await Promise.all(
      sellersList.map(async (s) => {
        const user = await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, s.userId)).limit(1);
        const prodCount = await db.select({ count: sql<number>`count(*)` }).from(products).where(eq(products.sellerId, s.id));
        return {
          ...s,
          ownerName: user[0]?.name || 'N/A',
          ownerEmail: user[0]?.email || s.contactEmail,
          productCount: Number(prodCount[0]?.count || 0),
        };
      })
    );

    return res.json({ sellers: enriched });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load sellers.' });
  }
});

// POST /api/admin/sellers/:id/status - Approve / Reject / Suspend seller
router.post('/sellers/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'APPROVED' | 'REJECTED' | 'SUSPENDED'

    if (!['APPROVED', 'REJECTED', 'SUSPENDED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid seller status.' });
    }

    const now = new Date().toISOString();
    await db.update(sellerProfiles).set({ status, updatedAt: now }).where(eq(sellerProfiles.id, id));

    return res.json({ message: `Seller status updated to ${status}.` });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update seller status.' });
  }
});

// GET /api/admin/products - All products with filter by status
router.get('/products', async (req, res) => {
  try {
    const { status, search } = req.query;
    const conditions = [];

    if (status) {
      conditions.push(eq(products.status, String(status)));
    }

    if (search) {
      conditions.push(or(like(products.name, `%${search}%`), like(products.sku, `%${search}%`)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const allProducts = await db.select().from(products)
      .where(whereClause)
      .orderBy(desc(products.createdAt));

    const enriched = await Promise.all(
      allProducts.map(async (p) => {
        const cat = await db.select({ name: categories.name }).from(categories).where(eq(categories.id, p.categoryId)).limit(1);
        const seller = await db.select({ storeName: sellerProfiles.storeName }).from(sellerProfiles).where(eq(sellerProfiles.id, p.sellerId)).limit(1);
        return {
          ...p,
          categoryName: cat[0]?.name || 'N/A',
          sellerStoreName: seller[0]?.storeName || 'N/A',
        };
      })
    );

    return res.json({ products: enriched });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load products for moderation.' });
  }
});

// POST /api/admin/products/:id/status - Moderate product (APPROVE, REJECT, ARCHIVE)
router.post('/products/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'APPROVED' | 'REJECTED' | 'ARCHIVED' | 'DRAFT'

    if (!['APPROVED', 'REJECTED', 'ARCHIVED', 'DRAFT'].includes(status)) {
      return res.status(400).json({ error: 'Invalid product status.' });
    }

    const now = new Date().toISOString();
    await db.update(products).set({ status, updatedAt: now }).where(eq(products.id, id));

    return res.json({ message: `Product marked as ${status}.` });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to moderate product.' });
  }
});

// Categories CRUD for Admin
router.get('/categories', async (_req, res) => {
  try {
    const catList = await db.select().from(categories).orderBy(desc(categories.createdAt));
    return res.json({ categories: catList });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load categories.' });
  }
});

router.post('/categories', async (req, res) => {
  try {
    const { name, description, image, isActive = 1 } = req.body;
    if (!name) return res.status(400).json({ error: 'Category name is required.' });

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const id = `cat-${slug}-${Date.now().toString().slice(-4)}`;
    const now = new Date().toISOString();

    await db.insert(categories).values({
      id,
      name: name.trim(),
      slug,
      description: description || null,
      image: image || 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800&auto=format&fit=crop&q=80',
      isActive: isActive ? 1 : 0,
      createdAt: now,
    });

    return res.status(201).json({ message: 'Category created successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to create category. Ensure name is unique.' });
  }
});

router.put('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, image, isActive } = req.body;

    const updateData: any = {};
    if (name) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description;
    if (image !== undefined) updateData.image = image;
    if (isActive !== undefined) updateData.isActive = isActive ? 1 : 0;

    await db.update(categories).set(updateData).where(eq(categories.id, id));
    return res.json({ message: 'Category updated successfully.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update category.' });
  }
});

router.delete('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Check if products exist in category
    const countRes = await db.select({ count: sql<number>`count(*)` }).from(products).where(eq(products.categoryId, id));
    if (Number(countRes[0]?.count || 0) > 0) {
      return res.status(400).json({ error: 'Cannot delete category containing products. Reassign or delete products first.' });
    }

    await db.delete(categories).where(eq(categories.id, id));
    return res.json({ message: 'Category deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete category.' });
  }
});

// Admin Orders
router.get('/orders', async (req, res) => {
  try {
    const { search, status } = req.query;
    const conditions = [];

    if (status) {
      conditions.push(eq(orders.status, String(status)));
    }

    if (search) {
      conditions.push(or(like(orders.orderNumber, `%${search}%`), like(orders.shippingAddressJson, `%${search}%`)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const allOrders = await db.select().from(orders).where(whereClause).orderBy(desc(orders.createdAt));

    const enriched = await Promise.all(
      allOrders.map(async (ord) => {
        const cust = await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, ord.customerId)).limit(1);
        const items = await db.select().from(orderItems).where(eq(orderItems.orderId, ord.id));
        return {
          ...ord,
          customer: cust[0] || { name: 'Customer', email: 'N/A' },
          itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
        };
      })
    );

    return res.json({ orders: enriched });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load orders.' });
  }
});

// GET /api/admin/orders/:id - Get full order details for Admin
router.get('/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const ordRows = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (ordRows.length === 0) return res.status(404).json({ error: 'Order not found.' });

    const ord = ordRows[0];
    const customer = await db.select().from(users).where(eq(users.id, ord.customerId)).limit(1);
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, ord.id));
    const suborders = await db.select().from(sellerOrders).where(eq(sellerOrders.orderId, ord.id));
    const rawShipments = await db.select().from(shipments).where(eq(shipments.orderId, ord.id));
    const enrichedShipments = await Promise.all(
      rawShipments.map(async (shp) => {
        const events = await db.select().from(shipmentEvents).where(eq(shipmentEvents.shipmentId, shp.id)).orderBy(desc(shipmentEvents.eventTime));
        return { ...shp, events };
      })
    );
    const payment = await db.select().from(payments).where(eq(payments.orderId, ord.id)).limit(1);

    let shippingAddress = {};
    try {
      shippingAddress = JSON.parse(ord.shippingAddressJson);
    } catch {}

    return res.json({
      order: {
        ...ord,
        customer: customer[0] || null,
        shippingAddress,
        items,
        suborders,
        shipments: enrichedShipments,
        payment: payment[0] || null,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load order details.' });
  }
});

// POST /api/admin/orders/:id/status - Update order status with immediate customer dashboard sync
router.post('/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note, location } = req.body;

    const validStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const ordRows = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (ordRows.length === 0) return res.status(404).json({ error: 'Order not found.' });

    const ord = ordRows[0];
    const prevStatus = ord.status;
    const now = new Date().toISOString();

    // If changing to CANCELLED and was not previously CANCELLED, restore stock
    if (status === 'CANCELLED' && prevStatus !== 'CANCELLED') {
      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, ord.id));
      for (const item of items) {
        const prodRows = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
        if (prodRows.length > 0) {
          await db.update(products)
            .set({ stock: prodRows[0].stock + item.quantity, updatedAt: now })
            .where(eq(products.id, item.productId));
        }

        if (item.variantId) {
          const varRows = await db.select().from(productVariants).where(eq(productVariants.id, item.variantId)).limit(1);
          if (varRows.length > 0) {
            await db.update(productVariants)
              .set({ stock: varRows[0].stock + item.quantity })
              .where(eq(productVariants.id, item.variantId));
          }
        }
      }
    }

    // Determine payment update if DELIVERED
    let paymentUpdate: any = {};
    if (status === 'DELIVERED' && ord.paymentStatus !== 'PAID') {
      paymentUpdate = { paymentStatus: 'PAID' };
      await db.update(payments).set({ status: 'PAID' }).where(eq(payments.orderId, ord.id));
    }

    // 1. Update master order status
    await db.update(orders)
      .set({ status, ...paymentUpdate, updatedAt: now })
      .where(eq(orders.id, id));

    // 2. Update all child seller orders (so sellers see the new status)
    await db.update(sellerOrders)
      .set({ status, updatedAt: now })
      .where(eq(sellerOrders.orderId, id));

    // 3. Update all child shipments and append live tracking timeline event
    const orderShipments = await db.select().from(shipments).where(eq(shipments.orderId, id));
    for (const shp of orderShipments) {
      await db.update(shipments)
        .set({ status, updatedAt: now })
        .where(eq(shipments.id, shp.id));

      let eventLocation = location || 'Marketplace Logistics Hub';
      let eventDescription = note || `Order marked as ${status} by Marketplace Administration.`;

      if (!note) {
        if (status === 'CONFIRMED') {
          eventLocation = location || 'Marketplace Hub';
          eventDescription = 'Order verified and confirmed by Marketplace Operations.';
        } else if (status === 'PROCESSING') {
          eventLocation = location || 'Packaging & Sorting Facility';
          eventDescription = 'Items gathered, inspected, and packed for shipment.';
        } else if (status === 'SHIPPED') {
          eventLocation = location || 'Regional Transit Station';
          eventDescription = 'Dispatched and handed over to courier carrier.';
        } else if (status === 'OUT_FOR_DELIVERY') {
          eventLocation = location || 'Local Delivery Depot';
          eventDescription = 'Package is out with local courier for final delivery.';
        } else if (status === 'DELIVERED') {
          eventLocation = location || 'Customer Delivery Address';
          eventDescription = 'Package handed over and successfully delivered to recipient.';
        } else if (status === 'CANCELLED') {
          eventLocation = location || 'Warehouse Returns Desk';
          eventDescription = 'Order cancelled by Admin. Inventory released back to catalog.';
        }
      }

      await db.insert(shipmentEvents).values({
        id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        shipmentId: shp.id,
        status,
        location: eventLocation,
        description: eventDescription,
        eventTime: now,
      });
    }

    // 4. Audit log entry
    await db.insert(auditLogs).values({
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      action: 'UPDATE_ORDER_STATUS',
      entityType: 'orders',
      entityId: id,
      userId: req.user!.id,
      detailsJson: JSON.stringify({ previousStatus: prevStatus, newStatus: status, note }),
      createdAt: now,
    });

    return res.json({
      message: `Order status successfully changed from ${prevStatus} to ${status}. Customer dashboard will reflect this immediately.`,
      status,
    });
  } catch (err) {
    console.error('Admin update order status error:', err);
    return res.status(500).json({ error: 'Failed to update order status.' });
  }
});

// Admin Returns & Refund Simulation
router.get('/returns', async (_req, res) => {
  try {
    const allReturns = await db.select().from(returns).orderBy(desc(returns.requestedAt));
    const enriched = await Promise.all(
      allReturns.map(async (r) => {
        const item = await db.select().from(orderItems).where(eq(orderItems.id, r.orderItemId)).limit(1);
        const order = await db.select().from(orders).where(eq(orders.id, r.orderId)).limit(1);
        const seller = await db.select().from(sellerProfiles).where(eq(sellerProfiles.id, r.sellerId)).limit(1);
        const cust = await db.select().from(users).where(eq(users.id, r.customerId)).limit(1);
        return {
          ...r,
          orderNumber: order[0]?.orderNumber || 'N/A',
          customerName: cust[0]?.name || 'Customer',
          sellerStoreName: seller[0]?.storeName || 'Store',
          item: item[0] || null,
        };
      })
    );

    return res.json({ returns: enriched });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load returns.' });
  }
});

// POST /api/admin/returns/:id/refund - Process simulated refund
router.post('/returns/:id/refund', async (req, res) => {
  try {
    const { id } = req.params;
    const rRows = await db.select().from(returns).where(eq(returns.id, id)).limit(1);
    if (rRows.length === 0) return res.status(404).json({ error: 'Return request not found.' });

    const ret = rRows[0];
    const orderRows = await db.select().from(orders).where(eq(orders.id, ret.orderId)).limit(1);
    const ord = orderRows[0];

    const itemRows = await db.select().from(orderItems).where(eq(orderItems.id, ret.orderItemId)).limit(1);
    const refundAmount = itemRows[0]?.total || 0;

    const now = new Date().toISOString();
    const refundId = `ref-${Date.now()}`;

    // Record refund
    await db.insert(refunds).values({
      id: refundId,
      returnId: ret.id,
      orderId: ret.orderId,
      amount: refundAmount,
      currency: ord?.currency || 'INR',
      reason: `Customer return approved: ${ret.reason}`,
      status: 'COMPLETED',
      processedAt: now,
    });

    // Update return status
    await db.update(returns).set({ status: 'REFUNDED', resolvedAt: now }).where(eq(returns.id, ret.id));

    // Update payment record if exists
    await db.update(payments).set({ status: 'REFUNDED' }).where(eq(payments.orderId, ret.orderId));

    return res.json({
      message: `Simulated refund of ${ord?.currency || 'INR'} ${refundAmount} processed successfully.`,
      refundId,
    });
  } catch (err: any) {
    console.error('Refund processing error:', err);
    return res.status(500).json({ error: 'Failed to process refund.' });
  }
});

// Coupons CRUD
router.get('/coupons', async (_req, res) => {
  try {
    const list = await db.select().from(coupons).orderBy(desc(coupons.createdAt));
    return res.json({ coupons: list });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load coupons.' });
  }
});

router.post('/coupons', async (req, res) => {
  try {
    const { code, type, value, minOrderAmount = 0, maxDiscount, startDate, endDate, usageLimit = 100 } = req.body;

    if (!code || !type || value === undefined) {
      return res.status(400).json({ error: 'Code, type, and value are required.' });
    }

    const now = new Date().toISOString();
    const couponId = `c-${code.toLowerCase().trim()}-${Date.now().toString().slice(-4)}`;

    await db.insert(coupons).values({
      id: couponId,
      code: code.toUpperCase().trim(),
      type,
      value: parseFloat(value),
      minOrderAmount: parseFloat(minOrderAmount) || 0,
      maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
      startDate: startDate || now.split('T')[0],
      endDate: endDate || '2030-12-31',
      usageLimit: parseInt(usageLimit) || 100,
      timesUsed: 0,
      isActive: 1,
      createdAt: now,
    });

    return res.status(201).json({ message: 'Coupon created successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to create coupon. Ensure code is unique.' });
  }
});

router.delete('/coupons/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(coupons).where(eq(coupons.id, id));
    return res.json({ message: 'Coupon deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete coupon.' });
  }
});

export default router;

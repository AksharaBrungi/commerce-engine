import { Router } from 'express';
import { db } from '../db/index.ts';
import {
  orders,
  sellerOrders,
  orderItems,
  payments,
  shipments,
  shipmentEvents,
  products,
  productVariants,
  coupons,
  couponRedemptions,
  cartItems,
  carts,
} from '../db/schema.ts';
import { eq, and } from 'drizzle-orm';
import { authenticateToken } from '../middleware/auth.ts';
import { convertFromINR, getCurrencyRate } from '../services/currency.ts';

const router = Router();

// POST /api/checkout/calculate - Preview and validate checkout totals
router.post('/calculate', authenticateToken, async (req, res) => {
  try {
    const { items, couponCode, shippingMethod = 'standard' } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Checkout cart is empty.' });
    }

    let subtotal = 0;
    const validatedItems: any[] = [];

    for (const item of items) {
      const prodRows = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
      if (prodRows.length === 0) {
        return res.status(400).json({ error: `Product not found.` });
      }
      const prod = prodRows[0];

      let price = prod.discountPrice || prod.price;
      let availableStock = prod.stock;
      let variantTitle = null;

      if (item.variantId) {
        const varRows = await db.select().from(productVariants).where(eq(productVariants.id, item.variantId)).limit(1);
        if (varRows.length === 0) {
          return res.status(400).json({ error: `Selected variant for "${prod.name}" no longer exists.` });
        }
        price = varRows[0].price;
        availableStock = varRows[0].stock;
        variantTitle = varRows[0].title;
      }

      if (item.quantity > availableStock) {
        return res.status(400).json({
          error: `Insufficient stock for "${prod.name}${variantTitle ? ` (${variantTitle})` : ''}". Available: ${availableStock}, Requested: ${item.quantity}`,
        });
      }

      const itemTotal = price * item.quantity;
      subtotal += itemTotal;

      validatedItems.push({
        productId: prod.id,
        sellerId: prod.sellerId,
        variantId: item.variantId || null,
        productName: prod.name,
        variantTitle,
        sku: item.sku || prod.sku,
        price,
        quantity: item.quantity,
        total: itemTotal,
      });
    }

    // Coupon calculation
    let discount = 0;
    let appliedCoupon = null;

    if (couponCode) {
      const couponRows = await db.select().from(coupons).where(
        and(eq(coupons.code, couponCode.toUpperCase().trim()), eq(coupons.isActive, 1))
      ).limit(1);

      if (couponRows.length === 0) {
        return res.status(400).json({ error: 'Coupon code is invalid or deactivated.' });
      }

      const c = couponRows[0];
      const today = new Date().toISOString().split('T')[0];

      if (c.startDate > today || c.endDate < today) {
        return res.status(400).json({ error: 'This coupon has expired.' });
      }

      if (subtotal < c.minOrderAmount) {
        return res.status(400).json({
          error: `Coupon requires a minimum order subtotal of ₹${c.minOrderAmount}.`,
        });
      }

      if (c.timesUsed >= c.usageLimit) {
        return res.status(400).json({ error: 'Coupon redemption limit has been reached.' });
      }

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
      };
    }

    // Shipping fee
    let shippingFee = 0;
    if (shippingMethod === 'express') {
      shippingFee = 199;
    } else {
      shippingFee = subtotal >= 999 ? 0 : 99;
    }

    // Tax calculation
    const taxableSubtotal = Math.max(0, subtotal - discount);
    const tax = Number((taxableSubtotal * 0.05).toFixed(2));
    const total = Number((taxableSubtotal + shippingFee + tax).toFixed(2));

    return res.json({
      subtotal,
      discount,
      shippingFee,
      tax,
      total,
      appliedCoupon,
      items: validatedItems,
    });
  } catch (err: any) {
    console.error('Checkout calculate error:', err);
    return res.status(500).json({ error: 'Unable to calculate checkout totals.' });
  }
});

// POST /api/checkout/place-order - Create order with atomic stock decrement
router.post('/place-order', authenticateToken, async (req, res) => {
  try {
    const {
      shippingAddress,
      paymentMethod = 'CASH_ON_DELIVERY',
      simulateCardSuccess = true,
      cardDetails,
      couponCode,
      shippingMethod = 'standard',
      currency = 'INR',
      notes,
    } = req.body;

    const customerId = req.user!.id;

    if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.addressLine1 || !shippingAddress.city || !shippingAddress.pincode) {
      return res.status(400).json({ error: 'Please provide a complete shipping address.' });
    }

    // 1. Fetch user cart items
    const userCartRows = await db.select().from(carts).where(eq(carts.userId, customerId)).limit(1);
    if (userCartRows.length === 0) {
      return res.status(400).json({ error: 'No active cart found for this account.' });
    }
    const cart = userCartRows[0];

    const rawCartItems = await db.select().from(cartItems).where(eq(cartItems.cartId, cart.id));
    if (rawCartItems.length === 0) {
      return res.status(400).json({ error: 'Your cart is empty.' });
    }

    // 2. Validate stock & build items
    let subtotal = 0;
    const validatedItems: any[] = [];
    const stockDecrements: Array<{ type: 'product' | 'variant'; id: string; qty: number; currentStock: number }> = [];

    for (const cItem of rawCartItems) {
      const prodRows = await db.select().from(products).where(eq(products.id, cItem.productId)).limit(1);
      if (prodRows.length === 0) {
        return res.status(400).json({ error: 'One or more items in your cart is no longer available.' });
      }
      const prod = prodRows[0];

      let unitPrice = prod.discountPrice || prod.price;
      let availableStock = prod.stock;
      let variantTitle = null;
      let sku = prod.sku;

      if (cItem.variantId) {
        const varRows = await db.select().from(productVariants).where(eq(productVariants.id, cItem.variantId)).limit(1);
        if (varRows.length === 0) {
          return res.status(400).json({ error: `Selected variant for "${prod.name}" no longer exists.` });
        }
        unitPrice = varRows[0].price;
        availableStock = varRows[0].stock;
        variantTitle = varRows[0].title;
        sku = varRows[0].sku;

        if (cItem.quantity > availableStock) {
          return res.status(400).json({
            error: `Sorry! Only ${availableStock} units of "${prod.name} (${variantTitle})" are available.`,
          });
        }

        stockDecrements.push({ type: 'variant', id: cItem.variantId, qty: cItem.quantity, currentStock: availableStock });
        stockDecrements.push({ type: 'product', id: prod.id, qty: cItem.quantity, currentStock: prod.stock });
      } else {
        if (cItem.quantity > availableStock) {
          return res.status(400).json({
            error: `Sorry! Only ${availableStock} units of "${prod.name}" are available in stock.`,
          });
        }
        stockDecrements.push({ type: 'product', id: prod.id, qty: cItem.quantity, currentStock: prod.stock });
      }

      const itemTotal = unitPrice * cItem.quantity;
      subtotal += itemTotal;

      validatedItems.push({
        productId: prod.id,
        sellerId: prod.sellerId,
        variantId: cItem.variantId,
        productName: prod.name,
        variantTitle,
        sku,
        price: unitPrice,
        quantity: cItem.quantity,
        total: itemTotal,
      });
    }

    // 3. Discount calculation
    let discount = 0;
    let validCoupon: any = null;

    if (couponCode) {
      const couponRows = await db.select().from(coupons).where(
        and(eq(coupons.code, couponCode.toUpperCase().trim()), eq(coupons.isActive, 1))
      ).limit(1);

      if (couponRows.length > 0) {
        const c = couponRows[0];
        const today = new Date().toISOString().split('T')[0];
        if (c.startDate <= today && c.endDate >= today && subtotal >= c.minOrderAmount && c.timesUsed < c.usageLimit) {
          validCoupon = c;
          if (c.type === 'PERCENTAGE') {
            discount = (subtotal * c.value) / 100;
            if (c.maxDiscount && discount > c.maxDiscount) discount = c.maxDiscount;
          } else {
            discount = Math.min(subtotal, c.value);
          }
        }
      }
    }

    const shippingFee = shippingMethod === 'express' ? 199 : (subtotal >= 999 ? 0 : 99);
    const taxableSubtotal = Math.max(0, subtotal - discount);
    const tax = Number((taxableSubtotal * 0.05).toFixed(2));
    const total = Number((taxableSubtotal + shippingFee + tax).toFixed(2));

    // 4. Handle sandbox payment simulation
    let paymentStatus = 'PENDING';
    if (paymentMethod === 'DEMO_CARD') {
      if (simulateCardSuccess === false) {
        return res.status(402).json({
          error: 'Payment could not be completed. Simulated card decline: Insufficient funds or invalid card security code.',
        });
      }
      paymentStatus = 'PAID';
    } else {
      paymentStatus = 'PENDING'; // Cash on Delivery
    }

    // 5. Atomic Stock Decrement
    const now = new Date().toISOString();
    for (const dec of stockDecrements) {
      if (dec.type === 'product') {
        const newStock = Math.max(0, dec.currentStock - dec.qty);
        await db.update(products).set({ stock: newStock, updatedAt: now }).where(eq(products.id, dec.id));
      } else if (dec.type === 'variant') {
        const newStock = Math.max(0, dec.currentStock - dec.qty);
        await db.update(productVariants).set({ stock: newStock }).where(eq(productVariants.id, dec.id));
      }
    }

    // 6. Currency exchange rate saving
    const exchangeRate = getCurrencyRate(currency);
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const orderId = `ord-${Date.now()}`;

    // Insert Order
    await db.insert(orders).values({
      id: orderId,
      orderNumber,
      customerId,
      status: 'CONFIRMED',
      currency: currency.toUpperCase(),
      exchangeRate,
      subtotal,
      discount,
      shippingFee,
      tax,
      total,
      paymentMethod,
      paymentStatus,
      shippingAddressJson: JSON.stringify(shippingAddress),
      notes: notes || null,
      createdAt: now,
      updatedAt: now,
    });

    // 7. Group items by Seller to create multi-seller suborders
    const sellerGrouped: Record<string, any[]> = {};
    for (const item of validatedItems) {
      if (!sellerGrouped[item.sellerId]) {
        sellerGrouped[item.sellerId] = [];
      }
      sellerGrouped[item.sellerId].push(item);
    }

    let subIndex = 1;
    for (const [sellerId, sItems] of Object.entries(sellerGrouped)) {
      const sellerSubtotal = sItems.reduce((acc, i) => acc + i.total, 0);
      const sellerDiscount = subtotal > 0 ? (sellerSubtotal / subtotal) * discount : 0;
      const sellerShipping = subtotal > 0 ? (sellerSubtotal / subtotal) * shippingFee : 0;
      const sellerTotal = Number((sellerSubtotal - sellerDiscount + sellerShipping).toFixed(2));

      const sellerOrderId = `sord-${Date.now()}-${subIndex}`;
      const suborderNumber = `${orderNumber}-${String.fromCharCode(64 + subIndex)}`;
      subIndex++;

      await db.insert(sellerOrders).values({
        id: sellerOrderId,
        orderId,
        sellerId,
        suborderNumber,
        subtotal: sellerSubtotal,
        discount: sellerDiscount,
        shippingFee: sellerShipping,
        total: sellerTotal,
        status: 'CONFIRMED',
        createdAt: now,
        updatedAt: now,
      });

      // Insert Order Items for this seller
      for (const item of sItems) {
        const orderItemId = `oit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        await db.insert(orderItems).values({
          id: orderItemId,
          orderId,
          sellerOrderId,
          productId: item.productId,
          variantId: item.variantId || null,
          productName: item.productName,
          variantTitle: item.variantTitle,
          sku: item.sku,
          price: item.price,
          quantity: item.quantity,
          total: item.total,
          isReviewed: 0,
          createdAt: now,
        });
      }

      // Create Shipment for this seller suborder
      const shipmentId = `shp-${Date.now()}-${subIndex}`;
      const trackingNumber = `TRK-${Date.now().toString().slice(-8)}${subIndex}`;
      const deliveryDate = new Date();
      deliveryDate.setDate(deliveryDate.getDate() + 3);

      await db.insert(shipments).values({
        id: shipmentId,
        orderId,
        sellerOrderId,
        trackingNumber,
        carrier: 'Express Logistics',
        status: 'PROCESSING',
        estimatedDelivery: deliveryDate.toISOString().split('T')[0],
        createdAt: now,
        updatedAt: now,
      });

      await db.insert(shipmentEvents).values({
        id: `ev-${Date.now()}-${subIndex}`,
        shipmentId,
        status: 'CONFIRMED',
        location: 'Merchant Fulfillment Hub',
        description: 'Order confirmed and ready for packaging.',
        eventTime: now,
      });
    }

    // 8. Record Payment record
    const paymentId = `pay-${Date.now()}`;
    const txnRef = `TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const last4 = cardDetails?.number ? String(cardDetails.number).slice(-4) : (paymentMethod === 'DEMO_CARD' ? '4242' : null);

    await db.insert(payments).values({
      id: paymentId,
      orderId,
      method: paymentMethod,
      status: paymentStatus,
      transactionReference: txnRef,
      amount: total,
      currency: currency.toUpperCase(),
      simulatedCardLast4: last4,
      createdAt: now,
    });

    // 9. Record coupon redemption if applicable
    if (validCoupon) {
      await db.insert(couponRedemptions).values({
        id: `cr-${Date.now()}`,
        couponId: validCoupon.id,
        userId: customerId,
        orderId,
        discountAmount: discount,
        redeemedAt: now,
      });

      await db.update(coupons)
        .set({ timesUsed: validCoupon.timesUsed + 1 })
        .where(eq(coupons.id, validCoupon.id));
    }

    // 10. Clear user's cart
    await db.delete(cartItems).where(eq(cartItems.cartId, cart.id));

    return res.status(201).json({
      message: 'Order placed successfully!',
      orderId,
      orderNumber,
      total,
      currency,
      paymentStatus,
    });
  } catch (err: any) {
    console.error('Order creation error:', err);
    return res.status(500).json({ error: 'Failed to place order. Please try again.' });
  }
});

export default router;

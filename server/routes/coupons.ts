import { Router } from 'express';
import { db } from '../db/index.ts';
import { coupons } from '../db/schema.ts';
import { eq, and } from 'drizzle-orm';

const router = Router();

// POST /api/coupons/validate
router.post('/validate', async (req, res) => {
  try {
    const { code, subtotal = 0 } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Please enter a coupon code.' });
    }

    const couponRows = await db.select().from(coupons).where(
      and(eq(coupons.code, String(code).toUpperCase().trim()), eq(coupons.isActive, 1))
    ).limit(1);

    if (couponRows.length === 0) {
      return res.status(404).json({ error: 'Coupon is invalid or deactivated.' });
    }

    const c = couponRows[0];
    const today = new Date().toISOString().split('T')[0];

    if (c.startDate > today) {
      return res.status(400).json({ error: 'This coupon is not active yet.' });
    }

    if (c.endDate < today) {
      return res.status(400).json({ error: 'This coupon has expired.' });
    }

    if (c.timesUsed >= c.usageLimit) {
      return res.status(400).json({ error: 'Coupon redemption limit has been reached.' });
    }

    if (subtotal < c.minOrderAmount) {
      return res.status(400).json({
        error: `Requires minimum order subtotal of ₹${c.minOrderAmount}.`,
      });
    }

    let discount = 0;
    if (c.type === 'PERCENTAGE') {
      discount = (subtotal * c.value) / 100;
      if (c.maxDiscount && discount > c.maxDiscount) {
        discount = c.maxDiscount;
      }
    } else {
      discount = Math.min(subtotal, c.value);
    }

    return res.json({
      valid: true,
      code: c.code,
      type: c.type,
      value: c.value,
      discountAmount: Number(discount.toFixed(2)),
      message: `Coupon "${c.code}" applied successfully!`,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to validate coupon.' });
  }
});

export default router;

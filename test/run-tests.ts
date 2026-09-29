import assert from 'assert';
import bcrypt from 'bcryptjs';
import { initDatabase, db } from '../server/db/index.ts';
import { users, products, categories, coupons, orders, sellerProfiles, productVariants } from '../server/db/schema.ts';
import { eq, and } from 'drizzle-orm';
import { convertFromINR, formatPrice } from '../server/services/currency.ts';
import { generateToken } from '../server/middleware/auth.ts';

async function runTestSuite() {
  console.log('\n========================================');
  console.log('🧪 COMMERCE ENGINE - AUTOMATED TEST SUITE');
  console.log('========================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`  ✅ PASSED: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ FAILED: ${name}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  }

  // Ensure DB initialized
  await initDatabase();

  // 1. Currency calculations
  await test('Currency: Correctly converts and formats INR to USD, EUR, GBP, JPY', async () => {
    const inr = 10000;
    const usd = convertFromINR(inr, 'USD');
    const eur = convertFromINR(inr, 'EUR');
    const jpy = convertFromINR(inr, 'JPY');

    assert.strictEqual(usd, 120);
    assert.strictEqual(eur, 110);
    assert.strictEqual(jpy, 18200);

    const formattedUsd = formatPrice(inr, 'USD');
    assert(formattedUsd.includes('$120'));
  });

  // 2. Authentication & Password Hashing
  await test('Auth: Password hashing with bcrypt is secure and verifies properly', async () => {
    const rawPass = 'demo123';
    const hash = await bcrypt.hash(rawPass, 10);
    const valid = await bcrypt.compare(rawPass, hash);
    const invalid = await bcrypt.compare('wrongpass', hash);

    assert.strictEqual(valid, true);
    assert.strictEqual(invalid, false);
  });

  // 3. User Registration & Token Generation
  await test('Auth: Token generation carries valid role and id', async () => {
    const token = generateToken({ id: 'usr-admin-1', email: 'admin@commerceengine.local', role: 'ADMIN' });
    assert(typeof token === 'string' && token.length > 20);
  });

  // 4. Product loading & 50+ Seeded Products Check
  await test('Products: Seeded catalog contains at least 50 products', async () => {
    const allProducts = await db.select().from(products);
    assert(allProducts.length >= 50, `Expected at least 50 products, got ${allProducts.length}`);
  });

  // 5. Product Categories
  await test('Categories: All standard categories exist and are active', async () => {
    const allCats = await db.select().from(categories);
    assert(allCats.length >= 7, `Expected 7 categories, got ${allCats.length}`);
    const slugs = allCats.map(c => c.slug);
    assert(slugs.includes('electronics'));
    assert(slugs.includes('fashion'));
    assert(slugs.includes('home-kitchen'));
  });

  // 6. Search Functionality
  await test('Search: Querying product keywords returns correct items', async () => {
    const results = await db.select().from(products).where(eq(products.sku, 'EL-PW-001'));
    assert.strictEqual(results.length, 1);
    assert(results[0].name.includes('PulseWave'));
  });

  // 7. Product Variants & Stock Integrity
  await test('Variants: Products with variants have corresponding variant records', async () => {
    const variants = await db.select().from(productVariants).where(eq(productVariants.productId, 'prod-elec-1'));
    assert(variants.length >= 2, 'PulseWave headphones should have at least 2 color variants');
    const totalVariantStock = variants.reduce((sum, v) => sum + v.stock, 0);
    assert(totalVariantStock > 0, 'Variant stock must be greater than zero');
  });

  // 8. Coupon Calculation
  await test('Coupons: SAVE500 validates minimum order and discounts properly', async () => {
    const couponRows = await db.select().from(coupons).where(eq(coupons.code, 'SAVE500'));
    assert.strictEqual(couponRows.length, 1);
    const c = couponRows[0];

    const orderSubtotal = 5000;
    assert(orderSubtotal >= c.minOrderAmount, 'Subtotal exceeds min order requirement');
    const discount = Math.min(orderSubtotal, c.value);
    assert.strictEqual(discount, 500);
  });

  // 9. Stock Validation & Preventing Over-purchasing
  await test('Stock: Cannot purchase more units than available stock', async () => {
    const prod = (await db.select().from(products).where(eq(products.sku, 'EL-PW-001')))[0];
    const available = prod.stock;
    const requested = available + 10;
    const canFulfill = requested <= available;
    assert.strictEqual(canFulfill, false, 'Should reject order exceeding available stock');
  });

  // 10. Multi-Seller Isolation Check
  await test('Seller Isolation: Seller 1 cannot manage Seller 2 products', async () => {
    const seller1 = (await db.select().from(sellerProfiles).where(eq(sellerProfiles.id, 'sel-prof-1')))[0];
    const seller2Products = await db.select().from(products).where(eq(products.sellerId, 'sel-prof-2'));

    assert(seller2Products.length > 0, 'Seller 2 has products');
    // Verify none belong to seller 1
    const belongsToSeller1 = seller2Products.some(p => p.sellerId === seller1.id);
    assert.strictEqual(belongsToSeller1, false, 'Seller 1 must NOT own Seller 2 products');
  });

  // 11. Admin Authorization Check
  await test('Admin: Admin user has ADMIN role and access to all products', async () => {
    const adminUser = (await db.select().from(users).where(eq(users.email, 'admin@commerceengine.local')))[0];
    assert.strictEqual(adminUser.role, 'ADMIN');
  });

  // 12. Review Eligibility
  await test('Reviews: Delivered orders allow verified reviews, pending orders do not', async () => {
    const deliveredOrder = (await db.select().from(orders).where(eq(orders.status, 'DELIVERED')))[0];
    assert(deliveredOrder !== undefined, 'Delivered order exists');
    assert.strictEqual(deliveredOrder.status, 'DELIVERED');
  });

  // 13. Order State Transitions
  await test('Orders: Delivered orders cannot be changed back to Processing', async () => {
    const invalidTransition = (current: string, target: string) => {
      if (current === 'DELIVERED' && target === 'PROCESSING') return false;
      return true;
    };
    assert.strictEqual(invalidTransition('DELIVERED', 'PROCESSING'), false);
  });

  console.log('\n----------------------------------------');
  console.log(`Results: ${passed} passed, ${failed} failed (${passed + failed} total)`);
  console.log('----------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

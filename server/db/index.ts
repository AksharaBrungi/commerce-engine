import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import bcrypt from 'bcryptjs';
import * as schema from './schema.ts';
import { DEMO_CATEGORIES, DEMO_PRODUCTS } from './seed-data.ts';

const client = createClient({
  url: 'file:commerce_engine.db',
});

export const db = drizzle(client, { schema });

export async function initDatabase(): Promise<void> {
  console.log('🔄 Initializing SQLite database schema...');

  const ddlStatements = [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'CUSTOMER',
      phone TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS seller_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      store_name TEXT NOT NULL UNIQUE,
      description TEXT,
      contact_email TEXT NOT NULL,
      contact_phone TEXT,
      status TEXT NOT NULL DEFAULT 'APPROVED',
      commission_rate REAL NOT NULL DEFAULT 10.0,
      rating REAL DEFAULT 4.8,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      image TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      seller_id TEXT NOT NULL REFERENCES seller_profiles(id),
      category_id TEXT NOT NULL REFERENCES categories(id),
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      sku TEXT NOT NULL UNIQUE,
      price REAL NOT NULL,
      discount_price REAL,
      stock INTEGER NOT NULL DEFAULT 0,
      rating REAL NOT NULL DEFAULT 0,
      review_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'APPROVED',
      is_featured INTEGER NOT NULL DEFAULT 0,
      specifications_json TEXT,
      shipping_info TEXT,
      return_info TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS product_variants (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id),
      sku TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      price REAL NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      attributes_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS product_images (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id),
      url TEXT NOT NULL,
      is_primary INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0
    );`,
    `CREATE TABLE IF NOT EXISTS inventory (
      id TEXT PRIMARY KEY,
      productId TEXT,
      product_id TEXT NOT NULL REFERENCES products(id),
      variant_id TEXT,
      available_stock INTEGER NOT NULL,
      reserved_stock INTEGER NOT NULL DEFAULT 0,
      low_stock_threshold INTEGER NOT NULL DEFAULT 5,
      updated_at TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      order_id TEXT NOT NULL,
      order_item_id TEXT NOT NULL,
      rating INTEGER NOT NULL,
      title TEXT NOT NULL,
      comment TEXT NOT NULL,
      created_at TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS wishlists (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS wishlist_items (
      id TEXT PRIMARY KEY,
      wishlist_id TEXT NOT NULL REFERENCES wishlists(id),
      product_id TEXT NOT NULL REFERENCES products(id),
      created_at TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS carts (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      guest_session_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS cart_items (
      id TEXT PRIMARY KEY,
      cart_id TEXT NOT NULL REFERENCES carts(id),
      product_id TEXT NOT NULL REFERENCES products(id),
      variant_id TEXT REFERENCES product_variants(id),
      quantity INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS addresses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      address_line1 TEXT NOT NULL,
      address_line2 TEXT,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      pincode TEXT NOT NULL,
      country TEXT NOT NULL DEFAULT 'India',
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS coupons (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL,
      value REAL NOT NULL,
      min_order_amount REAL NOT NULL DEFAULT 0,
      max_discount REAL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      usage_limit INTEGER NOT NULL DEFAULT 100,
      times_used INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS coupon_redemptions (
      id TEXT PRIMARY KEY,
      coupon_id TEXT NOT NULL REFERENCES coupons(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      order_id TEXT NOT NULL,
      discount_amount REAL NOT NULL,
      redeemed_at TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_number TEXT NOT NULL UNIQUE,
      customer_id TEXT NOT NULL REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'CONFIRMED',
      currency TEXT NOT NULL DEFAULT 'INR',
      exchange_rate REAL NOT NULL DEFAULT 1.0,
      subtotal REAL NOT NULL,
      discount REAL NOT NULL DEFAULT 0,
      shipping_fee REAL NOT NULL DEFAULT 0,
      tax REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'CASH_ON_DELIVERY',
      payment_status TEXT NOT NULL DEFAULT 'PENDING',
      shipping_address_json TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS seller_orders (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id),
      seller_id TEXT NOT NULL REFERENCES seller_profiles(id),
      suborder_number TEXT NOT NULL UNIQUE,
      subtotal REAL NOT NULL,
      discount REAL NOT NULL DEFAULT 0,
      shipping_fee REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'CONFIRMED',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id),
      seller_order_id TEXT NOT NULL REFERENCES seller_orders(id),
      product_id TEXT NOT NULL REFERENCES products(id),
      variant_id TEXT REFERENCES product_variants(id),
      product_name TEXT NOT NULL,
      variant_title TEXT,
      sku TEXT NOT NULL,
      price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      total REAL NOT NULL,
      is_reviewed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id),
      method TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      transaction_reference TEXT NOT NULL UNIQUE,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'INR',
      simulated_card_last4 TEXT,
      failure_reason TEXT,
      created_at TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS shipments (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id),
      seller_order_id TEXT REFERENCES seller_orders(id),
      tracking_number TEXT NOT NULL UNIQUE,
      carrier TEXT NOT NULL DEFAULT 'Express Logistics',
      status TEXT NOT NULL DEFAULT 'PROCESSING',
      estimated_delivery TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS shipment_events (
      id TEXT PRIMARY KEY,
      shipment_id TEXT NOT NULL REFERENCES shipments(id),
      status TEXT NOT NULL,
      location TEXT NOT NULL,
      description TEXT NOT NULL,
      event_time TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS returns (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id),
      order_item_id TEXT NOT NULL REFERENCES order_items(id),
      customer_id TEXT NOT NULL REFERENCES users(id),
      seller_id TEXT NOT NULL REFERENCES seller_profiles(id),
      reason TEXT NOT NULL,
      comments TEXT,
      status TEXT NOT NULL DEFAULT 'REQUESTED',
      requested_at TEXT NOT NULL,
      resolved_at TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS refunds (
      id TEXT PRIMARY KEY,
      return_id TEXT REFERENCES returns(id),
      order_id TEXT NOT NULL REFERENCES orders(id),
      payment_id TEXT REFERENCES payments(id),
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'INR',
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'COMPLETED',
      processed_at TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      details_json TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS ai_conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      session_id TEXT,
      title TEXT DEFAULT 'New Conversation',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS ai_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES ai_conversations(id),
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      structured_data_json TEXT,
      feedback TEXT,
      feedback_comment TEXT,
      created_at TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS ai_analytics_logs (
      id TEXT PRIMARY KEY,
      conversation_id TEXT,
      user_id TEXT,
      intent TEXT NOT NULL,
      query TEXT NOT NULL,
      tool_used TEXT,
      response_time_ms INTEGER DEFAULT 0,
      is_success INTEGER NOT NULL DEFAULT 1,
      has_products INTEGER NOT NULL DEFAULT 0,
      user_language TEXT DEFAULT 'en',
      created_at TEXT NOT NULL
    );`,
    // Indexes
    `CREATE INDEX IF NOT EXISTS idx_products_seller ON products(seller_id);`,
    `CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);`,
    `CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);`,
    `CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);`,
    `CREATE INDEX IF NOT EXISTS idx_seller_orders_seller ON seller_orders(seller_id);`,
    `CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);`,
    `CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON cart_items(cart_id);`,
    `CREATE INDEX IF NOT EXISTS idx_ai_messages_conv ON ai_messages(conversation_id);`,
    `CREATE INDEX IF NOT EXISTS idx_ai_analytics_created ON ai_analytics_logs(created_at);`,
  ];

  for (const sql of ddlStatements) {
    await client.execute(sql);
  }

  // Check if database is already seeded
  const userCountResult = await client.execute('SELECT COUNT(*) as count FROM users');
  const userCount = Number(userCountResult.rows[0].count);

  const now = new Date().toISOString();
  const sellerProfileIds = ['sel-prof-1', 'sel-prof-2', 'sel-prof-3'];
  const categoryMap: Record<string, string> = {
    'electronics': 'cat-electronics',
    'fashion': 'cat-fashion',
    'home-kitchen': 'cat-home',
    'beauty': 'cat-beauty',
    'sports': 'cat-sports',
    'books': 'cat-books',
    'accessories': 'cat-accessories',
  };

  // Helper to ensure a product exists
  const syncProduct = async (p: (typeof DEMO_PRODUCTS)[0]) => {
    const existing = await client.execute({
      sql: 'SELECT id FROM products WHERE id = ?',
      args: [p.id],
    });
    if (existing.rows.length === 0) {
      const sellerId = sellerProfileIds[p.sellerIndex] || 'sel-prof-1';
      const categoryId = categoryMap[p.categorySlug] || 'cat-electronics';
      await client.execute({
        sql: `INSERT INTO products (id, seller_id, category_id, name, slug, description, sku, price, discount_price, stock, rating, review_count, status, is_featured, specifications_json, shipping_info, return_info, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'APPROVED', ?, ?, ?, ?, ?, ?)`,
        args: [
          p.id,
          sellerId,
          categoryId,
          p.name,
          p.slug,
          p.description,
          p.sku,
          p.price,
          p.discountPrice || null,
          p.stock,
          p.rating,
          p.reviewCount,
          p.isFeatured ? 1 : 0,
          JSON.stringify(p.specifications),
          p.shippingInfo,
          p.returnInfo,
          now,
          now,
        ],
      });

      for (let i = 0; i < p.images.length; i++) {
        await client.execute({
          sql: `INSERT INTO product_images (id, product_id, url, is_primary, sort_order) VALUES (?, ?, ?, ?, ?)`,
          args: [`img-${p.id}-${i}`, p.id, p.images[i], i === 0 ? 1 : 0, i],
        });
      }

      if (p.variants && p.variants.length > 0) {
        for (const v of p.variants) {
          const variantId = `var-${v.sku.toLowerCase()}`;
          await client.execute({
            sql: `INSERT INTO product_variants (id, product_id, sku, title, price, stock, attributes_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [variantId, p.id, v.sku, v.title, v.price, v.stock, JSON.stringify(v.attributes), now],
          });
          await client.execute({
            sql: `INSERT INTO inventory (id, product_id, variant_id, available_stock, reserved_stock, low_stock_threshold, updated_at) VALUES (?, ?, ?, ?, 0, 5, ?)`,
            args: [`inv-${variantId}`, p.id, variantId, v.stock, now],
          });
        }
      } else {
        await client.execute({
          sql: `INSERT INTO inventory (id, product_id, variant_id, available_stock, reserved_stock, low_stock_threshold, updated_at) VALUES (?, ?, NULL, ?, 0, 5, ?)`,
          args: [`inv-${p.id}`, p.id, p.stock, now],
        });
      }
    }
  };

  if (userCount > 0) {
    console.log(`✅ Database ready. Found ${userCount} existing users. Syncing demo catalog products...`);
    for (const p of DEMO_PRODUCTS) {
      await syncProduct(p);
    }
    return;
  }

  console.log('🌱 Seeding demo data into fresh SQLite database...');

  const demoPasswordHash = await bcrypt.hash('demo123', 10);

  // 1. Insert Users & Sellers
  const adminId = 'usr-admin-1';
  const seller1UserId = 'usr-seller-1';
  const seller2UserId = 'usr-seller-2';
  const seller3UserId = 'usr-seller-3';
  const customer1Id = 'usr-cust-1';
  const customer2Id = 'usr-cust-2';
  const pendingSellerUserId = 'usr-seller-pending';

  await client.execute({
    sql: `INSERT INTO users (id, email, password_hash, name, role, phone, created_at, updated_at) VALUES 
      (?, 'admin@commerceengine.local', ?, 'Marketplace Administrator', 'ADMIN', '+91 9999900000', ?, ?),
      (?, 'seller1@commerceengine.local', ?, 'Alex Vance (Apex Tech)', 'SELLER', '+91 9999911111', ?, ?),
      (?, 'seller2@commerceengine.local', ?, 'Elena Rostova (Urban Thread)', 'SELLER', '+91 9999922222', ?, ?),
      (?, 'seller3@commerceengine.local', ?, 'Marcus Sterling (Luxe Living)', 'SELLER', '+91 9999933333', ?, ?),
      (?, 'seller_pending@commerceengine.local', ?, 'Sarah Lin (EcoVibe Goods)', 'SELLER', '+91 9999944444', ?, ?),
      (?, 'customer@commerceengine.local', ?, 'John Doe', 'CUSTOMER', '+91 9876543210', ?, ?),
      (?, 'customer2@commerceengine.local', ?, 'Sarah Jenkins', 'CUSTOMER', '+91 9876543211', ?, ?)`,
    args: [
      adminId, demoPasswordHash, now, now,
      seller1UserId, demoPasswordHash, now, now,
      seller2UserId, demoPasswordHash, now, now,
      seller3UserId, demoPasswordHash, now, now,
      pendingSellerUserId, demoPasswordHash, now, now,
      customer1Id, demoPasswordHash, now, now,
      customer2Id, demoPasswordHash, now, now,
    ],
  });

  // Seller profiles
  const sellerProfile1Id = 'sel-prof-1';
  const sellerProfile2Id = 'sel-prof-2';
  const sellerProfile3Id = 'sel-prof-3';
  const pendingSellerProfileId = 'sel-prof-pending';

  await client.execute({
    sql: `INSERT INTO seller_profiles (id, user_id, store_name, description, contact_email, contact_phone, status, commission_rate, rating, created_at, updated_at) VALUES 
      (?, ?, 'Apex Tech & Electronics', 'Flagship audio gear, high-performance laptops, and next-gen personal computing accessories.', 'support@apextech.local', '+91 9999911111', 'APPROVED', 8.5, 4.9, ?, ?),
      (?, ?, 'Urban Thread Apparel', 'Sustainable luxury fashion, selvedge denim, merino knitwear, and classic footwear.', 'orders@urbanthread.local', '+91 9999922222', 'APPROVED', 12.0, 4.8, ?, ?),
      (?, ?, 'Luxe Living & Home', 'Artisanal kitchenware, specialty coffee tools, and minimalist home design essentials.', 'concierge@luxeliving.local', '+91 9999933333', 'APPROVED', 10.0, 4.9, ?, ?),
      (?, ?, 'EcoVibe Handcrafted Goods', 'Zero-waste lifestyle items, organic cork accessories, and artisan ceramics.', 'hello@ecovibe.local', '+91 9999944444', 'PENDING', 10.0, 5.0, ?, ?)`,
    args: [
      sellerProfile1Id, seller1UserId, now, now,
      sellerProfile2Id, seller2UserId, now, now,
      sellerProfile3Id, seller3UserId, now, now,
      pendingSellerProfileId, pendingSellerUserId, now, now,
    ],
  });

  // 2. Insert Categories
  for (const cat of DEMO_CATEGORIES) {
    await client.execute({
      sql: `INSERT INTO categories (id, name, slug, description, image, is_active, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)`,
      args: [cat.id, cat.name, cat.slug, cat.description, cat.image, now],
    });
  }

  // 3. Insert Products, Images, Variants & Inventory
  for (const p of DEMO_PRODUCTS) {
    const sellerId = sellerProfileIds[p.sellerIndex];
    const categoryId = categoryMap[p.categorySlug];

    await client.execute({
      sql: `INSERT INTO products (id, seller_id, category_id, name, slug, description, sku, price, discount_price, stock, rating, review_count, status, is_featured, specifications_json, shipping_info, return_info, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'APPROVED', ?, ?, ?, ?, ?, ?)`,
      args: [
        p.id,
        sellerId,
        categoryId,
        p.name,
        p.slug,
        p.description,
        p.sku,
        p.price,
        p.discountPrice || null,
        p.stock,
        p.rating,
        p.reviewCount,
        p.isFeatured ? 1 : 0,
        JSON.stringify(p.specifications),
        p.shippingInfo,
        p.returnInfo,
        now,
        now,
      ],
    });

    // Product Images
    for (let i = 0; i < p.images.length; i++) {
      await client.execute({
        sql: `INSERT INTO product_images (id, product_id, url, is_primary, sort_order) VALUES (?, ?, ?, ?, ?)`,
        args: [`img-${p.id}-${i}`, p.id, p.images[i], i === 0 ? 1 : 0, i],
      });
    }

    // Product Variants
    if (p.variants && p.variants.length > 0) {
      for (const v of p.variants) {
        const variantId = `var-${v.sku.toLowerCase()}`;
        await client.execute({
          sql: `INSERT INTO product_variants (id, product_id, sku, title, price, stock, attributes_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [variantId, p.id, v.sku, v.title, v.price, v.stock, JSON.stringify(v.attributes), now],
        });

        // Inventory entry per variant
        await client.execute({
          sql: `INSERT INTO inventory (id, product_id, variant_id, available_stock, reserved_stock, low_stock_threshold, updated_at) VALUES (?, ?, ?, ?, 0, 5, ?)`,
          args: [`inv-${variantId}`, p.id, variantId, v.stock, now],
        });
      }
    } else {
      // General inventory entry
      await client.execute({
        sql: `INSERT INTO inventory (id, product_id, variant_id, available_stock, reserved_stock, low_stock_threshold, updated_at) VALUES (?, ?, NULL, ?, 0, 5, ?)`,
        args: [`inv-${p.id}`, p.id, p.stock, now],
      });
    }
  }

  // 4. Insert Demo Coupons
  const demoCoupons = [
    { id: 'c-save500', code: 'SAVE500', type: 'FIXED', value: 500, minOrder: 2000, maxDisc: 500 },
    { id: 'c-welcome10', code: 'WELCOME10', type: 'PERCENTAGE', value: 10, minOrder: 1000, maxDisc: 1500 },
    { id: 'c-mega50', code: 'MEGA50', type: 'PERCENTAGE', value: 50, minOrder: 5000, maxDisc: 3000 },
    { id: 'c-freeship', code: 'FREESHIP', type: 'FIXED', value: 150, minOrder: 999, maxDisc: 150 },
  ];

  for (const c of demoCoupons) {
    await client.execute({
      sql: `INSERT INTO coupons (id, code, type, value, min_order_amount, max_discount, start_date, end_date, usage_limit, times_used, is_active, created_at)
            VALUES (?, ?, ?, ?, ?, ?, '2025-01-01', '2030-12-31', 500, 0, 1, ?)`,
      args: [c.id, c.code, c.type, c.value, c.minOrder, c.maxDisc, now],
    });
  }

  // 5. Insert Customer Addresses
  await client.execute({
    sql: `INSERT INTO addresses (id, user_id, full_name, phone, address_line1, address_line2, city, state, pincode, country, is_default, created_at) VALUES
      ('addr-1', ?, 'John Doe', '+91 9876543210', 'Flat 402, Skyline Residency', 'Koramangala 4th Block', 'Bengaluru', 'Karnataka', '560034', 'India', 1, ?),
      ('addr-2', ?, 'John Doe (Work)', '+91 9876543210', 'Level 3, Tech Park Towers', 'Outer Ring Road, Bellandur', 'Bengaluru', 'Karnataka', '560103', 'India', 0, ?)`,
    args: [customer1Id, now, customer1Id, now],
  });

  // 6. Insert Sample Delivered Order for customer1
  const sampleOrderId = 'ord-demo-001';
  const sampleSellerOrderId = 'sord-demo-001';
  const sampleOrderItemId = 'oit-demo-001';
  const sampleShipmentId = 'shp-demo-001';

  await client.execute({
    sql: `INSERT INTO orders (id, order_number, customer_id, status, currency, exchange_rate, subtotal, discount, shipping_fee, tax, total, payment_method, payment_status, shipping_address_json, notes, created_at, updated_at)
          VALUES (?, 'ORD-2026-8841', ?, 'DELIVERED', 'INR', 1.0, 15499, 500, 0, 1349.91, 16348.91, 'DEMO_CARD', 'PAID', ?, 'Please leave at front door', '2026-09-10T14:30:00.000Z', '2026-09-13T10:15:00.000Z')`,
    args: [
      sampleOrderId,
      customer1Id,
      JSON.stringify({
        fullName: 'John Doe',
        phone: '+91 9876543210',
        addressLine1: 'Flat 402, Skyline Residency',
        addressLine2: 'Koramangala 4th Block',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560034',
        country: 'India',
      }),
    ],
  });

  await client.execute({
    sql: `INSERT INTO seller_orders (id, order_id, seller_id, suborder_number, subtotal, discount, shipping_fee, total, status, created_at, updated_at)
          VALUES (?, ?, ?, 'SUB-2026-8841-A', 15499, 500, 0, 14999, 'DELIVERED', '2026-09-10T14:30:00.000Z', '2026-09-13T10:15:00.000Z')`,
    args: [sampleSellerOrderId, sampleOrderId, sellerProfile1Id],
  });

  await client.execute({
    sql: `INSERT INTO order_items (id, order_id, seller_order_id, product_id, variant_id, product_name, variant_title, sku, price, quantity, total, is_reviewed, created_at)
          VALUES (?, ?, ?, 'prod-elec-1', 'var-el-pw-001-blk', 'PulseWave Pro Wireless ANC Headphones', 'Matte Onyx Black', 'EL-PW-001-BLK', 15499, 1, 15499, 1, '2026-09-10T14:30:00.000Z')`,
    args: [sampleOrderItemId, sampleOrderId, sampleSellerOrderId],
  });

  await client.execute({
    sql: `INSERT INTO payments (id, order_id, method, status, transaction_reference, amount, currency, simulated_card_last4, created_at)
          VALUES ('pay-demo-001', ?, 'DEMO_CARD', 'PAID', 'TXN-DEMO-991204', 16348.91, 'INR', '4242', '2026-09-10T14:30:05.000Z')`,
    args: [sampleOrderId],
  });

  await client.execute({
    sql: `INSERT INTO shipments (id, order_id, seller_order_id, tracking_number, carrier, status, estimated_delivery, created_at, updated_at)
          VALUES (?, ?, ?, 'TRK-CE-9928172', 'Express Air Cargo', 'DELIVERED', '2026-09-13', '2026-09-10T16:00:00.000Z', '2026-09-13T10:15:00.000Z')`,
    args: [sampleShipmentId, sampleOrderId, sampleSellerOrderId],
  });

  await client.execute({
    sql: `INSERT INTO shipment_events (id, shipment_id, status, location, description, event_time) VALUES
      ('evt-1', ?, 'CONFIRMED', 'Bengaluru Fulfillment Center', 'Order verified and packed by seller', '2026-09-10T16:30:00.000Z'),
      ('evt-2', ?, 'SHIPPED', 'Bengaluru Air Sorting Hub', 'Dispatched for last-mile transit', '2026-09-11T09:15:00.000Z'),
      ('evt-3', ?, 'OUT_FOR_DELIVERY', 'Koramangala Delivery Station', 'Out for delivery with courier partner', '2026-09-13T08:00:00.000Z'),
      ('evt-4', ?, 'DELIVERED', 'Customer Address', 'Package delivered and signed by John Doe', '2026-09-13T10:15:00.000Z')`,
    args: [sampleShipmentId, sampleShipmentId, sampleShipmentId, sampleShipmentId],
  });

  // 7. Insert Verified Customer Review
  await client.execute({
    sql: `INSERT INTO reviews (id, product_id, user_id, order_id, order_item_id, rating, title, comment, created_at)
          VALUES ('rev-001', 'prod-elec-1', ?, ?, ?, 5, 'Superb Soundstage and ANC', 'The noise cancellation completely blocks airplane cabin noise. Battery lasted through an entire week of daily work meetings. Highly recommended!', '2026-09-14T11:00:00.000Z')`,
    args: [customer1Id, sampleOrderId, sampleOrderItemId],
  });

  // 8. Wishlist for customer
  const wishlistId = 'wsh-cust-1';
  await client.execute({
    sql: `INSERT INTO wishlists (id, user_id, created_at) VALUES (?, ?, ?)`,
    args: [wishlistId, customer1Id, now],
  });
  await client.execute({
    sql: `INSERT INTO wishlist_items (id, wishlist_id, product_id, created_at) VALUES 
      ('wshi-1', ?, 'prod-fash-1', ?),
      ('wshi-2', ?, 'prod-home-1', ?)`,
    args: [wishlistId, now, wishlistId, now],
  });

  console.log('✅ Demo data successfully seeded:');
  console.log('   - 1 Admin: admin@commerceengine.local (Password: demo123)');
  console.log('   - 3 Active Sellers: seller1@..., seller2@..., seller3@...');
  console.log('   - 1 Pending Seller application for testing moderation');
  console.log('   - 2 Customers: customer@..., customer2@...');
  console.log(`   - ${DEMO_PRODUCTS.length} Seeded Products across 7 categories`);
  console.log('   - Coupons: SAVE500, WELCOME10, MEGA50, FREESHIP');
}

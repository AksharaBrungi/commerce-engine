import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: text('role').notNull().default('CUSTOMER'), // 'CUSTOMER' | 'SELLER' | 'ADMIN'
  phone: text('phone'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const sellerProfiles = sqliteTable('seller_profiles', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  storeName: text('store_name').notNull().unique(),
  description: text('description'),
  contactEmail: text('contact_email').notNull(),
  contactPhone: text('contact_phone'),
  status: text('status').notNull().default('APPROVED'), // 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED'
  commissionRate: real('commission_rate').notNull().default(10.0),
  rating: real('rating').default(4.8),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  image: text('image'),
  isActive: integer('is_active').notNull().default(1),
  createdAt: text('created_at').notNull(),
});

export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  sellerId: text('seller_id').notNull().references(() => sellerProfiles.id),
  categoryId: text('category_id').notNull().references(() => categories.id),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description').notNull(),
  sku: text('sku').notNull().unique(),
  price: real('price').notNull(), // Base price in INR
  discountPrice: real('discount_price'),
  stock: integer('stock').notNull().default(0),
  rating: real('rating').notNull().default(0),
  reviewCount: integer('review_count').notNull().default(0),
  status: text('status').notNull().default('APPROVED'), // 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'ARCHIVED'
  isFeatured: integer('is_featured').notNull().default(0),
  specificationsJson: text('specifications_json'), // JSON string: { "Brand": "...", "Warranty": "..." }
  shippingInfo: text('shipping_info'),
  returnInfo: text('return_info'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const productVariants = sqliteTable('product_variants', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull().references(() => products.id),
  sku: text('sku').notNull().unique(),
  title: text('title').notNull(), // e.g. "Space Black / 256GB" or "Navy Blue / Large"
  price: real('price').notNull(),
  stock: integer('stock').notNull().default(0),
  attributesJson: text('attributes_json').notNull(), // JSON: { "Color": "Black", "Size": "L" }
  createdAt: text('created_at').notNull(),
});

export const productImages = sqliteTable('product_images', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull().references(() => products.id),
  url: text('url').notNull(),
  isPrimary: integer('is_primary').notNull().default(0),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const inventory = sqliteTable('inventory', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull().references(() => products.id),
  variantId: text('variant_id'),
  availableStock: integer('available_stock').notNull(),
  reservedStock: integer('reserved_stock').notNull().default(0),
  lowStockThreshold: integer('low_stock_threshold').notNull().default(5),
  updatedAt: text('updated_at').notNull(),
});

export const reviews = sqliteTable('reviews', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull().references(() => products.id),
  userId: text('user_id').notNull().references(() => users.id),
  orderId: text('order_id').notNull(),
  orderItemId: text('order_item_id').notNull(),
  rating: integer('rating').notNull(), // 1 - 5
  title: text('title').notNull(),
  comment: text('comment').notNull(),
  createdAt: text('created_at').notNull(),
});

export const wishlists = sqliteTable('wishlists', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  createdAt: text('created_at').notNull(),
});

export const wishlistItems = sqliteTable('wishlist_items', {
  id: text('id').primaryKey(),
  wishlistId: text('wishlist_id').notNull().references(() => wishlists.id),
  productId: text('product_id').notNull().references(() => products.id),
  createdAt: text('created_at').notNull(),
});

export const carts = sqliteTable('carts', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  guestSessionId: text('guest_session_id'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const cartItems = sqliteTable('cart_items', {
  id: text('id').primaryKey(),
  cartId: text('cart_id').notNull().references(() => carts.id),
  productId: text('product_id').notNull().references(() => products.id),
  variantId: text('variant_id').references(() => productVariants.id),
  quantity: integer('quantity').notNull().default(1),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const addresses = sqliteTable('addresses', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  fullName: text('full_name').notNull(),
  phone: text('phone').notNull(),
  addressLine1: text('address_line1').notNull(),
  addressLine2: text('address_line2'),
  city: text('city').notNull(),
  state: text('state').notNull(),
  pincode: text('pincode').notNull(),
  country: text('country').notNull().default('India'),
  isDefault: integer('is_default').notNull().default(0),
  createdAt: text('created_at').notNull(),
});

export const coupons = sqliteTable('coupons', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  type: text('type').notNull(), // 'PERCENTAGE' | 'FIXED'
  value: real('value').notNull(),
  minOrderAmount: real('min_order_amount').notNull().default(0),
  maxDiscount: real('max_discount'),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  usageLimit: integer('usage_limit').notNull().default(100),
  timesUsed: integer('times_used').notNull().default(0),
  isActive: integer('is_active').notNull().default(1),
  createdAt: text('created_at').notNull(),
});

export const couponRedemptions = sqliteTable('coupon_redemptions', {
  id: text('id').primaryKey(),
  couponId: text('coupon_id').notNull().references(() => coupons.id),
  userId: text('user_id').notNull().references(() => users.id),
  orderId: text('order_id').notNull(),
  discountAmount: real('discount_amount').notNull(),
  redeemedAt: text('redeemed_at').notNull(),
});

export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  orderNumber: text('order_number').notNull().unique(),
  customerId: text('customer_id').notNull().references(() => users.id),
  status: text('status').notNull().default('CONFIRMED'),
  // 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED' | 'RETURN_REQUESTED' | 'RETURNED' | 'REFUNDED'
  currency: text('currency').notNull().default('INR'),
  exchangeRate: real('exchange_rate').notNull().default(1.0),
  subtotal: real('subtotal').notNull(),
  discount: real('discount').notNull().default(0),
  shippingFee: real('shipping_fee').notNull().default(0),
  tax: real('tax').notNull().default(0),
  total: real('total').notNull(),
  paymentMethod: text('payment_method').notNull().default('CASH_ON_DELIVERY'), // 'CASH_ON_DELIVERY' | 'DEMO_CARD'
  paymentStatus: text('payment_status').notNull().default('PENDING'), // 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'
  shippingAddressJson: text('shipping_address_json').notNull(),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const sellerOrders = sqliteTable('seller_orders', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull().references(() => orders.id),
  sellerId: text('seller_id').notNull().references(() => sellerProfiles.id),
  suborderNumber: text('suborder_number').notNull().unique(),
  subtotal: real('subtotal').notNull(),
  discount: real('discount').notNull().default(0),
  shippingFee: real('shipping_fee').notNull().default(0),
  total: real('total').notNull(),
  status: text('status').notNull().default('CONFIRMED'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const orderItems = sqliteTable('order_items', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull().references(() => orders.id),
  sellerOrderId: text('seller_order_id').notNull().references(() => sellerOrders.id),
  productId: text('product_id').notNull().references(() => products.id),
  variantId: text('variant_id').references(() => productVariants.id),
  productName: text('product_name').notNull(),
  variantTitle: text('variant_title'),
  sku: text('sku').notNull(),
  price: real('price').notNull(),
  quantity: integer('quantity').notNull(),
  total: real('total').notNull(),
  isReviewed: integer('is_reviewed').notNull().default(0),
  createdAt: text('created_at').notNull(),
});

export const payments = sqliteTable('payments', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull().references(() => orders.id),
  method: text('method').notNull(),
  status: text('status').notNull().default('PENDING'), // 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'
  transactionReference: text('transaction_reference').notNull().unique(),
  amount: real('amount').notNull(),
  currency: text('currency').notNull().default('INR'),
  simulatedCardLast4: text('simulated_card_last4'),
  failureReason: text('failure_reason'),
  createdAt: text('created_at').notNull(),
});

export const shipments = sqliteTable('shipments', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull().references(() => orders.id),
  sellerOrderId: text('seller_order_id').references(() => sellerOrders.id),
  trackingNumber: text('tracking_number').notNull().unique(),
  carrier: text('carrier').notNull().default('Express Logistics'),
  status: text('status').notNull().default('PROCESSING'),
  estimatedDelivery: text('estimated_delivery'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const shipmentEvents = sqliteTable('shipment_events', {
  id: text('id').primaryKey(),
  shipmentId: text('shipment_id').notNull().references(() => shipments.id),
  status: text('status').notNull(),
  location: text('location').notNull(),
  description: text('description').notNull(),
  eventTime: text('event_time').notNull(),
});

export const returns = sqliteTable('returns', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull().references(() => orders.id),
  orderItemId: text('order_item_id').notNull().references(() => orderItems.id),
  customerId: text('customer_id').notNull().references(() => users.id),
  sellerId: text('seller_id').notNull().references(() => sellerProfiles.id),
  reason: text('reason').notNull(),
  comments: text('comments'),
  status: text('status').notNull().default('REQUESTED'), // 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'ITEM_RECEIVED' | 'REFUNDED'
  requestedAt: text('requested_at').notNull(),
  resolvedAt: text('resolved_at'),
});

export const refunds = sqliteTable('refunds', {
  id: text('id').primaryKey(),
  returnId: text('return_id').references(() => returns.id),
  orderId: text('order_id').notNull().references(() => orders.id),
  paymentId: text('payment_id').references(() => payments.id),
  amount: real('amount').notNull(),
  currency: text('currency').notNull().default('INR'),
  reason: text('reason').notNull(),
  status: text('status').notNull().default('COMPLETED'),
  processedAt: text('processed_at').notNull(),
});

export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  detailsJson: text('details_json'),
  ipAddress: text('ip_address'),
  createdAt: text('created_at').notNull(),
});

export const aiConversations = sqliteTable('ai_conversations', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  sessionId: text('session_id'),
  title: text('title').default('New Conversation'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const aiMessages = sqliteTable('ai_messages', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').notNull().references(() => aiConversations.id),
  role: text('role').notNull(), // 'user' | 'assistant' | 'system'
  content: text('content').notNull(),
  structuredDataJson: text('structured_data_json'), // JSON string: { products: [], citations: [], actions: [] }
  feedback: text('feedback'), // 'positive' | 'negative'
  feedbackComment: text('feedback_comment'),
  createdAt: text('created_at').notNull(),
});

export const aiAnalyticsLogs = sqliteTable('ai_analytics_logs', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id'),
  userId: text('user_id'),
  intent: text('intent').notNull(), // 'PRODUCT_SEARCH' | 'PRODUCT_RECOMMENDATION' | 'STOCK_CHECK' etc.
  query: text('query').notNull(),
  toolUsed: text('tool_used'),
  responseTimeMs: integer('response_time_ms').default(0),
  isSuccess: integer('is_success').notNull().default(1),
  hasProducts: integer('has_products').notNull().default(0),
  userLanguage: text('user_language').default('en'),
  createdAt: text('created_at').notNull(),
});

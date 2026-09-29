import { db } from '../db/index.ts';
import {
  products,
  categories,
  sellerProfiles,
  productImages,
  productVariants,
  orders,
  orderItems,
  shipments,
  shipmentEvents,
  payments,
  carts,
  cartItems,
  coupons,
} from '../db/schema.ts';
import { eq, and, sql, or, like, desc, asc, gte, lte } from 'drizzle-orm';

export interface ProductSearchResult {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  seller: string;
  price: number;
  discountPrice: number | null;
  stock: number;
  rating: number;
  reviewCount: number;
  image: string;
  sku: string;
  specifications: Record<string, string>;
  hasVariants: boolean;
}

export const AI_TOOL_DEFINITIONS = [
  {
    name: 'search_products',
    description: 'Search, discover, and filter products in the Commerce Engine marketplace using natural language, keywords, categories, price range, ratings, and stock status.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'Search keywords (e.g. "laptop", "coding laptop", "shoes", "wireless headphones", "phone")' },
        category: { type: 'STRING', description: 'Category name or slug (e.g. "Electronics", "Fashion", "Home & Kitchen", "Sports")' },
        minPrice: { type: 'NUMBER', description: 'Minimum price in INR' },
        maxPrice: { type: 'NUMBER', description: 'Maximum price in INR' },
        minRating: { type: 'NUMBER', description: 'Minimum star rating (1 to 5)' },
        inStockOnly: { type: 'BOOLEAN', description: 'Whether to show only products currently in stock' },
        limit: { type: 'INTEGER', description: 'Number of products to return (default 4, max 8)' },
        sort: { type: 'STRING', description: 'Sort criteria: "rating", "price_asc", "price_desc", "newest"' },
      },
    },
  },
  {
    name: 'compare_products',
    description: 'Compare 2 to 3 products side-by-side using authoritative database specifications, price, rating, processor, RAM, storage, display, battery, and stock.',
    parameters: {
      type: 'OBJECT',
      properties: {
        productIdentifiers: {
          type: 'ARRAY',
          items: { type: 'STRING' },
          description: 'List of product names, IDs, or search category terms (e.g. ["AeroBook Ultra", "ZenithBook Pro"] or ["top laptops"])',
        },
      },
      required: ['productIdentifiers'],
    },
  },
  {
    name: 'get_product_details',
    description: 'Retrieve complete factual details of a specific product including specifications, variants, pricing, stock, seller, and ratings.',
    parameters: {
      type: 'OBJECT',
      properties: {
        productIdOrName: { type: 'STRING', description: 'The product ID, slug, or product name' },
      },
      required: ['productIdOrName'],
    },
  },
  {
    name: 'check_product_availability',
    description: 'Check real-time stock availability and inventory counts for a product or variant without guessing.',
    parameters: {
      type: 'OBJECT',
      properties: {
        productIdOrName: { type: 'STRING', description: 'Product ID or name' },
        variantTitle: { type: 'STRING', description: 'Optional variant title (e.g. "256GB / Space Black")' },
      },
      required: ['productIdOrName'],
    },
  },
  {
    name: 'get_categories',
    description: 'Get all marketplace product categories with their descriptions and item counts.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'get_shipping_policy',
    description: 'Get official Commerce Engine shipping timelines, delivery options, costs, and tracking details.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'get_return_policy',
    description: 'Get official Commerce Engine return, replacement, and refund policies by category.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'get_my_orders',
    description: 'Retrieve order history for the authenticated customer. Strictly ownership-protected.',
    parameters: {
      type: 'OBJECT',
      properties: {
        limit: { type: 'INTEGER', description: 'Number of orders to retrieve (default 5)' },
      },
    },
  },
  {
    name: 'get_my_order_details',
    description: 'Retrieve detailed tracking information, courier checkpoint events, and items for a customer order.',
    parameters: {
      type: 'OBJECT',
      properties: {
        orderNumberOrId: { type: 'STRING', description: 'Order number (e.g. "ORD-123456") or order ID' },
      },
      required: ['orderNumberOrId'],
    },
  },
  {
    name: 'check_return_eligibility',
    description: 'Check if an order is eligible for return according to the 15-day return policy.',
    parameters: {
      type: 'OBJECT',
      properties: {
        orderNumberOrId: { type: 'STRING', description: 'Order number or ID to inspect' },
      },
      required: ['orderNumberOrId'],
    },
  },
  {
    name: 'get_cart',
    description: 'Check items, quantities, and subtotal in the customer shopping cart.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'get_active_coupons',
    description: 'Find active discount promo codes and coupons available to save money on purchases.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
];

/**
 * Execute tool logic against SQLite database
 */
export async function executeTool(
  toolName: string,
  args: any,
  context: { userId?: string; guestSessionId?: string }
): Promise<any> {
  switch (toolName) {
    case 'search_products':
      return await searchProductsTool(args);
    case 'compare_products':
      return await compareProductsTool(args.productIdentifiers);
    case 'get_product_details':
      return await getProductDetailsTool(args.productIdOrName);
    case 'check_product_availability':
      return await checkProductAvailabilityTool(args.productIdOrName, args.variantTitle);
    case 'get_categories':
      return await getCategoriesTool();
    case 'get_shipping_policy':
      return getShippingPolicyTool();
    case 'get_return_policy':
      return getReturnPolicyTool();
    case 'get_my_orders':
      return await getMyOrdersTool(context.userId, args.limit);
    case 'get_my_order_details':
      return await getMyOrderDetailsTool(context.userId, args.orderNumberOrId);
    case 'check_return_eligibility':
      return await checkReturnEligibilityTool(context.userId, args.orderNumberOrId);
    case 'get_cart':
      return await getCartTool(context.userId, context.guestSessionId);
    case 'get_active_coupons':
      return await getActiveCouponsTool();
    default:
      return { error: `Tool ${toolName} not found.` };
  }
}

/**
 * Normalize and stem search query words
 */
function normalizeTokens(query: string): string[] {
  const clean = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();

  const stopWords = new Set([
    'show', 'me', 'find', 'get', 'give', 'do', 'you', 'have', 'the', 'a', 'an', 'and', 'or',
    'for', 'with', 'in', 'of', 'at', 'by', 'under', 'below', 'less', 'than', 'more', 'over',
    'above', 'please', 'tell', 'about', 'recommend', 'suggest', 'best', 'top', 'cheap', 'good',
    'latest', 'new', 'all', 'any', 'some', 'products', 'product', 'items', 'item', 'kavali',
    'chahiye', 'undhi', 'undha', 'entha', 'hai', 'kaise', 'kya', 'naaku', 'andar', 'lopala',
    'compare', 'comparison', 'vs', 'versus', 'between', 'rs', 'inr', 'rupees', 'buck', 'bucks',
    'is', 'are', 'which', 'what', 'who', 'how', 'much', 'many', 'does', 'cost', 'price', 'pricing'
  ]);

  const rawTokens = clean.split(/\s+/).filter((t) => t.length > 0 && !stopWords.has(t) && !/^\d+k?$/.test(t));
  const stems: string[] = [];

  for (const t of rawTokens) {
    stems.push(t);
    // Simple English singular stems
    if (t.endsWith('s') && t.length > 3 && !t.endsWith('ss')) {
      stems.push(t.slice(0, -1));
    }
    if (t.endsWith('ies') && t.length > 4) {
      stems.push(t.slice(0, -3) + 'y');
    }
    if (t === 'laptops' || t === 'laptop') stems.push('laptop', 'devbook', 'aerobook', 'zenithbook');
    if (t === 'phones' || t === 'phone' || t === 'mobile' || t === 'mobiles') stems.push('phone', 'smartphone', 'zenith');
    if (t === 'headphones' || t === 'headphone') stems.push('headphone', 'earbuds', 'pulsewave', 'aerotune');
    if (t === 'shoes' || t === 'shoe' || t === 'sneakers' || t === 'sneaker') stems.push('shoe', 'sneaker', 'boots', 'chelsea');
    if (t === 'watches' || t === 'watch') stems.push('watch', 'timepiece', 'chronograph');
    if (t === 'shirts' || t === 'shirt' || t === 'tshirts' || t === 'tshirt') stems.push('shirt', 'tee', 'knit');
    if (t === 'coding' || t === 'developer' || t === 'programmer' || t === 'programming') stems.push('dev', 'devbook', 'ram');
    if (t === 'gaming' || t === 'gamer') stems.push('rtx', '144hz', 'gpu', 'graphics');
  }

  return Array.from(new Set(stems));
}

/**
 * Robust Product Search and Catalog Discovery
 */
export async function searchProductsTool(args: {
  query?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  inStockOnly?: boolean;
  limit?: number;
  sort?: string;
}) {
  const { query, category, minPrice, maxPrice, minRating, inStockOnly, limit = 4, sort } = args;

  // 1. Fetch all approved products with category and seller info
  const allProds = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      description: products.description,
      categoryId: products.categoryId,
      sellerId: products.sellerId,
      price: products.price,
      discountPrice: products.discountPrice,
      stock: products.stock,
      rating: products.rating,
      reviewCount: products.reviewCount,
      sku: products.sku,
      specificationsJson: products.specificationsJson,
      isFeatured: products.isFeatured,
      createdAt: products.createdAt,
    })
    .from(products)
    .where(eq(products.status, 'APPROVED'));

  // 2. Fetch categories and sellers for lookups
  const allCategories = await db.select().from(categories);
  const allSellers = await db.select().from(sellerProfiles);
  const catMap = new Map(allCategories.map((c) => [c.id, c]));
  const sellerMap = new Map(allSellers.map((s) => [s.id, s]));

  // 3. Extract search tokens
  const tokens = query ? normalizeTokens(query) : [];

  // Check if query refers directly to a category (e.g. "electronics", "fashion", "shoes", "kitchen")
  let targetCatId: string | undefined;
  if (category) {
    const cMatch = allCategories.find(
      (c) => c.slug.toLowerCase() === category.toLowerCase() || c.name.toLowerCase().includes(category.toLowerCase())
    );
    if (cMatch) targetCatId = cMatch.id;
  }

  // 4. Score and filter products
  const scoredProducts: Array<{ product: typeof allProds[0]; score: number; effectivePrice: number }> = [];

  for (const p of allProds) {
    const cat = catMap.get(p.categoryId);
    const seller = sellerMap.get(p.sellerId);
    const effectivePrice = p.discountPrice || p.price;

    // Filter by category
    if (targetCatId && p.categoryId !== targetCatId) {
      continue;
    }

    // Filter by price
    if (minPrice !== undefined && minPrice > 0 && effectivePrice < minPrice) {
      continue;
    }
    if (maxPrice !== undefined && maxPrice > 0 && effectivePrice > maxPrice) {
      continue;
    }

    // Filter by rating
    if (minRating !== undefined && minRating > 0 && p.rating < minRating) {
      continue;
    }

    // Filter by stock
    if (inStockOnly && p.stock <= 0) {
      continue;
    }

    // Relevance scoring
    let score = 0;
    const searchableText = `${p.name} ${p.description} ${p.sku} ${p.specificationsJson || ''} ${cat?.name || ''} ${seller?.storeName || ''}`.toLowerCase();

    if (tokens.length === 0) {
      // No search keywords -> base score on rating and reviews
      score = p.rating * 10 + Math.min(p.reviewCount, 50) + (p.isFeatured ? 20 : 0);
    } else {
      let matchedTokens = 0;
      for (const t of tokens) {
        if (p.name.toLowerCase().includes(t)) {
          score += 50;
          matchedTokens++;
        } else if (searchableText.includes(t)) {
          score += 20;
          matchedTokens++;
        }
      }

      // Check if specific use-cases match
      const qLower = query ? query.toLowerCase() : '';
      if (tokens.includes('laptop')) {
        if (p.categoryId === 'cat-electronics' && (p.name.toLowerCase().includes('laptop') || p.name.toLowerCase().includes('book'))) {
          score += 150;
        } else if (p.categoryId !== 'cat-electronics') {
          score -= 100;
        }
      }
      if (tokens.includes('phone') || tokens.includes('smartphone')) {
        if (p.categoryId === 'cat-electronics' && (p.name.toLowerCase().includes('phone') || p.name.toLowerCase().includes('smartphone'))) {
          score += 150;
        } else if (p.categoryId !== 'cat-electronics') {
          score -= 100;
        }
      }
      if (qLower.includes('coding') || qLower.includes('developer') || qLower.includes('programming')) {
        if (p.name.toLowerCase().includes('devbook') || searchableText.includes('developer') || searchableText.includes('ram')) {
          score += 60;
        }
      }
      if (qLower.includes('gaming') && (searchableText.includes('rtx') || searchableText.includes('144hz') || searchableText.includes('gaming'))) {
        score += 60;
      }

      // If user provided keywords but zero matched or score <= 0, exclude product
      if (matchedTokens === 0 || score <= 0) {
        continue;
      }

      // Add rating bonus
      score += p.rating * 5;
    }

    scoredProducts.push({ product: p, score, effectivePrice });
  }

  // 5. Sort results
  if (sort === 'price_asc') {
    scoredProducts.sort((a, b) => a.effectivePrice - b.effectivePrice);
  } else if (sort === 'price_desc') {
    scoredProducts.sort((a, b) => b.effectivePrice - a.effectivePrice);
  } else if (sort === 'rating') {
    scoredProducts.sort((a, b) => b.product.rating - a.product.rating || b.product.reviewCount - a.product.reviewCount);
  } else if (sort === 'newest') {
    scoredProducts.sort((a, b) => new Date(b.product.createdAt).getTime() - new Date(a.product.createdAt).getTime());
  } else {
    // Default: Sort by relevance score then rating
    scoredProducts.sort((a, b) => b.score - a.score || b.product.rating - a.product.rating);
  }

  const selected = scoredProducts.slice(0, Math.min(limit, 8));

  // 6. Enrich with images, primary thumbnail, variants, and parsed specs
  const enriched: ProductSearchResult[] = await Promise.all(
    selected.map(async ({ product: p }) => {
      const cat = catMap.get(p.categoryId);
      const seller = sellerMap.get(p.sellerId);
      const imgRows = await db.select().from(productImages).where(eq(productImages.productId, p.id)).orderBy(asc(productImages.sortOrder));
      const varRows = await db.select().from(productVariants).where(eq(productVariants.productId, p.id));

      let specs: Record<string, string> = {};
      try {
        if (p.specificationsJson) specs = JSON.parse(p.specificationsJson);
      } catch {}

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description.slice(0, 160) + (p.description.length > 160 ? '...' : ''),
        category: cat?.name || 'Marketplace',
        seller: seller?.storeName || 'Verified Merchant',
        price: p.price,
        discountPrice: p.discountPrice,
        stock: p.stock,
        rating: p.rating,
        reviewCount: p.reviewCount,
        image: imgRows[0]?.url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
        sku: p.sku,
        specifications: specs,
        hasVariants: varRows.length > 0,
      };
    })
  );

  return {
    count: enriched.length,
    products: enriched,
  };
}

/**
 * Retrieve full product details
 */
export async function getProductDetailsTool(identifier: string) {
  if (!identifier) return { found: false, message: 'Product identifier is required.' };

  const idTrim = identifier.trim().toLowerCase();
  const allApproved = await db.select().from(products).where(eq(products.status, 'APPROVED'));

  // Match exact ID, slug, SKU or closest name match
  let matched = allApproved.find(
    (p) => p.id.toLowerCase() === idTrim || p.slug.toLowerCase() === idTrim || p.sku.toLowerCase() === idTrim
  );

  if (!matched) {
    matched = allApproved.find((p) => p.name.toLowerCase().includes(idTrim) || idTrim.includes(p.name.toLowerCase()));
  }

  if (!matched) {
    const tokens = normalizeTokens(identifier);
    if (tokens.length > 0) {
      matched = allApproved.find((p) => tokens.some((t) => p.name.toLowerCase().includes(t)));
    }
  }

  if (!matched) {
    return { found: false, message: `Product "${identifier}" was not found in Commerce Engine.` };
  }

  const p = matched;
  const images = await db.select().from(productImages).where(eq(productImages.productId, p.id)).orderBy(asc(productImages.sortOrder));
  const variants = await db.select().from(productVariants).where(eq(productVariants.productId, p.id));
  const seller = await db.select().from(sellerProfiles).where(eq(sellerProfiles.id, p.sellerId)).limit(1);
  const cat = await db.select().from(categories).where(eq(categories.id, p.categoryId)).limit(1);

  let specifications = {};
  try {
    if (p.specificationsJson) specifications = JSON.parse(p.specificationsJson);
  } catch {}

  return {
    found: true,
    product: {
      id: p.id,
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      category: cat[0]?.name || 'Electronics',
      seller: seller[0]?.storeName || 'Verified Merchant',
      sellerRating: seller[0]?.rating || 4.8,
      price: p.price,
      discountPrice: p.discountPrice,
      effectivePrice: p.discountPrice || p.price,
      stock: p.stock,
      availability: p.stock > 0 ? (p.stock <= 5 ? `Low Stock (${p.stock} units left)` : 'In Stock') : 'Out of Stock',
      rating: p.rating,
      reviewCount: p.reviewCount,
      description: p.description,
      specifications,
      shippingInfo: p.shippingInfo,
      returnInfo: p.returnInfo,
      images: images.map((i) => i.url),
      primaryImage: images[0]?.url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
      variants: variants.map((v) => ({
        id: v.id,
        title: v.title,
        price: v.price,
        stock: v.stock,
        sku: v.sku,
      })),
    },
  };
}

/**
 * Check Real-Time Stock Availability
 */
export async function checkProductAvailabilityTool(identifier: string, variantTitle?: string) {
  const details = await getProductDetailsTool(identifier);
  if (!details.found || !details.product) {
    return { available: false, message: `Product "${identifier}" was not found in the catalog.` };
  }

  const p = details.product;
  if (variantTitle && p.variants.length > 0) {
    const matchedVar = p.variants.find((v: any) => v.title.toLowerCase().includes(variantTitle.toLowerCase()));
    if (matchedVar) {
      return {
        productName: p.name,
        variantTitle: matchedVar.title,
        available: matchedVar.stock > 0,
        stock: matchedVar.stock,
        price: matchedVar.price,
        message: matchedVar.stock > 0 ? `In Stock (${matchedVar.stock} available)` : 'Currently Out of Stock',
      };
    }
  }

  return {
    productName: p.name,
    available: p.stock > 0,
    stock: p.stock,
    price: p.effectivePrice,
    hasVariants: p.variants.length > 0,
    availableVariants: p.variants.map((v: any) => ({ title: v.title, stock: v.stock, price: v.price })),
    message: p.stock > 0 ? `In Stock (${p.stock} available)` : 'Currently Out of Stock',
  };
}

/**
 * Robust Product Comparison: compares 2-3 products using database specifications
 */
export async function compareProductsTool(identifiers: string[] | string) {
  let idList: string[] = [];
  if (Array.isArray(identifiers)) {
    idList = identifiers;
  } else if (typeof identifiers === 'string') {
    idList = identifiers.split(/,\s*|\s+vs\s+|\s+and\s+/i);
  }

  // Check if identifier contains general term like "laptops", "phones", "top laptops"
  const isGeneric = idList.length === 0 || idList.some((id) => /^(top|best|cheap)?\s*(laptops?|phones?|headphones?|shoes?|products?|gadgets?)$/i.test(id.trim()));

  let comparisonProducts: ProductSearchResult[] = [];

  if (isGeneric) {
    // Extract category/keyword
    const queryTerm = idList[0] || 'laptop';
    const searchRes = await searchProductsTool({ query: queryTerm, sort: 'rating', limit: 3 });
    comparisonProducts = searchRes.products || [];
  } else {
    // Resolve individual product identifiers
    for (const rawId of idList.slice(0, 3)) {
      const details = await getProductDetailsTool(rawId);
      if (details.found && details.product) {
        const p = details.product;
        comparisonProducts.push({
          id: p.id,
          name: p.name,
          slug: p.slug,
          description: p.description,
          category: p.category,
          seller: p.seller,
          price: p.price,
          discountPrice: p.discountPrice,
          stock: p.stock,
          rating: p.rating,
          reviewCount: p.reviewCount,
          image: p.primaryImage,
          sku: p.sku,
          specifications: p.specifications,
          hasVariants: p.variants.length > 0,
        });
      }
    }
  }

  if (comparisonProducts.length === 0) {
    return {
      found: false,
      message: 'I could not find matching products in Commerce Engine to compare.',
      products: [],
    };
  }

  // Build key specification comparison matrix
  const specKeys = new Set<string>();
  comparisonProducts.forEach((p) => {
    Object.keys(p.specifications || {}).forEach((k) => specKeys.add(k));
  });

  const matrix: Record<string, Record<string, string>> = {};
  specKeys.forEach((specKey) => {
    matrix[specKey] = {};
    comparisonProducts.forEach((p) => {
      matrix[specKey][p.name] = p.specifications[specKey] || 'Not specified';
    });
  });

  return {
    found: true,
    count: comparisonProducts.length,
    products: comparisonProducts,
    matrix,
    summary: comparisonProducts.map((p) => ({
      name: p.name,
      price: p.discountPrice || p.price,
      rating: p.rating,
      stock: p.stock > 0 ? `${p.stock} in stock` : 'Out of stock',
      seller: p.seller,
      specifications: p.specifications,
    })),
  };
}

/**
 * Get all marketplace categories
 */
export async function getCategoriesTool() {
  const catRows = await db.select().from(categories).where(eq(categories.isActive, 1));
  const prods = await db.select({ categoryId: products.categoryId }).from(products).where(eq(products.status, 'APPROVED'));

  const countMap = new Map<string, number>();
  prods.forEach((p) => {
    countMap.set(p.categoryId, (countMap.get(p.categoryId) || 0) + 1);
  });

  return {
    categories: catRows.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      productCount: countMap.get(c.id) || 0,
    })),
  };
}

/**
 * Official Marketplace Shipping Policies
 */
export function getShippingPolicyTool() {
  return {
    standardDelivery: '3 to 5 business days',
    expressDelivery: '1 to 2 business days',
    freeShippingThreshold: 'Orders above ₹999 (Flat ₹99 shipping for orders below ₹999)',
    carrier: 'Express Logistics Network with real-time milestone checkpoints',
    tracking: 'Live tracking timeline available in Account Purchase History',
    dispatchTime: 'Orders placed before 2:00 PM are dispatched on the same business day',
    otpVerification: 'High-value electronics and luxury orders include secure OTP verification at doorstep',
  };
}

/**
 * Official Marketplace Return & Refund Policies
 */
export function getReturnPolicyTool() {
  return {
    fashionReturnWindow: '30-day complimentary returns and size replacements for unworn items with tags',
    homeKitchenReturnWindow: '15-day return window in original packaging',
    electronicsReturnWindow: '7 to 14-day defect replacement guarantee in original packaging with accessories',
    howToReturn: 'Navigate to Account Dashboard > Purchase History > click the "Return" button on your delivered order item',
    refundTimeline: 'Refunds are automatically processed to original payment method (Card/UPI/Netbanking) within 2 to 4 business days upon warehouse receipt. Cash on Delivery (COD) refunds are sent via direct bank transfer.',
    cancellationPolicy: 'Orders in PENDING, CONFIRMED, or PROCESSING state can be cancelled immediately for a 100% full refund with instant stock restoration.',
  };
}

/**
 * Customer Orders Retrieval (Ownership Protected)
 */
export async function getMyOrdersTool(userId?: string, limit: number = 5) {
  if (!userId) {
    return {
      authenticated: false,
      message: 'Please sign in to your Commerce Engine account to view your purchase history and live tracking.',
      orders: [],
    };
  }

  const userOrders = await db
    .select()
    .from(orders)
    .where(eq(orders.customerId, userId))
    .orderBy(desc(orders.createdAt))
    .limit(limit);

  if (userOrders.length === 0) {
    return {
      authenticated: true,
      hasOrders: false,
      message: 'You have not placed any orders yet. Browse our marketplace catalog to make your first purchase!',
      orders: [],
    };
  }

  const enriched = await Promise.all(
    userOrders.map(async (ord) => {
      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, ord.id));
      const shp = await db.select().from(shipments).where(eq(shipments.orderId, ord.id)).limit(1);

      return {
        id: ord.id,
        orderNumber: ord.orderNumber,
        status: ord.status,
        total: ord.total,
        currency: ord.currency,
        placedDate: ord.createdAt,
        itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
        itemsSummary: items.map((i) => `${i.quantity}x ${i.productName}`).join(', '),
        carrier: shp[0]?.carrier || 'Express Logistics',
        trackingNumber: shp[0]?.trackingNumber,
      };
    })
  );

  return {
    authenticated: true,
    hasOrders: true,
    count: enriched.length,
    orders: enriched,
  };
}

/**
 * Get Specific Order Tracking Details (Ownership Protected)
 */
export async function getMyOrderDetailsTool(userId?: string, orderNumberOrId?: string) {
  if (!userId) {
    return { authenticated: false, message: 'Please sign in to inspect your order details.' };
  }
  if (!orderNumberOrId) {
    return { found: false, message: 'Please provide an order number or ID.' };
  }

  const term = orderNumberOrId.trim();
  const ordRows = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.customerId, userId),
        or(eq(orders.id, term), eq(orders.orderNumber, term), like(orders.orderNumber, `%${term}%`))
      )
    )
    .limit(1);

  if (ordRows.length === 0) {
    return { found: false, message: `Order "${orderNumberOrId}" was not found in your account.` };
  }

  const ord = ordRows[0];
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, ord.id));
  const rawShipments = await db.select().from(shipments).where(eq(shipments.orderId, ord.id));
  const enrichedShipments = await Promise.all(
    rawShipments.map(async (shp) => {
      const events = await db.select().from(shipmentEvents).where(eq(shipmentEvents.shipmentId, shp.id)).orderBy(desc(shipmentEvents.eventTime));
      return {
        carrier: shp.carrier,
        trackingNumber: shp.trackingNumber,
        status: shp.status,
        estimatedDelivery: shp.estimatedDelivery,
        events: events.map((e) => ({
          status: e.status,
          location: e.location,
          description: e.description,
          time: e.eventTime,
        })),
      };
    })
  );

  return {
    found: true,
    order: {
      orderNumber: ord.orderNumber,
      status: ord.status,
      total: ord.total,
      currency: ord.currency,
      placedDate: ord.createdAt,
      paymentMethod: ord.paymentMethod,
      paymentStatus: ord.paymentStatus,
      items: items.map((i) => ({
        name: i.productName,
        variant: i.variantTitle,
        quantity: i.quantity,
        price: i.price,
        total: i.total,
      })),
      shipments: enrichedShipments,
    },
  };
}

/**
 * Check Return Eligibility (Ownership Protected)
 */
export async function checkReturnEligibilityTool(userId?: string, orderNumberOrId?: string) {
  if (!userId) {
    return { authenticated: false, message: 'Please sign in to check return eligibility.' };
  }

  const detailsRes = await getMyOrderDetailsTool(userId, orderNumberOrId);
  if (!detailsRes.found || !detailsRes.order) {
    return detailsRes;
  }

  const ord = detailsRes.order;
  if (ord.status !== 'DELIVERED') {
    return {
      orderNumber: ord.orderNumber,
      status: ord.status,
      eligible: false,
      reason: `Order is currently "${ord.status}". Items can only be returned after delivery. If not yet shipped, you can cancel instead.`,
    };
  }

  const orderDate = new Date(ord.placedDate);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays > 15) {
    return {
      orderNumber: ord.orderNumber,
      eligible: false,
      reason: `The 15-day return window has expired (order placed ${diffDays} days ago).`,
    };
  }

  return {
    orderNumber: ord.orderNumber,
    eligible: true,
    daysRemaining: 15 - diffDays,
    items: ord.items,
    instructions: 'You can initiate the return directly from your Account Purchase History by clicking the "Return" button on this order.',
  };
}

/**
 * Get Shopping Cart
 */
export async function getCartTool(userId?: string, guestSessionId?: string) {
  let cartRows: any[] = [];
  if (userId) {
    cartRows = await db.select().from(carts).where(eq(carts.userId, userId)).limit(1);
  } else if (guestSessionId) {
    cartRows = await db.select().from(carts).where(eq(carts.guestSessionId, guestSessionId)).limit(1);
  }

  if (cartRows.length === 0) {
    return { itemCount: 0, items: [], subtotal: 0, message: 'Your shopping cart is currently empty.' };
  }

  const cart = cartRows[0];
  const items = await db.select().from(cartItems).where(eq(cartItems.cartId, cart.id));

  let subtotal = 0;
  const enrichedItems = await Promise.all(
    items.map(async (ci) => {
      const p = await db.select().from(products).where(eq(products.id, ci.productId)).limit(1);
      const prod = p[0];
      const unitPrice = prod ? (prod.discountPrice || prod.price) : 0;
      const total = unitPrice * ci.quantity;
      subtotal += total;

      return {
        id: ci.id,
        productId: ci.productId,
        productName: prod?.name || 'Item',
        quantity: ci.quantity,
        unitPrice,
        total,
      };
    })
  );

  return {
    itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
    items: enrichedItems,
    subtotal,
  };
}

/**
 * Get Active Promotional Coupons
 */
export async function getActiveCouponsTool() {
  const active = await db
    .select({
      code: coupons.code,
      type: coupons.type,
      value: coupons.value,
      minOrderAmount: coupons.minOrderAmount,
    })
    .from(coupons)
    .where(eq(coupons.isActive, 1))
    .limit(6);

  return {
    count: active.length,
    coupons: active.map((c) => ({
      code: c.code,
      discount: c.type === 'PERCENTAGE' ? `${c.value}% OFF` : `₹${c.value} FLAT OFF`,
      minPurchase: `₹${c.minOrderAmount}`,
    })),
  };
}

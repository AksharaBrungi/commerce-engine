import { db } from '../db/index.ts';
import { products, categories, coupons } from '../db/schema.ts';
import { eq, sql } from 'drizzle-orm';

export interface KnowledgeDocument {
  id: string;
  category: 'shipping' | 'return_refund' | 'payment' | 'orders' | 'coupons' | 'marketplace' | 'products';
  title: string;
  content: string;
  keywords: string[];
}

export const APPROVED_MARKETPLACE_POLICIES: KnowledgeDocument[] = [
  {
    id: 'doc-shipping-1',
    category: 'shipping',
    title: 'Shipping & Delivery Timelines',
    content: 'Commerce Engine delivers across all major pin codes and international regions. Standard shipping takes 3 to 5 business days, while Express Priority shipping takes 1 to 2 business days. Orders placed before 2:00 PM are processed same-day. Free standard shipping applies to all orders with subtotal above ₹999 (or equivalent in chosen currency). A flat shipping fee of ₹99 applies to orders below ₹999.',
    keywords: ['shipping', 'delivery', 'time', 'how long', 'charges', 'free shipping', 'dispatch', 'fast', 'courier', 'express'],
  },
  {
    id: 'doc-shipping-2',
    category: 'shipping',
    title: 'Courier Partners & Live Tracking',
    content: 'All packages are fulfilled via our premier logistics network, Express Logistics. Every order receives a unique tracking number (e.g., TRK-XXXXXXXX) immediately upon confirmation. Customers can monitor live checkpoint events (Confirmed, Processing, Shipped, Out for Delivery, Delivered) in their Account Dashboard under Details & Tracking.',
    keywords: ['tracking', 'courier', 'carrier', 'track order', 'where is my package', 'status', 'events', 'checkpoint'],
  },
  {
    id: 'doc-return-1',
    category: 'return_refund',
    title: 'Return & Replacement Window',
    content: 'Commerce Engine provides a customer-friendly return policy: 15-day hassle-free returns for Fashion, Apparel, and Footwear; 7-day replacement guarantee for Electronics, Gadgets, and Home Appliances. Items must be in original condition with brand tags, accessories, and warranty cards intact. Used, washed, or physically damaged items (unless damaged during transit) cannot be returned.',
    keywords: ['return', 'replace', 'replacement', 'return window', 'policy', 'exchange', 'defective', 'damage', 'wrong size'],
  },
  {
    id: 'doc-return-2',
    category: 'return_refund',
    title: 'How to File a Return Request',
    content: 'To initiate a return: 1. Sign in and open your Account Dashboard. 2. Navigate to Purchase History. 3. Delivered orders have a "Return" button on eligible items. 4. Choose your reason (e.g., defective, size issue, not as described) and submit. The seller will review the request, and upon item pickup/receipt, a full refund is issued.',
    keywords: ['how to return', 'file return', 'return request', 'return process', 'step by step', 'initiate return'],
  },
  {
    id: 'doc-refund-1',
    category: 'return_refund',
    title: 'Refund Processing & Timelines',
    content: 'Once a returned item is received and inspected at our fulfillment hub, the refund is approved within 24 to 48 hours. For online card payments, the refund automatically reflects back on the original card within 2 to 4 business days. For Cash on Delivery (COD) orders, refunds are disbursed to the customer verified bank account or digital wallet within 3 business days.',
    keywords: ['refund', 'money back', 'how long refund', 'refund status', 'card refund', 'cod refund', 'payout'],
  },
  {
    id: 'doc-payment-1',
    category: 'payment',
    title: 'Accepted Payment Methods',
    content: 'Commerce Engine supports secure checkout via: 1. Demo Card Simulation: A built-in sandbox card test interface with 1-click test card auto-fill and toggles for simulating successful or failed transactions. 2. Cash on Delivery (COD): Pay cash or UPI upon package arrival at your doorstep. All transactions are encrypted and secured with full buyer protection.',
    keywords: ['payment', 'pay', 'credit card', 'debit card', 'cod', 'cash on delivery', 'secure', 'payment methods'],
  },
  {
    id: 'doc-orders-1',
    category: 'orders',
    title: 'Order Cancellation Policy',
    content: 'Customers can cancel their order free of charge at any time while the order is in PENDING, CONFIRMED, or PROCESSING status directly from the Account Purchase History page by clicking "Cancel". Once an order is SHIPPED or OUT_FOR_DELIVERY, it cannot be cancelled mid-transit, but can be returned upon delivery. Cancelling an order immediately releases reserved items back into stock.',
    keywords: ['cancel', 'cancellation', 'stop order', 'cancel policy', 'before shipped'],
  },
  {
    id: 'doc-reviews-1',
    category: 'marketplace',
    title: 'Verified Buyer Product Reviews',
    content: 'Only authenticated customers who purchased a product in a DELIVERED order can submit a review and rating (1 to 5 stars). This guarantees 100% authentic, spam-free reviews. Customer reviews display a "Verified Purchase" badge and automatically update the product live star rating.',
    keywords: ['review', 'rating', 'feedback', 'verified purchase', 'stars', 'write review'],
  },
  {
    id: 'doc-coupons-1',
    category: 'coupons',
    title: 'Discount Coupons & Promotional Offers',
    content: 'Discount coupons can be applied during checkout or directly inside the shopping cart. Enter the uppercase coupon code and click Apply. Note that minimum purchase thresholds apply (e.g. WELCOME100, FLASH30). Only one promo code can be redeemed per transaction. Expired or exhausted coupons cannot be combined.',
    keywords: ['coupon', 'discount', 'promo code', 'voucher', 'offer', 'deal', 'save money'],
  },
  {
    id: 'doc-support-1',
    category: 'marketplace',
    title: 'Customer Support & Help Desk',
    content: 'Customer assistance is available 24/7 through this Commerce AI Assistant and human support representatives. For complex order disputes, warranty claims, or seller inquiries, customers can contact support at support@commerceengine.local or call 1800-COMMERCE.',
    keywords: ['support', 'help', 'contact', 'customer care', 'email', 'phone', 'human agent'],
  },
];

/**
 * Hybrid Knowledge Retriever:
 * Combines policy documents and dynamic live database information
 */
export async function retrieveRelevantKnowledge(
  query: string,
  topK: number = 4
): Promise<{ documents: KnowledgeDocument[]; productHints: string }> {
  const queryLower = query.toLowerCase();
  const queryTokens = queryLower
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);

  // Score static policy documents
  const scoredDocs = APPROVED_MARKETPLACE_POLICIES.map((doc) => {
    let score = 0;
    const titleLower = doc.title.toLowerCase();
    const contentLower = doc.content.toLowerCase();

    for (const token of queryTokens) {
      if (titleLower.includes(token)) score += 5;
      if (doc.keywords.some((k) => k.toLowerCase().includes(token))) score += 4;
      if (contentLower.includes(token)) score += 1;
    }

    return { doc, score };
  });

  scoredDocs.sort((a, b) => b.score - a.score);
  const relevantDocs = scoredDocs.filter((item) => item.score > 0).slice(0, topK).map((i) => i.doc);

  // Also query active categories and coupons to inject into context
  let productHints = '';
  try {
    const activeCoupons = await db.select().from(coupons).where(eq(coupons.isActive, 1)).limit(4);
    if (activeCoupons.length > 0) {
      productHints += `Available active promo coupons: ${activeCoupons.map((c) => `${c.code} (${c.type === 'PERCENTAGE' ? `${c.value}% off` : `₹${c.value} off`} on min orders of ₹${c.minOrderAmount})`).join(', ')}.`;
    }
  } catch (err) {
    // Graceful fallback
  }

  return {
    documents: relevantDocs,
    productHints,
  };
}

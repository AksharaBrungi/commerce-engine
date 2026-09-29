import { GoogleGenAI } from '@google/genai';
import { db } from '../db/index.ts';
import { aiConversations, aiMessages, aiAnalyticsLogs } from '../db/schema.ts';
import { eq, desc } from 'drizzle-orm';
import { retrieveRelevantKnowledge } from './aiKnowledgeBase.ts';
import {
  AI_TOOL_DEFINITIONS,
  executeTool,
  searchProductsTool,
  compareProductsTool,
  getProductDetailsTool,
  checkProductAvailabilityTool,
  getCategoriesTool,
  getShippingPolicyTool,
  getReturnPolicyTool,
  ProductSearchResult,
} from './aiTools.ts';

export interface ChatRequestPayload {
  message: string;
  conversationId?: string;
  imageBase64?: string;
  imageMimeType?: string;
  currency?: string;
  exchangeRate?: number;
}

export interface StructuredAiResponse {
  message: string;
  products: ProductSearchResult[];
  citations: string[];
  actions: Array<{
    type: 'VIEW_PRODUCT' | 'COMPARE_PRODUCTS' | 'VIEW_CART' | 'VIEW_ORDER' | 'CONFIRM_ADD_TO_CART' | 'EXPLORE_CATALOG';
    title: string;
    payload?: any;
  }>;
  intent: string;
  conversationId: string;
  messageId: string;
}

const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;

if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
  try {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (err) {
    console.warn('⚠️ Could not initialize GoogleGenAI client:', err);
  }
}

/**
 * Detect high-level user intent from message
 */
function classifyIntent(message: string): string {
  const m = message.toLowerCase();

  if (m.includes('compare') || m.includes(' vs ') || m.includes('versus') || m.includes('difference between') || m.includes('which is better') || m.includes('which laptop is better') || m.includes('which product is better')) {
    return 'PRODUCT_COMPARISON';
  }
  if (m.includes('what categories') || m.includes('show categories') || m.includes('list categories') || m.includes('which categories') || m.includes('all categories')) {
    return 'CATEGORY_LIST';
  }
  if (m.includes('what products do you have') || m.includes('what do you sell') || m.includes('show all products') || m.includes('tell me about your products') || m.includes('what do you have')) {
    return 'CATALOG_OVERVIEW';
  }
  if (m.includes('order') && (m.includes('where') || m.includes('track') || m.includes('status') || m.includes('when') || m.includes('shipped') || m.includes('delivered') || m.includes('ekkada'))) {
    return 'ORDER_TRACKING';
  }
  if (m.includes('return') || m.includes('refund') || m.includes('replace') || m.includes('exchange') || m.includes('cancel')) {
    return 'RETURN_HELP';
  }
  if (m.includes('shipping') || m.includes('delivery') || m.includes('deliver') || m.includes('how long') || m.includes('how many days') || m.includes('charges') || m.includes('pincode') || m.includes('courier')) {
    return 'SHIPPING_INFO';
  }
  if (m.includes('in stock') || m.includes('is this product in stock') || m.includes('how many left') || m.includes('available')) {
    return 'STOCK_CHECK';
  }
  if (m.includes('price of') || m.includes('what is the price') || m.includes('how much is') || m.includes('entha') || m.includes('cost')) {
    return 'PRICE_CHECK';
  }
  if (m.includes('coupon') || m.includes('promo code') || m.includes('discount code') || m.includes('offer') || m.includes('voucher')) {
    return 'COUPON_HELP';
  }
  if (m.includes('cart') || m.includes('add to cart') || m.includes('in my cart') || m.includes('my cart')) {
    return 'CART_HELP';
  }
  if (m.includes('wishlist') || m.includes('my wishlist')) {
    return 'WISHLIST_HELP';
  }
  if (m.includes('seller') || m.includes('who is selling') || m.includes('merchant')) {
    return 'SELLER_HELP';
  }
  if (m.includes('payment') || m.includes('pay') || m.includes('upi') || m.includes('cod') || m.includes('cash on delivery')) {
    return 'PAYMENT_INFO';
  }

  return 'PRODUCT_SEARCH';
}

/**
 * Format currency amount using the active user currency
 */
function formatCurrency(amountINR: number, currency: string = 'INR', rate: number = 1): string {
  const converted = amountINR * (rate || 1);
  const symbols: Record<string, string> = {
    INR: '₹',
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    CAD: 'C$',
    AUD: 'A$',
    AED: 'AED ',
    CHF: 'CHF ',
    SGD: 'S$',
  };
  const sym = symbols[currency] || `${currency} `;
  return `${sym}${converted.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/**
 * Detect user language
 */
function detectLanguage(text: string): string {
  if (/[\u0C00-\u0C7F]/.test(text) || /\b(naaku|kavali|undha|entha|emi|ekkada|paduthundi|cheppandi)\b/i.test(text)) {
    return 'te'; // Telugu
  }
  if (/[\u0900-\u097F]/.test(text) || /\b(chahiye|kitna|hai|kaise|kya|batao|dikhao|kaha)\b/i.test(text)) {
    return 'hi'; // Hindi
  }
  return 'en';
}

/**
 * Main chat handler: orchestrates Database Tools, RAG, and LLM reasoning
 */
export async function processAiChat(
  payload: ChatRequestPayload,
  userContext: { userId?: string; guestSessionId?: string }
): Promise<StructuredAiResponse> {
  const startTime = Date.now();
  const { message, imageBase64, imageMimeType, currency = 'INR', exchangeRate = 1 } = payload;
  const intent = classifyIntent(message);

  // 1. Manage Conversation Session
  let conversationId = payload.conversationId;
  const now = new Date().toISOString();

  if (conversationId) {
    // Check if conversation exists in DB; if not, create it to guarantee foreign keys
    try {
      const existing = await db
        .select()
        .from(aiConversations)
        .where(eq(aiConversations.id, conversationId))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(aiConversations).values({
          id: conversationId,
          userId: userContext.userId || null,
          sessionId: userContext.guestSessionId || null,
          title: message.slice(0, 40) + (message.length > 40 ? '...' : ''),
          createdAt: now,
          updatedAt: now,
        });
      }
    } catch {
      // Fallback to fresh conversation ID if any issue
      conversationId = `conv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      await db.insert(aiConversations).values({
        id: conversationId,
        userId: userContext.userId || null,
        sessionId: userContext.guestSessionId || null,
        title: message.slice(0, 40) + (message.length > 40 ? '...' : ''),
        createdAt: now,
        updatedAt: now,
      });
    }
  } else {
    conversationId = `conv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    await db.insert(aiConversations).values({
      id: conversationId,
      userId: userContext.userId || null,
      sessionId: userContext.guestSessionId || null,
      title: message.slice(0, 40) + (message.length > 40 ? '...' : ''),
      createdAt: now,
      updatedAt: now,
    });
  }

  // 2. Fetch past conversation memory (last 6 messages)
  const historyRows = await db
    .select()
    .from(aiMessages)
    .where(eq(aiMessages.conversationId, conversationId))
    .orderBy(desc(aiMessages.createdAt))
    .limit(6);
  const conversationHistory = historyRows.reverse();

  // 3. Save incoming user message
  const userMessageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  await db.insert(aiMessages).values({
    id: userMessageId,
    conversationId,
    role: 'user',
    content: message,
    createdAt: now,
  });

  // 4. RAG Knowledge Retrieval
  const ragResult = await retrieveRelevantKnowledge(message, 3);
  const knowledgeContext = ragResult.documents.map((d) => `### [${d.title}] (${d.category})\n${d.content}`).join('\n\n');

  let finalMessage = '';
  let finalProducts: ProductSearchResult[] = [];
  let finalCitations: string[] = ragResult.documents.map((d) => d.title);
  let finalActions: StructuredAiResponse['actions'] = [];
  let toolUsedName: string | null = null;

  // 5. Intelligent Native Local Processing
  // First run authoritative database lookups to guarantee real data is always ready
  const localResult = await runAuthoritativeDataEngine(message, intent, userContext, currency, exchangeRate);

  if (localResult.handled) {
    finalMessage = localResult.message;
    finalProducts = localResult.products;
    finalActions = localResult.actions;
    toolUsedName = localResult.toolUsed;
  }

  // 6. If not handled deterministically or if LLM reasoning is desired and API key is present:
  if (!finalMessage && aiClient) {
    try {
      const modelName = process.env.AI_MODEL || 'gemini-3.7-flash';

      const systemInstruction = `
You are the "Commerce Assistant", the official AI shopping copilot for the COMMERCE ENGINE multi-vendor e-commerce marketplace.

CRITICAL RULES:
1. STRICT FACTUAL ACCURACY: You must NEVER invent, guess, or hallucinate product prices, specifications, stock numbers, order statuses, or marketplace policies. Use ONLY the provided tool outputs and Knowledge Base.
2. ABSTENTION: If you cannot find accurate information in the database, say: "I couldn't find that information in Commerce Engine."
3. ACTIVE CURRENCY: Format ALL displayed prices in "${currency}" (Exchange rate: ${exchangeRate}). Never default hardcode ₹ if user selected USD, EUR, etc.
4. TONE & CLARITY: Use simple, friendly, normal English. Avoid robotic or overly technical phrases.
5. MULTILINGUAL: Respond naturally in English, Telugu, or Hindi matching the customer's language.

KNOWLEDGE BASE:
${knowledgeContext}
      `.trim();

      const functionDeclarations = AI_TOOL_DEFINITIONS.map((def) => ({
        name: def.name,
        description: def.description,
        parameters: def.parameters,
      }));

      const contents: any[] = [];
      for (const h of conversationHistory) {
        contents.push({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.content }],
        });
      }

      const currentParts: any[] = [];
      if (imageBase64) {
        currentParts.push({
          inlineData: {
            mimeType: imageMimeType || 'image/jpeg',
            data: imageBase64,
          },
        });
        currentParts.push({ text: `Visual query: ${message}` });
      } else {
        currentParts.push({ text: message });
      }
      contents.push({ role: 'user', parts: currentParts });

      const response = await aiClient.models.generateContent({
        model: modelName,
        contents,
        config: {
          systemInstruction,
          temperature: 0.2,
          // @ts-ignore
          tools: [{ functionDeclarations }],
        },
      });

      const functionCalls = response.functionCalls;
      if (functionCalls && functionCalls.length > 0 && functionCalls[0].name) {
        const call = functionCalls[0];
        const callName = call.name!;
        toolUsedName = callName;
        const toolResult = await executeTool(callName, (call.args as Record<string, any>) || {}, userContext);

        if ((callName === 'search_products' || callName === 'compare_products') && toolResult.products) {
          finalProducts = toolResult.products;
        }

        const followUpContents = [
          ...contents,
          response.candidates?.[0]?.content,
          {
            role: 'user',
            parts: [
              {
                functionResponse: {
                  name: callName,
                  response: toolResult,
                },
              },
            ],
          },
        ];

        const followUpResponse = await aiClient.models.generateContent({
          model: modelName,
          contents: followUpContents,
          config: {
            systemInstruction,
            temperature: 0.2,
          },
        });

        finalMessage = followUpResponse.text || 'Here is what I found in Commerce Engine:';
      } else {
        finalMessage = response.text || "I'm here to help you shop! What are you looking for today?";
      }
    } catch (err: any) {
      console.warn('Gemini LLM call skipped/failed, using authoritative database engine:', err?.message || err);
    }
  }

  // 7. Fallback to authoritative data engine if still empty
  if (!finalMessage) {
    const fallbackResult = await runAuthoritativeDataEngine(message, intent, userContext, currency, exchangeRate, true);
    finalMessage = fallbackResult.message;
    finalProducts = fallbackResult.products;
    finalActions = fallbackResult.actions;
    if (fallbackResult.toolUsed) toolUsedName = fallbackResult.toolUsed;
  }

  // 8. Ensure UI Action Buttons are attached
  if (finalProducts.length > 0 && finalActions.length === 0) {
    if (finalProducts.length > 1) {
      finalActions.push({
        type: 'COMPARE_PRODUCTS',
        title: 'Compare in Detail',
        payload: { productIds: finalProducts.slice(0, 3).map((p) => p.id) },
      });
    }
    finalActions.push({
      type: 'VIEW_PRODUCT',
      title: `View ${finalProducts[0].name.slice(0, 25)}...`,
      payload: { productId: finalProducts[0].slug || finalProducts[0].id },
    });
  }

  // 9. Save Assistant Response in DB
  const assistantMessageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const structuredData = {
    products: finalProducts,
    citations: finalCitations,
    actions: finalActions,
    currency,
  };

  await db.insert(aiMessages).values({
    id: assistantMessageId,
    conversationId,
    role: 'assistant',
    content: finalMessage,
    structuredDataJson: JSON.stringify(structuredData),
    createdAt: new Date().toISOString(),
  });

  // 10. Observability Log
  const responseTimeMs = Date.now() - startTime;
  await db.insert(aiAnalyticsLogs).values({
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    conversationId,
    userId: userContext.userId || null,
    intent,
    query: message.slice(0, 200),
    toolUsed: toolUsedName,
    responseTimeMs,
    isSuccess: 1,
    hasProducts: finalProducts.length > 0 ? 1 : 0,
    userLanguage: detectLanguage(message),
    createdAt: new Date().toISOString(),
  });

  return {
    message: finalMessage,
    products: finalProducts,
    citations: finalCitations,
    actions: finalActions,
    intent,
    conversationId,
    messageId: assistantMessageId,
  };
}

/**
 * Authoritative Data Engine: Directly executes against the Commerce Engine SQLite database and configurations
 */
async function runAuthoritativeDataEngine(
  message: string,
  intent: string,
  userContext: { userId?: string; guestSessionId?: string },
  currency: string,
  exchangeRate: number,
  forceExecute: boolean = false
): Promise<{
  handled: boolean;
  message: string;
  products: ProductSearchResult[];
  actions: any[];
  toolUsed: string;
}> {
  const m = message.toLowerCase();
  const lang = detectLanguage(message);

  // 1. PRODUCT COMPARISON (e.g. "compare top laptops", "compare best laptops", "which laptop is better for coding")
  if (intent === 'PRODUCT_COMPARISON' || m.includes('compare') || m.includes('which laptop is better') || m.includes('coding laptop')) {
    let queryTerm = 'laptop';
    if (m.includes('phone') || m.includes('smartphone')) queryTerm = 'phone';
    if (m.includes('headphone') || m.includes('audio') || m.includes('earbuds')) queryTerm = 'headphones';
    if (m.includes('shoe') || m.includes('boots') || m.includes('sneaker')) queryTerm = 'shoes';

    const compRes = await compareProductsTool(queryTerm);
    const prods = compRes.products || [];

    if (prods.length === 0) {
      return {
        handled: true,
        message: `I couldn't find matching products in Commerce Engine to compare.`,
        products: [],
        actions: [{ type: 'EXPLORE_CATALOG', title: 'Explore Catalog' }],
        toolUsed: 'compare_products',
      };
    }

    const termPlural = queryTerm.endsWith('s') ? queryTerm : `${queryTerm}s`;
    let comparisonText = `Here is a side-by-side comparison of the top ${termPlural} in our catalog:\n\n`;

    prods.forEach((p, idx) => {
      const pPrice = formatCurrency(p.discountPrice || p.price, currency, exchangeRate);
      const specsList = Object.entries(p.specifications || {})
        .slice(0, 4)
        .map(([k, v]) => `  • **${k}:** ${v}`)
        .join('\n');

      comparisonText += `**${idx + 1}. ${p.name}**\n• **Price:** ${pPrice} | **Rating:** ${p.rating} ★ (${p.reviewCount} reviews)\n• **Stock:** ${p.stock > 0 ? `${p.stock} units available` : 'Out of stock'}\n• **Seller:** ${p.seller}\n${specsList}\n\n`;
    });

    if (m.includes('coding') || m.includes('developer') || m.includes('programming')) {
      comparisonText += `💡 **Recommendation for Coding & Development:** The **CodeCraft DevBook 14** is the best value choice with 16GB high-speed RAM, 16:10 anti-glare display, 14-hour battery endurance, and Linux/Windows support. For ultra-premium performance, the **AeroBook Ultra 14"** offers an OLED 120Hz display and 1TB storage.`;
    } else if (m.includes('gaming')) {
      comparisonText += `💡 **Recommendation for Gaming & High Performance:** The **ZenithBook Pro 15** with dedicated NVIDIA RTX 4050 graphics and 144Hz high-refresh display is the top gaming performer.`;
    } else {
      comparisonText += `💡 **Summary:** All compared models feature genuine warranty, free express delivery, and verified customer ratings.`;
    }

    return {
      handled: true,
      message: comparisonText.trim(),
      products: prods,
      actions: [
        { type: 'COMPARE_PRODUCTS', title: 'Compare Detailed Specs', payload: { productIds: prods.map((p) => p.id) } },
      ],
      toolUsed: 'compare_products',
    };
  }

  // 2. CATEGORY LIST ("What categories do you have?")
  if (intent === 'CATEGORY_LIST' || m.includes('what categories') || m.includes('list categories')) {
    const catRes = await getCategoriesTool();
    const catList = catRes.categories
      .map((c) => `• **${c.name}** (${c.productCount} products) — ${c.description}`)
      .join('\n');

    return {
      handled: true,
      message: `Commerce Engine offers products across **7 main categories**:\n\n${catList}\n\nLet me know which category you would like to explore!`,
      products: [],
      actions: [{ type: 'EXPLORE_CATALOG', title: 'Browse All Categories' }],
      toolUsed: 'get_categories',
    };
  }

  // 3. CATALOG OVERVIEW ("What products do you have?")
  if (intent === 'CATALOG_OVERVIEW' || m.includes('what products do you have') || m.includes('what do you sell')) {
    const featuredRes = await searchProductsTool({ limit: 4, sort: 'rating' });
    const prods = featuredRes.products || [];

    const featuredSummary = prods
      .map((p) => `• **${p.name}** (${p.category}) — ${formatCurrency(p.discountPrice || p.price, currency, exchangeRate)} (${p.rating} ★)`)
      .join('\n');

    return {
      handled: true,
      message: `Commerce Engine is a multi-vendor marketplace offering high-performance **Electronics** (Laptops, Smartphones, Studio Monitors, ANC Headphones), **Fashion & Apparel** (Merino Knitwear, Selvedge Denim, Chelsea Boots), **Home & Kitchen** (Conical Coffee Grinders, Enamelled Dutch Ovens, Damascus Knives), **Beauty & Skincare**, and **Sports Gear**.\n\nHere are some of our top-rated featured products:\n\n${featuredSummary}`,
      products: prods,
      actions: [{ type: 'EXPLORE_CATALOG', title: 'Explore Full Catalog' }],
      toolUsed: 'search_products',
    };
  }

  // 4. SHIPPING & DELIVERY QUESTIONS ("How long does delivery take?", "What is the delivery time?")
  if (intent === 'SHIPPING_INFO' || m.includes('shipping') || m.includes('delivery time') || m.includes('how long does delivery take') || m.includes('delivery enni days')) {
    const shipPolicy = getShippingPolicyTool();

    if (lang === 'te') {
      return {
        handled: true,
        message: `Commerce Engine ద్వారా డెలివరీ సమయాలు:\n\n• **స్టాండర్డ్ డెలివరీ:** ${shipPolicy.standardDelivery}\n• **ఎక్స్‌ప్రెస్ డెలివరీ:** ${shipPolicy.expressDelivery}\n• **ఉచిత షిప్పింగ్:** ₹999 కంటే ఎక్కువ ఆర్డర్‌లపై ఉచిత డెలివరీ అందుబాటులో ఉంది.\n\nప్రతి ఆర్డర్ రియల్-టైమ్ కొరియర్ ట్రాకింగ్‌తో పంపబడుతుంది.`,
        products: [],
        actions: [{ type: 'EXPLORE_CATALOG', title: 'షాపింగ్ ప్రారంభించండి' }],
        toolUsed: 'get_shipping_policy',
      };
    }

    return {
      handled: true,
      message: `Here is our official **Shipping & Delivery** information:\n\n• **Standard Delivery:** Takes **${shipPolicy.standardDelivery}**.\n• **Express Priority:** Takes **${shipPolicy.expressDelivery}**.\n• **Free Shipping:** Available on all orders **above ₹999** (Flat ₹99 shipping for orders below ₹999).\n• **Carrier & Tracking:** All packages are shipped via **${shipPolicy.carrier}** with milestone tracking events and OTP verification on high-value orders.\n• **Same-Day Dispatch:** Orders placed before 2:00 PM are dispatched on the same business day.`,
      products: [],
      actions: [{ type: 'EXPLORE_CATALOG', title: 'Browse Products' }],
      toolUsed: 'get_shipping_policy',
    };
  }

  // 5. RETURN & REFUND POLICY ("What is the return policy?", "Can I return my order?")
  if (intent === 'RETURN_HELP' || m.includes('return policy') || m.includes('refund policy') || m.includes('how do i return')) {
    const retPolicy = getReturnPolicyTool();

    return {
      handled: true,
      message: `Here is our official **Return & Refund Policy**:\n\n• **Fashion & Apparel:** **${retPolicy.fashionReturnWindow}**.\n• **Home & Kitchen:** **${retPolicy.homeKitchenReturnWindow}**.\n• **Electronics & Gadgets:** **${retPolicy.electronicsReturnWindow}**.\n• **Refund Timeline:** ${retPolicy.refundTimeline}\n• **How to Return:** ${retPolicy.howToReturn}.\n• **Cancellation:** ${retPolicy.cancellationPolicy}`,
      products: [],
      actions: [{ type: 'VIEW_ORDER', title: 'Open Purchase History' }],
      toolUsed: 'get_return_policy',
    };
  }

  // 6. STOCK CHECK ("Is this product in stock?", "Check stock")
  if (intent === 'STOCK_CHECK' || m.includes('in stock') || m.includes('stock')) {
    const searchRes = await searchProductsTool({ query: message, limit: 1 });
    if (searchRes.products && searchRes.products.length > 0) {
      const p = searchRes.products[0];
      const stockMsg = p.stock > 0 ? `In Stock (${p.stock} units available)` : 'Currently Out of Stock';
      return {
        handled: true,
        message: `**${p.name}** is **${stockMsg}** from seller **${p.seller}** at **${formatCurrency(p.discountPrice || p.price, currency, exchangeRate)}**.`,
        products: [p],
        actions: [{ type: 'VIEW_PRODUCT', title: 'View Product Details', payload: { productId: p.slug } }],
        toolUsed: 'check_product_availability',
      };
    }
  }

  // 7. PRICE CHECK ("What is the price of this product?")
  if (intent === 'PRICE_CHECK' || m.includes('price of') || m.includes('what is the price')) {
    const searchRes = await searchProductsTool({ query: message, limit: 1 });
    if (searchRes.products && searchRes.products.length > 0) {
      const p = searchRes.products[0];
      const effPrice = formatCurrency(p.discountPrice || p.price, currency, exchangeRate);
      const origPrice = p.discountPrice ? ` (Discounted from ${formatCurrency(p.price, currency, exchangeRate)})` : '';
      return {
        handled: true,
        message: `The price of **${p.name}** is **${effPrice}**${origPrice}. Rating: ${p.rating} ★ (${p.reviewCount} reviews). Stock: ${p.stock > 0 ? 'In Stock' : 'Out of Stock'}.`,
        products: [p],
        actions: [{ type: 'VIEW_PRODUCT', title: 'View Product', payload: { productId: p.slug } }],
        toolUsed: 'get_product_details',
      };
    }
  }

  // 8. ORDER TRACKING ("Where is my order?", "Track my order")
  if (intent === 'ORDER_TRACKING') {
    if (!userContext.userId) {
      return {
        handled: true,
        message: 'To track your order with real-time courier checkpoints, please sign in to your Commerce Engine account.',
        products: [],
        actions: [{ type: 'VIEW_ORDER', title: 'Sign In to View Orders' }],
        toolUsed: 'get_my_orders',
      };
    }

    const orderRes = await executeTool('get_my_orders', { limit: 3 }, userContext);
    if (!orderRes.hasOrders || !orderRes.orders || orderRes.orders.length === 0) {
      return {
        handled: true,
        message: 'You do not have any active orders in your account right now. Check our catalog to place your first order!',
        products: [],
        actions: [{ type: 'EXPLORE_CATALOG', title: 'Browse Products' }],
        toolUsed: 'get_my_orders',
      };
    }

    const latest = orderRes.orders[0];
    const totalFormatted = formatCurrency(latest.total, currency, exchangeRate);
    return {
      handled: true,
      message: `Here is your latest order:\n\n• **Order #${latest.orderNumber}**\n• **Status:** ${latest.status}\n• **Total:** ${totalFormatted}\n• **Items:** ${latest.itemsSummary}\n• **Carrier:** ${latest.carrier} (Tracking: ${latest.trackingNumber || 'Assigned'})\n\nYou can view full delivery milestones in your Account Purchase History.`,
      products: [],
      actions: [{ type: 'VIEW_ORDER', title: 'View Order in Dashboard' }],
      toolUsed: 'get_my_orders',
    };
  }

  // 9. COUPONS ("What coupons are available?")
  if (intent === 'COUPON_HELP') {
    const couponRes = await executeTool('get_active_coupons', {}, userContext);
    const list = couponRes.coupons?.map((c: any) => `• **${c.code}**: ${c.discount} (Min order ${c.minPurchase})`).join('\n') || 'No active coupons.';
    return {
      handled: true,
      message: `Here are the active promo coupons you can apply at checkout:\n\n${list}\n\nEnter any code at checkout or cart to apply the discount!`,
      products: [],
      actions: [{ type: 'VIEW_CART', title: 'Open Cart & Redeem' }],
      toolUsed: 'get_active_coupons',
    };
  }

  // 10. PRODUCT SEARCH / RECOMMENDATIONS / PRICE FILTERS (e.g. "Show me laptops", "Show laptops under ₹60,000", "Which products are highly rated?")
  let priceFilter: number | undefined;
  const priceMatch = m.match(/(?:under|below|less than|lopala|andar)\s*(?:₹|rs\.?|inr)?\s*(\d+(?:,\d+)?)/i);
  if (priceMatch) {
    priceFilter = parseInt(priceMatch[1].replace(/,/g, ''), 10);
  } else if (m.includes('50k')) {
    priceFilter = 50000;
  } else if (m.includes('60k')) {
    priceFilter = 60000;
  } else if (m.includes('30k')) {
    priceFilter = 30000;
  } else if (m.includes('5k')) {
    priceFilter = 5000;
  }

  let minRating: number | undefined;
  if (m.includes('highly rated') || m.includes('best rated') || m.includes('highest rating') || m.includes('top rated')) {
    minRating = 4.7;
  }

  const sortOrder = (m.includes('cheap') || m.includes('budget') || m.includes('affordable')) ? 'price_asc' : 'rating';

  const searchRes = await searchProductsTool({
    query: message,
    maxPrice: priceFilter,
    minRating,
    sort: sortOrder,
    limit: 4,
  });

  const found = searchRes.products || [];

  if (found.length === 0) {
    if (forceExecute) {
      return {
        handled: true,
        message: `I couldn't find any products matching "${message}" in Commerce Engine. You can browse our categories or search for items like "laptops", "headphones", "smartphones", or "shoes".`,
        products: [],
        actions: [{ type: 'EXPLORE_CATALOG', title: 'Explore Marketplace Catalog' }],
        toolUsed: 'search_products',
      };
    }
    return {
      handled: false,
      message: '',
      products: [],
      actions: [],
      toolUsed: 'search_products',
    };
  }

  let intro = `Here are the matching products from our marketplace catalog:`;
  if (priceFilter) {
    intro = `Here are the products under **${formatCurrency(priceFilter, currency, exchangeRate)}**:`;
  } else if (minRating) {
    intro = `Here are our highest-rated products (4.7+ ★):`;
  }

  if (lang === 'te') {
    intro = `మీకోసం కాటలాగ్‌లో లభించే ఉత్తమ ప్రొడక్టులు ఇక్కడ ఉన్నాయి:`;
  } else if (lang === 'hi') {
    intro = `यहाँ आपके लिए हमारे मार्केटप्लेस से सबसे बेहतरीन उत्पाद हैं:`;
  }

  const productListText = found
    .map((p) => {
      const pPrice = formatCurrency(p.discountPrice || p.price, currency, exchangeRate);
      const origPrice = p.discountPrice ? ` ~${formatCurrency(p.price, currency, exchangeRate)}~` : '';
      return `• **${p.name}** — ${pPrice}${origPrice} (${p.rating} ★, ${p.stock > 0 ? 'In Stock' : 'Out of Stock'})`;
    })
    .join('\n');

  return {
    handled: true,
    message: `${intro}\n\n${productListText}`,
    products: found,
    actions: [
      { type: 'COMPARE_PRODUCTS', title: 'Compare Products', payload: { productIds: found.slice(0, 3).map((p) => p.id) } },
    ],
    toolUsed: 'search_products',
  };
}

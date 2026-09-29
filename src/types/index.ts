export type UserRole = 'CUSTOMER' | 'SELLER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string | null;
  sellerProfileId?: string;
  sellerStatus?: string;
  storeName?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  isActive: number;
  productCount?: number;
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  title: string;
  price: number;
  stock: number;
  attributes: Record<string, string>;
}

export interface Product {
  id: string;
  sellerId: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string;
  sku: string;
  price: number;
  discountPrice?: number | null;
  stock: number;
  rating: number;
  reviewCount: number;
  status: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'ARCHIVED';
  isFeatured: number;
  specifications?: Record<string, string>;
  specificationsJson?: string;
  shippingInfo?: string;
  returnInfo?: string;
  images: string[];
  primaryImage: string;
  variants?: ProductVariant[];
  seller?: {
    id: string;
    storeName: string;
    description?: string;
    rating?: number;
    contactEmail?: string;
  };
  category?: {
    id: string;
    name: string;
    slug: string;
  };
  reviews?: Review[];
  relatedProducts?: Product[];
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  variantId?: string | null;
  quantity: number;
  availableStock: number;
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    discountPrice?: number | null;
    stock: number;
    image: string;
    sellerId: string;
  };
  variant?: ProductVariant | null;
}

export interface CartSummary {
  subtotal: number;
  discount: number;
  shippingFee: number;
  tax: number;
  total: number;
  appliedCoupon?: {
    code: string;
    discountAmount: number;
    type: string;
  } | null;
}

export interface Address {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault: number;
}

export interface OrderItem {
  id: string;
  orderId: string;
  sellerOrderId: string;
  productId: string;
  variantId?: string | null;
  productName: string;
  variantTitle?: string | null;
  sku: string;
  price: number;
  quantity: number;
  total: number;
  isReviewed: number;
  image?: string;
  sellerName?: string;
}

export interface ShipmentEvent {
  id: string;
  shipmentId: string;
  status: string;
  location: string;
  description: string;
  eventTime: string;
}

export interface Shipment {
  id: string;
  orderId: string;
  sellerOrderId?: string;
  trackingNumber: string;
  carrier: string;
  status: string;
  estimatedDelivery?: string;
  events?: ShipmentEvent[];
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  status: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED' | 'RETURN_REQUESTED' | 'RETURNED' | 'REFUNDED';
  currency: string;
  exchangeRate: number;
  subtotal: number;
  discount: number;
  shippingFee: number;
  tax: number;
  total: number;
  paymentMethod: 'CASH_ON_DELIVERY' | 'DEMO_CARD';
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  shippingAddressJson: string;
  shippingAddress?: Address;
  notes?: string | null;
  itemCount?: number;
  items?: OrderItem[];
  itemNames?: string[];
  previewImage?: string | null;
  shipments?: Shipment[];
  payment?: {
    id: string;
    method: string;
    status: string;
    transactionReference: string;
    amount: number;
    currency: string;
    simulatedCardLast4?: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  orderId: string;
  orderItemId: string;
  rating: number;
  title: string;
  comment: string;
  createdAt: string;
  user?: {
    id: string;
    name: string;
  };
}

export interface Coupon {
  id: string;
  code: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  minOrderAmount: number;
  maxDiscount?: number | null;
  startDate: string;
  endDate: string;
  usageLimit: number;
  timesUsed: number;
  isActive: number;
}

export interface ReturnRequest {
  id: string;
  orderId: string;
  orderItemId: string;
  customerId: string;
  sellerId: string;
  reason: string;
  comments?: string | null;
  status: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'ITEM_RECEIVED' | 'REFUNDED';
  requestedAt: string;
  resolvedAt?: string | null;
  orderNumber?: string;
  customerName?: string;
  sellerStoreName?: string;
  item?: OrderItem | null;
}

export interface SellerProfile {
  id: string;
  userId: string;
  storeName: string;
  description?: string;
  contactEmail: string;
  contactPhone?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  commissionRate: number;
  rating?: number;
  ownerName?: string;
  ownerEmail?: string;
  productCount?: number;
}

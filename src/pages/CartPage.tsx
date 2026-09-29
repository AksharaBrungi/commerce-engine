import React, { useState } from 'react';
import {
  Trash2,
  ArrowRight,
  ShoppingBag,
  Tag,
  ShieldCheck,
  Check,
  X,
  AlertCircle,
  Truck,
} from 'lucide-react';
import { useCart } from '../context/CartContext.tsx';
import { useCurrency } from '../context/CurrencyContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { Product } from '../types/index.ts';

interface CartPageProps {
  onCheckout: () => void;
  onContinueShopping: () => void;
  onSelectProduct: (product: any) => void;
}

export function CartPage({
  onCheckout,
  onContinueShopping,
  onSelectProduct,
}: CartPageProps) {
  const { items, summary, updateQuantity, removeFromCart, clearCart, applyCoupon, removeCoupon, couponCode } = useCart();
  const { format } = useCurrency();
  const { user } = useAuth();

  const [inputCoupon, setInputCoupon] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  const handleApply = async (code: string) => {
    setCouponLoading(true);
    await applyCoupon(code);
    setCouponLoading(false);
  };

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-5">
        <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl mx-auto flex items-center justify-center">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Your Cart is Empty</h2>
        <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
          Explore our marketplace to discover tech gadgets, stylish apparel, and handcrafted home accessories.
        </p>
        <button
          onClick={onContinueShopping}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-200 transition-all inline-flex items-center gap-2"
        >
          <span>Start Shopping</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Title */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Shopping Cart
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {items.reduce((s, i) => s + i.quantity, 0)} items in your cart
          </p>
        </div>
        <button
          onClick={clearCart}
          className="text-xs font-semibold text-rose-600 hover:text-rose-800 transition-colors"
        >
          Clear Cart
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Cart Items List */}
        <div className="lg:col-span-8 space-y-4">
          {items.map((item) => {
            const itemPrice = item.variant
              ? item.variant.price
              : (item.product.discountPrice || item.product.price);
            const lineTotal = itemPrice * item.quantity;
            const isAtMaxStock = item.quantity >= item.availableStock;

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-all"
              >
                {/* Product Thumbnail */}
                <div
                  onClick={() => onSelectProduct(item.product)}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-slate-100 shrink-0 cursor-pointer border border-slate-100"
                >
                  <img
                    src={item.product.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&auto=format&fit=crop&q=80'}
                    alt={item.product.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Details */}
                <div className="flex-1 space-y-1">
                  <h3
                    onClick={() => onSelectProduct(item.product)}
                    className="font-bold text-sm sm:text-base text-slate-900 hover:text-indigo-600 cursor-pointer transition-colors leading-snug"
                  >
                    {item.product.name}
                  </h3>
                  {item.variant && (
                    <span className="inline-block text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                      Variant: {item.variant.title}
                    </span>
                  )}
                  <div className="flex items-center gap-2 pt-1 text-xs">
                    <span className="font-bold text-slate-900">{format(itemPrice)}</span>
                    <span className="text-slate-400">× {item.quantity}</span>
                  </div>

                  {item.availableStock <= 5 && (
                    <p className="text-[11px] text-amber-600 font-medium">
                      Only {item.availableStock} available in stock
                    </p>
                  )}
                </div>

                {/* Quantity Controls & Line Total */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100"
                    >
                      -
                    </button>
                    <span className="px-3 py-1 text-xs font-bold text-slate-900 select-none">
                      {item.quantity}
                    </span>
                    <button
                      disabled={isAtMaxStock}
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      +
                    </button>
                  </div>

                  <div className="text-right">
                    <span className="font-extrabold text-sm sm:text-base text-slate-900 block">
                      {format(lineTotal)}
                    </span>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-[11px] font-medium text-slate-400 hover:text-rose-600 flex items-center gap-1 mt-0.5 ml-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          <button
            onClick={onContinueShopping}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 pt-2"
          >
            <span>← Continue Shopping</span>
          </button>
        </div>

        {/* Order Summary & Coupon Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          {/* Coupon Box */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-3">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-indigo-600" />
              Apply Discount Coupon
            </span>

            {couponCode ? (
              <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <div>
                    <span className="font-bold text-xs text-emerald-900 font-mono">{couponCode}</span>
                    <p className="text-[11px] text-emerald-700">Coupon discount applied</p>
                  </div>
                </div>
                <button
                  onClick={removeCoupon}
                  className="p-1 text-emerald-700 hover:text-emerald-900 text-xs font-bold"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. SAVE500"
                  value={inputCoupon}
                  onChange={(e) => setInputCoupon(e.target.value.toUpperCase())}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono uppercase text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                />
                <button
                  disabled={couponLoading || !inputCoupon.trim()}
                  onClick={() => handleApply(inputCoupon)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold disabled:bg-slate-200 disabled:text-slate-400 transition-colors"
                >
                  {couponLoading ? '...' : 'Apply'}
                </button>
              </div>
            )}

            {/* Quick Click Sample Coupons */}
            <div className="pt-2 border-t border-slate-100">
              <span className="text-[10px] text-slate-400 font-medium block mb-1.5">Quick Demo Coupons:</span>
              <div className="flex flex-wrap gap-1.5">
                {['SAVE500', 'WELCOME10', 'MEGA50', 'FREESHIP'].map((code) => (
                  <button
                    key={code}
                    onClick={() => {
                      setInputCoupon(code);
                      handleApply(code);
                    }}
                    className="text-[10px] font-mono font-semibold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 px-2 py-1 rounded-md border border-slate-200 transition-colors"
                  >
                    {code}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Totals Summary */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              Order Summary
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-semibold text-slate-900">{format(summary.subtotal)}</span>
              </div>

              {summary.discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Coupon Discount:</span>
                  <span>-{format(summary.discount)}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <span className="flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5" />
                  Estimated Delivery:
                </span>
                <span className="font-semibold text-slate-900">
                  {summary.shippingFee === 0 ? 'FREE' : format(summary.shippingFee)}
                </span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>Marketplace Taxes (GST 5%):</span>
                <span className="font-semibold text-slate-900">{format(summary.tax)}</span>
              </div>

              <div className="border-t border-slate-200 pt-3 mt-3 flex justify-between text-base font-extrabold text-slate-900">
                <span>Estimated Total:</span>
                <span className="text-indigo-600 text-lg">{format(summary.total)}</span>
              </div>
            </div>

            <button
              onClick={onCheckout}
              className="w-full py-4 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Safe & simulated sandbox checkout</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Banknote,
  CheckCircle2,
  ShieldCheck,
  Truck,
  ArrowRight,
  AlertCircle,
  MapPin,
  Plus,
  ArrowLeft,
  Package,
} from 'lucide-react';
import { useCart } from '../context/CartContext.tsx';
import { useCurrency } from '../context/CurrencyContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { Address } from '../types/index.ts';

interface CheckoutPageProps {
  onOrderSuccess: (orderId: string) => void;
  onBackToCart: () => void;
  onOpenAuth: () => void;
}

export function CheckoutPage({
  onOrderSuccess,
  onBackToCart,
  onOpenAuth,
}: CheckoutPageProps) {
  const { items, summary, couponCode, refreshCart } = useCart();
  const { format, currency } = useCurrency();
  const { user, token } = useAuth();
  const { error, success } = useToast();

  // Step state: 1. Address, 2. Payment, 3. Success
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [useNewAddress, setUseNewAddress] = useState(false);

  // New address fields
  const [fullName, setFullName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '+91 9876543210');
  const [addressLine1, setAddressLine1] = useState('Flat 402, Skyline Residency');
  const [addressLine2, setAddressLine2] = useState('Koramangala 4th Block');
  const [city, setCity] = useState('Bengaluru');
  const [state, setState] = useState('Karnataka');
  const [pincode, setPincode] = useState('560034');
  const [country] = useState('India');

  // Shipping method
  const [shippingMethod, setShippingMethod] = useState<'standard' | 'express'>('standard');

  // Payment simulator
  const [paymentMethod, setPaymentMethod] = useState<'DEMO_CARD' | 'CASH_ON_DELIVERY'>('DEMO_CARD');
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('123');
  const [cardName, setCardName] = useState(user?.name || 'John Doe');
  const [simulateCardSuccess, setSimulateCardSuccess] = useState(true);

  const [orderNotes, setOrderNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<any>(null);

  // Load saved addresses for user
  useEffect(() => {
    async function loadAddresses() {
      if (!token) return;
      try {
        const res = await fetch('/api/auth/addresses', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setSavedAddresses(data.addresses || []);
          if (data.addresses && data.addresses.length > 0) {
            setSelectedAddressId(data.addresses[0].id);
          } else {
            setUseNewAddress(true);
          }
        }
      } catch {}
    }
    loadAddresses();
  }, [token]);

  if (!user) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-white rounded-3xl border border-slate-200 shadow-md text-center space-y-4">
        <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl mx-auto flex items-center justify-center">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Sign In to Continue</h2>
        <p className="text-xs text-slate-500">
          Please sign in or use a 1-click demo account to proceed with delivery details and order placement.
        </p>
        <button
          onClick={onOpenAuth}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors"
        >
          Sign In / Demo Login
        </button>
      </div>
    );
  }

  if (items.length === 0 && step !== 3) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-white rounded-3xl border border-slate-200 shadow-md text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Your Cart is Empty</h2>
        <p className="text-xs text-slate-500">Add products to your cart before proceeding to checkout.</p>
        <button
          onClick={onBackToCart}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
        >
          Back to Cart
        </button>
      </div>
    );
  }

  const getActiveShippingAddress = () => {
    if (!useNewAddress && selectedAddressId) {
      const match = savedAddresses.find((a) => a.id === selectedAddressId);
      if (match) return match;
    }
    return {
      fullName,
      phone,
      addressLine1,
      addressLine2,
      city,
      state,
      pincode,
      country,
    };
  };

  const handlePlaceOrder = async () => {
    const shippingAddress = getActiveShippingAddress();

    if (!shippingAddress.fullName || !shippingAddress.addressLine1 || !shippingAddress.city || !shippingAddress.pincode) {
      error('Please complete all required shipping address fields.');
      setStep(1);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/checkout/place-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          shippingAddress,
          shippingMethod,
          paymentMethod,
          simulateCardSuccess,
          cardDetails: { number: cardNumber, expiry: cardExpiry, cvv: cardCvv, name: cardName },
          couponCode: couponCode || undefined,
          currency,
          notes: orderNotes || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        error(data.error || 'Failed to place order.');
        setIsSubmitting(false);
        return;
      }

      success('Order placed successfully!');
      setCompletedOrder(data);
      setStep(3);
      await refreshCart();
    } catch (err: any) {
      error('Order checkout encountered an error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 3: Order Confirmation
  if (step === 3 && completedOrder) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6 animate-in zoom-in-95">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl mx-auto flex items-center justify-center shadow-lg shadow-emerald-100">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Order Confirmed!</h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            Your order has been recorded in the database. Product inventory was automatically decremented and seller suborders created.
          </p>
        </div>

        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200 text-xs text-left space-y-3">
          <div className="flex justify-between border-b border-slate-200 pb-2">
            <span className="text-slate-500">Order Number:</span>
            <span className="font-mono font-bold text-indigo-700 text-sm">{completedOrder.orderNumber}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200 pb-2">
            <span className="text-slate-500">Order Total:</span>
            <span className="font-bold text-slate-900 text-sm">{format(completedOrder.total)}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200 pb-2">
            <span className="text-slate-500">Payment Status:</span>
            <span className="font-bold text-emerald-700">{completedOrder.paymentStatus}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Fulfillment:</span>
            <span className="font-medium text-slate-800">Dispatching via Express Logistics</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => onOrderSuccess(completedOrder.orderId)}
            className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-200 transition-colors flex items-center justify-center gap-2"
          >
            <Package className="w-4 h-4" />
            <span>View Order Details & Tracking</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Checkout Progress Stepper */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <button onClick={onBackToCart} className="text-xs font-semibold text-slate-500 hover:text-indigo-600 flex items-center gap-1 mb-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Cart</span>
          </button>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Checkout</h1>
        </div>

        <div className="flex items-center gap-3 text-xs font-bold">
          <span className={`px-3 py-1 rounded-full ${step === 1 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
            1. Delivery
          </span>
          <span className="text-slate-300">→</span>
          <span className={`px-3 py-1 rounded-full ${step === 2 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
            2. Payment
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Flow Steps */}
        <div className="lg:col-span-8 space-y-6">
          {step === 1 ? (
            /* STEP 1: Delivery Address */
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-6">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-900">Select Shipping Destination</h2>
              </div>

              {/* Saved Addresses */}
              {savedAddresses.length > 0 && !useNewAddress && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {savedAddresses.map((addr) => (
                      <div
                        key={addr.id}
                        onClick={() => setSelectedAddressId(addr.id)}
                        className={`p-4 rounded-2xl border text-xs cursor-pointer transition-all ${
                          selectedAddressId === addr.id
                            ? 'border-indigo-600 bg-indigo-50/50 shadow-xs ring-1 ring-indigo-500'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold text-slate-900 mb-1">
                          <span>{addr.fullName}</span>
                          {addr.isDefault === 1 && (
                            <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">Default</span>
                          )}
                        </div>
                        <p className="text-slate-600 leading-relaxed">{addr.addressLine1}</p>
                        {addr.addressLine2 && <p className="text-slate-600">{addr.addressLine2}</p>}
                        <p className="text-slate-600">{addr.city}, {addr.state} - {addr.pincode}</p>
                        <p className="text-slate-500 mt-1 font-mono">Ph: {addr.phone}</p>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setUseNewAddress(true)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 pt-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Enter a different address</span>
                  </button>
                </div>
              )}

              {/* New Address Form */}
              {(useNewAddress || savedAddresses.length === 0) && (
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Phone Number *</label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Address Line 1 *</label>
                    <input
                      type="text"
                      required
                      placeholder="Street address, apartment, suite"
                      value={addressLine1}
                      onChange={(e) => setAddressLine1(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Address Line 2 (Optional)</label>
                    <input
                      type="text"
                      placeholder="Landmark, building number"
                      value={addressLine2}
                      onChange={(e) => setAddressLine2(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">City *</label>
                      <input
                        type="text"
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">State *</label>
                      <input
                        type="text"
                        required
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Pincode *</label>
                      <input
                        type="text"
                        required
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
                      />
                    </div>
                  </div>

                  {savedAddresses.length > 0 && (
                    <button
                      onClick={() => setUseNewAddress(false)}
                      className="text-xs font-medium text-slate-500 hover:text-slate-800"
                    >
                      ← Use one of your saved addresses
                    </button>
                  )}
                </div>
              )}

              {/* Shipping Method Selection */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Delivery Speed:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div
                    onClick={() => setShippingMethod('standard')}
                    className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between ${
                      shippingMethod === 'standard'
                        ? 'border-indigo-600 bg-indigo-50/50'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <span className="font-bold text-slate-900 block">Standard Delivery</span>
                      <span className="text-slate-500 text-[11px]">Estimated 2-4 business days</span>
                    </div>
                    <span className="font-bold text-slate-900">
                      {summary.subtotal >= 999 ? 'FREE' : format(99)}
                    </span>
                  </div>

                  <div
                    onClick={() => setShippingMethod('express')}
                    className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between ${
                      shippingMethod === 'express'
                        ? 'border-indigo-600 bg-indigo-50/50'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <span className="font-bold text-slate-900 block">Priority Express Air</span>
                      <span className="text-slate-500 text-[11px]">Guaranteed 24-48 hour delivery</span>
                    </div>
                    <span className="font-bold text-slate-900">{format(199)}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-200 transition-colors flex items-center justify-center gap-2"
              >
                <span>Continue to Payment</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* STEP 2: Sandbox Payment Simulator */
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-base font-bold text-slate-900">Sandbox Payment Simulator</h2>
                </div>
                <button
                  onClick={() => setStep(1)}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  Edit Address
                </button>
              </div>

              {/* Payment Method Selector */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('DEMO_CARD')}
                  className={`p-4 rounded-2xl border text-left flex items-start gap-3 transition-colors ${
                    paymentMethod === 'DEMO_CARD'
                      ? 'border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-500'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <CreditCard className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 block">Simulated Card</span>
                    <span className="text-[11px] text-slate-500">Test Visa / MasterCard Sandbox</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH_ON_DELIVERY')}
                  className={`p-4 rounded-2xl border text-left flex items-start gap-3 transition-colors ${
                    paymentMethod === 'CASH_ON_DELIVERY'
                      ? 'border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-500'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Banknote className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 block">Cash on Delivery</span>
                    <span className="text-[11px] text-slate-500">Pay cash upon parcel delivery</span>
                  </div>
                </button>
              </div>

              {/* Card Simulator Details */}
              {paymentMethod === 'DEMO_CARD' && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                    <span className="font-bold text-indigo-900">Sandbox Test Credentials (Pre-filled)</span>
                    <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[10px] font-bold">NO REAL CARD DATA</span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Card Number</label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Expiry Date</label>
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">CVV</label>
                        <input
                          type="text"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Simulator outcome toggle */}
                  <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-700">Simulate Payment Outcome:</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSimulateCardSuccess(true)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                          simulateCardSuccess
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        Success
                      </button>
                      <button
                        type="button"
                        onClick={() => setSimulateCardSuccess(false)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                          !simulateCardSuccess
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        Fail (Decline)
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Order Notes */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Delivery Instructions (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Leave with security guard, door code 1234..."
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="py-3.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                >
                  Back
                </button>
                <button
                  disabled={isSubmitting}
                  onClick={handlePlaceOrder}
                  className="flex-1 py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-200 transition-colors flex items-center justify-center gap-2 disabled:bg-slate-200 disabled:text-slate-400"
                >
                  {isSubmitting ? (
                    <span>Verifying stock & processing...</span>
                  ) : (
                    <>
                      <span>Confirm & Place Order ({format(summary.total)})</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Order Summary Preview */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
            Items in Order ({items.length})
          </h3>

          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {items.map((i) => {
              const price = i.variant ? i.variant.price : (i.product.discountPrice || i.product.price);
              return (
                <div key={i.id} className="flex items-center gap-3 text-xs">
                  <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-100">
                    <img src={i.product.image} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{i.product.name}</p>
                    {i.variant && <p className="text-[10px] text-slate-500">Variant: {i.variant.title}</p>}
                    <p className="text-slate-500">{i.quantity} × {format(price)}</p>
                  </div>
                  <span className="font-bold text-slate-900 shrink-0">
                    {format(price * i.quantity)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="border-t border-slate-100 pt-3 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-medium text-slate-900">{format(summary.subtotal)}</span>
            </div>
            {summary.discount > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Coupon Discount ({couponCode}):</span>
                <span>-{format(summary.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>Shipping ({shippingMethod}):</span>
              <span className="font-medium text-slate-900">
                {shippingMethod === 'express' ? format(199) : (summary.subtotal >= 999 ? 'FREE' : format(99))}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Marketplace Tax (5%):</span>
              <span className="font-medium text-slate-900">{format(summary.tax)}</span>
            </div>
            <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-extrabold text-slate-900">
              <span>Total Payable:</span>
              <span className="text-indigo-600 text-base">{format(summary.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

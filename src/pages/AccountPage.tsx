import React, { useState, useEffect, useCallback } from 'react';
import {
  Package,
  MapPin,
  Heart,
  Star,
  RotateCcw,
  User as UserIcon,
  Printer,
  X,
  CheckCircle2,
  Clock,
  Truck,
  Plus,
  Trash2,
  ShoppingBag,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useCurrency } from '../context/CurrencyContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { useCart } from '../context/CartContext.tsx';
import { useWishlist } from '../context/WishlistContext.tsx';
import { Order, Address, ReturnRequest } from '../types/index.ts';
import { PrintableReceipt } from '../components/PrintableReceipt.tsx';

interface AccountPageProps {
  onSelectProduct: (product: any) => void;
  onExploreCatalog: () => void;
}

export function AccountPage({ onSelectProduct, onExploreCatalog }: AccountPageProps) {
  const { user, token, refreshProfile } = useAuth();
  const { format } = useCurrency();
  const { success, error } = useToast();
  const { addToCart } = useCart();
  const { wishlistItems, removeFromWishlist } = useWishlist();

  const [activeTab, setActiveTab] = useState<'orders' | 'addresses' | 'wishlist' | 'returns' | 'profile'>('orders');

  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrderForReceipt, setSelectedOrderForReceipt] = useState<Order | null>(null);
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<Order | null>(null);

  // Review Modal State
  const [reviewModalItem, setReviewModalItem] = useState<{ productId: string; orderId: string; orderItemId: string; name: string } | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Return Modal State
  const [returnModalItem, setReturnModalItem] = useState<{ orderId: string; orderItemId: string; name: string } | null>(null);
  const [returnReason, setReturnReason] = useState('Defective or damaged item');
  const [returnComments, setReturnComments] = useState('');
  const [submittingReturn, setSubmittingReturn] = useState(false);

  // Addresses State
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const [newAddrFullName, setNewAddrFullName] = useState('');
  const [newAddrPhone, setNewAddrPhone] = useState('');
  const [newAddrLine1, setNewAddrLine1] = useState('');
  const [newAddrLine2, setNewAddrLine2] = useState('');
  const [newAddrCity, setNewAddrCity] = useState('');
  const [newAddrState, setNewAddrState] = useState('');
  const [newAddrPincode, setNewAddrPincode] = useState('');
  const [newAddrIsDefault, setNewAddrIsDefault] = useState(false);

  // Returns State
  const [customerReturns, setCustomerReturns] = useState<ReturnRequest[]>([]);

  // Profile Edit State
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');

  const fetchOrders = useCallback(async () => {
    if (!token) return;
    setOrdersLoading(true);
    try {
      const res = await fetch('/api/orders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch {}
    setOrdersLoading(false);
  }, [token]);

  const fetchAddresses = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/auth/addresses', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAddresses(data.addresses || []);
      }
    } catch {}
  }, [token]);

  const fetchReturns = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/returns', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCustomerReturns(data.returns || []);
      }
    } catch {}
  }, [token]);

  useEffect(() => {
    fetchOrders();
    fetchAddresses();
    fetchReturns();
  }, [fetchOrders, fetchAddresses, fetchReturns]);

  // Order Details Modal loader (with optional silent refresh)
  const handleViewOrderDetail = async (orderId: string, showToastOnError = true) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedOrderForDetail(data.order);
      }
    } catch {
      if (showToastOnError) {
        error('Failed to load order details.');
      }
    }
  };

  // Auto-refresh orders dynamically so status changes from admin immediately reflect
  useEffect(() => {
    const interval = setInterval(() => {
      if (token && activeTab === 'orders') {
        fetchOrders();
      }
      if (token && selectedOrderForDetail) {
        handleViewOrderDetail(selectedOrderForDetail.id, false);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [token, activeTab, fetchOrders, selectedOrderForDetail]);

  // Window focus listener: immediately fetch latest status when user switches back to this tab
  useEffect(() => {
    const handleFocus = () => {
      if (token) {
        fetchOrders();
        if (selectedOrderForDetail) {
          handleViewOrderDetail(selectedOrderForDetail.id, false);
        }
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [token, fetchOrders, selectedOrderForDetail]);

  // Order Cancellation (Restores Stock!)
  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel this order? Items will be released back to stock.')) return;
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        success('Order cancelled and inventory restored.');
        await fetchOrders();
        if (selectedOrderForDetail?.id === orderId) {
          setSelectedOrderForDetail(null);
        }
      } else {
        error(data.error || 'Failed to cancel order.');
      }
    } catch {
      error('Error cancelling order.');
    }
  };

  // Review submission
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewModalItem) return;
    setSubmittingReview(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: reviewModalItem.productId,
          orderId: reviewModalItem.orderId,
          orderItemId: reviewModalItem.orderItemId,
          rating: reviewRating,
          title: reviewTitle,
          comment: reviewComment,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        success('Review submitted successfully!');
        setReviewModalItem(null);
        setReviewTitle('');
        setReviewComment('');
        await fetchOrders();
      } else {
        error(data.error || 'Failed to submit review.');
      }
    } catch {
      error('Error submitting review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Return request submission
  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnModalItem) return;
    setSubmittingReturn(true);
    try {
      const res = await fetch('/api/returns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderId: returnModalItem.orderId,
          orderItemId: returnModalItem.orderItemId,
          reason: returnReason,
          comments: returnComments,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        success('Return request submitted.');
        setReturnModalItem(null);
        setReturnComments('');
        await fetchReturns();
      } else {
        error(data.error || 'Could not submit return request.');
      }
    } catch {
      error('Error requesting return.');
    } finally {
      setSubmittingReturn(false);
    }
  };

  // Add Address
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/addresses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: newAddrFullName,
          phone: newAddrPhone,
          addressLine1: newAddrLine1,
          addressLine2: newAddrLine2,
          city: newAddrCity,
          state: newAddrState,
          pincode: newAddrPincode,
          isDefault: newAddrIsDefault,
        }),
      });
      if (res.ok) {
        success('Address added successfully!');
        setShowAddAddressModal(false);
        fetchAddresses();
      } else {
        error('Failed to save address.');
      }
    } catch {
      error('Failed to save address.');
    }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      await fetch(`/api/auth/addresses/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      success('Address removed.');
      fetchAddresses();
    } catch {
      error('Failed to delete address.');
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: profileName, phone: profilePhone }),
      });
      if (res.ok) {
        success('Profile updated.');
        await refreshProfile();
      } else {
        error('Failed to update profile.');
      }
    } catch {
      error('Failed to update profile.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Printable Receipt Modal */}
      {selectedOrderForReceipt && (
        <PrintableReceipt
          order={selectedOrderForReceipt}
          onClose={() => setSelectedOrderForReceipt(null)}
        />
      )}

      {/* Account Header */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white font-extrabold text-xl flex items-center justify-center shadow-md shadow-indigo-200">
            {user?.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{user?.name}</h1>
            <p className="text-xs text-slate-500 mt-0.5">{user?.email}</p>
            <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full">
              {user?.role} ACCOUNT
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'orders' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            My Orders
          </button>
          <button
            onClick={() => setActiveTab('addresses')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'addresses' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Addresses
          </button>
          <button
            onClick={() => setActiveTab('wishlist')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'wishlist' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Wishlist
          </button>
          <button
            onClick={() => setActiveTab('returns')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'returns' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Returns
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'profile' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Settings
          </button>
        </div>
      </div>

      {/* TAB 1: Orders History */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Purchase History</h2>
              <span className="text-xs text-slate-500">{orders.length} orders total</span>
            </div>
            <button
              onClick={() => fetchOrders()}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs flex items-center gap-1.5 font-semibold border border-slate-200 transition-colors"
              title="Refresh status from marketplace operations"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${ordersLoading ? 'animate-spin text-indigo-600' : ''}`} />
              <span>Refresh Status</span>
            </button>
          </div>

          {ordersLoading ? (
            <div className="text-center py-12 text-slate-400 text-xs">Loading order history...</div>
          ) : orders.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
              <Package className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="font-bold text-slate-800 text-sm">No orders yet</h3>
              <p className="text-xs text-slate-500">Your completed purchases and tracking events will appear here.</p>
              <button
                onClick={onExploreCatalog}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
              >
                Browse Marketplace
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((ord) => {
                const canCancel = ['PENDING', 'CONFIRMED', 'PROCESSING'].includes(ord.status);
                const isDelivered = ord.status === 'DELIVERED';

                return (
                  <div
                    key={ord.id}
                    className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-sm text-slate-900">{ord.orderNumber}</span>
                          <span
                            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                              ord.status === 'DELIVERED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : ord.status === 'CANCELLED'
                                ? 'bg-rose-100 text-rose-800'
                                : ord.status === 'SHIPPED'
                                ? 'bg-blue-100 text-blue-800'
                                : ord.status === 'OUT_FOR_DELIVERY'
                                ? 'bg-cyan-100 text-cyan-800'
                                : ord.status === 'PROCESSING'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-indigo-100 text-indigo-800'
                            }`}
                          >
                            {ord.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Placed on {new Date(ord.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-base font-extrabold text-slate-900 mr-2">
                          {format(ord.total)}
                        </span>
                        <button
                          onClick={() => setSelectedOrderForReceipt(ord)}
                          className="p-2 text-slate-600 hover:text-indigo-600 rounded-xl hover:bg-slate-100 text-xs font-semibold flex items-center gap-1 border border-slate-200"
                          title="Print Receipt"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Receipt</span>
                        </button>
                        <button
                          onClick={() => handleViewOrderDetail(ord.id)}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold"
                        >
                          Details & Tracking
                        </button>
                        {canCancel && (
                          <button
                            onClick={() => handleCancelOrder(ord.id)}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold border border-rose-200"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Order summary row */}
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <div>
                        <p className="truncate max-w-md">
                          {ord.itemNames?.join(', ') || `${ord.itemCount || 1} items ordered`}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Payment: {ord.paymentMethod === 'DEMO_CARD' ? 'Card' : 'COD'} ({ord.paymentStatus})
                        </p>
                      </div>

                      {isDelivered && (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Eligible for review & returns
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Addresses Management */}
      {activeTab === 'addresses' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Saved Addresses</h2>
            <button
              onClick={() => setShowAddAddressModal(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Address</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-2 relative text-xs"
              >
                <div className="flex items-center justify-between font-bold text-slate-900">
                  <span>{addr.fullName}</span>
                  {addr.isDefault === 1 && (
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                      Default
                    </span>
                  )}
                </div>
                <p className="text-slate-600">{addr.addressLine1}</p>
                {addr.addressLine2 && <p className="text-slate-600">{addr.addressLine2}</p>}
                <p className="text-slate-600">{addr.city}, {addr.state} - {addr.pincode}</p>
                <p className="text-slate-500 font-mono">Ph: {addr.phone}</p>

                <div className="pt-2 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => handleDeleteAddress(addr.id)}
                    className="text-slate-400 hover:text-rose-600 flex items-center gap-1 text-[11px]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Wishlist */}
      {activeTab === 'wishlist' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Saved Wishlist Items</h2>
            <span className="text-xs text-slate-500">{wishlistItems.length} items</span>
          </div>

          {wishlistItems.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
              <Heart className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="font-bold text-slate-800 text-sm">Your wishlist is empty</h3>
              <p className="text-xs text-slate-500">Save products to revisit later or move straight into your cart.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {wishlistItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div
                      onClick={() => onSelectProduct(item)}
                      className="aspect-square rounded-xl overflow-hidden bg-slate-100 cursor-pointer"
                    >
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <h4
                      onClick={() => onSelectProduct(item)}
                      className="font-bold text-xs sm:text-sm text-slate-900 line-clamp-2 hover:text-indigo-600 cursor-pointer"
                    >
                      {item.name}
                    </h4>
                    <p className="font-extrabold text-slate-900 text-sm">{format(item.price)}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 mt-3">
                    <button
                      onClick={() => {
                        addToCart(item.productId, null, 1);
                        removeFromWishlist(item.productId);
                      }}
                      className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Move to Cart</span>
                    </button>
                    <button
                      onClick={() => removeFromWishlist(item.productId)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Customer Return Requests */}
      {activeTab === 'returns' && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Your Return Requests</h2>
          {customerReturns.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-xs text-slate-500">
              No return requests filed. Eligible items in delivered orders can request returns from Order Details.
            </div>
          ) : (
            <div className="space-y-3">
              {customerReturns.map((r) => (
                <div key={r.id} className="p-4 bg-white rounded-2xl border border-slate-200/80 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">Order #{r.orderNumber}</span>
                    <span className="font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      Status: {r.status}
                    </span>
                  </div>
                  <p className="text-slate-600">Reason: <span className="font-medium text-slate-800">{r.reason}</span></p>
                  {r.comments && <p className="text-slate-500 italic">"{r.comments}"</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: Profile Settings */}
      {activeTab === 'profile' && (
        <div className="max-w-md bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Account Profile</h2>
          <form onSubmit={handleUpdateProfile} className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Full Name</label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Phone Number</label>
              <input
                type="tel"
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Email (Immutable)</label>
              <input
                type="text"
                disabled
                value={user?.email || ''}
                className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-500 cursor-not-allowed"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-xs hover:bg-indigo-700 transition-colors"
            >
              Update Profile
            </button>
          </form>
        </div>
      )}

      {/* ORDER DETAILS & TRACKING MODAL */}
      {selectedOrderForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-6 my-8">
            <button
              onClick={() => setSelectedOrderForDetail(null)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">Order Status & Tracking</span>
                <button
                  onClick={() => handleViewOrderDetail(selectedOrderForDetail.id)}
                  className="text-[11px] font-semibold text-slate-500 hover:text-indigo-600 flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Refresh</span>
                </button>
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 mt-1">
                Order #{selectedOrderForDetail.orderNumber}
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-1.5 flex-wrap">
                <span>Status: <strong className={`font-bold px-2.5 py-0.5 rounded-full text-[11px] ${
                  selectedOrderForDetail.status === 'DELIVERED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : selectedOrderForDetail.status === 'CANCELLED'
                    ? 'bg-rose-100 text-rose-800'
                    : selectedOrderForDetail.status === 'SHIPPED'
                    ? 'bg-blue-100 text-blue-800'
                    : selectedOrderForDetail.status === 'OUT_FOR_DELIVERY'
                    ? 'bg-cyan-100 text-cyan-800'
                    : selectedOrderForDetail.status === 'PROCESSING'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-indigo-100 text-indigo-800'
                }`}>{selectedOrderForDetail.status}</strong></span>
                <span>•</span>
                <span>Payment: <strong className="text-emerald-700">{selectedOrderForDetail.paymentStatus}</strong></span>
              </div>
            </div>

            {/* Shipment Tracking Timeline */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-indigo-600" />
                Live Courier Timeline
              </span>

              {selectedOrderForDetail.shipments && selectedOrderForDetail.shipments.length > 0 ? (
                <div className="space-y-3 text-xs">
                  {selectedOrderForDetail.shipments.map((shp) => (
                    <div key={shp.id} className="space-y-2">
                      <div className="flex justify-between text-slate-600 text-[11px]">
                        <span>Carrier: <strong>{shp.carrier}</strong></span>
                        <span className="font-mono">Tracking: {shp.trackingNumber}</span>
                      </div>

                      {/* Timeline Events */}
                      <div className="border-l-2 border-indigo-400 pl-3 ml-1.5 space-y-2 mt-2">
                        {shp.events && shp.events.length > 0 ? (
                          shp.events.map((ev, i) => (
                            <div key={ev.id || i} className="relative">
                              <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-600 ring-2 ring-white"></div>
                              <span className="font-bold text-slate-900 block">{ev.status} - {ev.location}</span>
                              <p className="text-[11px] text-slate-500">{ev.description}</p>
                              <span className="text-[10px] text-slate-400">{new Date(ev.eventTime).toLocaleString()}</span>
                            </div>
                          ))
                        ) : (
                          <div className="text-slate-400 text-xs">Package is being prepared at fulfillment station.</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">Order confirmed. Preparing shipment dispatch.</p>
              )}
            </div>

            {/* Items Breakdown with Review & Return Actions */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Ordered Products</h3>
              <div className="space-y-2">
                {selectedOrderForDetail.items?.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-900">{item.productName}</p>
                      {item.variantTitle && <span className="text-[11px] text-slate-500">Variant: {item.variantTitle}</span>}
                      <p className="text-slate-400 text-[11px]">Qty: {item.quantity} • {format(item.price)} each</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {selectedOrderForDetail.status === 'DELIVERED' && (
                        <>
                          <button
                            onClick={() =>
                              setReviewModalItem({
                                productId: item.productId,
                                orderId: selectedOrderForDetail.id,
                                orderItemId: item.id,
                                name: item.productName,
                              })
                            }
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold flex items-center gap-1"
                          >
                            <Star className="w-3 h-3 fill-current" />
                            <span>{item.isReviewed ? 'Reviewed' : 'Review'}</span>
                          </button>

                          <button
                            onClick={() =>
                              setReturnModalItem({
                                orderId: selectedOrderForDetail.id,
                                orderItemId: item.id,
                                name: item.productName,
                              })
                            }
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Return</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="pt-2 border-t border-slate-100 flex justify-between text-sm font-extrabold text-slate-900">
              <span>Order Total Paid:</span>
              <span className="text-indigo-600">{format(selectedOrderForDetail.total)}</span>
            </div>
          </div>
        </div>
      )}

      {/* WRITE REVIEW MODAL */}
      {reviewModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-xl p-6 space-y-4">
            <button onClick={() => setReviewModalItem(null)} className="absolute top-4 right-4 text-slate-400">
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-bold text-slate-900 text-base">Write Verified Review</h3>
            <p className="text-xs text-slate-500">{reviewModalItem.name}</p>

            <form onSubmit={handleSubmitReview} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Rating</label>
                <div className="flex gap-1 text-amber-500">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setReviewRating(star)}
                      className="p-1"
                    >
                      <Star className={`w-5 h-5 ${star <= reviewRating ? 'fill-current' : 'text-slate-200'}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Headline</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Excellent build quality and design"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Feedback Comments</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Write your detailed review about durability, performance, and features..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submittingReview}
                className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-xs hover:bg-indigo-700 disabled:bg-slate-300"
              >
                {submittingReview ? 'Submitting...' : 'Submit Verified Review'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* RETURN REQUEST MODAL */}
      {returnModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-xl p-6 space-y-4">
            <button onClick={() => setReturnModalItem(null)} className="absolute top-4 right-4 text-slate-400">
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-bold text-slate-900 text-base">Request Item Return</h3>
            <p className="text-xs text-slate-500">{returnModalItem.name}</p>

            <form onSubmit={handleSubmitReturn} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Reason for Return</label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none cursor-pointer"
                >
                  <option value="Defective or damaged item">Defective or damaged item</option>
                  <option value="Incorrect item or variant delivered">Incorrect item or variant delivered</option>
                  <option value="Item not as described">Item not as described</option>
                  <option value="Size or fit issue">Size or fit issue</option>
                  <option value="No longer needed">No longer needed</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Additional Comments</label>
                <textarea
                  rows={3}
                  placeholder="Provide any details to help the merchant process your return quickly..."
                  value={returnComments}
                  onChange={(e) => setReturnComments(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submittingReturn}
                className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-bold shadow-xs hover:bg-slate-800 disabled:bg-slate-300"
              >
                {submittingReturn ? 'Submitting...' : 'Submit Return Request'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ADD ADDRESS MODAL */}
      {showAddAddressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-xl p-6 space-y-4">
            <button onClick={() => setShowAddAddressModal(false)} className="absolute top-4 right-4 text-slate-400">
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-bold text-slate-900 text-base">Add Delivery Address</h3>

            <form onSubmit={handleSaveAddress} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newAddrFullName}
                  onChange={(e) => setNewAddrFullName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Phone</label>
                <input
                  type="tel"
                  required
                  value={newAddrPhone}
                  onChange={(e) => setNewAddrPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Address Line 1</label>
                <input
                  type="text"
                  required
                  value={newAddrLine1}
                  onChange={(e) => setNewAddrLine1(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Address Line 2 (Optional)</label>
                <input
                  type="text"
                  value={newAddrLine2}
                  onChange={(e) => setNewAddrLine2(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={newAddrCity}
                    onChange={(e) => setNewAddrCity(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">State</label>
                  <input
                    type="text"
                    required
                    value={newAddrState}
                    onChange={(e) => setNewAddrState(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Pincode</label>
                  <input
                    type="text"
                    required
                    value={newAddrPincode}
                    onChange={(e) => setNewAddrPincode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 outline-none"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={newAddrIsDefault}
                  onChange={(e) => setNewAddrIsDefault(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <span className="text-slate-700 font-medium">Set as default delivery address</span>
              </label>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-xs hover:bg-indigo-700"
              >
                Save Address
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

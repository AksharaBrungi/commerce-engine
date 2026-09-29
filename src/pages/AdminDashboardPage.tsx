import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Package,
  Users,
  Store,
  Tag,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Plus,
  Trash2,
  Edit2,
  Search,
  Check,
  X,
  Layers,
  Truck,
  Eye,
  RefreshCw,
  Clock,
  ExternalLink,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Bot,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useCurrency } from '../context/CurrencyContext.tsx';
import { useToast } from '../context/ToastContext.tsx';

export function AdminDashboardPage() {
  const { token } = useAuth();
  const { format } = useCurrency();
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState<'overview' | 'moderation' | 'categories' | 'sellers' | 'orders' | 'returns' | 'coupons' | 'users' | 'ai-analytics'>('overview');

  // Metrics
  const [metrics, setMetrics] = useState<any>({});
  const [lowStock, setLowStock] = useState<any[]>([]);

  // Moderation products
  const [modProducts, setModProducts] = useState<any[]>([]);
  const [modFilter, setModFilter] = useState<string>('PENDING_REVIEW');

  // Categories
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [showAddCatModal, setShowAddCatModal] = useState(false);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catImage, setCatImage] = useState('');

  // Sellers
  const [sellersList, setSellersList] = useState<any[]>([]);

  // Orders
  const [ordersList, setOrdersList] = useState<any[]>([]);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('');
  const [selectedAdminOrder, setSelectedAdminOrder] = useState<any | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [statusModalOrder, setStatusModalOrder] = useState<any | null>(null);
  const [newStatusValue, setNewStatusValue] = useState<string>('CONFIRMED');
  const [newStatusNote, setNewStatusNote] = useState<string>('');
  const [newStatusLocation, setNewStatusLocation] = useState<string>('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  // Returns
  const [returnsList, setReturnsList] = useState<any[]>([]);

  // Coupons
  const [couponsList, setCouponsList] = useState<any[]>([]);
  const [showAddCouponModal, setShowAddCouponModal] = useState(false);
  const [cpCode, setCpCode] = useState('');
  const [cpType, setCpType] = useState<'PERCENTAGE' | 'FIXED'>('FIXED');
  const [cpValue, setCpValue] = useState('500');
  const [cpMinOrder, setCpMinOrder] = useState('2000');

  // Users
  const [usersList, setUsersList] = useState<any[]>([]);

  // AI Assistant Analytics
  const [aiAnalytics, setAiAnalytics] = useState<any>(null);
  const [loadingAiAnalytics, setLoadingAiAnalytics] = useState<boolean>(false);

  const fetchDashboard = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics || {});
        setLowStock(data.lowStockProducts || []);
      }
    } catch {}
  }, [token]);

  const fetchModerationProducts = useCallback(async () => {
    if (!token) return;
    try {
      const query = modFilter ? `?status=${modFilter}` : '';
      const res = await fetch(`/api/admin/products${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setModProducts(data.products || []);
      }
    } catch {}
  }, [token, modFilter]);

  const fetchCategories = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/categories', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCategoriesList(data.categories || []);
      }
    } catch {}
  }, [token]);

  const fetchSellers = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/sellers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSellersList(data.sellers || []);
      }
    } catch {}
  }, [token]);

  const fetchOrders = useCallback(async () => {
    if (!token) return;
    try {
      const params = new URLSearchParams();
      if (orderStatusFilter) params.set('status', orderStatusFilter);
      if (orderSearch) params.set('search', orderSearch);

      const res = await fetch(`/api/admin/orders?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOrdersList(data.orders || []);
      }
    } catch {}
  }, [token, orderStatusFilter, orderSearch]);

  const fetchReturns = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/returns', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setReturnsList(data.returns || []);
      }
    } catch {}
  }, [token]);

  const fetchCoupons = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/coupons', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCouponsList(data.coupons || []);
      }
    } catch {}
  }, [token]);

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsersList(data.users || []);
      }
    } catch {}
  }, [token]);

  const fetchAiAnalytics = useCallback(async () => {
    if (!token) return;
    setLoadingAiAnalytics(true);
    try {
      const res = await fetch('/api/ai/analytics', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAiAnalytics(data);
      }
    } catch {}
    setLoadingAiAnalytics(false);
  }, [token]);

  useEffect(() => {
    fetchDashboard();
    fetchModerationProducts();
    fetchCategories();
    fetchSellers();
    fetchOrders();
    fetchReturns();
    fetchCoupons();
    fetchUsers();
    fetchAiAnalytics();
  }, [fetchDashboard, fetchModerationProducts, fetchCategories, fetchSellers, fetchOrders, fetchReturns, fetchCoupons, fetchUsers, fetchAiAnalytics]);

  // Product status moderation (Approve / Reject)
  const handleModerateProduct = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/products/${id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        success(`Product marked as ${status}`);
        fetchModerationProducts();
        fetchDashboard();
      } else {
        error('Failed to moderate product.');
      }
    } catch {
      error('Error updating product status.');
    }
  };

  // Seller status moderation (Approve / Reject / Suspend)
  const handleModerateSeller = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/sellers/${id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        success(`Seller application updated to ${status}`);
        fetchSellers();
      } else {
        error('Failed to update seller.');
      }
    } catch {
      error('Error updating seller.');
    }
  };

  // Process Simulated Refund
  const handleProcessRefund = async (returnId: string) => {
    try {
      const res = await fetch(`/api/admin/returns/${returnId}/refund`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        success(data.message || 'Refund issued.');
        fetchReturns();
        fetchDashboard();
      } else {
        error(data.error || 'Failed to process refund.');
      }
    } catch {
      error('Error processing refund.');
    }
  };

  // Admin Order Status Update (Syncs with Customer Dashboard)
  const handleUpdateOrderStatus = async (orderId: string, newStatus: string, note?: string, location?: string) => {
    setUpdatingOrderId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus, note, location }),
      });
      const data = await res.json();
      if (res.ok) {
        success(data.message || `Order status updated to ${newStatus}`);
        await fetchOrders();
        await fetchDashboard();
        if (selectedAdminOrder && selectedAdminOrder.id === orderId) {
          handleViewAdminOrder(orderId);
        }
      } else {
        error(data.error || 'Failed to update order status.');
      }
    } catch {
      error('Error updating order status.');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Open status change dialog with custom notes
  const handleOpenStatusModal = (ord: any) => {
    setStatusModalOrder(ord);
    setNewStatusValue(ord.status);
    setNewStatusNote('');
    setNewStatusLocation('');
  };

  // Submit modal status update
  const handleSubmitStatusModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusModalOrder) return;
    setIsUpdatingStatus(true);
    try {
      await handleUpdateOrderStatus(statusModalOrder.id, newStatusValue, newStatusNote, newStatusLocation);
      setStatusModalOrder(null);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // View full order details for Admin
  const handleViewAdminOrder = async (orderId: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedAdminOrder(data.order);
      } else {
        error('Failed to load order details.');
      }
    } catch {
      error('Error loading order details.');
    }
  };

  // Add Category
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: catName, description: catDesc, image: catImage }),
      });
      if (res.ok) {
        success('Category created successfully.');
        setShowAddCatModal(false);
        setCatName('');
        setCatDesc('');
        setCatImage('');
        fetchCategories();
      } else {
        error('Failed to create category.');
      }
    } catch {
      error('Failed to create category.');
    }
  };

  // Add Coupon
  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          code: cpCode,
          type: cpType,
          value: parseFloat(cpValue),
          minOrderAmount: parseFloat(cpMinOrder),
        }),
      });
      if (res.ok) {
        success(`Coupon ${cpCode} created.`);
        setShowAddCouponModal(false);
        setCpCode('');
        fetchCoupons();
      } else {
        error('Failed to create coupon.');
      }
    } catch {
      error('Failed to create coupon.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Admin Header */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Marketplace Administration</h1>
            <p className="text-xs text-slate-400 mt-1">
              Global moderation, seller approvals, returns & catalog controls
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap ${
              activeTab === 'overview' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('moderation')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap ${
              activeTab === 'moderation' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Product Moderation
          </button>
          <button
            onClick={() => setActiveTab('sellers')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap ${
              activeTab === 'sellers' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Sellers & Approvals
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap ${
              activeTab === 'orders' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Orders
          </button>
          <button
            onClick={() => setActiveTab('returns')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap ${
              activeTab === 'returns' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Refunds
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap ${
              activeTab === 'categories' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Categories
          </button>
          <button
            onClick={() => setActiveTab('coupons')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap ${
              activeTab === 'coupons' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Coupons
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap ${
              activeTab === 'users' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Users
          </button>
          <button
            onClick={() => {
              setActiveTab('ai-analytics');
              fetchAiAnalytics();
            }}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap flex items-center gap-1.5 font-bold ${
              activeTab === 'ai-analytics'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-xs'
                : 'bg-slate-800 text-indigo-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>AI Analytics</span>
          </button>
        </div>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gross Platform Sales</span>
              <p className="text-2xl font-extrabold text-slate-900">{format(metrics.totalSales || 0)}</p>
              <span className="text-[11px] text-emerald-600 font-medium">Completed marketplace transactions</span>
            </div>

            <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Orders</span>
              <p className="text-2xl font-extrabold text-slate-900">{metrics.totalOrders || 0}</p>
              <span className="text-[11px] text-indigo-600 font-medium">
                {metrics.deliveredOrders || 0} delivered / {metrics.pendingOrders || 0} pending
              </span>
            </div>

            <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Seeded Products</span>
              <p className="text-2xl font-extrabold text-slate-900">{metrics.totalProducts || 0}</p>
              <span className="text-[11px] text-slate-500 font-medium">Active database catalog items</span>
            </div>

            <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Registered Accounts</span>
              <p className="text-2xl font-extrabold text-slate-900">{metrics.totalCustomers || 0}</p>
              <span className="text-[11px] text-slate-500 font-medium">{metrics.totalSellers || 0} sellers onboarded</span>
            </div>
          </div>

          {/* Low Stock Alerts */}
          {lowStock.length > 0 && (
            <div className="bg-amber-50 rounded-3xl border border-amber-200 p-6 space-y-3">
              <h3 className="font-bold text-amber-900 text-sm flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Inventory Depletion Monitor (Stock ≤ 5 units)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                {lowStock.map((p) => (
                  <div key={p.id} className="p-3 bg-white rounded-xl border border-amber-200 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-900 truncate max-w-[140px]">{p.name}</p>
                      <span className="text-[10px] text-slate-400 font-mono">SKU: {p.sku}</span>
                    </div>
                    <span className="font-bold text-rose-600">{p.stock} units</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Orders Quick Status Manager */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Package className="w-4 h-4 text-indigo-600" />
                  Recent Customer Orders (Quick Status Changer)
                </h3>
                <p className="text-xs text-slate-500">Update status directly here to change it on customer dashboard in real time</p>
              </div>
              <button
                onClick={() => setActiveTab('orders')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
              >
                View All Orders →
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Order #</th>
                    <th className="p-2.5">Customer</th>
                    <th className="p-2.5">Total</th>
                    <th className="p-2.5">Status (Syncs to Customer)</th>
                    <th className="p-2.5 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ordersList.slice(0, 5).map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-50/50">
                      <td className="p-2.5 font-mono font-bold text-slate-900">{ord.orderNumber}</td>
                      <td className="p-2.5 text-slate-700">{ord.customer?.name}</td>
                      <td className="p-2.5 font-bold text-slate-900">{format(ord.total)}</td>
                      <td className="p-2.5">
                        <select
                          value={ord.status}
                          disabled={updatingOrderId === ord.id}
                          onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value)}
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border cursor-pointer outline-none ${
                            ord.status === 'DELIVERED'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : ord.status === 'CANCELLED'
                              ? 'bg-rose-50 text-rose-800 border-rose-300'
                              : ord.status === 'SHIPPED'
                              ? 'bg-blue-50 text-blue-800 border-blue-300'
                              : ord.status === 'OUT_FOR_DELIVERY'
                              ? 'bg-cyan-50 text-cyan-800 border-cyan-300'
                              : ord.status === 'PROCESSING'
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : 'bg-indigo-50 text-indigo-800 border-indigo-300'
                          }`}
                        >
                          <option value="CONFIRMED">CONFIRMED</option>
                          <option value="PROCESSING">PROCESSING</option>
                          <option value="SHIPPED">SHIPPED</option>
                          <option value="OUT_FOR_DELIVERY">OUT FOR DELIVERY</option>
                          <option value="DELIVERED">DELIVERED</option>
                          <option value="CANCELLED">CANCELLED</option>
                        </select>
                      </td>
                      <td className="p-2.5 text-right">
                        <button
                          onClick={() => handleViewAdminOrder(ord.id)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODERATION TAB */}
      {activeTab === 'moderation' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Product Moderation Queue</h2>
              <p className="text-xs text-slate-500">Only APPROVED products appear on the public shopping catalog</p>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold">
              <button
                onClick={() => setModFilter('PENDING_REVIEW')}
                className={`px-3 py-1.5 rounded-xl ${
                  modFilter === 'PENDING_REVIEW' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                Pending Review
              </button>
              <button
                onClick={() => setModFilter('APPROVED')}
                className={`px-3 py-1.5 rounded-xl ${
                  modFilter === 'APPROVED' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                Approved
              </button>
              <button
                onClick={() => setModFilter('REJECTED')}
                className={`px-3 py-1.5 rounded-xl ${
                  modFilter === 'REJECTED' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                Rejected
              </button>
              <button
                onClick={() => setModFilter('')}
                className={`px-3 py-1.5 rounded-xl ${
                  modFilter === '' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                All
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Product & SKU</th>
                  <th className="p-3.5">Seller</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Price</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {modProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="p-3.5">
                      <p className="font-bold text-slate-900">{p.name}</p>
                      <span className="font-mono text-[10px] text-slate-400">SKU: {p.sku}</span>
                    </td>
                    <td className="p-3.5 text-slate-600 font-medium">{p.sellerStoreName}</td>
                    <td className="p-3.5 text-slate-600">{p.categoryName}</td>
                    <td className="p-3.5 font-bold text-slate-900">{format(p.price)}</td>
                    <td className="p-3.5">
                      <span className="font-bold text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-800">
                        {p.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {p.status !== 'APPROVED' && (
                          <button
                            onClick={() => handleModerateProduct(p.id, 'APPROVED')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                        )}
                        {p.status !== 'REJECTED' && (
                          <button
                            onClick={() => handleModerateProduct(p.id, 'REJECTED')}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-bold flex items-center gap-1"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SELLERS & APPLICATIONS TAB */}
      {activeTab === 'sellers' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Seller Network & Approvals</h2>
            <p className="text-xs text-slate-500">Review pending store onboarding applications and active merchants</p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Store Name</th>
                  <th className="p-3.5">Owner / Contact</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Commission</th>
                  <th className="p-3.5 text-right">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sellersList.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50">
                    <td className="p-3.5">
                      <p className="font-bold text-slate-900">{s.storeName}</p>
                      <p className="text-[11px] text-slate-400 line-clamp-1">{s.description}</p>
                    </td>
                    <td className="p-3.5 text-slate-600">
                      <p className="font-medium text-slate-900">{s.ownerName}</p>
                      <p className="text-[11px] text-slate-400">{s.contactEmail}</p>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          s.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : s.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-700 font-bold">{s.commissionRate}%</td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {s.status !== 'APPROVED' && (
                          <button
                            onClick={() => handleModerateSeller(s.id, 'APPROVED')}
                            className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg font-bold"
                          >
                            Approve
                          </button>
                        )}
                        {s.status !== 'REJECTED' && s.status !== 'SUSPENDED' && (
                          <button
                            onClick={() => handleModerateSeller(s.id, 'SUSPENDED')}
                            className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg font-bold"
                          >
                            Suspend
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ORDERS TAB */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">Global Orders Monitor & Status Manager</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Live Customer Sync
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Change order statuses below. Updates immediately reflect in the customer dashboard and live courier tracking.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => fetchOrders()}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs flex items-center gap-1 font-semibold border border-slate-200"
                title="Refresh Orders"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <input
                type="text"
                placeholder="Search order #..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs outline-none"
              />
              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs outline-none cursor-pointer"
              >
                <option value="">All Statuses</option>
                <option value="CONFIRMED">CONFIRMED</option>
                <option value="PROCESSING">PROCESSING</option>
                <option value="SHIPPED">SHIPPED</option>
                <option value="OUT_FOR_DELIVERY">OUT_FOR_DELIVERY</option>
                <option value="DELIVERED">DELIVERED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Order # & Date</th>
                  <th className="p-3.5">Customer</th>
                  <th className="p-3.5">Payment</th>
                  <th className="p-3.5">Total</th>
                  <th className="p-3.5">Change Status (Syncs to Customer)</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ordersList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No orders found matching criteria.
                    </td>
                  </tr>
                ) : (
                  ordersList.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-50/50">
                      <td className="p-3.5">
                        <button
                          onClick={() => handleViewAdminOrder(ord.id)}
                          className="font-mono font-bold text-slate-900 hover:text-indigo-600 text-left flex items-center gap-1 group"
                        >
                          <span>{ord.orderNumber}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                        <p className="text-[10px] text-slate-400">{new Date(ord.createdAt).toLocaleDateString()}</p>
                      </td>
                      <td className="p-3.5">
                        <p className="font-semibold text-slate-900">{ord.customer?.name}</p>
                        <p className="text-[10px] text-slate-400">{ord.customer?.email}</p>
                      </td>
                      <td className="p-3.5">
                        <span className="font-bold text-emerald-700">{ord.paymentStatus}</span>
                        <p className="text-[10px] text-slate-400">{ord.paymentMethod}</p>
                      </td>
                      <td className="p-3.5 font-bold text-slate-900">{format(ord.total)}</td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <select
                            value={ord.status}
                            disabled={updatingOrderId === ord.id}
                            onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value)}
                            className={`text-xs font-bold px-2.5 py-1 rounded-xl border cursor-pointer outline-none transition-all shadow-2xs ${
                              ord.status === 'DELIVERED'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : ord.status === 'CANCELLED'
                                ? 'bg-rose-50 text-rose-800 border-rose-300'
                                : ord.status === 'SHIPPED'
                                ? 'bg-blue-50 text-blue-800 border-blue-300'
                                : ord.status === 'OUT_FOR_DELIVERY'
                                ? 'bg-cyan-50 text-cyan-800 border-cyan-300'
                                : ord.status === 'PROCESSING'
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : 'bg-indigo-50 text-indigo-800 border-indigo-300'
                            }`}
                          >
                            <option value="CONFIRMED">CONFIRMED</option>
                            <option value="PROCESSING">PROCESSING</option>
                            <option value="SHIPPED">SHIPPED</option>
                            <option value="OUT_FOR_DELIVERY">OUT FOR DELIVERY</option>
                            <option value="DELIVERED">DELIVERED</option>
                            <option value="CANCELLED">CANCELLED</option>
                          </select>
                          {updatingOrderId === ord.id && (
                            <RefreshCw className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
                          )}
                        </div>
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleViewAdminOrder(ord.id)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 border border-slate-200 transition-colors"
                            title="Inspect complete order details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Details</span>
                          </button>
                          <button
                            onClick={() => handleOpenStatusModal(ord)}
                            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                            title="Update status with custom note or courier event"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>Add Note</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RETURNS & REFUNDS TAB */}
      {activeTab === 'returns' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Return & Simulated Refund Center</h2>
            <p className="text-xs text-slate-500">Authorize refunds for received items to safely test returns workflow</p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Order & Customer</th>
                  <th className="p-3.5">Item & Seller</th>
                  <th className="p-3.5">Reason</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Refund Simulation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {returnsList.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="p-3.5">
                      <p className="font-mono font-bold text-slate-900">{r.orderNumber}</p>
                      <p className="text-[11px] text-slate-400">{r.customerName}</p>
                    </td>
                    <td className="p-3.5">
                      <p className="font-semibold text-slate-900">{r.item?.productName || 'Product'}</p>
                      <p className="text-[11px] text-slate-400">{r.sellerStoreName}</p>
                    </td>
                    <td className="p-3.5 text-slate-700">
                      <p className="font-medium">{r.reason}</p>
                      {r.comments && <p className="text-[11px] text-slate-400 italic">"{r.comments}"</p>}
                    </td>
                    <td className="p-3.5">
                      <span className="font-bold text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-800">
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      {r.status !== 'REFUNDED' ? (
                        <button
                          onClick={() => handleProcessRefund(r.id)}
                          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold"
                        >
                          Process Refund
                        </button>
                      ) : (
                        <span className="text-emerald-700 font-bold text-[11px]">✓ Refunded</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CATEGORIES TAB */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Marketplace Categories</h2>
              <p className="text-xs text-slate-500">Manage catalog taxonomy and navigation departments</p>
            </div>
            <button
              onClick={() => setShowAddCatModal(true)}
              className="px-3.5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Category</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {categoriesList.map((c) => (
              <div key={c.id} className="p-4 bg-white rounded-2xl border border-slate-200 text-xs space-y-2 flex items-center gap-3">
                <img src={c.image} alt="" className="w-14 h-14 rounded-xl object-cover bg-slate-100 shrink-0" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-900 text-sm truncate">{c.name}</h4>
                  <p className="text-[11px] text-slate-400 truncate">{c.slug}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* COUPONS TAB */}
      {activeTab === 'coupons' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Promotional Coupons</h2>
              <p className="text-xs text-slate-500">Configure percentage or fixed discount coupons</p>
            </div>
            <button
              onClick={() => setShowAddCouponModal(true)}
              className="px-3.5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create Coupon</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {couponsList.map((cp) => (
              <div key={cp.id} className="p-4 bg-white rounded-2xl border border-slate-200 space-y-1 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-mono font-extrabold text-sm text-indigo-700">{cp.code}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                    Active
                  </span>
                </div>
                <p className="text-slate-600">
                  Discount: <strong>{cp.type === 'PERCENTAGE' ? `${cp.value}%` : format(cp.value)}</strong>
                </p>
                <p className="text-slate-500 text-[11px]">Min order: {format(cp.minOrderAmount)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* USERS TAB */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-slate-900">Registered Accounts</h2>
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Name</th>
                  <th className="p-3.5">Email</th>
                  <th className="p-3.5">Role</th>
                  <th className="p-3.5">Phone</th>
                  <th className="p-3.5">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50">
                    <td className="p-3.5 font-bold text-slate-900">{u.name}</td>
                    <td className="p-3.5 text-slate-600">{u.email}</td>
                    <td className="p-3.5">
                      <span className="font-bold text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-800">
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-500 font-mono">{u.phone || 'N/A'}</td>
                    <td className="p-3.5 text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AI ASSISTANT ANALYTICS TAB */}
      {activeTab === 'ai-analytics' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">Commerce Assistant AI Analytics</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  Gemini Grounded Intelligence
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Track AI shopping interactions, popular product inquiries, satisfaction ratings, and real-time response latency.
              </p>
            </div>

            <button
              onClick={() => fetchAiAnalytics()}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-200"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingAiAnalytics ? 'animate-spin text-indigo-600' : ''}`} />
              <span>Refresh Metrics</span>
            </button>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Conversations</span>
              <p className="text-2xl font-extrabold text-slate-900">{aiAnalytics?.metrics?.totalConversations || 0}</p>
              <span className="text-[11px] text-indigo-600 font-medium">Distinct shopping sessions</span>
            </div>

            <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">AI Messages Exchanged</span>
              <p className="text-2xl font-extrabold text-slate-900">{aiAnalytics?.metrics?.totalMessages || 0}</p>
              <span className="text-[11px] text-slate-500 font-medium">Questions & grounded answers</span>
            </div>

            <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Customer Satisfaction</span>
              <p className="text-2xl font-extrabold text-emerald-600">{aiAnalytics?.metrics?.satisfactionRate || 100}%</p>
              <span className="text-[11px] text-slate-500 font-medium">
                {aiAnalytics?.metrics?.positiveFeedback || 0} 👍 / {aiAnalytics?.metrics?.negativeFeedback || 0} 👎
              </span>
            </div>

            <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avg Response Time</span>
              <p className="text-2xl font-extrabold text-slate-900">{aiAnalytics?.metrics?.avgResponseTimeMs || 0} ms</p>
              <span className="text-[11px] text-emerald-600 font-medium">Fast real-time retrieval</span>
            </div>
          </div>

          {/* Grid: Popular Intents & Feedback Comments */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Popular Intents */}
            <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                Customer Intent Distribution
              </h3>
              {(!aiAnalytics?.intents || aiAnalytics.intents.length === 0) ? (
                <p className="text-xs text-slate-400 py-4">No AI queries recorded yet. Use the assistant to see breakdown.</p>
              ) : (
                <div className="space-y-2.5 text-xs">
                  {aiAnalytics.intents.map((item: any) => {
                    const totalMsg = aiAnalytics?.metrics?.totalMessages || 1;
                    const pct = Math.min(100, Math.round((item.count / totalMsg) * 100));
                    return (
                      <div key={item.intent} className="space-y-1">
                        <div className="flex justify-between font-semibold text-slate-700">
                          <span>{item.intent.replace(/_/g, ' ')}</span>
                          <span className="font-mono text-slate-900">{item.count} inquiries</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-indigo-600 h-2 rounded-full"
                            style={{ width: `${Math.max(5, pct)}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Customer Feedback */}
            <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <ThumbsUp className="w-4 h-4 text-emerald-600" />
                Recent User Feedback & Comments
              </h3>
              {(!aiAnalytics?.feedbackComments || aiAnalytics.feedbackComments.length === 0) ? (
                <p className="text-xs text-slate-400 py-4">No ratings submitted yet. Customers can rate answers with 👍 or 👎.</p>
              ) : (
                <div className="space-y-2.5 text-xs divide-y divide-slate-100">
                  {aiAnalytics.feedbackComments.map((fb: any) => (
                    <div key={fb.id} className="pt-2 first:pt-0 space-y-1">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            fb.feedback === 'positive'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {fb.feedback === 'positive' ? '👍 Helpful' : '👎 Needs Improvement'}
                        </span>
                        <span className="text-[10px] text-slate-400">{new Date(fb.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-slate-600 line-clamp-1 italic">"{fb.content}"</p>
                      {fb.comment && (
                        <p className="text-slate-800 font-medium text-[11px] bg-slate-50 p-2 rounded-lg">
                          Feedback: {fb.comment}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Query Logs Table */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              Recent AI Interactions & Tool Logs
            </h3>
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Customer Query</th>
                    <th className="p-3.5">Detected Intent</th>
                    <th className="p-3.5">Tool Invoked</th>
                    <th className="p-3.5">Response Time</th>
                    <th className="p-3.5">Language</th>
                    <th className="p-3.5">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(!aiAnalytics?.recentLogs || aiAnalytics.recentLogs.length === 0) ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        No AI query logs found yet. Start chatting with Commerce Assistant to populate.
                      </td>
                    </tr>
                  ) : (
                    aiAnalytics.recentLogs.map((log: any) => (
                      <tr key={log.id} className="hover:bg-slate-50/50">
                        <td className="p-3.5 font-medium text-slate-900 max-w-xs truncate" title={log.query}>
                          {log.query}
                        </td>
                        <td className="p-3.5">
                          <span className="font-mono text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
                            {log.intent}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-600 font-mono text-[11px]">
                          {log.toolUsed ? `⚙️ ${log.toolUsed}` : 'Direct RAG'}
                        </td>
                        <td className="p-3.5 font-mono text-slate-700 font-bold">
                          {log.responseTimeMs} ms
                        </td>
                        <td className="p-3.5 text-slate-500 font-semibold uppercase text-[10px]">
                          {log.userLanguage || 'en'}
                        </td>
                        <td className="p-3.5 text-slate-400 text-[10px]">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CREATE CATEGORY MODAL */}
      {showAddCatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-xl p-6 space-y-4">
            <button onClick={() => setShowAddCatModal(false)} className="absolute top-4 right-4 text-slate-400">
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-bold text-slate-900 text-base">Create Category</h3>
            <form onSubmit={handleCreateCategory} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Category Name</label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Cover Image URL</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={catImage}
                  onChange={(e) => setCatImage(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-xs hover:bg-indigo-700"
              >
                Create Category
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CREATE COUPON MODAL */}
      {showAddCouponModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-xl p-6 space-y-4">
            <button onClick={() => setShowAddCouponModal(false)} className="absolute top-4 right-4 text-slate-400">
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-bold text-slate-900 text-base">Create Discount Coupon</h3>
            <form onSubmit={handleCreateCoupon} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Coupon Code (Uppercase)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FLASH30"
                  value={cpCode}
                  onChange={(e) => setCpCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none font-mono uppercase"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Type</label>
                  <select
                    value={cpType}
                    onChange={(e: any) => setCpType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 outline-none cursor-pointer"
                  >
                    <option value="FIXED">Fixed (₹)</option>
                    <option value="PERCENTAGE">Percentage (%)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Discount Value</label>
                  <input
                    type="number"
                    required
                    value={cpValue}
                    onChange={(e) => setCpValue(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Min Order Subtotal (₹)</label>
                <input
                  type="number"
                  required
                  value={cpMinOrder}
                  onChange={(e) => setCpMinOrder(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-xs hover:bg-indigo-700"
              >
                Save Coupon
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN ORDER DETAILS & LIVE STATUS INSPECTOR MODAL */}
      {selectedAdminOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-6 my-8">
            <button
              onClick={() => setSelectedAdminOrder(null)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
                  Admin Order Inspector
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Live Customer Sync Active
                </span>
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 mt-1">
                Order #{selectedAdminOrder.orderNumber}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Placed on {new Date(selectedAdminOrder.createdAt).toLocaleString()} • Total: <strong className="text-slate-900">{format(selectedAdminOrder.total)}</strong>
              </p>
            </div>

            {/* Status Change Control in Modal */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    Marketplace Status Control
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Changing the status here will automatically update the customer's dashboard in real time.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedAdminOrder.status}
                    disabled={updatingOrderId === selectedAdminOrder.id}
                    onChange={(e) => handleUpdateOrderStatus(selectedAdminOrder.id, e.target.value)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-xl border cursor-pointer outline-none shadow-2xs ${
                      selectedAdminOrder.status === 'DELIVERED'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : selectedAdminOrder.status === 'CANCELLED'
                        ? 'bg-rose-50 text-rose-800 border-rose-300'
                        : selectedAdminOrder.status === 'SHIPPED'
                        ? 'bg-blue-50 text-blue-800 border-blue-300'
                        : selectedAdminOrder.status === 'OUT_FOR_DELIVERY'
                        ? 'bg-cyan-50 text-cyan-800 border-cyan-300'
                        : selectedAdminOrder.status === 'PROCESSING'
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : 'bg-indigo-50 text-indigo-800 border-indigo-300'
                    }`}
                  >
                    <option value="CONFIRMED">CONFIRMED</option>
                    <option value="PROCESSING">PROCESSING</option>
                    <option value="SHIPPED">SHIPPED</option>
                    <option value="OUT_FOR_DELIVERY">OUT FOR DELIVERY</option>
                    <option value="DELIVERED">DELIVERED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                  {updatingOrderId === selectedAdminOrder.id && (
                    <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin" />
                  )}
                </div>
              </div>
            </div>

            {/* Customer & Shipping info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-1.5">
                <span className="font-bold text-slate-900 block">Customer Information</span>
                <p className="text-slate-700 font-semibold">{selectedAdminOrder.customer?.name || 'Customer'}</p>
                <p className="text-slate-500">{selectedAdminOrder.customer?.email || 'N/A'}</p>
                <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                  <span>Payment Method: <strong>{selectedAdminOrder.paymentMethod}</strong></span>
                  <br />
                  <span>Payment Status: <strong className="text-emerald-700">{selectedAdminOrder.paymentStatus}</strong></span>
                </div>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-1.5">
                <span className="font-bold text-slate-900 block">Delivery Address</span>
                {selectedAdminOrder.shippingAddress ? (
                  <div className="text-slate-600">
                    <p className="font-semibold text-slate-800">{selectedAdminOrder.shippingAddress.fullName}</p>
                    <p>{selectedAdminOrder.shippingAddress.addressLine1}</p>
                    {selectedAdminOrder.shippingAddress.addressLine2 && <p>{selectedAdminOrder.shippingAddress.addressLine2}</p>}
                    <p>{selectedAdminOrder.shippingAddress.city}, {selectedAdminOrder.shippingAddress.state} - {selectedAdminOrder.shippingAddress.pincode}</p>
                    <p className="font-mono text-[11px] text-slate-500 mt-1">Ph: {selectedAdminOrder.shippingAddress.phone}</p>
                  </div>
                ) : (
                  <p className="text-slate-400">No address recorded.</p>
                )}
              </div>
            </div>

            {/* Ordered Items */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">Ordered Products</span>
              <div className="space-y-2">
                {selectedAdminOrder.items?.map((item: any) => (
                  <div
                    key={item.id}
                    className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-900">{item.productName}</p>
                      {item.variantTitle && <span className="text-[11px] text-slate-500">Variant: {item.variantTitle}</span>}
                      <p className="text-slate-400 text-[11px]">SKU: {item.sku} • Qty: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-900">{format(item.total)}</span>
                      <p className="text-[10px] text-slate-400">{format(item.price)} each</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Courier Tracking Timeline */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-indigo-600" />
                  Live Courier & Tracking Events
                </span>
                <button
                  onClick={() => handleOpenStatusModal(selectedAdminOrder)}
                  className="px-2.5 py-1 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Courier Event</span>
                </button>
              </div>

              {selectedAdminOrder.shipments && selectedAdminOrder.shipments.length > 0 ? (
                <div className="space-y-3 text-xs">
                  {selectedAdminOrder.shipments.map((shp: any) => (
                    <div key={shp.id} className="space-y-2">
                      <div className="flex justify-between text-slate-600 text-[11px]">
                        <span>Carrier: <strong>{shp.carrier}</strong></span>
                        <span className="font-mono">Tracking: {shp.trackingNumber}</span>
                      </div>

                      <div className="border-l-2 border-indigo-400 pl-3 ml-1.5 space-y-2 mt-2">
                        {shp.events && shp.events.length > 0 ? (
                          shp.events.map((ev: any, i: number) => (
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
                <p className="text-xs text-slate-500">No shipment records found.</p>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedAdminOrder(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK STATUS & COURIER NOTE MODAL */}
      {statusModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-xl p-6 space-y-4">
            <button onClick={() => setStatusModalOrder(null)} className="absolute top-4 right-4 text-slate-400">
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-bold text-slate-900 text-base">Update Order Status & Tracking</h3>
            <p className="text-xs text-slate-500">Order #{statusModalOrder.orderNumber}</p>

            <form onSubmit={handleSubmitStatusModal} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">New Status</label>
                <select
                  value={newStatusValue}
                  onChange={(e) => setNewStatusValue(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none font-semibold cursor-pointer"
                >
                  <option value="CONFIRMED">CONFIRMED</option>
                  <option value="PROCESSING">PROCESSING</option>
                  <option value="SHIPPED">SHIPPED</option>
                  <option value="OUT_FOR_DELIVERY">OUT FOR DELIVERY</option>
                  <option value="DELIVERED">DELIVERED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Facility / Checkpoint Location (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Mumbai Logistics Station / Out for Delivery"
                  value={newStatusLocation}
                  onChange={(e) => setNewStatusLocation(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Tracking Note / Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Package cleared regional scan and is on the delivery vehicle..."
                  value={newStatusNote}
                  onChange={(e) => setNewStatusNote(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none"
                />
              </div>

              <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 text-[11px] text-indigo-700">
                Notice: Saving will immediately update customer purchase history, courier tracking, and eligible actions (reviews/returns when DELIVERED).
              </div>

              <button
                type="submit"
                disabled={isUpdatingStatus}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs disabled:bg-slate-300"
              >
                {isUpdatingStatus ? 'Updating Status...' : 'Apply Status Change'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

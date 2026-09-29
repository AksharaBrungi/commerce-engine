import React, { useState, useEffect, useCallback } from 'react';
import {
  Store,
  DollarSign,
  Package,
  TrendingUp,
  AlertTriangle,
  Plus,
  Edit2,
  Trash2,
  Truck,
  RotateCcw,
  Check,
  X,
  Settings,
  ShieldCheck,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useCurrency } from '../context/CurrencyContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { Category, Product } from '../types/index.ts';

interface SellerDashboardPageProps {
  categories: Category[];
}

export function SellerDashboardPage({ categories }: SellerDashboardPageProps) {
  const { user, token } = useAuth();
  const { format } = useCurrency();
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'orders' | 'returns' | 'settings'>('overview');

  // Metrics state
  const [metrics, setMetrics] = useState<any>({
    totalSales: 0,
    totalOrders: 0,
    totalProducts: 0,
    unitsSold: 0,
  });
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);

  // Products state
  const [sellerProducts, setSellerProducts] = useState<Product[]>([]);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Orders state
  const [sellerOrders, setSellerOrders] = useState<any[]>([]);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [newOrderStatus, setNewOrderStatus] = useState<string>('SHIPPED');
  const [statusNote, setStatusNote] = useState<string>('Package dispatched to courier hub');

  // Returns state
  const [sellerReturns, setSellerReturns] = useState<any[]>([]);

  // Store Settings
  const [storeName, setStoreName] = useState(user?.storeName || '');
  const [storeDesc, setStoreDesc] = useState('');
  const [storeEmail, setStoreEmail] = useState(user?.email || '');

  // Add / Edit Product form fields
  const [pName, setPName] = useState('');
  const [pCategory, setPCategory] = useState(categories[0]?.id || '');
  const [pDescription, setPDescription] = useState('');
  const [pSku, setPSku] = useState('');
  const [pPrice, setPPrice] = useState('');
  const [pDiscountPrice, setPDiscountPrice] = useState('');
  const [pStock, setPStock] = useState('20');
  const [pImageUrl, setPImageUrl] = useState('');

  // Variants in product modal
  const [hasVariants, setHasVariants] = useState(false);
  const [variantList, setVariantList] = useState<Array<{ sku: string; title: string; price: string; stock: string }>>([
    { sku: '', title: '', price: '', stock: '10' },
  ]);

  const fetchDashboardData = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/seller/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics || {});
        setLowStockProducts(data.lowStockProducts || []);
        setTopProducts(data.topProducts || []);
      }
    } catch {}
  }, [token]);

  const fetchSellerProducts = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/seller/products', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSellerProducts(data.products || []);
      }
    } catch {}
  }, [token]);

  const fetchSellerOrders = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/seller/orders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSellerOrders(data.orders || []);
      }
    } catch {}
  }, [token]);

  const fetchSellerReturns = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/seller/returns', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSellerReturns(data.returns || []);
      }
    } catch {}
  }, [token]);

  useEffect(() => {
    fetchDashboardData();
    fetchSellerProducts();
    fetchSellerOrders();
    fetchSellerReturns();
  }, [fetchDashboardData, fetchSellerProducts, fetchSellerOrders, fetchSellerReturns]);

  // Handle Save Product (Create or Edit)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        name: pName,
        categoryId: pCategory || categories[0]?.id,
        description: pDescription,
        sku: pSku,
        price: parseFloat(pPrice),
        discountPrice: pDiscountPrice ? parseFloat(pDiscountPrice) : undefined,
        stock: parseInt(pStock),
        images: pImageUrl ? [pImageUrl] : undefined,
      };

      if (hasVariants) {
        payload.variants = variantList.map((v) => ({
          sku: v.sku,
          title: v.title,
          price: parseFloat(v.price) || parseFloat(pPrice),
          stock: parseInt(v.stock) || 0,
        }));
      }

      let res;
      if (editingProduct) {
        res = await fetch(`/api/seller/products/${editingProduct.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/seller/products', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (res.ok) {
        success(editingProduct ? 'Product updated.' : 'Product submitted for review.');
        setShowAddProductModal(false);
        setEditingProduct(null);
        resetProductForm();
        fetchSellerProducts();
        fetchDashboardData();
      } else {
        error(data.error || 'Failed to save product.');
      }
    } catch {
      error('Failed to save product.');
    }
  };

  const resetProductForm = () => {
    setPName('');
    setPDescription('');
    setPSku('');
    setPPrice('');
    setPDiscountPrice('');
    setPStock('20');
    setPImageUrl('');
    setHasVariants(false);
    setVariantList([{ sku: '', title: '', price: '', stock: '10' }]);
  };

  const handleEditClick = (prod: Product) => {
    setEditingProduct(prod);
    setPName(prod.name);
    setPCategory(prod.categoryId);
    setPDescription(prod.description);
    setPSku(prod.sku);
    setPPrice(String(prod.price));
    setPDiscountPrice(prod.discountPrice ? String(prod.discountPrice) : '');
    setPStock(String(prod.stock));
    setPImageUrl(prod.primaryImage || '');
    setShowAddProductModal(true);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to archive this product? It will no longer be listed.')) return;
    try {
      const res = await fetch(`/api/seller/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        success('Product archived.');
        fetchSellerProducts();
      } else {
        error('Failed to archive product.');
      }
    } catch {
      error('Failed to archive product.');
    }
  };

  // Update order fulfillment status
  const handleUpdateFulfillment = async (sOrderId: string) => {
    try {
      const res = await fetch(`/api/seller/orders/${sOrderId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newOrderStatus, note: statusNote }),
      });
      const data = await res.json();
      if (res.ok) {
        success(`Fulfillment progressed to ${newOrderStatus}`);
        setUpdatingOrderId(null);
        fetchSellerOrders();
        fetchDashboardData();
      } else {
        error(data.error || 'Failed to update order status.');
      }
    } catch {
      error('Failed to update status.');
    }
  };

  // Approve / Reject Return
  const handleReturnAction = async (returnId: string, status: string) => {
    try {
      const res = await fetch(`/api/seller/returns/${returnId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        success(`Return marked as ${status}`);
        fetchSellerReturns();
      } else {
        error('Failed to update return.');
      }
    } catch {
      error('Error updating return.');
    }
  };

  // Save Store Settings
  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/seller/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ storeName, description: storeDesc, contactEmail: storeEmail }),
      });
      if (res.ok) {
        success('Store profile updated.');
      } else {
        error('Failed to update store settings.');
      }
    } catch {
      error('Failed to update store settings.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold">
            <Store className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold">{user?.storeName || 'Merchant Portal'}</h1>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                ACTIVE SELLER
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Tenant-isolated inventory and fulfillment dashboard</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'overview' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'products' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            My Products ({sellerProducts.length})
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'orders' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Fulfillment Orders ({sellerOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('returns')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'returns' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Returns ({sellerReturns.length})
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'settings' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Store Settings
          </button>
        </div>
      </div>

      {/* TAB 1: OVERVIEW METRICS */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Top 4 Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Sales</span>
              <p className="text-2xl font-extrabold text-slate-900">{format(metrics.totalSales || 0)}</p>
              <span className="text-[11px] text-emerald-600 font-medium">Realized revenue</span>
            </div>

            <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Suborders</span>
              <p className="text-2xl font-extrabold text-slate-900">{metrics.totalOrders || 0}</p>
              <span className="text-[11px] text-indigo-600 font-medium">Direct store orders</span>
            </div>

            <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Units Sold</span>
              <p className="text-2xl font-extrabold text-slate-900">{metrics.unitsSold || 0}</p>
              <span className="text-[11px] text-slate-500 font-medium">Dispatched products</span>
            </div>

            <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Catalog</span>
              <p className="text-2xl font-extrabold text-slate-900">{metrics.totalProducts || 0}</p>
              <span className="text-[11px] text-slate-500 font-medium">Listed SKUs</span>
            </div>
          </div>

          {/* Low Stock Warning Section */}
          {lowStockProducts.length > 0 && (
            <div className="p-6 bg-amber-50 rounded-3xl border border-amber-200 space-y-4">
              <div className="flex items-center gap-2 text-amber-900">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-sm">Low Stock Inventory Warnings (≤ 5 units)</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {lowStockProducts.map((p) => (
                  <div key={p.id} className="p-3 bg-white rounded-xl border border-amber-200 text-xs flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-900 truncate max-w-[180px]">{p.name}</p>
                      <span className="text-[10px] text-slate-400 font-mono">SKU: {p.sku}</span>
                    </div>
                    <span className="font-extrabold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                      {p.stock} left
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Products Table */}
          {topProducts.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-slate-900">Top Performing Products</h3>
              <div className="divide-y divide-slate-100 text-xs">
                {topProducts.map((p, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900">{p.productName}</span>
                      <p className="text-[11px] text-slate-500">{p.unitsSold} units shipped</p>
                    </div>
                    <span className="font-bold text-indigo-600">{format(p.totalRevenue)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY PRODUCTS */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Product Catalog Management</h2>
              <p className="text-xs text-slate-500">Manage SKUs, prices, stock levels, and review statuses</p>
            </div>
            <button
              onClick={() => {
                resetProductForm();
                setEditingProduct(null);
                setShowAddProductModal(true);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Product</span>
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Product & SKU</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Price</th>
                  <th className="p-3.5">Stock</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sellerProducts.map((prod) => (
                  <tr key={prod.id} className="hover:bg-slate-50/50">
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <img
                          src={prod.primaryImage || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100&auto=format&fit=crop&q=80'}
                          alt=""
                          className="w-10 h-10 rounded-lg object-cover bg-slate-100 shrink-0"
                        />
                        <div>
                          <p className="font-bold text-slate-900 leading-snug">{prod.name}</p>
                          <span className="font-mono text-[10px] text-slate-400">SKU: {prod.sku}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 text-slate-600">{prod.category?.name || 'General'}</td>
                    <td className="p-3.5 font-bold text-slate-900">{format(prod.price)}</td>
                    <td className="p-3.5">
                      <span className={`font-semibold ${prod.stock <= 5 ? 'text-amber-600' : 'text-slate-800'}`}>
                        {prod.stock} units
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          prod.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-700'
                            : prod.status === 'PENDING_REVIEW'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {prod.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEditClick(prod)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-100"
                          title="Edit Product"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(prod.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-slate-100"
                          title="Archive Product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SELLER SUBORDERS */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Seller Fulfillment Orders</h2>
            <p className="text-xs text-slate-500">Only suborders containing your products appear here (Tenant Isolation)</p>
          </div>

          {sellerOrders.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-xs text-slate-500">
              No orders assigned to your store yet.
            </div>
          ) : (
            <div className="space-y-4">
              {sellerOrders.map((ord) => (
                <div key={ord.id} className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                    <div>
                      <span className="font-mono font-bold text-sm text-slate-900">Suborder #{ord.suborderNumber}</span>
                      <p className="text-[11px] text-slate-500">Customer: {ord.customerName} ({ord.customerPhone})</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-sm font-extrabold text-slate-900">{format(ord.total)}</span>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                        {ord.status}
                      </span>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="space-y-2 text-xs">
                    {ord.items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between text-slate-700">
                        <span>{item.quantity} × {item.productName} {item.variantTitle && `(${item.variantTitle})`}</span>
                        <span className="font-semibold text-slate-900">{format(item.total)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Update Status Controls */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-slate-600">Advance Status:</span>
                      <select
                        value={newOrderStatus}
                        onChange={(e) => setNewOrderStatus(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none cursor-pointer"
                      >
                        <option value="PROCESSING">Processing</option>
                        <option value="SHIPPED">Shipped</option>
                        <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                        <option value="DELIVERED">Delivered</option>
                      </select>
                      <button
                        onClick={() => handleUpdateFulfillment(ord.id)}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors"
                      >
                        Update
                      </button>
                    </div>

                    {ord.shipment && (
                      <span className="text-[11px] text-slate-400 font-mono">
                        Tracking: {ord.shipment.trackingNumber}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: RETURNS */}
      {activeTab === 'returns' && (
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-slate-900">Return Requests for Your Products</h2>
          {sellerReturns.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-xs text-slate-500">
              No return requests pending.
            </div>
          ) : (
            <div className="space-y-3">
              {sellerReturns.map((ret) => (
                <div key={ret.id} className="p-4 bg-white rounded-2xl border border-slate-200 text-xs space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900">Order #{ret.orderNumber}</span>
                    <span className="font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{ret.status}</span>
                  </div>
                  <p className="text-slate-700">Reason: {ret.reason}</p>
                  {ret.comments && <p className="text-slate-500 italic">"{ret.comments}"</p>}

                  {ret.status === 'REQUESTED' && (
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => handleReturnAction(ret.id, 'APPROVED')}
                        className="px-3 py-1 bg-emerald-600 text-white rounded-lg font-bold"
                      >
                        Approve Return
                      </button>
                      <button
                        onClick={() => handleReturnAction(ret.id, 'REJECTED')}
                        className="px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg font-bold"
                      >
                        Decline Return
                      </button>
                    </div>
                  )}

                  {ret.status === 'APPROVED' && (
                    <div className="pt-2">
                      <button
                        onClick={() => handleReturnAction(ret.id, 'ITEM_RECEIVED')}
                        className="px-3 py-1 bg-indigo-600 text-white rounded-lg font-bold"
                      >
                        Confirm Item Received
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: STORE SETTINGS */}
      {activeTab === 'settings' && (
        <div className="max-w-xl bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Store Profile & Settings</h2>
          <form onSubmit={handleSaveStore} className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Store Name</label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none text-slate-900"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Store Description</label>
              <textarea
                rows={3}
                value={storeDesc}
                onChange={(e) => setStoreDesc(e.target.value)}
                placeholder="Describe your brand, specializations, and quality standards..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none text-slate-900"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Support Email</label>
              <input
                type="email"
                value={storeEmail}
                onChange={(e) => setStoreEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none text-slate-900"
              />
            </div>
            <button
              type="submit"
              className="py-2.5 px-4 bg-indigo-600 text-white rounded-xl font-bold shadow-xs hover:bg-indigo-700 transition-colors"
            >
              Save Store Changes
            </button>
          </form>
        </div>
      )}

      {/* ADD / EDIT PRODUCT MODAL */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl p-6 sm:p-8 space-y-4 my-8">
            <button
              onClick={() => setShowAddProductModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-extrabold text-slate-900 text-lg">
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </h3>

            <form onSubmit={handleSaveProduct} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Studio Pro Studio ANC Headphones"
                  value={pName}
                  onChange={(e) => setPName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Category *</label>
                  <select
                    value={pCategory}
                    onChange={(e) => setPCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none cursor-pointer"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Unique SKU *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EL-HP-990"
                    value={pSku}
                    onChange={(e) => setPSku(e.target.value.toUpperCase())}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Description *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Provide specifications, materials, and highlights..."
                  value={pDescription}
                  onChange={(e) => setPDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Price (₹) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    placeholder="1999"
                    value={pPrice}
                    onChange={(e) => setPPrice(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Discount Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="1499"
                    value={pDiscountPrice}
                    onChange={(e) => setPDiscountPrice(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Stock Units *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="25"
                    value={pStock}
                    onChange={(e) => setPStock(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Image URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={pImageUrl}
                  onChange={(e) => setPImageUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none"
                />
              </div>

              {/* Variants toggle */}
              {!editingProduct && (
                <div className="pt-2 border-t border-slate-100">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={hasVariants}
                      onChange={(e) => setHasVariants(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    <span>Add Color/Size/Storage Variants</span>
                  </label>

                  {hasVariants && (
                    <div className="space-y-2 mt-2 p-3 bg-slate-50 rounded-xl">
                      {variantList.map((v, i) => (
                        <div key={i} className="grid grid-cols-4 gap-2">
                          <input
                            type="text"
                            placeholder="Title (e.g. Black / L)"
                            value={v.title}
                            onChange={(e) => {
                              const updated = [...variantList];
                              updated[i].title = e.target.value;
                              setVariantList(updated);
                            }}
                            className="bg-white border border-slate-200 rounded-lg p-1.5 outline-none col-span-2"
                          />
                          <input
                            type="text"
                            placeholder="SKU"
                            value={v.sku}
                            onChange={(e) => {
                              const updated = [...variantList];
                              updated[i].sku = e.target.value;
                              setVariantList(updated);
                            }}
                            className="bg-white border border-slate-200 rounded-lg p-1.5 outline-none"
                          />
                          <input
                            type="number"
                            placeholder="Stock"
                            value={v.stock}
                            onChange={(e) => {
                              const updated = [...variantList];
                              updated[i].stock = e.target.value;
                              setVariantList(updated);
                            }}
                            className="bg-white border border-slate-200 rounded-lg p-1.5 outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-200 transition-colors"
              >
                {editingProduct ? 'Save Product Changes' : 'Submit Product for Review'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

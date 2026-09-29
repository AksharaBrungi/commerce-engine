import React, { useState } from 'react';
import {
  Search,
  ShoppingCart,
  Heart,
  Scale,
  User as UserIcon,
  Store,
  ShieldCheck,
  ChevronDown,
  Menu,
  X,
  LogOut,
  Package,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useCurrency } from '../context/CurrencyContext.tsx';
import { useCart } from '../context/CartContext.tsx';
import { useWishlist } from '../context/WishlistContext.tsx';
import { useCompare } from '../context/CompareContext.tsx';
import { Category } from '../types/index.ts';

interface HeaderProps {
  categories: Category[];
  activeView: string;
  setActiveView: (view: string) => void;
  onSearch: (query: string, categorySlug?: string) => void;
  onOpenAuth: () => void;
  onSelectCategory: (categorySlug: string) => void;
}

export function Header({
  categories,
  activeView,
  setActiveView,
  onSearch,
  onOpenAuth,
  onSelectCategory,
}: HeaderProps) {
  const { user, logout, quickDemoLogin } = useAuth();
  const { currency, setCurrency, currencies } = useCurrency();
  const { itemCount } = useCart();
  const { wishlistIds } = useWishlist();
  const { compareItems } = useCompare();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoBannerOpen, setDemoBannerOpen] = useState(true);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery, selectedCat);
    setActiveView('catalog');
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 shadow-xs">
      {/* Top Demo Bar */}
      {demoBannerOpen && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white text-xs py-1.5 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-x-auto py-0.5 max-w-full">
            <span className="font-semibold text-indigo-300 flex items-center gap-1 shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Demo Accounts:
            </span>
            <span className="text-slate-300 shrink-0">Password: <code className="bg-white/10 px-1.5 py-0.5 rounded text-amber-300 font-mono">demo123</code></span>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => quickDemoLogin('admin@commerceengine.local')}
                className="bg-indigo-600/80 hover:bg-indigo-500 text-white px-2 py-0.5 rounded font-medium transition-colors"
              >
                Admin
              </button>
              <button
                onClick={() => quickDemoLogin('seller1@commerceengine.local')}
                className="bg-emerald-600/80 hover:bg-emerald-500 text-white px-2 py-0.5 rounded font-medium transition-colors"
              >
                Seller (Apex)
              </button>
              <button
                onClick={() => quickDemoLogin('seller2@commerceengine.local')}
                className="bg-teal-600/80 hover:bg-teal-500 text-white px-2 py-0.5 rounded font-medium transition-colors"
              >
                Seller (Fashion)
              </button>
              <button
                onClick={() => quickDemoLogin('customer@commerceengine.local')}
                className="bg-sky-600/80 hover:bg-sky-500 text-white px-2 py-0.5 rounded font-medium transition-colors"
              >
                Customer (John)
              </button>
            </div>
          </div>
          <button
            onClick={() => setDemoBannerOpen(false)}
            className="text-slate-400 hover:text-white ml-2 text-xs shrink-0"
            title="Dismiss banner"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Header Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 gap-3 md:gap-6">
          {/* Logo */}
          <div
            onClick={() => setActiveView('home')}
            className="flex items-center gap-2.5 cursor-pointer shrink-0 group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-200 group-hover:scale-105 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-slate-900 block leading-none">
                COMMERCE<span className="text-indigo-600">ENGINE</span>
              </span>
              <span className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase block mt-0.5">
                Multi-Vendor Marketplace
              </span>
            </div>
          </div>

          {/* Search Bar (Desktop) */}
          <form
            onSubmit={handleSearchSubmit}
            className="hidden md:flex flex-1 max-w-xl items-center relative"
          >
            <div className="flex w-full items-center bg-slate-100/90 hover:bg-slate-100 rounded-full border border-slate-200 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all overflow-hidden">
              <select
                value={selectedCat}
                onChange={(e) => setSelectedCat(e.target.value)}
                className="text-xs font-medium text-slate-700 bg-transparent pl-4 pr-2 py-2.5 outline-none border-r border-slate-200 cursor-pointer"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Search products, brands, models, or SKUs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 text-slate-400 hover:text-slate-600 text-xs mr-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 font-medium transition-colors flex items-center justify-center"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Right Utility Actions */}
          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            {/* Currency Selector */}
            <div className="relative">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="text-xs font-semibold bg-slate-100 hover:bg-slate-200/70 text-slate-800 py-1.5 px-2.5 rounded-lg border border-slate-200/80 outline-none cursor-pointer transition-colors"
                title="Select Currency"
              >
                {Object.values(currencies).map((curr) => (
                  <option key={curr.code} value={curr.code}>
                    {curr.code} ({curr.symbol})
                  </option>
                ))}
              </select>
            </div>

            {/* Compare Button */}
            <button
              onClick={() => setActiveView('compare')}
              className="relative p-2 rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
              title="Compare Products (up to 3)"
            >
              <Scale className="w-5 h-5" />
              {compareItems.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[10px] font-bold w-4.5 h-4.5 rounded-full flex items-center justify-center">
                  {compareItems.length}
                </span>
              )}
            </button>

            {/* Wishlist Button */}
            <button
              onClick={() => {
                if (!user) onOpenAuth();
                else setActiveView('account');
              }}
              className="relative p-2 rounded-xl text-slate-600 hover:text-rose-600 hover:bg-slate-100 transition-colors"
              title="Wishlist"
            >
              <Heart className="w-5 h-5" />
              {wishlistIds.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold w-4.5 h-4.5 rounded-full flex items-center justify-center">
                  {wishlistIds.length}
                </span>
              )}
            </button>

            {/* Cart Button */}
            <button
              onClick={() => setActiveView('cart')}
              className="relative p-2 rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
              title="Shopping Cart"
            >
              <ShoppingCart className="w-5 h-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[10px] font-bold w-4.5 h-4.5 rounded-full flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </button>

            {/* User Account / Auth */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                  className="flex items-center gap-2 p-1.5 pl-2.5 rounded-xl bg-slate-100/90 hover:bg-slate-200/70 border border-slate-200/80 transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left hidden lg:block">
                    <span className="text-xs font-bold text-slate-800 block leading-tight max-w-[100px] truncate">
                      {user.name}
                    </span>
                    <span className="text-[10px] font-semibold text-indigo-600 uppercase">
                      {user.role}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                </button>

                {accountMenuOpen && (
                  <div
                    onMouseLeave={() => setAccountMenuOpen(false)}
                    className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 text-sm animate-in fade-in zoom-in-95"
                  >
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="font-semibold text-slate-900 truncate">{user.name}</p>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                      <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full">
                        {user.role} ACCOUNT
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setActiveView('account');
                        setAccountMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                    >
                      <Package className="w-4 h-4 text-slate-400" />
                      <span>My Orders & Profile</span>
                    </button>

                    {user.role === 'SELLER' && (
                      <button
                        onClick={() => {
                          setActiveView('seller');
                          setAccountMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2 text-emerald-700 font-medium"
                      >
                        <Store className="w-4 h-4 text-emerald-600" />
                        <span>Seller Dashboard</span>
                      </button>
                    )}

                    {user.role === 'ADMIN' && (
                      <button
                        onClick={() => {
                          setActiveView('admin');
                          setAccountMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2 text-indigo-700 font-medium"
                      >
                        <ShieldCheck className="w-4 h-4 text-indigo-600" />
                        <span>Admin Dashboard</span>
                      </button>
                    )}

                    <div className="border-t border-slate-100 my-1"></div>

                    <button
                      onClick={() => {
                        logout();
                        setAccountMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-rose-50 flex items-center gap-2 text-rose-600"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 md:hidden text-slate-600 hover:text-slate-900 rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Search Input */}
        <div className="md:hidden pb-3">
          <form onSubmit={handleSearchSubmit} className="flex w-full items-center bg-slate-100 rounded-full px-3 py-1.5 border border-slate-200">
            <input
              type="text"
              placeholder="Search products, brands..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-xs text-slate-800 outline-none"
            />
            <button type="submit" className="text-slate-500 hover:text-indigo-600">
              <Search className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Categories Bar */}
        <div className="hidden md:flex items-center gap-6 overflow-x-auto py-2.5 text-xs font-semibold text-slate-600 border-t border-slate-100 no-scrollbar">
          <button
            onClick={() => {
              setSelectedCat('');
              onSearch('', '');
              setActiveView('catalog');
            }}
            className="hover:text-indigo-600 whitespace-nowrap transition-colors"
          >
            All Products
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelectCategory(c.slug)}
              className="hover:text-indigo-600 whitespace-nowrap transition-colors flex items-center gap-1"
            >
              <span>{c.name}</span>
              {c.productCount !== undefined && (
                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded-full font-normal">
                  {c.productCount}
                </span>
              )}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-4 text-xs font-medium text-slate-500">
            {user?.role !== 'SELLER' && (
              <button
                onClick={() => {
                  if (!user) onOpenAuth();
                  else setActiveView('account');
                }}
                className="text-indigo-600 hover:underline flex items-center gap-1 font-semibold"
              >
                <Store className="w-3.5 h-3.5" />
                Become a Seller
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 py-4 space-y-3">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Categories</div>
          <div className="grid grid-cols-2 gap-2">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  onSelectCategory(c.slug);
                  setMobileMenuOpen(false);
                }}
                className="text-left text-xs font-medium text-slate-700 py-1 hover:text-indigo-600"
              >
                {c.name}
              </button>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2 text-sm">
            <button
              onClick={() => {
                setActiveView('catalog');
                setMobileMenuOpen(false);
              }}
              className="text-left py-1 text-slate-700 hover:text-indigo-600"
            >
              Browse All Products
            </button>
            <button
              onClick={() => {
                setActiveView('compare');
                setMobileMenuOpen(false);
              }}
              className="text-left py-1 text-slate-700 hover:text-indigo-600"
            >
              Compare Products ({compareItems.length})
            </button>
            {user && (
              <button
                onClick={() => {
                  setActiveView('account');
                  setMobileMenuOpen(false);
                }}
                className="text-left py-1 text-slate-700 hover:text-indigo-600"
              >
                My Account & Orders
              </button>
            )}
            {user?.role === 'SELLER' && (
              <button
                onClick={() => {
                  setActiveView('seller');
                  setMobileMenuOpen(false);
                }}
                className="text-left py-1 text-emerald-600 font-semibold"
              >
                Seller Dashboard
              </button>
            )}
            {user?.role === 'ADMIN' && (
              <button
                onClick={() => {
                  setActiveView('admin');
                  setMobileMenuOpen(false);
                }}
                className="text-left py-1 text-indigo-600 font-semibold"
              >
                Admin Dashboard
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

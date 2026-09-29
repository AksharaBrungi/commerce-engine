import React, { useState, useEffect } from 'react';
import { ToastProvider } from './context/ToastContext.tsx';
import { CurrencyProvider } from './context/CurrencyContext.tsx';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { CartProvider } from './context/CartContext.tsx';
import { WishlistProvider } from './context/WishlistContext.tsx';
import { CompareProvider } from './context/CompareContext.tsx';

import { Header } from './components/Header.tsx';
import { Footer } from './components/Footer.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { CommerceAssistant } from './components/CommerceAssistant/CommerceAssistant.tsx';

import { HomePage } from './pages/HomePage.tsx';
import { CatalogPage } from './pages/CatalogPage.tsx';
import { ProductDetailPage } from './pages/ProductDetailPage.tsx';
import { CartPage } from './pages/CartPage.tsx';
import { ComparePage } from './pages/ComparePage.tsx';
import { CheckoutPage } from './pages/CheckoutPage.tsx';
import { AccountPage } from './pages/AccountPage.tsx';
import { SellerDashboardPage } from './pages/SellerDashboardPage.tsx';
import { AdminDashboardPage } from './pages/AdminDashboardPage.tsx';

import { Product, Category } from './types/index.ts';

function MainApp() {
  const { user } = useAuth();

  // Navigation state
  const [activeView, setActiveView] = useState<string>('home');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // Search & Filter state passed to Catalog
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategorySlug, setSelectedCategorySlug] = useState('');

  // Auth Modal state
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Fetch categories on mount
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch('/api/categories');
        if (res.ok) {
          const data = await res.json();
          setCategories(data.categories || []);
        }
      } catch (e) {
        console.error('Error fetching categories:', e);
      }
    }
    loadCategories();
  }, []);

  // Handlers
  const handleSelectProduct = (product: Product) => {
    setSelectedProductId(product.slug || product.id);
    setActiveView('product');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectCategory = (catSlug: string) => {
    setSelectedCategorySlug(catSlug);
    setSearchQuery('');
    setActiveView('catalog');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearch = (query: string, catSlug?: string) => {
    setSearchQuery(query);
    if (catSlug !== undefined) setSelectedCategorySlug(catSlug);
    setActiveView('catalog');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExploreCatalog = () => {
    setSearchQuery('');
    setSelectedCategorySlug('');
    setActiveView('catalog');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <Header
        categories={categories}
        activeView={activeView}
        setActiveView={(v) => {
          setActiveView(v);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onSearch={handleSearch}
        onOpenAuth={() => setAuthModalOpen(true)}
        onSelectCategory={handleSelectCategory}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {activeView === 'home' && (
          <HomePage
            categories={categories}
            onSelectProduct={handleSelectProduct}
            onSelectCategory={handleSelectCategory}
            onExploreCatalog={handleExploreCatalog}
          />
        )}

        {activeView === 'catalog' && (
          <CatalogPage
            categories={categories}
            initialCategory={selectedCategorySlug}
            initialSearch={searchQuery}
            onSelectProduct={handleSelectProduct}
          />
        )}

        {activeView === 'product' && selectedProductId && (
          <ProductDetailPage
            productIdOrSlug={selectedProductId}
            onBack={() => setActiveView('catalog')}
            onSelectProduct={handleSelectProduct}
            onBuyNow={() => setActiveView('checkout')}
          />
        )}

        {activeView === 'cart' && (
          <CartPage
            onCheckout={() => {
              if (!user) setAuthModalOpen(true);
              else setActiveView('checkout');
            }}
            onContinueShopping={handleExploreCatalog}
            onSelectProduct={handleSelectProduct}
          />
        )}

        {activeView === 'compare' && (
          <ComparePage
            onSelectProduct={handleSelectProduct}
            onExploreCatalog={handleExploreCatalog}
          />
        )}

        {activeView === 'checkout' && (
          <CheckoutPage
            onOrderSuccess={(orderId) => {
              setActiveView('account');
            }}
            onBackToCart={() => setActiveView('cart')}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        )}

        {activeView === 'account' && (
          <AccountPage
            onSelectProduct={handleSelectProduct}
            onExploreCatalog={handleExploreCatalog}
          />
        )}

        {activeView === 'seller' && (
          <SellerDashboardPage categories={categories} />
        )}

        {activeView === 'admin' && (
          <AdminDashboardPage />
        )}
      </main>

      {/* Footer */}
      <Footer onSelectCategory={handleSelectCategory} />

      {/* Global Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

      {/* Floating AI Shopping Assistant */}
      <CommerceAssistant
        onSelectProduct={handleSelectProduct}
        onNavigate={(view) => {
          setActiveView(view);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenAuth={() => setAuthModalOpen(true)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <CurrencyProvider>
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <CompareProvider>
                <MainApp />
              </CompareProvider>
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </CurrencyProvider>
    </ToastProvider>
  );
}

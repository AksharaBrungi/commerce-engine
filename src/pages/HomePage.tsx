import React, { useState, useEffect } from 'react';
import { ArrowRight, Sparkles, TrendingUp, Tag, ShieldCheck, Zap, Star } from 'lucide-react';
import { Product, Category } from '../types/index.ts';
import { ProductCard } from '../components/ProductCard.tsx';
import { useCurrency } from '../context/CurrencyContext.tsx';

interface HomePageProps {
  categories: Category[];
  onSelectProduct: (product: Product) => void;
  onSelectCategory: (categorySlug: string) => void;
  onExploreCatalog: () => void;
}

export function HomePage({
  categories,
  onSelectProduct,
  onSelectCategory,
  onExploreCatalog,
}: HomePageProps) {
  const { format } = useCurrency();
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [popularProducts, setPopularProducts] = useState<Product[]>([]);
  const [dealProducts, setDealProducts] = useState<Product[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHomeProducts() {
      setLoading(true);
      try {
        // Fetch featured
        const featuredRes = await fetch('/api/products?featured=true&limit=8');
        const featuredData = await featuredRes.json();
        setFeaturedProducts(featuredData.products || []);

        // Fetch popular / rating
        const popRes = await fetch('/api/products?sort=rating&limit=8');
        const popData = await popRes.json();
        setPopularProducts(popData.products || []);

        // Fetch newest
        const newRes = await fetch('/api/products?sort=newest&limit=8');
        const newData = await newRes.json();
        setNewArrivals(newData.products || []);

        // Filter deals (discountPrice < price)
        const deals = (featuredData.products || []).concat(popData.products || [])
          .filter((p: Product) => p.discountPrice && p.discountPrice < p.price)
          .slice(0, 4);
        setDealProducts(deals);
      } catch (err) {
        console.error('Home products error:', err);
      } finally {
        setLoading(false);
      }
    }

    loadHomeProducts();

    // Load recently viewed from localStorage
    try {
      const stored = localStorage.getItem('ce_recently_viewed');
      if (stored) {
        setRecentlyViewed(JSON.parse(stored).slice(0, 4));
      }
    } catch {}
  }, []);

  return (
    <div className="space-y-16 pb-20">
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden bg-slate-900 text-white rounded-3xl mx-4 sm:mx-6 lg:mx-8 mt-4 shadow-2xl">
        {/* Subtle decorative mesh background */}
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(#4f46e5_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none"></div>
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative max-w-7xl mx-auto px-6 sm:px-12 py-16 sm:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
              <span>Multi-Vendor Marketplace • Local SQLite Architecture</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1]">
              Shop Top Brands & Artisanal Creators.
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl">
              Discover curated electronics, luxury apparel, bespoke homeware, and studio gear from verified independent sellers. Instant checkout and guaranteed real-time stock.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={onExploreCatalog}
                className="px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-lg shadow-indigo-600/30 hover:shadow-indigo-500/50 active:scale-95 transition-all flex items-center gap-2"
              >
                <span>Explore Catalog</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => onSelectCategory('electronics')}
                className="px-6 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold border border-slate-700 active:scale-95 transition-all"
              >
                View Electronics
              </button>
            </div>

            <div className="pt-4 flex items-center gap-8 border-t border-slate-800/80 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Verified Independent Sellers</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Zero Database Setup Required</span>
              </div>
            </div>
          </div>

          {/* Hero Showcase Card */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-full max-w-sm rounded-3xl bg-slate-800/80 p-5 border border-slate-700/80 shadow-2xl backdrop-blur-md">
              <div className="relative aspect-4/3 rounded-2xl overflow-hidden mb-4 bg-slate-900">
                <img
                  src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80"
                  alt="PulseWave Headphones"
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-3 right-3 bg-rose-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-md">
                  HOT DEAL
                </span>
              </div>

              <div>
                <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">Spotlight Product</span>
                <h3 className="text-base font-bold text-white mt-1">PulseWave Pro Wireless ANC</h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  40mm titanium drivers with 45-hour battery life and studio spatial audio.
                </p>
                <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-700/60">
                  <div>
                    <span className="text-xs text-slate-400">Deal Price:</span>
                    <p className="text-lg font-bold text-white">{format(15499)}</p>
                  </div>
                  <button
                    onClick={onExploreCatalog}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition-colors"
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Shop by Category */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Shop by Category</h2>
            <p className="text-xs text-slate-500 mt-1">Explore 50+ handpicked products across popular departments</p>
          </div>
          <button
            onClick={onExploreCatalog}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {categories.map((c) => (
            <div
              key={c.id}
              onClick={() => onSelectCategory(c.slug)}
              className="group bg-white rounded-2xl p-3 border border-slate-200/80 hover:border-indigo-300 shadow-xs hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden mb-3 bg-slate-100 group-hover:scale-105 transition-transform duration-300">
                <img
                  src={c.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&auto=format&fit=crop&q=80'}
                  alt={c.name}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </div>
              <h4 className="font-bold text-xs sm:text-sm text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-1">
                {c.name}
              </h4>
              <span className="text-[11px] text-slate-400 mt-0.5">
                {c.productCount || 0} Products
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Deals Section with Limited-Time savings */}
      {dealProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-6 sm:p-8 bg-gradient-to-r from-rose-50 via-amber-50 to-orange-50 rounded-3xl border border-rose-200/70 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-rose-500 text-white rounded-2xl shadow-sm">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900">Deals of the Day</h3>
                  <p className="text-xs text-slate-600 mt-0.5">Exclusive promotional discounts validated directly on the server</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white/80 px-3.5 py-1.5 rounded-full border border-rose-200 text-xs font-bold text-rose-700">
                <span>Use coupon code:</span>
                <code className="bg-rose-100 px-2 py-0.5 rounded text-rose-900 font-mono">SAVE500</code>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
              {dealProducts.map((product) => (
                <ProductCard key={product.id} product={product} onSelect={onSelectProduct} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 4. Featured Products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-indigo-600" />
              Featured Products
            </h2>
            <p className="text-xs text-slate-500 mt-1">Handpicked bestsellers with top consumer satisfaction</p>
          </div>
          <button
            onClick={onExploreCatalog}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            <span>See More</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse bg-slate-200 h-72 rounded-2xl"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {featuredProducts.slice(0, 8).map((product) => (
              <ProductCard key={product.id} product={product} onSelect={onSelectProduct} />
            ))}
          </div>
        )}
      </section>

      {/* 5. Top Sellers Highlight */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <span className="text-indigo-400 font-bold text-xs uppercase tracking-wider">Independent Merchant Network</span>
              <h2 className="text-2xl font-bold mt-1">Featured Verified Sellers</h2>
            </div>
            <span className="text-xs text-slate-400">100% Tenant-Isolated Fulfillment</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-white text-base">Apex Tech & Electronics</h4>
                  <div className="flex items-center gap-1 text-xs text-amber-400 font-bold bg-amber-400/10 px-2 py-0.5 rounded-full">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>4.9</span>
                  </div>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Flagship audio gear, OLED laptops, and next-gen personal computing accessories.
                </p>
              </div>
              <button
                onClick={() => onSelectCategory('electronics')}
                className="mt-4 text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                <span>Browse Store Items</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-white text-base">Urban Thread Apparel</h4>
                  <div className="flex items-center gap-1 text-xs text-amber-400 font-bold bg-amber-400/10 px-2 py-0.5 rounded-full">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>4.8</span>
                  </div>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Sustainable luxury fashion, selvedge denim, merino knitwear, and classic footwear.
                </p>
              </div>
              <button
                onClick={() => onSelectCategory('fashion')}
                className="mt-4 text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                <span>Browse Store Items</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-white text-base">Luxe Living & Home</h4>
                  <div className="flex items-center gap-1 text-xs text-amber-400 font-bold bg-amber-400/10 px-2 py-0.5 rounded-full">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>4.9</span>
                  </div>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Artisanal kitchenware, specialty coffee tools, and minimalist home design essentials.
                </p>
              </div>
              <button
                onClick={() => onSelectCategory('home-kitchen')}
                className="mt-4 text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                <span>Browse Store Items</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Popular / Top Rated */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
              Popular & Top Rated
            </h2>
            <p className="text-xs text-slate-500 mt-1">Highly evaluated items based on verified customer ratings</p>
          </div>
          <button
            onClick={onExploreCatalog}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {popularProducts.slice(0, 4).map((product) => (
            <ProductCard key={product.id} product={product} onSelect={onSelectProduct} />
          ))}
        </div>
      </section>

      {/* 7. New Arrivals */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">New Arrivals</h2>
            <p className="text-xs text-slate-500 mt-1">Freshly stocked products from our trusted seller roster</p>
          </div>
          <button
            onClick={onExploreCatalog}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            <span>Explore All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {newArrivals.slice(0, 4).map((product) => (
            <ProductCard key={product.id} product={product} onSelect={onSelectProduct} />
          ))}
        </div>
      </section>

      {/* 8. Recently Viewed Products */}
      {recentlyViewed.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900">Recently Viewed</h3>
            <p className="text-xs text-slate-500">Pick up right where you left off</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
            {recentlyViewed.map((product) => (
              <ProductCard key={product.id} product={product} onSelect={onSelectProduct} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

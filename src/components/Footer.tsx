import React from 'react';
import { Layers, ShieldCheck, Truck, RotateCcw, Headphones, Lock } from 'lucide-react';

export function Footer({ onSelectCategory }: { onSelectCategory: (slug: string) => void }) {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-12 border-t border-slate-800">
      {/* Trust Badges */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-8 px-6 bg-slate-800/60 rounded-3xl border border-slate-700/60">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Fast Local Dispatch</h4>
              <p className="text-xs text-slate-400 mt-0.5">Reliable delivery across all zones</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Verified Merchants</h4>
              <p className="text-xs text-slate-400 mt-0.5">Strict quality & identity checks</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Easy Returns</h4>
              <p className="text-xs text-slate-400 mt-0.5">Up to 30 days hassle-free</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Secure Sandbox Flow</h4>
              <p className="text-xs text-slate-400 mt-0.5">End-to-end safe transactions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-5 gap-10">
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">
              <Layers className="w-4 h-4" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">
              COMMERCE<span className="text-indigo-400">ENGINE</span>
            </span>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
            Self-contained multi-vendor marketplace platform. Built with React, TypeScript, Express, SQLite, and Drizzle ORM. Designed for effortless local evaluation without external database dependencies.
          </p>
          <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
            <span className="bg-slate-800 px-2 py-1 rounded">SQLite 3</span>
            <span className="bg-slate-800 px-2 py-1 rounded">Drizzle ORM</span>
            <span className="bg-slate-800 px-2 py-1 rounded">Multi-Currency</span>
          </div>
        </div>

        <div>
          <h5 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Categories</h5>
          <ul className="space-y-2 text-sm text-slate-400">
            <li><button onClick={() => onSelectCategory('electronics')} className="hover:text-indigo-400 transition-colors">Electronics</button></li>
            <li><button onClick={() => onSelectCategory('fashion')} className="hover:text-indigo-400 transition-colors">Fashion & Apparel</button></li>
            <li><button onClick={() => onSelectCategory('home-kitchen')} className="hover:text-indigo-400 transition-colors">Home & Kitchen</button></li>
            <li><button onClick={() => onSelectCategory('beauty')} className="hover:text-indigo-400 transition-colors">Beauty & Personal Care</button></li>
            <li><button onClick={() => onSelectCategory('sports')} className="hover:text-indigo-400 transition-colors">Sports & Outdoors</button></li>
          </ul>
        </div>

        <div>
          <h5 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Marketplace Roles</h5>
          <ul className="space-y-2 text-sm text-slate-400">
            <li><span className="hover:text-slate-200">Customer Shopping</span></li>
            <li><span className="hover:text-slate-200">Multi-Seller Suborders</span></li>
            <li><span className="hover:text-slate-200">Seller Dashboard</span></li>
            <li><span className="hover:text-slate-200">Admin Moderation</span></li>
            <li><span className="hover:text-slate-200">Fulfillment Tracking</span></li>
          </ul>
        </div>

        <div>
          <h5 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Local Architecture</h5>
          <div className="text-xs text-slate-400 space-y-2">
            <p>Single development command:</p>
            <code className="block bg-slate-950 p-2 rounded text-emerald-400 font-mono text-[11px]">
              npm run dev
            </code>
            <p className="text-[11px] text-slate-500">
              Auto-seeds 50+ products, categories, coupons, and demo accounts upon startup.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <p>© 2026 Commerce Engine. Full-Stack Self-Contained E-Commerce System.</p>
        <p>Built with React, Express, and Drizzle ORM.</p>
      </div>
    </footer>
  );
}

import React from 'react';
import { Scale, Trash2, ShoppingBag, Star, ArrowRight, ArrowLeft } from 'lucide-react';
import { useCompare } from '../context/CompareContext.tsx';
import { useCurrency } from '../context/CurrencyContext.tsx';
import { useCart } from '../context/CartContext.tsx';
import { Product } from '../types/index.ts';

interface ComparePageProps {
  onSelectProduct: (product: Product) => void;
  onExploreCatalog: () => void;
}

export function ComparePage({ onSelectProduct, onExploreCatalog }: ComparePageProps) {
  const { compareItems, removeFromCompare, clearCompare } = useCompare();
  const { format } = useCurrency();
  const { addToCart } = useCart();

  if (compareItems.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl mx-auto flex items-center justify-center">
          <Scale className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">No Products in Comparison</h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Add up to 3 products from the catalog to compare prices, technical specifications, and customer ratings side-by-side.
        </p>
        <button
          onClick={onExploreCatalog}
          className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-indigo-700 transition-colors"
        >
          Explore Catalog
        </button>
      </div>
    );
  }

  // Collect all unique specification keys across the compared items
  const allSpecKeys = Array.from(
    new Set(
      compareItems.flatMap((item) =>
        item.specifications ? Object.keys(item.specifications) : []
      )
    )
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Compare Products
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Comparing {compareItems.length} of 3 items side-by-side
          </p>
        </div>
        <button
          onClick={clearCompare}
          className="text-xs font-semibold text-rose-600 hover:text-rose-800 transition-colors"
        >
          Clear Comparison
        </button>
      </div>

      <div className="overflow-x-auto pb-6">
        <table className="w-full border-collapse bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs text-xs">
          <thead>
            <tr className="border-b border-slate-200 divide-x divide-slate-100">
              <th className="p-4 bg-slate-50 w-44 text-slate-500 font-bold text-left uppercase tracking-wider">
                Product Details
              </th>
              {compareItems.map((prod) => (
                <th key={prod.id} className="p-4 w-72 text-left relative">
                  <button
                    onClick={() => removeFromCompare(prod.id)}
                    className="absolute top-3 right-3 text-slate-400 hover:text-rose-600 p-1"
                    title="Remove from compare"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div
                    onClick={() => onSelectProduct(prod)}
                    className="w-36 h-36 mx-auto rounded-2xl overflow-hidden bg-slate-100 mb-3 cursor-pointer"
                  >
                    <img
                      src={prod.primaryImage || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&auto=format&fit=crop&q=80'}
                      alt={prod.name}
                      className="w-full h-full object-cover hover:scale-105 transition-transform"
                    />
                  </div>

                  <h3
                    onClick={() => onSelectProduct(prod)}
                    className="font-bold text-sm text-slate-900 line-clamp-2 hover:text-indigo-600 cursor-pointer"
                  >
                    {prod.name}
                  </h3>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {/* Price */}
            <tr className="divide-x divide-slate-100">
              <td className="p-4 font-bold text-slate-600 bg-slate-50">Price</td>
              {compareItems.map((prod) => (
                <td key={prod.id} className="p-4">
                  <span className="text-base font-extrabold text-slate-900">
                    {format(prod.discountPrice || prod.price)}
                  </span>
                  {prod.discountPrice && (
                    <span className="ml-2 text-[11px] text-slate-400 line-through">
                      {format(prod.price)}
                    </span>
                  )}
                </td>
              ))}
            </tr>

            {/* Rating */}
            <tr className="divide-x divide-slate-100">
              <td className="p-4 font-bold text-slate-600 bg-slate-50">Customer Rating</td>
              {compareItems.map((prod) => (
                <td key={prod.id} className="p-4">
                  <div className="flex items-center gap-1.5 text-amber-500 font-bold">
                    <Star className="w-4 h-4 fill-current" />
                    <span>{prod.rating.toFixed(1)}</span>
                    <span className="text-slate-400 font-normal">({prod.reviewCount} reviews)</span>
                  </div>
                </td>
              ))}
            </tr>

            {/* Seller */}
            <tr className="divide-x divide-slate-100">
              <td className="p-4 font-bold text-slate-600 bg-slate-50">Seller</td>
              {compareItems.map((prod) => (
                <td key={prod.id} className="p-4 text-slate-800 font-medium">
                  {prod.seller?.storeName || 'Verified Store'}
                </td>
              ))}
            </tr>

            {/* Stock Availability */}
            <tr className="divide-x divide-slate-100">
              <td className="p-4 font-bold text-slate-600 bg-slate-50">Stock Availability</td>
              {compareItems.map((prod) => (
                <td key={prod.id} className="p-4">
                  {prod.stock > 0 ? (
                    <span className="font-semibold text-emerald-700">
                      In Stock ({prod.stock} units)
                    </span>
                  ) : (
                    <span className="font-semibold text-rose-600">Out of Stock</span>
                  )}
                </td>
              ))}
            </tr>

            {/* Dynamic Specifications */}
            {allSpecKeys.map((key) => (
              <tr key={key} className="divide-x divide-slate-100">
                <td className="p-4 font-bold text-slate-600 bg-slate-50">{key}</td>
                {compareItems.map((prod) => (
                  <td key={prod.id} className="p-4 text-slate-700">
                    {prod.specifications && prod.specifications[key]
                      ? prod.specifications[key]
                      : '—'}
                  </td>
                ))}
              </tr>
            ))}

            {/* Action Row */}
            <tr className="divide-x divide-slate-100">
              <td className="p-4 font-bold text-slate-600 bg-slate-50">Purchase Action</td>
              {compareItems.map((prod) => (
                <td key={prod.id} className="p-4">
                  <button
                    disabled={prod.stock <= 0}
                    onClick={() => {
                      if (prod.variants && prod.variants.length > 0) {
                        onSelectProduct(prod);
                      } else {
                        addToCart(prod.id, null, 1);
                      }
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>{prod.stock <= 0 ? 'Sold Out' : 'Add to Cart'}</span>
                  </button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

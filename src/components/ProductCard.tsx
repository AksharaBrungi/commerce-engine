import React from 'react';
import { Heart, Scale, ShoppingBag, Star, Store, Check } from 'lucide-react';
import { Product } from '../types/index.ts';
import { useCurrency } from '../context/CurrencyContext.tsx';
import { useWishlist } from '../context/WishlistContext.tsx';
import { useCompare } from '../context/CompareContext.tsx';
import { useCart } from '../context/CartContext.tsx';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
}

export function ProductCard({ product, onSelect }: ProductCardProps) {
  const { format } = useCurrency();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { addToCompare, isInCompare } = useCompare();
  const { addToCart } = useCart();

  const inWish = isInWishlist(product.id);
  const inComp = isInCompare(product.id);
  const isOutOfStock = product.stock <= 0;

  const currentPrice = product.discountPrice || product.price;
  const originalPrice = product.discountPrice ? product.price : null;
  const discountPercent = originalPrice
    ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
    : 0;

  const handleCardClick = (e: React.MouseEvent) => {
    // If target is button or svg, don't trigger navigation
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    onSelect(product);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (product.variants && product.variants.length > 0) {
      // If product has variants, open detail page to select variant
      onSelect(product);
    } else {
      addToCart(product.id, null, 1);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className="group relative bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-indigo-200 transition-all duration-300 flex flex-col overflow-hidden cursor-pointer"
    >
      {/* Badges & Floating Actions */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 pointer-events-none">
        {discountPercent > 0 && (
          <span className="bg-rose-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-xs">
            -{discountPercent}%
          </span>
        )}
        {product.isFeatured === 1 && (
          <span className="bg-amber-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full shadow-xs">
            Featured
          </span>
        )}
        {isOutOfStock && (
          <span className="bg-slate-800 text-slate-200 text-xs font-semibold px-2 py-0.5 rounded-full shadow-xs">
            Out of Stock
          </span>
        )}
      </div>

      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
        <button
          title={inWish ? 'Remove from wishlist' : 'Add to wishlist'}
          onClick={(e) => {
            e.stopPropagation();
            toggleWishlist(product.id);
          }}
          className={`p-2 rounded-full backdrop-blur-md shadow-xs transition-colors ${
            inWish
              ? 'bg-rose-50 text-rose-600 border border-rose-200'
              : 'bg-white/90 text-slate-600 hover:text-rose-600 hover:bg-white'
          }`}
        >
          <Heart className={`w-4 h-4 ${inWish ? 'fill-current' : ''}`} />
        </button>

        <button
          title={inComp ? 'In comparison' : 'Compare product'}
          onClick={(e) => {
            e.stopPropagation();
            addToCompare(product);
          }}
          className={`p-2 rounded-full backdrop-blur-md shadow-xs transition-colors ${
            inComp
              ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
              : 'bg-white/90 text-slate-600 hover:text-indigo-600 hover:bg-white'
          }`}
        >
          <Scale className="w-4 h-4" />
        </button>
      </div>

      {/* Image Container */}
      <div className="relative aspect-4/3 w-full bg-slate-100 overflow-hidden">
        <img
          src={product.primaryImage || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80'}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
        />
        {product.stock > 0 && product.stock <= 5 && (
          <div className="absolute bottom-2 left-2 bg-amber-500/90 text-white text-[11px] font-medium px-2 py-0.5 rounded-md backdrop-blur-xs">
            Only {product.stock} left!
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4.5 flex-1 flex flex-col justify-between">
        <div>
          {/* Seller / Brand */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5">
            <Store className="w-3.5 h-3.5 text-slate-400" />
            <span className="truncate max-w-[180px]">
              {product.seller?.storeName || 'Verified Merchant'}
            </span>
          </div>

          {/* Title */}
          <h3 className="font-semibold text-slate-900 text-sm md:text-base leading-snug line-clamp-2 group-hover:text-indigo-600 transition-colors mb-2">
            {product.name}
          </h3>

          {/* Rating */}
          <div className="flex items-center gap-1.5 mb-3 text-xs">
            <div className="flex items-center text-amber-500">
              <Star className="w-3.5 h-3.5 fill-current" />
              <span className="font-bold ml-1 text-slate-800">{product.rating.toFixed(1)}</span>
            </div>
            <span className="text-slate-400">({product.reviewCount})</span>
            {product.variants && product.variants.length > 0 && (
              <span className="ml-auto text-[11px] bg-slate-100 text-slate-600 font-medium px-1.5 py-0.5 rounded">
                {product.variants.length} options
              </span>
            )}
          </div>
        </div>

        {/* Price & Action */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-slate-900">
                {format(currentPrice)}
              </span>
              {originalPrice && (
                <span className="text-xs text-slate-400 line-through">
                  {format(originalPrice)}
                </span>
              )}
            </div>
          </div>

          <button
            disabled={isOutOfStock}
            onClick={handleAddToCart}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              isOutOfStock
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white shadow-xs hover:shadow-indigo-200'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>{isOutOfStock ? 'Sold Out' : product.variants?.length ? 'Select' : 'Add'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

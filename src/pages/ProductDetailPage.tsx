import React, { useState, useEffect } from 'react';
import {
  Star,
  Store,
  Truck,
  RotateCcw,
  ShieldCheck,
  Heart,
  Scale,
  ShoppingBag,
  Zap,
  Check,
  ChevronRight,
  ArrowLeft,
  Package,
} from 'lucide-react';
import { Product, ProductVariant } from '../types/index.ts';
import { useCurrency } from '../context/CurrencyContext.tsx';
import { useCart } from '../context/CartContext.tsx';
import { useWishlist } from '../context/WishlistContext.tsx';
import { useCompare } from '../context/CompareContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { ProductCard } from '../components/ProductCard.tsx';

interface ProductDetailPageProps {
  productIdOrSlug: string;
  onBack: () => void;
  onSelectProduct: (product: Product) => void;
  onBuyNow: () => void;
}

export function ProductDetailPage({
  productIdOrSlug,
  onBack,
  onSelectProduct,
  onBuyNow,
}: ProductDetailPageProps) {
  const { format } = useCurrency();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { addToCompare, isInCompare } = useCompare();
  const { error } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'specs' | 'shipping' | 'reviews'>('specs');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProduct() {
      setLoading(true);
      try {
        const res = await fetch(`/api/products/${productIdOrSlug}`);
        if (res.ok) {
          const data = await res.json();
          const p = data.product;
          setProduct(p);
          setSelectedImage(p.primaryImage || p.images[0] || '');

          // Select first variant by default if variants exist
          if (p.variants && p.variants.length > 0) {
            setSelectedVariant(p.variants[0]);
          } else {
            setSelectedVariant(null);
          }

          // Save to recently viewed in localStorage
          try {
            const raw = localStorage.getItem('ce_recently_viewed');
            const list: Product[] = raw ? JSON.parse(raw) : [];
            const filtered = list.filter((item) => item.id !== p.id);
            localStorage.setItem('ce_recently_viewed', JSON.stringify([p, ...filtered].slice(0, 8)));
          } catch {}
        }
      } catch (err) {
        console.error('Error fetching product:', err);
      } finally {
        setLoading(false);
      }
    }

    loadProduct();
  }, [productIdOrSlug]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="inline-block animate-spin text-indigo-600 mb-3 text-2xl">⏳</div>
        <p className="text-xs text-slate-500">Loading product details...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Product Not Found</h2>
        <p className="text-xs text-slate-500">The product you are looking for does not exist or has been removed.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
        >
          Return to Catalog
        </button>
      </div>
    );
  }

  const activePrice = selectedVariant ? selectedVariant.price : (product.discountPrice || product.price);
  const originalPrice = selectedVariant ? null : (product.discountPrice ? product.price : null);
  const maxStock = selectedVariant ? selectedVariant.stock : product.stock;
  const isOutOfStock = maxStock <= 0;

  const handleAddToCart = async () => {
    if (isOutOfStock) {
      error('This item is currently out of stock.');
      return;
    }
    await addToCart(product.id, selectedVariant?.id || null, quantity);
  };

  const handleBuyNow = async () => {
    if (isOutOfStock) {
      error('This item is currently out of stock.');
      return;
    }
    const added = await addToCart(product.id, selectedVariant?.id || null, quantity);
    if (added) {
      onBuyNow();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      {/* Breadcrumb / Back button */}
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
        <button onClick={onBack} className="hover:text-indigo-600 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>
        <span>/</span>
        <span className="hover:text-slate-800">{product.category?.name || 'Catalog'}</span>
        <span>/</span>
        <span className="text-slate-900 font-semibold truncate max-w-xs">{product.name}</span>
      </div>

      {/* Main Product Showcase */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left: Gallery */}
        <div className="lg:col-span-6 space-y-4">
          <div className="aspect-4/3 w-full bg-slate-100 rounded-3xl overflow-hidden border border-slate-200/80 shadow-xs relative">
            <img
              src={selectedImage}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            {product.discountPrice && (
              <span className="absolute top-4 left-4 bg-rose-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                SAVE {Math.round(((product.price - product.discountPrice) / product.price) * 100)}%
              </span>
            )}
          </div>

          {/* Thumbnails */}
          {product.images && product.images.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(img)}
                  className={`w-20 h-20 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                    selectedImage === img
                      ? 'border-indigo-600 ring-2 ring-indigo-100'
                      : 'border-slate-200 hover:border-slate-400 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Info & Purchase Controls */}
        <div className="lg:col-span-6 space-y-6">
          <div>
            {/* Seller Info */}
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 mb-2">
              <Store className="w-4 h-4" />
              <span>Sold by: {product.seller?.storeName || 'Verified Merchant'}</span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-500 font-mono">SKU: {selectedVariant?.sku || product.sku}</span>
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
              {product.name}
            </h1>

            {/* Rating Summary */}
            <div className="flex items-center gap-2 mt-2 text-xs">
              <div className="flex items-center text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.round(product.rating) ? 'fill-current' : 'text-slate-200'
                    }`}
                  />
                ))}
                <span className="font-bold ml-1.5 text-slate-900">{product.rating.toFixed(1)}</span>
              </div>
              <span className="text-slate-400">•</span>
              <span className="text-slate-500">{product.reviewCount} customer reviews</span>
            </div>
          </div>

          {/* Pricing Box */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-baseline justify-between">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900">
                  {format(activePrice)}
                </span>
                {originalPrice && (
                  <span className="text-sm text-slate-400 line-through">
                    {format(originalPrice)}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Inclusive of all local marketplace taxes</p>
            </div>

            {/* Stock status indicator */}
            <div className="text-right">
              {isOutOfStock ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                  Out of Stock
                </span>
              ) : maxStock <= 5 ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                  Only {maxStock} left in stock!
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  <Check className="w-3.5 h-3.5" />
                  In Stock ({maxStock} available)
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {product.description}
          </p>

          {/* Variant Selection (Size, Color, Storage, etc.) */}
          {product.variants && product.variants.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Select Option:
              </label>
              <div className="flex flex-wrap gap-2.5">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => {
                      setSelectedVariant(v);
                      setQuantity(1);
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      selectedVariant?.id === v.id
                        ? 'border-indigo-600 bg-indigo-50/60 text-indigo-700 shadow-xs ring-1 ring-indigo-500'
                        : 'border-slate-200 text-slate-700 hover:border-slate-400 bg-white'
                    }`}
                  >
                    <span>{v.title}</span>
                    <span className="ml-1.5 text-[11px] opacity-70">({format(v.price)})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity Selector & Purchase Actions */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-4">
              <span className="text-xs font-bold text-slate-700">Quantity:</span>
              <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-white">
                <button
                  disabled={quantity <= 1 || isOutOfStock}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-3 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  -
                </button>
                <span className="px-4 py-1.5 text-xs font-bold text-slate-900 select-none">
                  {quantity}
                </span>
                <button
                  disabled={quantity >= maxStock || isOutOfStock}
                  onClick={() => setQuantity((q) => Math.min(maxStock, q + 1))}
                  className="px-3 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  +
                </button>
              </div>
              <span className="text-[11px] text-slate-400">Max: {maxStock}</span>
            </div>

            {/* Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                disabled={isOutOfStock}
                onClick={handleAddToCart}
                className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-xs font-bold shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed disabled:shadow-none"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Add to Cart</span>
              </button>

              <button
                disabled={isOutOfStock}
                onClick={handleBuyNow}
                className="w-full py-3.5 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-98 text-white text-xs font-bold shadow-md shadow-slate-300 transition-all flex items-center justify-center gap-2 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed disabled:shadow-none"
              >
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Buy Now</span>
              </button>
            </div>

            {/* Wishlist & Compare Quick Toggles */}
            <div className="flex items-center gap-4 pt-1">
              <button
                onClick={() => toggleWishlist(product.id)}
                className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                  isInWishlist(product.id) ? 'text-rose-600 font-bold' : 'text-slate-600 hover:text-rose-600'
                }`}
              >
                <Heart className={`w-4 h-4 ${isInWishlist(product.id) ? 'fill-current' : ''}`} />
                <span>{isInWishlist(product.id) ? 'In Wishlist' : 'Add to Wishlist'}</span>
              </button>

              <button
                onClick={() => addToCompare(product)}
                className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                  isInCompare(product.id) ? 'text-indigo-600 font-bold' : 'text-slate-600 hover:text-indigo-600'
                }`}
              >
                <Scale className="w-4 h-4" />
                <span>{isInCompare(product.id) ? 'In Comparison' : 'Compare Product'}</span>
              </button>
            </div>
          </div>

          {/* Guarantees */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Free delivery on orders over ₹999</span>
            </div>
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-amber-600 shrink-0" />
              <span>30-Day Hassle-Free Returns</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs: Specs, Shipping, Reviews */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center gap-6 border-b border-slate-200 text-xs sm:text-sm font-bold">
          <button
            onClick={() => setActiveTab('specs')}
            className={`pb-3 border-b-2 transition-all ${
              activeTab === 'specs'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Technical Specifications
          </button>
          <button
            onClick={() => setActiveTab('shipping')}
            className={`pb-3 border-b-2 transition-all ${
              activeTab === 'shipping'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Shipping & Return Policy
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`pb-3 border-b-2 transition-all ${
              activeTab === 'reviews'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Verified Customer Reviews ({product.reviews?.length || 0})
          </button>
        </div>

        {/* Tab 1: Specs */}
        {activeTab === 'specs' && (
          <div className="space-y-4">
            {product.specifications && Object.keys(product.specifications).length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {Object.entries(product.specifications).map(([key, val]) => (
                  <div key={key} className="flex justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="font-semibold text-slate-600">{key}</span>
                    <span className="font-medium text-slate-900 text-right">{val}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">Standard specifications apply for this catalog item.</p>
            )}
          </div>
        )}

        {/* Tab 2: Shipping */}
        {activeTab === 'shipping' && (
          <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
            <div>
              <h4 className="font-bold text-slate-900 mb-1">Dispatch & Delivery</h4>
              <p>{product.shippingInfo || 'Standard tracked courier delivery within 2 to 4 business days.'}</p>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-1">Returns & Exchanges</h4>
              <p>{product.returnInfo || 'Return within 30 days of receipt in original packaging.'}</p>
            </div>
          </div>
        )}

        {/* Tab 3: Reviews */}
        {activeTab === 'reviews' && (
          <div className="space-y-6">
            {product.reviews && product.reviews.length > 0 ? (
              <div className="space-y-4">
                {product.reviews.map((rev) => (
                  <div key={rev.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center text-amber-500">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${i < rev.rating ? 'fill-current' : 'text-slate-200'}`}
                            />
                          ))}
                        </div>
                        <span className="font-bold text-slate-900">{rev.title}</span>
                      </div>
                      <span className="text-slate-400 text-[11px]">
                        {new Date(rev.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{rev.comment}</p>
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Verified Buyer: {rev.user?.name || 'Customer'}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                No customer reviews yet. Customers who order this item can leave verified purchase feedback after delivery.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Related Products */}
      {product.relatedProducts && product.relatedProducts.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900">Customers Also Viewed</h3>
            <span className="text-xs text-slate-400">Same category</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
            {product.relatedProducts.map((rel) => (
              <ProductCard key={rel.id} product={rel} onSelect={onSelectProduct} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CartItem, CartSummary } from '../types/index.ts';
import { useAuth } from './AuthContext.tsx';
import { useToast } from './ToastContext.tsx';

interface CartContextType {
  items: CartItem[];
  summary: CartSummary;
  itemCount: number;
  isLoading: boolean;
  couponCode: string;
  appliedCoupon: any;
  addToCart: (productId: string, variantId?: string | null, quantity?: number) => Promise<boolean>;
  updateQuantity: (itemId: string, newQty: number) => Promise<boolean>;
  removeFromCart: (itemId: string) => Promise<boolean>;
  clearCart: () => Promise<void>;
  applyCoupon: (code: string) => Promise<boolean>;
  removeCoupon: () => void;
  refreshCart: () => Promise<void>;
}

const defaultSummary: CartSummary = {
  subtotal: 0,
  discount: 0,
  shippingFee: 0,
  tax: 0,
  total: 0,
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user, token, guestSessionId } = useAuth();
  const { success, error } = useToast();

  const [items, setItems] = useState<CartItem[]>([]);
  const [summary, setSummary] = useState<CartSummary>(defaultSummary);
  const [couponCode, setCouponCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchCart = useCallback(async (activeCoupon?: string) => {
    setIsLoading(true);
    try {
      const headers: Record<string, string> = {
        'x-guest-session-id': guestSessionId,
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const queryParams = new URLSearchParams();
      const codeToUse = activeCoupon !== undefined ? activeCoupon : couponCode;
      if (codeToUse) {
        queryParams.set('coupon', codeToUse);
      }

      const res = await fetch(`/api/cart?${queryParams.toString()}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setSummary(data.summary || defaultSummary);
      }
    } catch (e) {
      console.error('Failed to fetch cart:', e);
    } finally {
      setIsLoading(false);
    }
  }, [token, guestSessionId, couponCode]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart, user]);

  const addToCart = async (productId: string, variantId?: string | null, quantity: number = 1): Promise<boolean> => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-guest-session-id': guestSessionId,
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/cart/items', {
        method: 'POST',
        headers,
        body: JSON.stringify({ productId, variantId, quantity }),
      });

      const data = await res.json();
      if (!res.ok) {
        error(data.error || 'Could not add to cart.');
        return false;
      }

      success('Added to cart!');
      await fetchCart();
      return true;
    } catch (e: any) {
      error('Failed to add item to cart.');
      return false;
    }
  };

  const updateQuantity = async (itemId: string, newQty: number): Promise<boolean> => {
    if (newQty <= 0) {
      return removeFromCart(itemId);
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-guest-session-id': guestSessionId,
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/cart/items/${itemId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ quantity: newQty }),
      });

      const data = await res.json();
      if (!res.ok) {
        error(data.error || 'Failed to update quantity.');
        return false;
      }

      await fetchCart();
      return true;
    } catch {
      error('Failed to update quantity.');
      return false;
    }
  };

  const removeFromCart = async (itemId: string): Promise<boolean> => {
    try {
      const headers: Record<string, string> = {
        'x-guest-session-id': guestSessionId,
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/cart/items/${itemId}`, {
        method: 'DELETE',
        headers,
      });

      if (res.ok) {
        success('Item removed from cart.');
        await fetchCart();
        return true;
      } else {
        error('Could not remove item.');
        return false;
      }
    } catch {
      error('Failed to remove item.');
      return false;
    }
  };

  const clearCart = async () => {
    try {
      const headers: Record<string, string> = {
        'x-guest-session-id': guestSessionId,
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      await fetch('/api/cart/clear', { method: 'POST', headers });
      setItems([]);
      setSummary(defaultSummary);
      setCouponCode('');
      success('Cart cleared.');
    } catch {
      error('Failed to clear cart.');
    }
  };

  const applyCoupon = async (code: string): Promise<boolean> => {
    if (!code.trim()) {
      error('Please enter a coupon code.');
      return false;
    }

    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim(), subtotal: summary.subtotal }),
      });

      const data = await res.json();
      if (!res.ok) {
        error(data.error || 'Invalid coupon.');
        return false;
      }

      setCouponCode(code.trim().toUpperCase());
      await fetchCart(code.trim().toUpperCase());
      success(data.message || 'Coupon applied successfully!');
      return true;
    } catch {
      error('Failed to validate coupon.');
      return false;
    }
  };

  const removeCoupon = () => {
    setCouponCode('');
    fetchCart('');
    success('Coupon removed.');
  };

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        summary,
        itemCount,
        isLoading,
        couponCode,
        appliedCoupon: summary.appliedCoupon,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        applyCoupon,
        removeCoupon,
        refreshCart: fetchCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

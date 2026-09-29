import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext.tsx';
import { useToast } from './ToastContext.tsx';

interface WishlistContextType {
  wishlistIds: string[];
  wishlistItems: any[];
  toggleWishlist: (productId: string) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  refreshWishlist: () => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth();
  const { success, error } = useToast();

  const [wishlistIds, setWishlistIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ce_guest_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [wishlistItems, setWishlistItems] = useState<any[]>([]);

  const fetchWishlist = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/wishlist', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setWishlistItems(data.items || []);
        setWishlistIds((data.items || []).map((i: any) => i.productId));
      }
    } catch (e) {
      console.error('Failed to load wishlist:', e);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchWishlist();
    } else {
      setWishlistItems([]);
    }
  }, [token, fetchWishlist]);

  const isInWishlist = (productId: string) => {
    return wishlistIds.includes(productId);
  };

  const toggleWishlist = async (productId: string) => {
    if (token) {
      try {
        const res = await fetch('/api/wishlist/toggle', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ productId }),
        });
        const data = await res.json();
        if (res.ok) {
          success(data.message);
          await fetchWishlist();
        } else {
          error(data.error || 'Failed to update wishlist.');
        }
      } catch {
        error('Failed to update wishlist.');
      }
    } else {
      // Guest mode
      setWishlistIds((prev) => {
        let updated: string[];
        if (prev.includes(productId)) {
          updated = prev.filter((id) => id !== productId);
          success('Removed from wishlist.');
        } else {
          updated = [...prev, productId];
          success('Added to wishlist!');
        }
        localStorage.setItem('ce_guest_wishlist', JSON.stringify(updated));
        return updated;
      });
    }
  };

  const removeFromWishlist = async (productId: string) => {
    if (token) {
      try {
        await fetch(`/api/wishlist/${productId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        await fetchWishlist();
        success('Removed from wishlist.');
      } catch {
        error('Failed to remove from wishlist.');
      }
    } else {
      setWishlistIds((prev) => {
        const updated = prev.filter((id) => id !== productId);
        localStorage.setItem('ce_guest_wishlist', JSON.stringify(updated));
        return updated;
      });
      success('Removed from wishlist.');
    }
  };

  return (
    <WishlistContext.Provider
      value={{
        wishlistIds,
        wishlistItems,
        toggleWishlist,
        isInWishlist,
        refreshWishlist: fetchWishlist,
        removeFromWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product } from '../types/index.ts';
import { useToast } from './ToastContext.tsx';

interface CompareContextType {
  compareItems: Product[];
  addToCompare: (product: Product) => void;
  removeFromCompare: (productId: string) => void;
  clearCompare: () => void;
  isInCompare: (productId: string) => boolean;
}

const CompareContext = createContext<CompareContextType | undefined>(undefined);

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const { info, error } = useToast();
  const [compareItems, setCompareItems] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('ce_compare_items');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('ce_compare_items', JSON.stringify(compareItems));
  }, [compareItems]);

  const isInCompare = (productId: string) => {
    return compareItems.some((item) => item.id === productId);
  };

  const addToCompare = (product: Product) => {
    if (isInCompare(product.id)) {
      info('Item is already in comparison table.');
      return;
    }
    if (compareItems.length >= 3) {
      error('You can compare a maximum of 3 products at a time.');
      return;
    }
    setCompareItems((prev) => [...prev, product]);
    info(`Added "${product.name.slice(0, 25)}..." to comparison.`);
  };

  const removeFromCompare = (productId: string) => {
    setCompareItems((prev) => prev.filter((item) => item.id !== productId));
    info('Removed from comparison.');
  };

  const clearCompare = () => {
    setCompareItems([]);
    info('Comparison cleared.');
  };

  return (
    <CompareContext.Provider
      value={{
        compareItems,
        addToCompare,
        removeFromCompare,
        clearCompare,
        isInCompare,
      }}
    >
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const context = useContext(CompareContext);
  if (!context) {
    throw new Error('useCompare must be used within a CompareProvider');
  }
  return context;
}

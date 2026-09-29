import React, { createContext, useContext, useState, useEffect } from 'react';
import { SUPPORTED_CURRENCIES, convertFromINR, formatPrice } from '../../server/services/currency.ts';

interface CurrencyContextType {
  currency: string;
  setCurrency: (code: string) => void;
  currencies: typeof SUPPORTED_CURRENCIES;
  format: (amountInINR: number) => string;
  convert: (amountInINR: number) => number;
  currentSymbol: string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<string>(() => {
    return localStorage.getItem('ce_currency') || 'INR';
  });

  const setCurrency = (code: string) => {
    if (SUPPORTED_CURRENCIES[code]) {
      setCurrencyState(code);
      localStorage.setItem('ce_currency', code);
    }
  };

  const format = (amountInINR: number) => {
    return formatPrice(amountInINR, currency);
  };

  const convert = (amountInINR: number) => {
    return convertFromINR(amountInINR, currency);
  };

  const currentSymbol = SUPPORTED_CURRENCIES[currency]?.symbol || '₹';

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        currencies: SUPPORTED_CURRENCIES,
        format,
        convert,
        currentSymbol,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}

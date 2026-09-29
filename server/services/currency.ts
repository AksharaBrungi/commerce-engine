export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  rateFromINR: number; // 1 INR in this currency
  symbolPosition: 'before' | 'after';
  decimals: number;
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyConfig> = {
  INR: {
    code: 'INR',
    symbol: '₹',
    name: 'Indian Rupee',
    rateFromINR: 1.0,
    symbolPosition: 'before',
    decimals: 2,
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    rateFromINR: 0.012,
    symbolPosition: 'before',
    decimals: 2,
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    rateFromINR: 0.011,
    symbolPosition: 'before',
    decimals: 2,
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    rateFromINR: 0.0094,
    symbolPosition: 'before',
    decimals: 2,
  },
  JPY: {
    code: 'JPY',
    symbol: '¥',
    name: 'Japanese Yen',
    rateFromINR: 1.82,
    symbolPosition: 'before',
    decimals: 0,
  },
  CAD: {
    code: 'CAD',
    symbol: 'C$',
    name: 'Canadian Dollar',
    rateFromINR: 0.0163,
    symbolPosition: 'before',
    decimals: 2,
  },
  AUD: {
    code: 'AUD',
    symbol: 'A$',
    name: 'Australian Dollar',
    rateFromINR: 0.0182,
    symbolPosition: 'before',
    decimals: 2,
  },
  AED: {
    code: 'AED',
    symbol: 'AED ',
    name: 'UAE Dirham',
    rateFromINR: 0.044,
    symbolPosition: 'before',
    decimals: 2,
  },
  CHF: {
    code: 'CHF',
    symbol: 'CHF ',
    name: 'Swiss Franc',
    rateFromINR: 0.0105,
    symbolPosition: 'before',
    decimals: 2,
  },
  SGD: {
    code: 'SGD',
    symbol: 'S$',
    name: 'Singapore Dollar',
    rateFromINR: 0.0161,
    symbolPosition: 'before',
    decimals: 2,
  },
};

export function convertFromINR(amountInINR: number, targetCurrencyCode: string): number {
  const config = SUPPORTED_CURRENCIES[targetCurrencyCode] || SUPPORTED_CURRENCIES.INR;
  const converted = amountInINR * config.rateFromINR;
  if (config.decimals === 0) {
    return Math.round(converted);
  }
  return Number(converted.toFixed(config.decimals));
}

export function formatPrice(amountInINR: number, targetCurrencyCode: string = 'INR'): string {
  const config = SUPPORTED_CURRENCIES[targetCurrencyCode] || SUPPORTED_CURRENCIES.INR;
  const converted = convertFromINR(amountInINR, targetCurrencyCode);
  const formattedNumber = converted.toLocaleString(undefined, {
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  });

  return config.symbolPosition === 'before'
    ? `${config.symbol}${formattedNumber}`
    : `${formattedNumber} ${config.symbol}`;
}

export function getCurrencyRate(currencyCode: string): number {
  return SUPPORTED_CURRENCIES[currencyCode]?.rateFromINR || 1.0;
}

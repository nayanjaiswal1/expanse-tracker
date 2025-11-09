import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { CURRENCIES, Currency } from '../types/currency';

interface CurrencyContextType {
  currency: string;
  setCurrency: (currency: string) => void;
  formatCurrency: (amount: number, currencyCode?: string) => string;
  getCurrency: (currencyCode?: string) => Currency;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = React.useState<string>('USD');

  const setCurrency = useCallback((currencyCode: string) => {
    if (CURRENCIES[currencyCode]) {
      setCurrencyState(currencyCode);
      // You might want to save this to localStorage or user preferences
      localStorage.setItem('preferredCurrency', currencyCode);
    }
  }, []);

  const formatCurrency = useCallback(
    (amount: number, currencyCode: string = currency) => {
      const selectedCurrency = CURRENCIES[currencyCode] || CURRENCIES.USD;
      const formatter = new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: selectedCurrency.code,
        minimumFractionDigits: selectedCurrency.decimalDigits,
        maximumFractionDigits: selectedCurrency.decimalDigits,
      });
      return formatter.format(amount);
    },
    [currency]
  );

  const getCurrency = useCallback(
    (currencyCode: string = currency) => {
      return CURRENCIES[currencyCode] || CURRENCIES.USD;
    },
    [currency]
  );

  // Load saved currency preference on initial render
  React.useEffect(() => {
    const savedCurrency = localStorage.getItem('preferredCurrency');
    if (savedCurrency && CURRENCIES[savedCurrency]) {
      setCurrencyState(savedCurrency);
    }
  }, []);

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatCurrency, getCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = (): CurrencyContextType => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};

export default CurrencyContext;

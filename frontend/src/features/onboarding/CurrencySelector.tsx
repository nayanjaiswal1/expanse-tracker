import React, { useEffect, useState } from 'react';
import { CurrencyInfo } from '../../services/currencyService';

interface CurrencySelectorProps {
  selectedCurrency: string;
  onSelectCurrency: (currency: string) => void;
  currencies: CurrencyInfo[];
  className?: string;
}

export const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  selectedCurrency,
  onSelectCurrency,
  currencies,
  className = '',
}) => {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {currencies.map((currency) => (
        <button
          key={currency.code}
          type="button"
          onClick={() => onSelectCurrency(currency.code)}
          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition ${
            selectedCurrency === currency.code
              ? 'border-blue-500 bg-blue-50 text-blue-600 dark:border-blue-400 dark:bg-blue-900/40 dark:text-blue-100'
              : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-600'
          }`}
          title={`${currency.name} (${currency.code})`}
        >
          <span>{currency.symbol_native || currency.symbol || currency.code}</span>
          {currency.code}
        </button>
      ))}
    </div>
  );
};

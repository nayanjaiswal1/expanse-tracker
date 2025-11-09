import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../../contexts/AuthContext';
import { apiClient } from '../../../../api/client';

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  is_base_currency: boolean;
  exchange_rate: number;
}

interface CurrencyListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Currency[];
}

export const useCurrency = () => {
  const { state: authState } = useAuth();

  const {
    data: currencyData,
    isLoading,
    error,
  } = useQuery<CurrencyListResponse>({
    queryKey: ['currencies'],
    queryFn: async (): Promise<CurrencyListResponse> => {
      const response = await apiClient.get('/finance/currencies/');
      return response.data;
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });

  const currencies = currencyData?.results || [];

  const getDefaultCurrency = (): string => {
    // First try to get from user preferences
    if (authState.user?.preferences?.preferred_currency) {
      return authState.user.preferences.preferred_currency;
    }

    // Then try to find the base currency
    const baseCurrency = currencies.find((c) => c.is_base_currency);
    if (baseCurrency) {
      return baseCurrency.code;
    }

    // Fallback to INR if available
    const inrCurrency = currencies.find((c) => c.code === 'INR');
    if (inrCurrency) {
      return 'INR';
    }

    // Fallback to first available currency or 'INR' as last resort
    return currencies[0]?.code || 'INR';
  };

  const getCurrencySymbol = (currencyCode: string): string => {
    if (!currencyCode) return '';
    const currency = currencies.find((c) => c.code === currencyCode.toUpperCase());
    return currency?.symbol || currencyCode;
  };

  const getCurrencyName = (currencyCode: string): string => {
    if (!currencyCode) return '';
    const currency = currencies.find((c) => c.code === currencyCode.toUpperCase());
    return currency?.name || currencyCode;
  };

  const getBaseCurrency = (): Currency | undefined => {
    return currencies.find((c) => c.is_base_currency) || currencies[0];
  };

  const getExchangeRate = (fromCurrency: string, toCurrency: string): number => {
    if (fromCurrency === toCurrency) return 1;

    const from = currencies.find((c) => c.code === fromCurrency);
    const to = currencies.find((c) => c.code === toCurrency);

    if (!from || !to) return 1;

    // If either currency is the base currency, use direct rate
    if (from.is_base_currency) return to.exchange_rate;
    if (to.is_base_currency) return 1 / from.exchange_rate;

    // Otherwise convert through base currency
    return (1 / from.exchange_rate) * to.exchange_rate;
  };

  const formatAmount = (
    amount: number,
    currencyCode: string,
    options: {
      locale?: string;
      minimumFractionDigits?: number;
      maximumFractionDigits?: number;
    } = {}
  ): string => {
    const currency = currencies.find((c) => c.code === currencyCode);
    if (!currency) return amount.toString();

    const locale = options.locale || 'en-IN';
    const minimumFractionDigits = options.minimumFractionDigits ?? 2;
    const maximumFractionDigits = options.maximumFractionDigits ?? minimumFractionDigits;

    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits,
        maximumFractionDigits,
      }).format(amount);
    } catch (error) {
      // Fallback formatting if Intl.NumberFormat fails
      const formatted = amount.toLocaleString(locale, {
        minimumFractionDigits,
        maximumFractionDigits,
      });
      return `${currency.symbol}${formatted}`;
    }
  };

  return {
    currencies,
    isLoading,
    error,
    getDefaultCurrency,
    getCurrencySymbol,
    getCurrencyName,
    getBaseCurrency,
    getExchangeRate,
    formatAmount,
  };
};

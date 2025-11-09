import { useQuery } from '@tanstack/react-query';
import { getPopularCurrencies, CurrencyInfo } from '../../../services/currencyService';

export const CURRENCIES_QUERY_KEY = ['currencies'];

export const useCurrencies = () => {
  return useQuery<CurrencyInfo[], Error>({
    queryKey: CURRENCIES_QUERY_KEY,
    queryFn: getPopularCurrencies,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    refetchOnWindowFocus: false,
  });
};

import { API_BASE_URL } from '../config';

export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  symbol_native: string;
  decimal_digits: number;
  rounding: number;
  name_plural: string;
}

let CURRENCY_CACHE: CurrencyInfo[] | null = null;
const CURRENCY_CACHE_KEY = 'finance-tracker:currency-cache';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

/**
 * Fetches currency data from the API
 */
export const fetchCurrencies = async (): Promise<CurrencyInfo[]> => {
  // Check if we have cached data
  const cachedData = getCachedCurrencyData();
  if (cachedData) {
    return cachedData;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/currencies/`);
    if (!response.ok) {
      throw new Error('Failed to fetch currency data');
    }

    const data = await response.json();

    // Cache the data
    if (Array.isArray(data)) {
      cacheCurrencyData(data);
      return data;
    }

    throw new Error('Invalid currency data format');
  } catch (error) {
    console.error('Error fetching currencies:', error);
    // Return a default set if the API fails
    return getDefaultCurrencies();
  }
};

/**
 * Gets a currency by its code
 */
export const getCurrencyByCode = async (code: string): Promise<CurrencyInfo | undefined> => {
  const currencies = await fetchCurrencies();
  return currencies.find((c) => c.code === code.toUpperCase());
};

/**
 * Gets a list of popular/common currencies from the backend
 */
export const getPopularCurrencies = async (): Promise<CurrencyInfo[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/currencies/popular/`);
    if (!response.ok) {
      throw new Error('Failed to fetch popular currencies');
    }
    const data = await response.json();

    if (Array.isArray(data)) {
      return data;
    }

    throw new Error('Invalid popular currencies data format');
  } catch (error) {
    console.error('Error fetching popular currencies, falling back to all currencies:', error);
    // Fallback to all currencies if popular endpoint fails
    return fetchCurrencies();
  }
};

/**
 * Gets currency data from cache
 */
const getCachedCurrencyData = (): CurrencyInfo[] | null => {
  try {
    const cached = localStorage.getItem(CURRENCY_CACHE_KEY);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);

    // Check if cache is still valid
    if (Date.now() - timestamp < CACHE_DURATION) {
      return data;
    }
  } catch (error) {
    console.error('Error reading currency cache:', error);
  }
  return null;
};

/**
 * Caches currency data
 */
const cacheCurrencyData = (data: CurrencyInfo[]): void => {
  try {
    const cache = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(CURRENCY_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Error caching currency data:', error);
  }
};

/**
 * Provides a default set of currencies in case the API fails
 */
const getDefaultCurrencies = (): CurrencyInfo[] => [
  {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    symbol_native: '$',
    decimal_digits: 2,
    rounding: 0,
    name_plural: 'US dollars',
  },
  {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    symbol_native: '€',
    decimal_digits: 2,
    rounding: 0,
    name_plural: 'euros',
  },
  {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    symbol_native: '£',
    decimal_digits: 2,
    rounding: 0,
    name_plural: 'British pounds',
  },
  {
    code: 'INR',
    symbol: '₹',
    name: 'Indian Rupee',
    symbol_native: '₹',
    decimal_digits: 0,
    rounding: 0,
    name_plural: 'Indian rupees',
  },
  // Add more default currencies as needed
];

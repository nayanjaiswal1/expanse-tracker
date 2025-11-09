import { API_BASE_URL } from '../config';

export interface Country {
  id: number;
  code: string;
  name: string;
  flag: string;
  dial_code: string;
  default_currency?: number;
  default_currency_code?: string;
  default_timezone: string;
  is_active: boolean;
}

export interface Currency {
  id: number;
  code: string;
  name: string;
  symbol: string;
  symbol_position: 'left' | 'right';
  decimal_places: number;
  decimal_separator: string;
  thousands_separator: string;
  is_active: boolean;
  is_base_currency: boolean;
  exchange_rate: string;
  // Extended info
  symbol_native: string;
  name_plural: string;
  // Frontend compatibility fields
  symbolOnLeft: boolean;
  decimalDigits: number;
  spaceBetweenAmountAndSymbol: boolean;
  decimal_digits: number;
}

export interface Language {
  id: number;
  code: string;
  name: string;
  native_name: string;
  is_active: boolean;
  is_rtl: boolean;
}

export interface Timezone {
  id: number;
  name: string;
  label: string;
  offset: string;
  country_code: string;
  is_common: boolean;
  is_active: boolean;
  value: string; // Frontend compatibility
}

export interface LocaleMapping {
  id: number;
  locale_code: string;
  language?: number;
  language_code?: string;
  country?: number;
  country_code?: string;
  default_currency?: number;
  currency_code?: string;
  is_active: boolean;
}

export interface ReferenceData {
  countries: Country[];
  currencies: Currency[];
  languages: Language[];
  timezones: Timezone[];
  locale_mappings: LocaleMapping[];
  country_to_currency: Record<string, string>;
  locale_to_currency: Record<string, string>;
  locale_to_language: Record<string, string>;
}

const REFERENCE_DATA_CACHE_KEY = 'finance-tracker:reference-data-cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

let REFERENCE_DATA_CACHE: ReferenceData | null = null;

/**
 * Fetches all reference data from the backend in a single request
 */
export const fetchReferenceData = async (): Promise<ReferenceData> => {
  // Check memory cache first
  if (REFERENCE_DATA_CACHE) {
    return REFERENCE_DATA_CACHE;
  }

  // Check localStorage cache
  const cachedData = getCachedReferenceData();
  if (cachedData) {
    REFERENCE_DATA_CACHE = cachedData;
    return cachedData;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/reference/all/`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch reference data');
    }

    const data = await response.json();

    // Validate the data structure
    if (!data.countries || !data.currencies || !data.languages || !data.timezones) {
      throw new Error('Invalid reference data format');
    }

    // Cache the data
    cacheReferenceData(data);
    REFERENCE_DATA_CACHE = data;

    return data;
  } catch (error) {
    console.error('Error fetching reference data:', error);
    // Return a minimal default set if the API fails
    return getDefaultReferenceData();
  }
};

/**
 * Fetches only currencies
 */
export const fetchCurrencies = async (): Promise<Currency[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/reference/currencies/`);
    if (!response.ok) {
      throw new Error('Failed to fetch currencies');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching currencies:', error);
    const refData = await fetchReferenceData();
    return refData.currencies;
  }
};

/**
 * Fetches only common currencies
 */
export const fetchCommonCurrencies = async (): Promise<Currency[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/reference/currencies/common/`);
    if (!response.ok) {
      throw new Error('Failed to fetch common currencies');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching common currencies:', error);
    const refData = await fetchReferenceData();
    return refData.currencies.filter(c => c.code === 'USD' || c.code === 'EUR' || c.code === 'GBP' || c.code === 'INR');
  }
};

/**
 * Fetches only countries
 */
export const fetchCountries = async (): Promise<Country[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/reference/countries/`);
    if (!response.ok) {
      throw new Error('Failed to fetch countries');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching countries:', error);
    const refData = await fetchReferenceData();
    return refData.countries;
  }
};

/**
 * Fetches only languages
 */
export const fetchLanguages = async (): Promise<Language[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/reference/languages/`);
    if (!response.ok) {
      throw new Error('Failed to fetch languages');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching languages:', error);
    const refData = await fetchReferenceData();
    return refData.languages;
  }
};

/**
 * Fetches only timezones
 */
export const fetchTimezones = async (): Promise<Timezone[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/reference/timezones/`);
    if (!response.ok) {
      throw new Error('Failed to fetch timezones');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching timezones:', error);
    const refData = await fetchReferenceData();
    return refData.timezones;
  }
};

/**
 * Fetches only common timezones
 */
export const fetchCommonTimezones = async (): Promise<Timezone[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/reference/timezones/common/`);
    if (!response.ok) {
      throw new Error('Failed to fetch common timezones');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching common timezones:', error);
    const refData = await fetchReferenceData();
    return refData.timezones.filter(t => t.is_common);
  }
};

/**
 * Gets reference data from cache
 */
const getCachedReferenceData = (): ReferenceData | null => {
  try {
    const cached = localStorage.getItem(REFERENCE_DATA_CACHE_KEY);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);

    // Check if cache is still valid
    if (Date.now() - timestamp < CACHE_DURATION) {
      return data;
    }

    // Cache expired, remove it
    localStorage.removeItem(REFERENCE_DATA_CACHE_KEY);
  } catch (error) {
    console.error('Error reading reference data cache:', error);
  }
  return null;
};

/**
 * Caches reference data
 */
const cacheReferenceData = (data: ReferenceData): void => {
  try {
    const cache = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(REFERENCE_DATA_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Error caching reference data:', error);
  }
};

/**
 * Clears the reference data cache
 */
export const clearReferenceDataCache = (): void => {
  REFERENCE_DATA_CACHE = null;
  try {
    localStorage.removeItem(REFERENCE_DATA_CACHE_KEY);
  } catch (error) {
    console.error('Error clearing reference data cache:', error);
  }
};

/**
 * Provides a minimal default set of reference data if the API fails
 */
const getDefaultReferenceData = (): ReferenceData => ({
  countries: [
    { id: 1, code: 'US', name: 'United States', flag: '🇺🇸', dial_code: '+1', default_currency_code: 'USD', default_timezone: 'America/New_York', is_active: true },
    { id: 2, code: 'GB', name: 'United Kingdom', flag: '🇬🇧', dial_code: '+44', default_currency_code: 'GBP', default_timezone: 'Europe/London', is_active: true },
    { id: 3, code: 'IN', name: 'India', flag: '🇮🇳', dial_code: '+91', default_currency_code: 'INR', default_timezone: 'Asia/Kolkata', is_active: true },
  ],
  currencies: [
    {
      id: 1, code: 'USD', name: 'US Dollar', symbol: '$', symbol_position: 'left',
      decimal_places: 2, decimal_separator: '.', thousands_separator: ',',
      is_active: true, is_base_currency: true, exchange_rate: '1.0',
      symbol_native: '$', name_plural: 'US dollars',
      symbolOnLeft: true, decimalDigits: 2, spaceBetweenAmountAndSymbol: false, decimal_digits: 2
    },
    {
      id: 2, code: 'EUR', name: 'Euro', symbol: '€', symbol_position: 'right',
      decimal_places: 2, decimal_separator: ',', thousands_separator: '.',
      is_active: true, is_base_currency: false, exchange_rate: '0.92',
      symbol_native: '€', name_plural: 'euros',
      symbolOnLeft: false, decimalDigits: 2, spaceBetweenAmountAndSymbol: true, decimal_digits: 2
    },
    {
      id: 3, code: 'GBP', name: 'British Pound', symbol: '£', symbol_position: 'left',
      decimal_places: 2, decimal_separator: '.', thousands_separator: ',',
      is_active: true, is_base_currency: false, exchange_rate: '0.79',
      symbol_native: '£', name_plural: 'British pounds',
      symbolOnLeft: true, decimalDigits: 2, spaceBetweenAmountAndSymbol: false, decimal_digits: 2
    },
    {
      id: 4, code: 'INR', name: 'Indian Rupee', symbol: '₹', symbol_position: 'left',
      decimal_places: 0, decimal_separator: '.', thousands_separator: ',',
      is_active: true, is_base_currency: false, exchange_rate: '83.0',
      symbol_native: '₹', name_plural: 'Indian rupees',
      symbolOnLeft: true, decimalDigits: 0, spaceBetweenAmountAndSymbol: false, decimal_digits: 0
    },
  ],
  languages: [
    { id: 1, code: 'en', name: 'English', native_name: 'English', is_active: true, is_rtl: false },
    { id: 2, code: 'es', name: 'Spanish', native_name: 'Español', is_active: true, is_rtl: false },
    { id: 3, code: 'hi', name: 'Hindi', native_name: 'हिन्दी', is_active: true, is_rtl: false },
  ],
  timezones: [
    { id: 1, name: 'America/New_York', label: 'United States (Eastern)', offset: 'UTC-5', country_code: 'US', is_common: true, is_active: true, value: 'America/New_York' },
    { id: 2, name: 'Europe/London', label: 'United Kingdom', offset: 'UTC+0', country_code: 'GB', is_common: true, is_active: true, value: 'Europe/London' },
    { id: 3, name: 'Asia/Kolkata', label: 'India', offset: 'UTC+5:30', country_code: 'IN', is_common: true, is_active: true, value: 'Asia/Kolkata' },
    { id: 4, name: 'UTC', label: 'UTC', offset: 'UTC+0', country_code: '', is_common: true, is_active: true, value: 'UTC' },
  ],
  locale_mappings: [
    { id: 1, locale_code: 'en-US', language_code: 'en', country_code: 'US', currency_code: 'USD', is_active: true },
    { id: 2, locale_code: 'en-GB', language_code: 'en', country_code: 'GB', currency_code: 'GBP', is_active: true },
    { id: 3, locale_code: 'en-IN', language_code: 'en', country_code: 'IN', currency_code: 'INR', is_active: true },
    { id: 4, locale_code: 'hi-IN', language_code: 'hi', country_code: 'IN', currency_code: 'INR', is_active: true },
  ],
  country_to_currency: {
    'US': 'USD',
    'GB': 'GBP',
    'IN': 'INR',
  },
  locale_to_currency: {
    'en-US': 'USD',
    'en-GB': 'GBP',
    'en-IN': 'INR',
    'hi-IN': 'INR',
  },
  locale_to_language: {
    'en-US': 'en',
    'en-GB': 'en',
    'en-IN': 'en',
    'hi-IN': 'hi',
  },
});

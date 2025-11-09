/**
 * Utilities for auto-detecting user's location, currency, and timezone
 */

const GEO_CACHE_KEY = 'finance-tracker:geo-location-cache';
const GEO_CACHE_VERSION = 'v1';

export interface DetectedLocation {
  country?: string;
  countryCode?: string;
  currency?: string;
  timezone?: string;
  locale?: string;
}

interface CachedGeoData {
  version: string;
  data: DetectedLocation;
  timestamp: number;
}

/**
 * Map of country codes to their primary currencies
 */
const COUNTRY_TO_CURRENCY: Record<string, string> = {
  US: 'USD',
  GB: 'GBP',
  IN: 'INR',
  CA: 'CAD',
  AU: 'AUD',
  NZ: 'NZD',
  SG: 'SGD',
  HK: 'HKD',
  JP: 'JPY',
  CN: 'CNY',
  KR: 'KRW',
  TW: 'TWD',
  MY: 'MYR',
  TH: 'THB',
  ID: 'IDR',
  PH: 'PHP',
  VN: 'VND',
  AE: 'AED',
  SA: 'SAR',
  ZA: 'ZAR',
  BR: 'BRL',
  MX: 'MXN',
  AR: 'ARS',
  CL: 'CLP',
  CO: 'COP',
  PE: 'PEN',
  CH: 'CHF',
  NO: 'NOK',
  SE: 'SEK',
  DK: 'DKK',
  PL: 'PLN',
  CZ: 'CZK',
  HU: 'HUF',
  RO: 'RON',
  TR: 'TRY',
  IL: 'ILS',
  EG: 'EGP',
  NG: 'NGN',
  KE: 'KES',
  RU: 'RUB',
  // Eurozone countries
  AT: 'EUR',
  BE: 'EUR',
  CY: 'EUR',
  EE: 'EUR',
  FI: 'EUR',
  FR: 'EUR',
  DE: 'EUR',
  GR: 'EUR',
  IE: 'EUR',
  IT: 'EUR',
  LV: 'EUR',
  LT: 'EUR',
  LU: 'EUR',
  MT: 'EUR',
  NL: 'EUR',
  PT: 'EUR',
  SK: 'EUR',
  SI: 'EUR',
  ES: 'EUR',
};

/**
 * Map of locale codes to currencies for fallback
 */
const LOCALE_TO_CURRENCY: Record<string, string> = {
  'en-US': 'USD',
  'en-GB': 'GBP',
  'en-IN': 'INR',
  'en-CA': 'CAD',
  'en-AU': 'AUD',
  'en-NZ': 'NZD',
  'en-SG': 'SGD',
  'en-HK': 'HKD',
  'ja-JP': 'JPY',
  'zh-CN': 'CNY',
  'ko-KR': 'KRW',
  'zh-TW': 'TWD',
  'ms-MY': 'MYR',
  'th-TH': 'THB',
  'id-ID': 'IDR',
  'vi-VN': 'VND',
  'ar-AE': 'AED',
  'ar-SA': 'SAR',
  'pt-BR': 'BRL',
  'es-MX': 'MXN',
  'es-AR': 'ARS',
  'es-CL': 'CLP',
  'es-CO': 'COP',
  'de-DE': 'EUR',
  'fr-FR': 'EUR',
  'it-IT': 'EUR',
  'es-ES': 'EUR',
  'nl-NL': 'EUR',
  'de-CH': 'CHF',
  'nb-NO': 'NOK',
  'sv-SE': 'SEK',
  'da-DK': 'DKK',
  'pl-PL': 'PLN',
  'cs-CZ': 'CZK',
  'hu-HU': 'HUF',
  'ro-RO': 'RON',
  'tr-TR': 'TRY',
  'he-IL': 'ILS',
  'ru-RU': 'RUB',
};

/**
 * Detect timezone from browser
 */
export const detectTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch (error) {
    console.error('Error detecting timezone:', error);
    return 'UTC';
  }
};

/**
 * Detect locale from browser
 */
export const detectLocale = (): string => {
  try {
    return navigator.language || navigator.languages?.[0] || 'en-US';
  } catch (error) {
    console.error('Error detecting locale:', error);
    return 'en-US';
  }
};

/**
 * Detect currency from locale
 */
export const detectCurrencyFromLocale = (locale?: string): string => {
  const detectedLocale = locale || detectLocale();

  // Try exact match first
  if (LOCALE_TO_CURRENCY[detectedLocale]) {
    return LOCALE_TO_CURRENCY[detectedLocale];
  }

  // Try language-only match
  const languageCode = detectedLocale.split('-')[0];
  const matchingLocale = Object.keys(LOCALE_TO_CURRENCY).find((key) =>
    key.startsWith(languageCode)
  );

  if (matchingLocale) {
    return LOCALE_TO_CURRENCY[matchingLocale];
  }

  return 'USD'; // Default fallback
};

/**
 * Get country code from timezone (rough estimation)
 */
const getCountryFromTimezone = (timezone: string): string | null => {
  const timezoneToCountry: Record<string, string> = {
    'America/New_York': 'US',
    'America/Chicago': 'US',
    'America/Denver': 'US',
    'America/Los_Angeles': 'US',
    'America/Phoenix': 'US',
    'America/Toronto': 'CA',
    'America/Vancouver': 'CA',
    'America/Mexico_City': 'MX',
    'America/Sao_Paulo': 'BR',
    'America/Argentina/Buenos_Aires': 'AR',
    'Europe/London': 'GB',
    'Europe/Paris': 'FR',
    'Europe/Berlin': 'DE',
    'Europe/Madrid': 'ES',
    'Europe/Rome': 'IT',
    'Europe/Amsterdam': 'NL',
    'Europe/Brussels': 'BE',
    'Europe/Vienna': 'AT',
    'Europe/Zurich': 'CH',
    'Europe/Stockholm': 'SE',
    'Europe/Oslo': 'NO',
    'Europe/Copenhagen': 'DK',
    'Europe/Warsaw': 'PL',
    'Europe/Prague': 'CZ',
    'Europe/Budapest': 'HU',
    'Europe/Bucharest': 'RO',
    'Europe/Istanbul': 'TR',
    'Europe/Moscow': 'RU',
    'Asia/Kolkata': 'IN',
    'Asia/Dubai': 'AE',
    'Asia/Singapore': 'SG',
    'Asia/Hong_Kong': 'HK',
    'Asia/Tokyo': 'JP',
    'Asia/Shanghai': 'CN',
    'Asia/Seoul': 'KR',
    'Asia/Taipei': 'TW',
    'Asia/Bangkok': 'TH',
    'Asia/Jakarta': 'ID',
    'Asia/Manila': 'PH',
    'Asia/Kuala_Lumpur': 'MY',
    'Asia/Ho_Chi_Minh': 'VN',
    'Asia/Jerusalem': 'IL',
    'Australia/Sydney': 'AU',
    'Australia/Melbourne': 'AU',
    'Australia/Brisbane': 'AU',
    'Australia/Perth': 'AU',
    'Pacific/Auckland': 'NZ',
    'Africa/Johannesburg': 'ZA',
    'Africa/Cairo': 'EG',
    'Africa/Lagos': 'NG',
    'Africa/Nairobi': 'KE',
  };

  return timezoneToCountry[timezone] || null;
};

/**
 * Detect basic location info from browser without external API
 */
export const detectLocationBasic = (): DetectedLocation => {
  const timezone = detectTimezone();
  const locale = detectLocale();
  const countryCode = getCountryFromTimezone(timezone) || locale.split('-')[1] || 'US';
  const currency = COUNTRY_TO_CURRENCY[countryCode] || detectCurrencyFromLocale(locale);

  return {
    timezone,
    locale,
    countryCode,
    currency,
  };
};

/**
 * Get cached geolocation data from localStorage
 */
const getCachedGeoData = (): DetectedLocation | null => {
  if (typeof window === 'undefined') return null;

  try {
    const cached = window.localStorage.getItem(GEO_CACHE_KEY);
    if (!cached) return null;

    const parsedCache: CachedGeoData = JSON.parse(cached);

    // Check if cache version matches
    if (parsedCache.version !== GEO_CACHE_VERSION) {
      console.log('Geo cache version mismatch, clearing cache');
      window.localStorage.removeItem(GEO_CACHE_KEY);
      return null;
    }

    console.log(
      'Using cached geolocation data from:',
      new Date(parsedCache.timestamp).toLocaleString()
    );
    return parsedCache.data;
  } catch (error) {
    console.error('Error reading geo cache:', error);
    return null;
  }
};

/**
 * Save geolocation data to localStorage cache
 */
const setCachedGeoData = (data: DetectedLocation): void => {
  if (typeof window === 'undefined') return;

  try {
    const cacheData: CachedGeoData = {
      version: GEO_CACHE_VERSION,
      data,
      timestamp: Date.now(),
    };
    window.localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(cacheData));
    console.log('Geolocation data cached successfully');
  } catch (error) {
    console.error('Error caching geo data:', error);
  }
};

/**
 * Detect location using IP geolocation API (cached permanently)
 */
export const detectLocationFromIP = async (): Promise<DetectedLocation> => {
  // Check cache first
  const cached = getCachedGeoData();
  if (cached) {
    return cached;
  }

  // If no cache, fetch from API
  try {
    console.log('Fetching geolocation data from API...');
    const response = await fetch('https://ipapi.co/json/', {
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!response.ok) {
      throw new Error('Failed to fetch location data');
    }

    const data = await response.json();

    const locationData: DetectedLocation = {
      country: data.country_name,
      countryCode: data.country_code,
      currency: data.currency || COUNTRY_TO_CURRENCY[data.country_code] || 'USD',
      timezone: data.timezone || detectTimezone(),
      locale: detectLocale(),
    };

    // Cache the result permanently
    setCachedGeoData(locationData);

    return locationData;
  } catch (error) {
    console.warn('IP geolocation failed, falling back to browser detection:', error);
    const fallbackData = detectLocationBasic();

    // Cache the fallback data too
    setCachedGeoData(fallbackData);

    return fallbackData;
  }
};

/**
 * Auto-detect location with fallback mechanism
 * Tries IP-based detection first, falls back to browser detection
 * Results are cached permanently in localStorage
 */
export const autoDetectLocation = async (): Promise<DetectedLocation> => {
  try {
    return await detectLocationFromIP();
  } catch (_error) {
    return detectLocationBasic();
  }
};

/**
 * Clear cached geolocation data
 * Useful for testing or if user wants to reset location detection
 */
export const clearGeoCache = (): void => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(GEO_CACHE_KEY);
    console.log('Geolocation cache cleared');
  } catch (error) {
    console.error('Error clearing geo cache:', error);
  }
};

/**
 * Get cached geolocation data (for debugging/display purposes)
 */
export const getGeoCache = (): DetectedLocation | null => {
  return getCachedGeoData();
};

/**
 * Get language code from locale
 */
export const getLanguageFromLocale = (locale: string): string => {
  const languageMap: Record<string, string> = {
    en: 'en',
    es: 'es',
    fr: 'fr',
    de: 'de',
    pt: 'pt',
    it: 'it',
    nl: 'nl',
    ja: 'ja',
    zh: 'zh',
    ko: 'ko',
    ar: 'ar',
    ru: 'ru',
    hi: 'hi',
  };

  const langCode = locale.split('-')[0].toLowerCase();
  return languageMap[langCode] || 'en';
};

/**
 * Format currency list for dropdown
 */
export const COMMON_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'Mex$' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
];

/**
 * Common timezones grouped by region
 */
export const COMMON_TIMEZONES = [
  { label: 'United States', value: 'America/New_York', offset: 'UTC-5' },
  { label: 'United States (Central)', value: 'America/Chicago', offset: 'UTC-6' },
  { label: 'United States (Mountain)', value: 'America/Denver', offset: 'UTC-7' },
  { label: 'United States (Pacific)', value: 'America/Los_Angeles', offset: 'UTC-8' },
  { label: 'Canada (Toronto)', value: 'America/Toronto', offset: 'UTC-5' },
  { label: 'Canada (Vancouver)', value: 'America/Vancouver', offset: 'UTC-8' },
  { label: 'United Kingdom', value: 'Europe/London', offset: 'UTC+0' },
  { label: 'France', value: 'Europe/Paris', offset: 'UTC+1' },
  { label: 'Germany', value: 'Europe/Berlin', offset: 'UTC+1' },
  { label: 'India', value: 'Asia/Kolkata', offset: 'UTC+5:30' },
  { label: 'China', value: 'Asia/Shanghai', offset: 'UTC+8' },
  { label: 'Japan', value: 'Asia/Tokyo', offset: 'UTC+9' },
  { label: 'Australia (Sydney)', value: 'Australia/Sydney', offset: 'UTC+10' },
  { label: 'Singapore', value: 'Asia/Singapore', offset: 'UTC+8' },
  { label: 'Hong Kong', value: 'Asia/Hong_Kong', offset: 'UTC+8' },
  { label: 'UAE', value: 'Asia/Dubai', offset: 'UTC+4' },
  { label: 'UTC', value: 'UTC', offset: 'UTC+0' },
];

import type { User } from '../types';
import { getCurrencyByCode } from '../services/currencyService';

/**
 * Get the currency symbol for a given currency code
 * Fetches from the API, returns the code as fallback if API fails
 */
export const getCurrencySymbol = async (currencyCode: string): Promise<string> => {
  if (!currencyCode) return '';

  const normalized = currencyCode.toUpperCase();

  try {
    const currency = await getCurrencyByCode(normalized);
    if (currency) {
      return currency.symbol_native || currency.symbol || currencyCode;
    }
  } catch (error) {
    console.error('Error fetching currency symbol:', error);
  }

  // Return the currency code as fallback if API fails
  return normalized;
};

/**
 * Get currency icon (symbol) - kept for backward compatibility
 * Consider using getCurrencySymbol instead
 */
export const getCurrencyIcon = (currencyCode: string): string => {
  // This is a simple fallback that just returns the currency code
  // In a real app, you might want to make this async as well
  return currencyCode?.toUpperCase?.() || '';
};

export type CurrencyFormatterInput = number | string | null | undefined;
export type CurrencyFormatterUser = User | null | undefined;

// Default currency will be determined by the API based on user's location
const DEFAULT_CURRENCY_CODE = '';
const DEFAULT_LOCALE = 'en-US';

export const resolveCurrencyCode = (
  currencyOrUser?: string | CurrencyFormatterUser,
  fallback?: string
): string => {
  if (typeof currencyOrUser === 'string') {
    return currencyOrUser.toUpperCase();
  }

  const user = currencyOrUser;
  const code = user?.preferences?.preferred_currency || fallback;

  return (code || DEFAULT_CURRENCY_CODE).toUpperCase();
};

export const formatCurrency = (
  value: CurrencyFormatterInput,
  currencyOrUser?: string | CurrencyFormatterUser,
  options?: {
    locale?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    fallbackCurrency?: string;
  }
): string => {
  const amount = typeof value === 'string' ? Number(value.replace(/,/g, '')) : value;
  const parsedAmount = Number.isFinite(amount as number) ? (amount as number) : 0;

  const currency = resolveCurrencyCode(currencyOrUser, options?.fallbackCurrency);
  const locale =
    (typeof currencyOrUser === 'object' && currencyOrUser
      ? currencyOrUser.preferences?.language
      : undefined) ||
    options?.locale ||
    DEFAULT_LOCALE;

  const minimumFractionDigits = Math.max(0, options?.minimumFractionDigits ?? 2);
  const maximumFractionDigits = Math.max(
    minimumFractionDigits,
    options?.maximumFractionDigits ?? minimumFractionDigits
  );

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      currencyDisplay: 'symbol',
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(parsedAmount);
  } catch (_error) {
    const symbol = getCurrencySymbol(currency);
    const absolute = Math.abs(parsedAmount).toFixed(maximumFractionDigits);
    const sign = parsedAmount < 0 ? '-' : '';
    return `${sign}${symbol}${absolute}`;
  }
};

export const formatDate = (dateString: string, user?: User | null): string => {
  const date = new Date(dateString);
  const format = user?.preferences?.preferred_date_format || 'DD/MM/YYYY';

  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();

  switch (format) {
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'MM/DD/YYYY':
    default:
      return `${month}/${day}/${year}`;
  }
};

export const formatDateShort = (dateString: string, user?: User | null): string => {
  const date = new Date(dateString);
  const format = user?.preferences?.preferred_date_format || 'DD/MM/YYYY';

  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear().toString().slice(-2);

  switch (format) {
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'MM/DD/YYYY':
    default:
      return `${month}/${day}/${year}`;
  }
};

export const getDateInputFormat = (dateString: string): string => {
  // Always return YYYY-MM-DD format for HTML date inputs
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getDefaultDateFormat = (user?: User | null): string => {
  return user?.preferences?.preferred_date_format || 'DD/MM/YYYY';
};

export const getDefaultCurrency = (user?: User | null): string => {
  return user?.preferences?.preferred_currency || 'INR';
};

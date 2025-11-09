export interface Currency {
  code: string;
  name: string;
  symbol: string;
  decimalDigits?: number;
  symbolOnLeft?: boolean;
  spaceBetweenAmountAndSymbol?: boolean;
  decimalSeparator?: string;
  thousandsSeparator?: string;
}

export const CURRENCIES: Record<string, Currency> = {
  USD: {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    decimalDigits: 2,
    symbolOnLeft: true,
    spaceBetweenAmountAndSymbol: false,
    decimalSeparator: '.',
    thousandsSeparator: ',',
  },
  EUR: {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    decimalDigits: 2,
    symbolOnLeft: false,
    spaceBetweenAmountAndSymbol: true,
    decimalSeparator: ',',
    thousandsSeparator: '.',
  },
  GBP: {
    code: 'GBP',
    name: 'British Pound',
    symbol: '£',
    decimalDigits: 2,
    symbolOnLeft: true,
    spaceBetweenAmountAndSymbol: false,
    decimalSeparator: '.',
    thousandsSeparator: ',',
  },
  // Add more currencies as needed
};

export const DEFAULT_CURRENCY = CURRENCIES.USD;

export function formatCurrency(
  amount: number,
  currencyCode: string = 'USD',
  options?: Intl.NumberFormatOptions
): string {
  const currency = CURRENCIES[currencyCode] || DEFAULT_CURRENCY;
  const formatter = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency.code,
    minimumFractionDigits: currency.decimalDigits,
    maximumFractionDigits: currency.decimalDigits,
    ...options,
  });

  return formatter.format(amount);
}

export function getCurrencySymbol(currencyCode: string): string {
  return CURRENCIES[currencyCode]?.symbol || '$';
}

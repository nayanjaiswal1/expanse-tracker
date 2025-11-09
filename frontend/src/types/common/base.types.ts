// Common types used across the application
export type DateString = string;
export type ID = number | string;

export interface Timestamps {
  created_at?: DateString;
  updated_at?: DateString;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export type CurrencyCode = string; // ISO 4217 currency codes (e.g., 'USD', 'EUR')

export type Status = 'active' | 'inactive' | 'pending' | 'completed' | 'cancelled' | 'failed';

export interface Metadata {
  [key: string]: any;
}

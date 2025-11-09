export interface CsvFormat {
  headers: string[];
  sample_data: Record<string, string>[];
  required_fields: string[];
  optional_fields: string[];
}

export interface JsonFormat {
  schema: Record<string, unknown>;
  sample_data: Record<string, unknown>;
  required_fields: string[];
  optional_fields: string[];
}

export interface Subscription {
  id: number;
  name: string;
  amount: string;
  billing_cycle: 'monthly' | 'yearly' | 'weekly' | 'daily';
  next_billing_date: string;
  status: 'active' | 'paused' | 'cancelled';
  category_id?: string;
  account_id: number;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionSummary {
  total_active: number;
  total_monthly_cost: string;
  total_yearly_cost: string;
  upcoming_renewals: number;
  paused_subscriptions: number;
}

export interface ProcessingRule {
  id: number;
  name: string;
  description?: string;
  condition_field: string;
  condition_operator: string;
  condition_value: string;
  action_type: string;
  action_value: string;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface EmailTemplate {
  id: number;
  name: string;
  subject_pattern: string;
  body_pattern: string;
  sender_pattern?: string;
  category_id?: string;
  confidence_threshold: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExtractedTransaction {
  id: number;
  gmail_message_id: string;
  merchant_name?: string;
  amount?: string;
  date?: string;
  description?: string;
  category_id?: string;
  confidence_score: number;
  status: 'pending' | 'approved' | 'rejected';
  raw_data: Record<string, unknown>;
  created_at: string;
}

export interface TransactionSuggestion {
  id: number;
  transaction_id: number;
  suggested_category_id?: string;
  suggested_merchant?: string;
  confidence_score: number;
  reason: string;
}

export interface LendingSummary {
  total_lent: string;
  total_borrowed: string;
  total_outstanding_lent: string;
  total_outstanding_borrowed: string;
  overdue_count: number;
}

export interface GmailSyncStatus {
  account_id: number;
  account_email: string;
  status: 'idle' | 'syncing' | 'completed' | 'error';
  last_sync: string;
  emails_processed: number;
  transactions_extracted: number;
  error_message?: string;
}

export interface Currency {
  code: string;
  name: string;
  symbol: string;
}

export interface CurrencyResponse {
  currencies: Currency[];
  count: number;
}

export interface ExchangeRateResponse {
  base_currency: string;
  rates: Record<string, number>;
}

export interface CurrencyConversionResponse {
  from_currency: string;
  to_currency: string;
  original_amount: number;
  converted_amount: number;
  exchange_rate: number;
}

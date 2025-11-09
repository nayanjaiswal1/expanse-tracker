export interface PersonalizationData {
  primary_use_case?:
    | 'personal_expense_tracking'
    | 'business_finance_management'
    | 'freelance_income_expenses'
    | 'family_budget_management'
    | 'investment_portfolio_tracking'
    | 'just_exploring';
  account_count_range?: '1' | '2-3' | '4-10' | '10+' | 'not_sure';
  account_types?: Array<
    'checking' | 'savings' | 'credit' | 'investment' | 'loan' | 'cash' | 'other'
  >;
  monthly_transaction_volume?: '0-20' | '21-50' | '51-200' | '200+' | 'not_sure';
  interested_ai_features?: string[];
  primary_goal?:
    | 'save_time'
    | 'better_organization'
    | 'track_cash_flow'
    | 'understand_spending_patterns'
    | 'tax_preparation'
    | 'pay_off_debt'
    | 'build_savings'
    | 'track_investments';
  has_connected_gmail?: boolean;
  has_added_first_account?: boolean;
  took_dashboard_tour?: boolean;
  detected_location?: {
    country?: string;
    currency?: string;
    timezone?: string;
  };
}

export interface UserProfile {
  phone?: string;
  bio?: string;
  website?: string;
  location?: string;
  profile_photo?: string;
  profile_photo_url?: string;
  profile_photo_thumbnail_url?: string;
  profile_picture?: string;
  has_custom_photo?: boolean;
  is_onboarded?: boolean;
  has_completed_personalization?: boolean;
  is_verified?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface UserSubscription {
  current_plan?: number;
  current_plan_name?: string;
  status?: 'trial' | 'active' | 'cancelled' | 'expired' | 'suspended';
  start_date?: string;
  end_date?: string;
  is_auto_renew?: boolean;
  ai_credits_remaining?: number;
  ai_credits_used_this_month?: number;
  transactions_this_month?: number;
  last_reset_date?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface UserPreferences {
  preferred_currency?: string;
  preferred_date_format?: string;
  timezone?: string;
  language?: string;
  theme?: 'light' | 'dark' | 'system';
  notifications_enabled?: boolean;
  email_notifications?: boolean;
  push_notifications?: boolean;
  table_column_preferences?: Record<
    string,
    {
      visibility?: Record<string, boolean>;
      sizing?: Record<string, number>;
    }
  >;
  ui_preferences?: {
    header_collapsed?: Record<string, boolean>;
    [key: string]: unknown;
  };
  created_at?: string;
  updated_at?: string;
}

export interface UserAISettings {
  preferred_provider?: 'system' | 'openai' | 'ollama' | 'anthropic';
  has_openai_key?: boolean;
  openai_model?: string;
  has_anthropic_key?: boolean;
  anthropic_model?: string;
  ollama_endpoint?: string;
  ollama_model?: string;
  enable_ai_suggestions?: boolean;
  enable_ai_categorization?: boolean;
  enable_ai_invoice_generation?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface UserPersonalization {
  onboarding_step?: number;
  onboarding_completed_at?: string;
  is_onboarded?: boolean;
  questionnaire_completed?: boolean;
  questionnaire_completed_at?: string;
  preferences?: PersonalizationData;
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id: number;
  email: string;
  username: string;
  first_name?: string;
  last_name?: string;
  full_name: string;
  date_joined: string;
  country?: string;
  last_login?: string;
  role?: 'admin' | 'staff' | 'user';
  is_staff?: boolean;
  is_superuser?: boolean;
  is_verified?: boolean;
  is_onboarded?: boolean;
  has_completed_personalization?: boolean;
  enable_notifications?: boolean;
  ai_credits_remaining?: number;
  ai_credits_used_this_month?: number;
  preferred_currency?: string;
  default_currency?: string;
  preferred_date_format?: string;
  timezone?: string;
  language?: string;
  theme?: 'light' | 'dark' | 'system';
  notifications_enabled?: boolean;
  email_notifications?: boolean;
  push_notifications?: boolean;
  ui_preferences?: UserPreferences['ui_preferences'];
  phone?: string;
  bio?: string;
  website?: string;
  location?: string;
  profile_photo_url?: string;
  profile_photo_thumbnail_url?: string;
  profile_picture?: string;
  has_custom_photo?: boolean;
  onboarding_step?: number;
  profile?: UserProfile;
  subscription?: UserSubscription;
  preferences?: UserPreferences;
  ai_settings?: UserAISettings;
  personalization?: UserPersonalization;
  personalization_data?: PersonalizationData;
}

// Re-export account-related types from account.types.ts
export type {
  Account,
  AccountType,
  AccountStatus,
  AccountPriority,
  BalanceStatus,
  BalanceRecord,
  AccountFormData,
} from './types/finance/account.types';

// Core Information
interface BalanceInfo {
  balance: string;
  date: string;
  entry_type: 'daily' | 'monthly' | 'weekly' | 'manual' | 'reconciliation';
  entry_type_display: string;

  // Statement/Reconciliation Fields
  statement_balance?: string;
  reconciliation_status: 'pending' | 'reconciled' | 'discrepancy' | 'investigation';
  reconciliation_status_display: string;
  difference: string;

  // Transaction Analysis
  total_income: string;
  total_expenses: string;
  calculated_change: string;
  actual_change: string;
  missing_transactions: string;

  // Period Information
  period_start?: string;
  period_end?: string;
  is_month_end: boolean;
  year?: number;
  month?: number;
  month_name: string;
  date_display: string;

  // Additional Information
  notes?: string;
  source?: string;
  confidence_score?: string;
  metadata: Record<string, any>;

  // Computed fields
  has_discrepancy: boolean;
  balance_status: string;

  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  user_id: number;
  name: string;
  color: string;
  is_system: boolean;
  created_at?: string;
}

// Optimized Transaction interface matching the new backend model
export interface TransactionGroup {
  id: number;
  name: string;
  group_type:
    | 'merchant'
    | 'bank'
    | 'broker'
    | 'person'
    | 'expense_group'
    | 'employer'
    | 'government'
    | 'charity'
    | 'other';
  description?: string;
  is_active?: boolean;
  // Cached statistics
  total_transactions: number;
  total_spent: string;
  total_received: string;
  last_transaction_date?: string;
  // Metadata and visual
  metadata: Record<string, any>;
  logo_url?: string;
  color: string;
  // Timestamps
  created_at?: string;
  updated_at?: string;
}

export interface TransactionDetail {
  id: number;
  transaction: number;
  detail_type:
    | 'line_item'
    | 'split_share'
    | 'investment_detail'
    | 'lending_terms'
    | 'installment'
    | 'tax_detail'
    | 'fee'
    | 'discount'
    | 'other';
  detail_type_display: string;
  // Common fields
  name: string;
  description?: string;
  amount: string;
  category?: number;
  category_name?: string;
  // Quantity fields
  quantity?: string;
  unit_price?: string;
  calculated_amount: string;
  // Additional fields
  metadata: Record<string, any>;
  verified: boolean;
  notes?: string;
  // Timestamps
  created_at?: string;
  updated_at?: string;
}

export interface Transaction {
  id: string;
  // Core fields (from BaseTransaction)
  amount: number | string;
  description: string;
  date: string;
  currency: string;
  notes?: string;
  external_id?: string;
  status: 'active' | 'cancelled' | 'pending' | 'failed';

  // Transaction-specific fields
  is_credit: boolean; // True = money IN, False = money OUT
  account: number;
  account_id?: number; // For forms
  account_name?: string;
  transaction_group?: TransactionGroup;
  transaction_group_id?: number; // For forms
  transaction_group_name?: string;

  // Soft delete
  is_deleted: boolean;
  deleted_at?: string;

  // Metadata-based fields (accessed via properties)
  metadata: Record<string, any>;
  category_id?: number;
  suggested_category_id?: number;
  original_description?: string;
  transfer_account_id?: number;
  gmail_message_id?: string;
  verified: boolean;
  confidence_score?: number;
  source: string; // manual, gmail, csv, splitwise, etc.
  transaction_subtype?: string; // income, expense, transfer, investment, lending
  transaction_category?: string;
  investment_id?: number;
  investment_symbol?: string;
  quantity?: number;
  price_per_unit?: number;
  fees?: number;

  // Tags
  tags: string[];

  // Details
  details?: TransactionDetail[];
  has_details: boolean;
  total_details_amount: string;

  // Display
  display_description: string;

  // Timestamps
  created_at?: string;
  updated_at?: string;

  // Backward compatibility / computed fields
  merchant_name?: string; // Use transaction_group.name
  category_name?: string;
  transaction_type?:
    | 'income'
    | 'expense'
    | 'transfer'
    | 'buy'
    | 'sell'
    | 'dividend'
    | 'lend'
    | 'borrow'
    | 'repayment';
}

export interface TransactionSplit {
  id?: number;
  category_id: string;
  amount: string;
  description?: string;
}

export interface Goal {
  id: number;
  user_id: number;
  name: string;
  description?: string;
  goal_type?: 'savings' | 'spending' | 'debt_payoff' | 'investment';
  target_amount: string;
  current_amount: string;
  target_date?: string;
  start_date?: string;
  currency?: string;
  color?: string;
  thumbnail_image?: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  progress_percentage: number;
  remaining_amount: string;
  is_completed: boolean;
  images?: GoalImage[];
  created_at?: string;
  updated_at?: string;
}

export interface GoalImage {
  id: number;
  goal_id: number;
  image_url: string;
  thumbnail_url?: string;
  caption?: string;
  is_primary: boolean;
  created_at?: string;
}

export interface Summary {
  total_income: string;
  total_expenses: string;
  net_amount: string;
  transaction_count: number;
  account_balances: {
    account_name: string;
    balance: string;
    currency: string;
  }[];
  category_breakdown: {
    category_name: string;
    amount: string;
    percentage: number;
    transaction_count: number;
  }[];
  monthly_trend: {
    month: string;
    income: string;
    expenses: string;
    net: string;
  }[];
}

export interface Filter {
  search?: string;
  account_ids?: number[];
  category_ids?: string[];
  start_date?: string;
  end_date?: string;
  min_amount?: string;
  max_amount?: string;
  // New fields
  is_credit?: boolean; // Filter by income (true) or expense (false)
  transaction_group_id?: number; // Filter by specific merchant/group
  transaction_subtype?: string; // Filter by subtype (expense, income, transfer, etc.)
  source?: string; // Filter by source (manual, gmail, csv, etc.)
  // Old field for backward compatibility
  transaction_type?:
    | 'income'
    | 'expense'
    | 'transfer'
    | 'buy'
    | 'sell'
    | 'dividend'
    | 'lend'
    | 'borrow'
    | 'repayment';
  verified?: boolean;
  tags?: string[];
  page?: number;
  page_size?: number;
  ordering?: string;
  accounts?: number[];
  categories?: string[];
  upload_session?: number;
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
  // Soft delete filter
  include_deleted?: boolean;
}

export interface Contact {
  id: number;
  user_id: number;
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface GroupExpense {
  id: number;
  user_id: number;
  title: string;
  description?: string;
  total_amount: string;
  account_id: number;
  account_name: string;
  paid_by: number;
  paid_by_name: string;
  date: string;
  category_id?: string;
  shares: GroupExpenseShare[];
  total_settled_amount: string;
  is_fully_settled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface GroupExpenseShare {
  id: number;
  participant_id: number;
  participant_name: string;
  share_amount: string;
  settled_amount: string;
  is_settled: boolean;
  notes?: string;
}

// Unified Transaction interface matching backend
export interface UnifiedTransaction {
  id: number;
  amount: string;
  description: string;
  date: string;
  currency: string;
  notes?: string;
  external_id?: string;
  status: string;

  // Transaction categorization
  transaction_category:
    | 'standard'
    | 'investment'
    | 'lending'
    | 'recurring_template'
    | 'group_expense';
  transaction_type:
    | 'income'
    | 'expense'
    | 'transfer'
    | 'buy'
    | 'sell'
    | 'dividend'
    | 'lend'
    | 'borrow'
    | 'repayment';

  // Standard transaction fields
  account?: number;
  account_name?: string;
  transfer_account?: number;
  category?: number;
  category_name?: string;
  suggested_category?: number;
  tags?: number[];
  tag_names?: string[];

  // Investment fields
  investment?: number;
  quantity?: string;
  price_per_unit?: string;
  fees: string;

  // Lending fields
  contact_user?: number;
  contact_name?: string;
  contact_email?: string;
  due_date?: string;
  interest_rate?: string;

  // Group expense fields
  group_expense?: number;
  group_expense_title?: string;

  // Recurring template fields
  is_template: boolean;
  template_name?: string;
  frequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  frequency_interval?: number;
  start_date?: string;
  end_date?: string;
  max_executions?: number;
  next_execution_date?: string;
  is_active_template: boolean;
  is_manual: boolean;
  auto_categorize: boolean;
  execution_conditions?: Record<string, any>;

  // Enhanced fields
  merchant_name?: string;
  original_description?: string;
  verified: boolean;
  gmail_message_id?: string;
  metadata?: Record<string, any>;

  // Computed fields for lending
  is_lending: boolean;
  is_group_expense: boolean;
  remaining_amount?: number;
  repayment_percentage?: number;
  is_overdue?: boolean;

  // Timestamps
  created_at?: string;
  updated_at?: string;
}

export interface LendingTransaction {
  id: number;
  user_id: number;
  contact_id: number;
  contact_name: string;
  account_id: number;
  account_name: string;
  amount: string;
  remaining_amount: string;
  transaction_type: 'lent' | 'borrowed';
  description: string;
  date: string;
  due_date?: string;
  interest_rate?: string;
  repayments: LendingRepayment[];
  is_fully_repaid: boolean;
  repayment_percentage: number;
  status: 'active' | 'overdue' | 'paid' | 'written_off';
  created_at?: string;
  updated_at?: string;
}

export interface LendingRepayment {
  id: number;
  amount: string;
  date: string;
  notes?: string;
  created_at?: string;
}

// Upload Session Types
export interface UploadSession {
  id: number;
  original_filename: string;
  file_type: string;
  file_size: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  account?: number;
  account_name?: string;
  total_transactions: number;
  successful_imports: number;
  failed_imports: number;
  duplicate_imports: number;
  processing_started_at?: string;
  processing_completed_at?: string;
  processing_duration?: number;
  success_rate?: number;
  error_message?: string;
  requires_password: boolean;
  password_attempts: number;
  ai_categorization_enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TransactionImport {
  id: number;
  upload_session: number;
  statement_import?: number;
  transaction?: number;
  import_status: 'pending' | 'imported' | 'duplicate' | 'failed' | 'skipped';
  raw_data: Record<string, any>;
  parsed_amount?: string;
  parsed_date?: string;
  parsed_description: string;
  error_message?: string;
  suggested_category_confidence?: string;
  ai_merchant_detection: Record<string, any>;
  transaction_details?: {
    id: number;
    amount: string;
    description: string;
    date: string;
    category?: string;
  };
  created_at?: string;
}

export interface TransactionLink {
  id: number;
  from_transaction: number;
  to_transaction: number;
  link_type: 'transfer' | 'refund' | 'split_payment' | 'correction' | 'duplicate';
  confidence_score: string;
  is_confirmed: boolean;
  notes?: string;
  auto_detected: boolean;
  from_transaction_details: {
    id: number;
    amount: string;
    description: string;
    date: string;
    account?: string;
  };
  to_transaction_details: {
    id: number;
    amount: string;
    description: string;
    date: string;
    account?: string;
  };
  created_at?: string;
}

export interface MerchantPattern {
  id: number;
  pattern: string;
  category: number;
  category_name: string;
  category_color: string;
  merchant_name: string;
  confidence: string;
  usage_count: number;
  last_used?: string;
  is_active?: boolean;
  is_user_confirmed: boolean;
  pattern_type: string;
  created_at?: string;
}

export interface UploadStats {
  total_sessions: number;
  completed_sessions: number;
  failed_sessions: number;
  processing_sessions: number;
  total_transactions_imported: number;
  total_files_size: number;
  recent_sessions: UploadSession[];
}

export type AssistantType = 'quick_add' | 'invoice_upload';

export interface AssistantMessage {
  id: number;
  conversation: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  payload: Record<string, unknown>;
  is_error: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AssistantConversation {
  id: number;
  assistant_type: AssistantType;
  title: string;
  metadata: Record<string, unknown>;
  last_summary: string;
  created_at?: string;
  updated_at?: string;
  messages?: AssistantMessage[];
  last_message?: AssistantMessage | null;
}

export interface AssistantConversationEnvelope {
  conversation: AssistantConversation;
  latest_message?: AssistantMessage | null;
}

export interface AISettings {
  preferred_provider: 'openai' | 'ollama' | 'system';
  openai_api_key: string;
  openai_model?: string;
  ollama_endpoint?: string;
  ollama_model?: string;
  enable_categorization: boolean;
  enable_transaction_parsing: boolean;
  enable_receipt_ocr: boolean;
  enable_monthly_reports: boolean;
  confidence_threshold: number;
  max_monthly_usage: number;
  auto_approve_high_confidence: boolean;
}

export interface AIUsageStats {
  total_requests: number;
  successful_requests: number;
  success_rate: number;
  total_credits_used: number;
  total_tokens_used: number;
  avg_processing_time: number;
  credits_remaining: number;
  provider_stats: Record<
    string,
    { requests: number; tokens: number; avg_time: number; success_rate: number; credits: number }
  >;
  operation_stats: Record<string, { count: number; credits_used: number; success_rate: number }>;
  daily_usage: Array<{ date: string; requests: number; credits: number }>;
  period_days?: number;
}

export interface AISystemStatus {
  system_openai_status: 'available' | 'unavailable' | 'error';
  system_ollama_status: 'available' | 'unavailable' | 'error';
  system_openai_endpoint: string | null;
  system_ollama_endpoint: string | null;
  credit_costs: Record<string, number>;
  user_credits_remaining?: number;
}

export interface AISettingsBootstrap {
  settings: AISettings;
  profile: {
    credits_remaining: number;
    system_openai_available: boolean;
    system_ollama_available: boolean;
  };
  usage: AIUsageStats;
  system: AISystemStatus;
}

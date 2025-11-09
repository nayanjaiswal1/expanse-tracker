import { ID, DateString, Timestamps, Status } from '../common/base.types';

export interface UserProfile extends Timestamps {
  phone?: string;
  bio?: string;
  website?: string;
  location?: string;
  profile_photo_url?: string;
  profile_photo_thumbnail_url?: string;
  profile_picture?: string;
  has_custom_photo?: boolean;
  is_onboarded?: boolean;
  has_completed_personalization?: boolean;
  is_verified?: boolean;
}

export interface UserSubscription extends Timestamps {
  current_plan?: number;
  current_plan_name?: string;
  status?: 'trial' | 'active' | 'cancelled' | 'expired' | 'suspended';
  start_date?: DateString;
  end_date?: DateString;
  is_auto_renew?: boolean;
  ai_credits_remaining?: number;
  ai_credits_used_this_month?: number;
  transactions_this_month?: number;
  last_reset_date?: DateString;
  is_active?: boolean;
}

export interface UserPreferences extends Timestamps {
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
}

export interface UserAISettings extends Timestamps {
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
}

export interface UserPersonalization extends Timestamps {
  onboarding_step?: number;
  onboarding_completed_at?: DateString;
  is_onboarded?: boolean;
  questionnaire_completed?: boolean;
  questionnaire_completed_at?: DateString;
  preferences?: PersonalizationData;
}

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
  country?: string;
  currency?: string;
  timezone?: string;
}

export interface User extends Timestamps {
  id: ID;
  email: string;
  username: string;
  first_name?: string;
  last_name?: string;
  full_name: string;
  date_joined: DateString;
  country?: string;
  last_login?: DateString;
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

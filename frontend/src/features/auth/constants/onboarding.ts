// Common constants
export const PHONE_REGEX = /^[+]?[\d\s().-]{7,20}$/;

// Step definitions
export const STEPS = [
  { id: 1, key: 'setup' },
  { id: 2, key: 'personalize' },
] as const;

// Form field names
export const FORM_FIELDS = {
  FULL_NAME: 'full_name',
  PHONE: 'phone',
  PHONE_COUNTRY_CODE: 'phoneCountryCode',
  COUNTRY: 'country',
  CURRENCY: 'default_currency',
  TIMEZONE: 'timezone',
  LANGUAGE: 'language',
  THEME: 'theme',
  PRIMARY_USE_CASE: 'primary_use_case',
  PRIMARY_GOAL: 'primary_goal',
  AI_FEATURES: 'interested_ai_features',
} as const;

// Default values
export const DEFAULTS = {
  CURRENCY: 'USD',
  TIMEZONE: 'UTC',
  LANGUAGE: 'en',
  THEME: 'system' as const,
  PRIMARY_USE_CASE: 'personal_expense_tracking' as const,
  PRIMARY_GOAL: 'save_time' as const,
} as const;

// Validation messages
export const VALIDATION_MESSAGES = {
  REQUIRED: 'This field is required',
  INVALID_PHONE: 'Please enter a valid phone number',
  MAX_LENGTH: (max: number) => `Must be ${max} characters or less`,
} as const;

// Type definitions
export type PrimaryUseCase =
  | 'personal_expense_tracking'
  | 'business_finance_management'
  | 'freelance_income_expenses'
  | 'family_budget_management'
  | 'investment_portfolio_tracking'
  | 'just_exploring';

export type PrimaryGoal =
  | 'save_time'
  | 'better_organization'
  | 'track_cash_flow'
  | 'understand_spending_patterns'
  | 'tax_preparation'
  | 'pay_off_debt'
  | 'build_savings'
  | 'track_investments';

export type ThemePreference = 'system' | 'light' | 'dark';

export interface FormValues {
  [FORM_FIELDS.FULL_NAME]: string;
  [FORM_FIELDS.PHONE]?: string;
  [FORM_FIELDS.PHONE_COUNTRY_CODE]: string;
  [FORM_FIELDS.COUNTRY]: string;
  [FORM_FIELDS.CURRENCY]: string;
  [FORM_FIELDS.TIMEZONE]: string;
  [FORM_FIELDS.LANGUAGE]: string;
  [FORM_FIELDS.THEME]: ThemePreference;
  [FORM_FIELDS.PRIMARY_USE_CASE]: PrimaryUseCase;
  [FORM_FIELDS.PRIMARY_GOAL]: PrimaryGoal;
  [FORM_FIELDS.AI_FEATURES]?: string[];
}

// Type guards
export function isPrimaryUseCase(value: string): value is PrimaryUseCase {
  return [
    'personal_expense_tracking',
    'business_finance_management',
    'freelance_income_expenses',
    'family_budget_management',
    'investment_portfolio_tracking',
    'just_exploring',
  ].includes(value);
}

export function isPrimaryGoal(value: string): value is PrimaryGoal {
  return [
    'save_time',
    'better_organization',
    'track_cash_flow',
    'understand_spending_patterns',
    'tax_preparation',
    'pay_off_debt',
    'build_savings',
    'track_investments',
  ].includes(value);
}

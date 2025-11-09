import { ID, DateString, Status, Timestamps, Metadata } from '../common/base.types';

export type AccountType =
  | 'checking'
  | 'savings'
  | 'credit'
  | 'investment'
  | 'loan'
  | 'cash'
  | 'other';
export type AccountStatus = 'active' | 'inactive' | 'closed' | 'frozen' | 'pending';
export type AccountPriority = 'low' | 'medium' | 'high' | 'critical';
export type BalanceStatus = 'below_minimum' | 'over_limit' | 'zero_or_negative' | 'normal';

export interface Account extends Timestamps {
  id: ID;
  name: string;
  description?: string;
  account_type: AccountType;
  status: AccountStatus;
  balance: string;
  currency: string | { code: string; symbol?: string; name?: string };
  balance_limit: string | null;
  balance_status?: BalanceStatus;
  account_number?: string;
  last_sync_date?: DateString;
  metadata: Metadata;
  deleted_at?: DateString;
  balance_limit_display?: string;
  days_since_opened?: number;
  tags: string[];
  // Computed fields (not in backend model, but might be used in frontend)
  is_deleted?: boolean;
}

export interface BalanceRecord extends Timestamps {
  id: ID;
  account: ID;
  account_name: string;
  account_type: string;
  balance: string;
  date: DateString;
  entry_type: 'daily' | 'monthly' | 'weekly' | 'manual' | 'reconciliation';
  notes?: string;
  is_reconciled: boolean;
  metadata: Metadata;
}

export interface AccountFormData
  extends Omit<
    Account,
    | 'id'
    | 'created_at'
    | 'updated_at'
    | 'deleted_at'
    | 'balance_status'
    | 'balance_limit_display'
    | 'days_since_opened'
    | 'is_deleted'
    | 'tags'
  > {
  // Form specific fields can be added here
}

// Type guards
export const isAccount = (obj: any): obj is Account => {
  return obj && typeof obj === 'object' && 'account_type' in obj && 'balance' in obj;
};

// Utility functions
export const getAccountTypeLabel = (type: AccountType): string => {
  const labels: Record<AccountType, string> = {
    checking: 'Checking',
    savings: 'Savings',
    credit: 'Credit Card',
    investment: 'Investment',
    loan: 'Loan',
    cash: 'Cash',
    other: 'Other',
  };
  return labels[type] || type;
};

export const getAccountStatusLabel = (status: AccountStatus): string => {
  const labels: Record<AccountStatus, string> = {
    active: 'Active',
    inactive: 'Inactive',
    closed: 'Closed',
    frozen: 'Frozen',
    pending: 'Pending',
  };
  return labels[status] || status;
};

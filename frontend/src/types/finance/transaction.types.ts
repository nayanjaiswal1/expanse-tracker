import { ID, DateString, Status, Timestamps, Metadata } from '../common/base.types';

export type TransactionType =
  | 'income'
  | 'expense'
  | 'transfer'
  | 'buy'
  | 'sell'
  | 'dividend'
  | 'lend'
  | 'borrow'
  | 'repayment';

export type TransactionStatus = 'active' | 'cancelled' | 'pending' | 'failed';

export interface TransactionBase extends Timestamps {
  id: ID;
  amount: string | number;
  description: string;
  date: DateString;
  currency: string;
  notes?: string;
  external_id?: string;
  status: TransactionStatus;
  is_credit: boolean;
  account_id: number;
  account_name?: string;
  transaction_group_id?: number;
  transaction_group_name?: string;
  transaction_group?: TransactionGroup;
  is_deleted: boolean;
  deleted_at?: string;
  metadata: Metadata;
  category_id?: number;
  suggested_category_id?: number;
  original_description?: string;
  transfer_account_id?: number;
  gmail_message_id?: string;
  verified: boolean;
  confidence_score?: number;
  source: string;
  transaction_subtype?: string;
  transaction_category?: string;
  tags: string[];
  has_details: boolean;
  total_details_amount: string;
  display_description: string;
  merchant_name?: string;
  category_name?: string;
  transaction_type: TransactionType;
}

export interface InvestmentTransaction extends TransactionBase {
  investment_id: number;
  investment_symbol?: string;
  quantity?: number;
  price_per_unit?: number;
  fees?: number;
}

export interface Transaction extends TransactionBase {
  details?: TransactionDetail[];
}

export interface TransactionGroup extends Timestamps {
  id: ID;
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
  total_transactions: number;
  total_spent: string;
  total_received: string;
  last_transaction_date?: DateString;
  logo_url?: string;
  color: string;
}

export type TransactionDetailType =
  | 'line_item'
  | 'split_share'
  | 'investment_detail'
  | 'lending_terms'
  | 'installment'
  | 'tax_detail'
  | 'fee'
  | 'discount'
  | 'other';

export interface TransactionDetail extends Timestamps {
  id: ID;
  transaction: ID;
  detail_type: TransactionDetailType;
  detail_type_display: string;
  name: string;
  description?: string;
  amount: string;
  category?: number;
  category_name?: string;
  quantity?: string;
  unit_price?: string;
  calculated_amount: string;
  verified: boolean;
  notes?: string;
}

export interface TransactionSplit {
  id?: ID;
  category_id: string;
  amount: string;
  description?: string;
}

export interface TransactionFilter extends Record<string, unknown> {
  search?: string;
  account_ids?: ID[];
  category_ids?: string[];
  start_date?: DateString;
  end_date?: DateString;
  min_amount?: string;
  max_amount?: string;
  is_credit?: boolean;
  transaction_group_id?: ID;
  transaction_subtype?: string;
  source?: string;
  transaction_type?: TransactionType;
  verified?: boolean;
  tags?: string[];
  page?: number;
  page_size?: number;
  ordering?: string;
  include_deleted?: boolean;
}

// Type guards
export const isInvestmentTransaction = (
  transaction: Transaction | InvestmentTransaction
): transaction is InvestmentTransaction => {
  return 'investment_id' in transaction;
};

// Utility functions
export const getTransactionTypeLabel = (type: TransactionType): string => {
  const labels: Record<TransactionType, string> = {
    income: 'Income',
    expense: 'Expense',
    transfer: 'Transfer',
    buy: 'Buy',
    sell: 'Sell',
    dividend: 'Dividend',
    lend: 'Lend',
    borrow: 'Borrow',
    repayment: 'Repayment',
  };
  return labels[type] || type;
};

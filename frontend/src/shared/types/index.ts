/**
 * Shared Type Definitions
 */

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  account: string;
  tags: string[];
  type: 'income' | 'expense' | 'transfer';
  status?: 'active' | 'pending' | 'cancelled';
}

export interface Account {
  id: string;
  name: string;
  type: 'credit' | 'savings' | 'checking';
  balance: number;
  lastSync: string;
  color: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  isSystem: boolean;
  transactionCount: number;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  isSystem: boolean;
  usageCount: number;
}

export interface Budget {
  id: string;
  name: string;
  period: string;
  total: number;
  spent: number;
  categories: BudgetCategory[];
}

export interface BudgetCategory {
  name: string;
  allocated: number;
  spent: number;
}

export interface Statement {
  id: string;
  filename: string;
  uploadDate: string;
  status: 'completed' | 'processing' | 'failed';
  transactions: number;
  duplicates: number;
  parseMethod: 'AI' | 'System';
}

export interface AIProvider {
  id: string;
  name: string;
  apiKey: string;
  status: 'active' | 'inactive';
  lastTested: string;
}

export type TimeRange = 'daily' | 'weekly' | 'monthly' | 'yearly';

export type SortDirection = 'asc' | 'desc';

export interface PaginationParams {
  page: number;
  pageSize: number;
  total: number;
}

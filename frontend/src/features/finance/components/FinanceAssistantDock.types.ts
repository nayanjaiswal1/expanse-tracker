import type { AssistantMessage, AssistantType, Transaction } from '../../../types';

export type FinanceAssistantDockProps = {
  accounts: Array<{ id: number; name: string; currency?: string; icon?: string }>;
  categories: Array<{ id: string; name: string }>;
  onTransactionsMutated?: () => void;
};

export type FinanceAssistantFormState = {
  amount: string;
  description: string;
  transaction_type: Transaction['transaction_type'];
  account_id: string;
  category_id: string;
  merchant_name: string;
  date: string;
  currency: string;
};

export type SuggestionPayload = {
  amount: string | null;
  description: string;
  transaction_type: Transaction['transaction_type'];
  merchant_name?: string | null;
  date?: string;
  currency?: string;
  suggested_account?: { id: number; name: string; icon?: string } | null;
  suggested_category?: { id: string; name: string } | null;
  confidence?: number;
  tags?: string[];
  translation?: string;
};

export type InvoiceAssistantPayload = {
  type: string;
  document?: {
    file_name?: string;
    document_type?: string;
    quality_score?: number;
    detection_confidence?: number;
    language?: string;
    tags?: string[];
  };
  created_transactions?: Transaction[];
  raw_transactions?: Array<Record<string, unknown>>;
  translation?: string;
  tags?: string[];
};

export type AugmentedMessage = AssistantMessage & { assistantType: AssistantType };

export type FinanceAssistantTab = 'assistant' | 'coach';

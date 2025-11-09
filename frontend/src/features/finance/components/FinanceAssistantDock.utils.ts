import type { AssistantMessage, AssistantType, Transaction } from '../../../types';
import type {
  FinanceAssistantDockProps,
  FinanceAssistantFormState,
  InvoiceAssistantPayload,
  SuggestionPayload,
} from './FinanceAssistantDock.types';

export const QUICK_ADD_ASSISTANT: AssistantType = 'quick_add';
export const INVOICE_ASSISTANT: AssistantType = 'invoice_upload';

export const isSuggestionMessage = (message: AssistantMessage) =>
  message.role === 'assistant' &&
  message.payload &&
  typeof message.payload === 'object' &&
  (message.payload as Record<string, unknown>).type === 'quick_add_suggestion';

export const isTransactionCreatedMessage = (message: AssistantMessage) =>
  message.role === 'assistant' &&
  message.payload &&
  typeof message.payload === 'object' &&
  (message.payload as Record<string, unknown>).type === 'transaction_created';

export const extractSuggestion = (message: AssistantMessage): SuggestionPayload | null => {
  if (!isSuggestionMessage(message)) return null;
  const payload = message.payload as Record<string, unknown>;
  return (payload.suggestion as SuggestionPayload | undefined) ?? null;
};

export const extractCreatedTransaction = (message: AssistantMessage): Transaction | null => {
  if (!isTransactionCreatedMessage(message)) return null;
  const payload = message.payload as Record<string, unknown>;
  return (payload.transaction as Transaction | undefined) ?? null;
};

export const extractInvoicePayload = (
  message: AssistantMessage
): InvoiceAssistantPayload | null => {
  if (!message.payload || typeof message.payload !== 'object') return null;
  const payload = message.payload as InvoiceAssistantPayload;
  return payload.type === 'invoice_upload_result' ? payload : null;
};

export const defaultDate = () => new Date().toISOString().split('T')[0];

export const buildInitialForm = (
  defaultAccount: FinanceAssistantDockProps['accounts'][number] | undefined
): FinanceAssistantFormState => ({
  amount: '',
  description: '',
  transaction_type: 'expense' as Transaction['transaction_type'],
  account_id: defaultAccount ? String(defaultAccount.id) : '',
  category_id: '',
  merchant_name: '',
  date: defaultDate(),
  currency: defaultAccount?.currency || 'USD',
});

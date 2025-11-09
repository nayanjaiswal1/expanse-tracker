import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../../api';

export interface OCRResult {
  merchant_name?: string;
  amount?: string;
  date?: string;
  items: string[];
  suggested_category?: string;
  confidence: number;
  ai_analysis?: string;
  raw_text: string;
}

export interface ProcessReceiptResponse {
  success: boolean;
  ocr_result: OCRResult;
  suggestions: {
    create_transaction: boolean;
    account_id?: number;
    account_name?: string;
  };
}

export interface CreateTransactionFromReceiptData {
  merchant_name: string;
  amount: number | string;
  date: string;
  account_id: number;
  category_name?: string;
  items?: string[];
  notes?: string;
}

export interface CreateTransactionFromReceiptResponse {
  success: boolean;
  transaction_id: number;
  message: string;
}

export function useProcessReceiptMutation() {
  return useMutation({
    mutationFn: async ({ receiptImage, accountId }: { receiptImage: File; accountId?: number }) => {
      return (await apiClient.processReceipt(receiptImage, accountId)) as ProcessReceiptResponse;
    },
  });
}

export function useCreateTransactionFromReceiptMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateTransactionFromReceiptData) => {
      return (await apiClient.createTransactionFromReceipt(
        data
      )) as CreateTransactionFromReceiptResponse;
    },
    onSuccess: () => {
      // Invalidate transactions cache when a new transaction is created
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

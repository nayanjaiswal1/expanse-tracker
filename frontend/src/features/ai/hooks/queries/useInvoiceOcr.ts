import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../../api';

export interface OCRCapabilities {
  tesseract: boolean;
  pdf2image: boolean;
  ocr_enabled: boolean;
  tesseract_working: boolean;
}

export interface InvoiceDocument {
  id: string;
  title: string;
  document_type: string;
  file_type: string;
  file_size: number;
  created_at: string;
  description: string;
  has_file: boolean;
}

export interface ProcessedInvoice {
  id: string;
  title: string;
  processed_at: string;
  document_type: string;
  confidence: number;
  processing_method: string;
  invoice_type: string;
  category: string;
  amount?: number;
  vendor?: string;
  has_transaction: boolean;
}

export interface Statistics {
  total_processed_30d: number;
  successful_processed_30d: number;
  transactions_created_30d: number;
  pending_documents: number;
  success_rate: number;
}

export interface InvoiceDetails {
  id: string;
  file_name: string;
  document_type: string;
  quality_score: number;
  detection_confidence: number;
  extracted_transactions: any[]; // Refine later
  account_info: any; // Refine later
  title?: string;
  confidence?: number;
  processed_at?: string;
  has_transaction?: boolean;
  invoice_data?: {
    amount?: number | string;
    vendor?: string;
    invoice_date?: string;
    category?: string;
  };
  extracted_text?: string;
}

const keys = {
  capabilities: ['invoice-ocr', 'capabilities'] as const,
  unprocessed: ['invoice-ocr', 'unprocessed'] as const,
  history: ['invoice-ocr', 'history'] as const,
  statistics: ['invoice-ocr', 'statistics'] as const,
  details: (id: string) => ['invoice-ocr', 'details', id] as const,
};

export function useInvoiceCapabilities() {
  return useQuery({
    queryKey: keys.capabilities,
    queryFn: async (): Promise<{ capabilities: OCRCapabilities }> => {
      const res = await apiClient.get('/invoice-ocr/capabilities/');
      return (res as any).data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useUnprocessedInvoices() {
  return useQuery({
    queryKey: keys.unprocessed,
    queryFn: async (): Promise<{ unprocessed_invoices: InvoiceDocument[] }> => {
      const res = await apiClient.get('/invoice-ocr/unprocessed_invoices/');
      return (res as any).data;
    },
  });
}

export function useInvoiceProcessingHistory() {
  return useQuery({
    queryKey: keys.history,
    queryFn: async (): Promise<{ processing_history: ProcessedInvoice[] }> => {
      const res = await apiClient.get('/invoice-ocr/processing_history/');
      return (res as any).data;
    },
  });
}

export function useStatistics() {
  return useQuery({
    queryKey: keys.statistics,
    queryFn: async (): Promise<{ statistics: Statistics }> => {
      const res = await apiClient.get('/invoice-ocr/statistics/');
      return (res as any).data;
    },
    staleTime: 60 * 1000,
  });
}

export function useProcessInvoiceMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const res = await apiClient.post(`/invoice-ocr/${id}/process_invoice/`, {});
      return (res as any).data as { success: boolean; confidence?: number };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.unprocessed });
      qc.invalidateQueries({ queryKey: keys.history });
      qc.invalidateQueries({ queryKey: keys.statistics });
    },
  });
}

export function useCreateTransactionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const res = await apiClient.post(`/invoice-ocr/${id}/create_transaction/`, {});
      return (res as any).data as { success: boolean; amount?: number; vendor?: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.history });
      qc.invalidateQueries({ queryKey: keys.statistics });
    },
  });
}

export function useInvoiceBatchProcessMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { create_transactions: boolean }) => {
      const res = await apiClient.post('/invoice-ocr/batch_process/', payload);
      return (res as any).data as {
        success: boolean;
        successful_count?: number;
        transactions_created?: number;
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.unprocessed });
      qc.invalidateQueries({ queryKey: keys.history });
      qc.invalidateQueries({ queryKey: keys.statistics });
    },
  });
}

export function useInvoiceDetails(id: string | null) {
  return useQuery<InvoiceDetails>({
    queryKey: id ? keys.details(id) : ['invoice-ocr', 'details', 'none'],
    queryFn: async () => {
      if (!id) throw new Error('missing id');
      const res = await apiClient.get(`/invoice-ocr/${id}/invoice_details/`);
      return res.data;
    },
    enabled: !!id,
  });
}

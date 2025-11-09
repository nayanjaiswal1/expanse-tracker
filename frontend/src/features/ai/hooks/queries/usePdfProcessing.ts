import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../../api';

// Types used in PDFProcessor UI
export interface ProcessingCapabilities {
  pypdf2: boolean;
  pymupdf: boolean;
  ocr: boolean;
  pdf_processing_enabled: boolean;
}

export interface PDFDocument {
  id: string;
  title: string;
  file_size: number;
  created_at: string;
  is_password_protected: boolean;
  description: string;
}

export interface ProcessedPDF {
  id: string;
  title: string;
  processed_at: string;
  document_type: string;
  page_count: number;
  extraction_method: string;
  password_protected: boolean;
  has_financial_data: boolean;
  confidence: number;
  file_size: number;
}

export interface ExtractionResult {
  document_id: string;
  title: string;
  document_type: string;
  page_count: number;
  extraction_method: string;
  password_protected: boolean;
  financial_data: any;
  text_preview: string;
  confidence: number;
}

const keys = {
  capabilities: ['pdf-processing', 'capabilities'] as const,
  unprocessed: ['pdf-processing', 'unprocessed'] as const,
  history: ['pdf-processing', 'history'] as const,
  extractionResult: (id: string) => ['pdf-processing', 'extraction-result', id] as const,
};

export function usePdfCapabilities() {
  return useQuery({
    queryKey: keys.capabilities,
    queryFn: async (): Promise<{ capabilities: ProcessingCapabilities }> => {
      const res = await apiClient.get('/pdf-processing/capabilities/');
      return (res as any).data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useUnprocessedPdfs() {
  return useQuery({
    queryKey: keys.unprocessed,
    queryFn: async (): Promise<{ unprocessed_pdfs: PDFDocument[] }> => {
      const res = await apiClient.get('/pdf-processing/unprocessed_pdfs/');
      return (res as any).data;
    },
  });
}

export function usePdfProcessingHistory() {
  return useQuery({
    queryKey: keys.history,
    queryFn: async (): Promise<{ processing_history: ProcessedPDF[] }> => {
      const res = await apiClient.get('/pdf-processing/processing_history/');
      return (res as any).data;
    },
  });
}

export function useProcessPdfMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, password }: { id: string; password?: string }) => {
      const res = await apiClient.post(
        `/pdf-processing/${id}/process_pdf/`,
        password ? { password } : {}
      );
      return (res as any).data as { success: boolean; document_type?: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.unprocessed });
      qc.invalidateQueries({ queryKey: keys.history });
    },
  });
}

export function useUnlockPdfMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      const res = await apiClient.post(`/pdf-processing/${id}/unlock_pdf/`, { password });
      return (res as any).data as { success: boolean };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.unprocessed });
      qc.invalidateQueries({ queryKey: keys.history });
    },
  });
}

export function usePdfBatchProcessMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { password_attempts: Record<string, string> }) => {
      const res = await apiClient.post('/pdf-processing/batch_process/', payload);
      return (res as any).data as { success: boolean; success_count?: number };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.unprocessed });
      qc.invalidateQueries({ queryKey: keys.history });
    },
  });
}

export function useExtractionResult(id: string | null) {
  return useQuery({
    queryKey: id ? keys.extractionResult(id) : ['pdf-processing', 'extraction-result', 'none'],
    queryFn: async (): Promise<ExtractionResult> => {
      if (!id) throw new Error('missing id');
      const res = await apiClient.get(`/pdf-processing/${id}/extraction_result/`);
      return (res as any).data as ExtractionResult;
    },
    enabled: !!id,
  });
}

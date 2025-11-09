/**
 * API client for interactive statement upload and parsing.
 */

import { apiClient } from './client';

const api = apiClient.client;

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ExtractedTable {
  table_id?: number;
  headers: string[];
  rows: string[][];
  bounding_box?: BoundingBox;
  page_number: number;
  table_type: string;
  confidence?: number;
  metadata?: Record<string, any>;
}

export interface ParsedTransaction {
  date: string;
  description: string;
  amount: string;
  transaction_type: 'debit' | 'credit';
  balance?: string;
  external_id?: string;
  account_id?: number;
  status?: 'new' | 'duplicate';
  duplicate_of?: number;
}

export interface UploadSessionResponse {
  session_id: number;
  file_name: string;
  file_size: number;
  file_type: string;
  page_count: number;
  status: string;
  message: string;
}

export interface ParseResponse {
  session_id: number;
  statement_import_id: number;
  tables: ExtractedTable[];
  transactions: ParsedTransaction[];
  metadata: Record<string, any>;
  extraction_metadata: Record<string, any>;
  total_transactions: number;
}

export interface ExtractTableRequest {
  page_number: number;
  bounding_box: BoundingBox;
  table_type?: string;
  ai_model?: string;
}

export interface ExtractTableResponse {
  table: ExtractedTable;
  transactions: ParsedTransaction[];
  total_transactions_extracted: number;
}

export interface DuplicateCheckResponse {
  duplicates: ParsedTransaction[];
  unique: ParsedTransaction[];
  total: number;
  duplicate_count: number;
  unique_count: number;
}

export interface SaveTransactionsRequest {
  transactions?: ParsedTransaction[];
  skip_duplicates?: boolean;
  add_tag?: string;
}

export interface SaveTransactionsResponse {
  success: boolean;
  created: number;
  skipped_duplicates: number;
  failed: number;
  transactions: any[];
  session_id: number;
}

export interface PDFPageResponse {
  page_number: number;
  image: string; // base64 data URL
  width: number;
  height: number;
}

/**
 * Upload a statement file
 */
export const uploadStatement = async (
  file: File,
  accountId?: number
): Promise<UploadSessionResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  if (accountId) {
    formData.append('account_id', accountId.toString());
  }

  const response = await api.post('/finance/statement-uploads/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

/**
 * Parse uploaded statement
 */
export const parseStatement = async (
  sessionId: number,
  mode: 'auto' | 'manual' | 'hybrid' = 'auto',
  aiModel: string = 'anthropic_claude_sonnet'
): Promise<ParseResponse> => {
  const response = await api.post(`/finance/statement-uploads/${sessionId}/parse/`, {
    mode,
    ai_model: aiModel,
  });

  return response.data;
};

/**
 * Extract table from user-drawn region
 */
export const extractTableFromRegion = async (
  sessionId: number,
  request: ExtractTableRequest
): Promise<ExtractTableResponse> => {
  const response = await api.post(
    `/finance/statement-uploads/${sessionId}/extract_table/`,
    request
  );

  return response.data;
};

/**
 * Check for duplicate transactions
 */
export const checkDuplicates = async (sessionId: number): Promise<DuplicateCheckResponse> => {
  const response = await api.get(`/finance/statement-uploads/${sessionId}/check_duplicates/`);

  return response.data;
};

/**
 * Save transactions
 */
export const saveTransactions = async (
  sessionId: number,
  request: SaveTransactionsRequest
): Promise<SaveTransactionsResponse> => {
  const response = await api.post(
    `/finance/statement-uploads/${sessionId}/save_transactions/`,
    request
  );

  return response.data;
};

/**
 * Get PDF page as image
 */
export const getPDFPage = async (
  sessionId: number,
  pageNumber: number,
  scale: number = 2.0
): Promise<PDFPageResponse> => {
  const response = await api.get(`/finance/statement-uploads/${sessionId}/get_pdf_page/`, {
    params: {
      page_number: pageNumber,
      scale,
    },
  });

  return response.data;
};

/**
 * Get upload session details
 */
export const getUploadSession = async (sessionId: number) => {
  const response = await api.get(`/finance/statement-uploads/${sessionId}/`);
  return response.data;
};

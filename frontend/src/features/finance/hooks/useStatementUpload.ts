/**
 * Custom hook for statement upload operations with loading and error states.
 */

import { useState } from 'react';
import {
  uploadStatement,
  parseStatement,
  extractTableFromRegion,
  checkDuplicates,
  saveTransactions,
  type BoundingBox,
  type ParsedTransaction,
  type ExtractedTable,
} from '../../../api/statementApi';

interface UseStatementUploadReturn {
  // State
  isLoading: boolean;
  error: string | null;
  sessionId: number | null;
  tables: ExtractedTable[];
  transactions: ParsedTransaction[];
  metadata: Record<string, any>;
  duplicates: ParsedTransaction[];
  uniqueTransactions: ParsedTransaction[];

  // Actions
  upload: (file: File, accountId?: number) => Promise<void>;
  parse: (mode?: 'auto' | 'manual' | 'hybrid', aiModel?: string) => Promise<void>;
  extractTable: (pageNumber: number, boundingBox: BoundingBox, tableType?: string) => Promise<void>;
  checkForDuplicates: () => Promise<void>;
  save: (
    transactionsToSave?: ParsedTransaction[],
    skipDuplicates?: boolean,
    tag?: string
  ) => Promise<void>;
  reset: () => void;
}

export const useStatementUpload = (): UseStatementUploadReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [tables, setTables] = useState<ExtractedTable[]>([]);
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
  const [metadata, setMetadata] = useState<Record<string, any>>({});
  const [duplicates, setDuplicates] = useState<ParsedTransaction[]>([]);
  const [uniqueTransactions, setUniqueTransactions] = useState<ParsedTransaction[]>([]);

  const upload = async (file: File, accountId?: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await uploadStatement(file, accountId);
      setSessionId(response.session_id);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Upload failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const parse = async (
    mode: 'auto' | 'manual' | 'hybrid' = 'auto',
    aiModel: string = 'anthropic_claude_sonnet'
  ) => {
    if (!sessionId) {
      setError('No session ID. Please upload a file first.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await parseStatement(sessionId, mode, aiModel);
      setTables(response.tables);
      setTransactions(response.transactions);
      setMetadata(response.metadata);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Parsing failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const extractTable = async (
    pageNumber: number,
    boundingBox: BoundingBox,
    tableType: string = 'transactions'
  ) => {
    if (!sessionId) {
      setError('No session ID. Please upload a file first.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await extractTableFromRegion(sessionId, {
        page_number: pageNumber,
        bounding_box: boundingBox,
        table_type: tableType,
      });

      // Add new table and transactions
      setTables((prev) => [...prev, response.table]);
      setTransactions((prev) => [...prev, ...response.transactions]);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Table extraction failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const checkForDuplicates = async () => {
    if (!sessionId) {
      setError('No session ID. Please upload a file first.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await checkDuplicates(sessionId);
      setDuplicates(response.duplicates);
      setUniqueTransactions(response.unique);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Duplicate check failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const save = async (
    transactionsToSave?: ParsedTransaction[],
    skipDuplicates: boolean = true,
    tag: string = 'statement-import'
  ) => {
    if (!sessionId) {
      setError('No session ID. Please upload a file first.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await saveTransactions(sessionId, {
        transactions: transactionsToSave,
        skip_duplicates: skipDuplicates,
        add_tag: tag,
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Save failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setIsLoading(false);
    setError(null);
    setSessionId(null);
    setTables([]);
    setTransactions([]);
    setMetadata({});
    setDuplicates([]);
    setUniqueTransactions([]);
  };

  return {
    isLoading,
    error,
    sessionId,
    tables,
    transactions,
    metadata,
    duplicates,
    uniqueTransactions,
    upload,
    parse,
    extractTable,
    checkForDuplicates,
    save,
    reset,
  };
};

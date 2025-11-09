import React, { useState, useCallback, useRef, useEffect } from 'react';
import { FileUploadZone } from '../../../components/ui/FileUploadZone';
import { FileProcessingCard, ProcessingFile } from '../../../components/ui/FileProcessingCard';
import { useToast } from '../../../components/ui/Toast';
import { PasswordDialog } from '../../../components/ui/PasswordDialog';
import TransactionPreview from './TransactionPreview';
import { MultiLevelParser } from './MultiLevelParser';
import { apiClient } from '../../../api/client';
import type { Account, Category } from '../../../types';
import { FlexBetween } from '../../../components/ui/Layout';

interface ParsedFileData {
  sessionId: string;
  fileName: string;
  fileType: string;
  transactions: any[];
  detectedAccount?: Account;
  warnings: string[];
  errors: string[];
  stats: {
    total: number;
    duplicates: number;
    errors: number;
    confidence: number;
  };
  parsing_method?: string;
  parsing_time?: number;
  multi_level_parsing_used?: boolean;
}

// Use the ProcessingFile type from the UI component

interface EnhancedUploadProps {
  accounts: Account[];
  categories: Category[];
  onUploadSuccess?: () => void;
  defaultAccount?: Account;
}

const EnhancedUpload: React.FC<EnhancedUploadProps> = ({
  accounts,
  categories,
  onUploadSuccess,
  defaultAccount,
}) => {
  const { showSuccess, showError } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper function to get CSRF token
  const getCSRFToken = (): string | null => {
    const cookieValue = document.cookie
      .split('; ')
      .find((row) => row.startsWith('csrftoken='))
      ?.split('=')[1];

    if (cookieValue) return cookieValue;

    const metaTag = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement;
    return metaTag?.content || null;
  };

  const [files, setFiles] = useState<ProcessingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<ParsedFileData | null>(null);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState<{
    file: File;
    fileId: string;
    filename: string;
  } | null>(null);
  const [showMultiLevelParser, setShowMultiLevelParser] = useState(false);
  const [parsingSessionId, setParsingSessionId] = useState<string | null>(null);
  const [useMultiLevelParsing, setUseMultiLevelParsing] = useState(false);

  // Load upload history on component mount
  useEffect(() => {
    loadUploadHistory();
  }, []);

  const loadUploadHistory = async () => {
    try {
      const historyData = await apiClient.get('/upload-sessions/history/');
      setFiles(historyData);
    } catch (error) {
      console.error('Failed to load upload history:', error);
    }
  };

  // Enhanced file processing with better error handling and progress tracking
  const processFile = async (file: File, password?: string): Promise<void> => {
    const fileId = Math.random().toString(36).substr(2, 9);

    const uploadedFile: ProcessingFile = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'uploading',
      progress: 0,
    };

    setFiles((prev) => [...prev, uploadedFile]);

    try {
      // Step 1: Upload file
      setFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, status: 'uploading', progress: 30 } : f))
      );

      const formData = new FormData();
      formData.append('file', file);
      if (password) formData.append('password', password);
      if (defaultAccount) formData.append('account_id', defaultAccount.id.toString());
      if (useMultiLevelParsing) formData.append('use_multi_level_parsing', 'true');

      const csrfToken = getCSRFToken();
      const headers: Record<string, string> = {};
      if (csrfToken) headers['X-CSRFToken'] = csrfToken;

      const uploadResponse = await fetch('/api/enhanced-upload/', {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();

        if (errorData.requires_password) {
          setShowPasswordPrompt({ file, fileId, filename: file.name });
          return;
        }

        if (errorData.requires_manual_correction) {
          // Handle manual correction requirement
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileId
                ? {
                    ...f,
                    status: 'error',
                    progress: 100,
                    error: 'Requires manual parsing assistance',
                  }
                : f
            )
          );

          setParsingSessionId(errorData.session_id);
          setShowMultiLevelParser(true);
          return;
        }

        throw new Error(errorData.error || 'Upload failed');
      }

      // Step 2: Parse file
      setFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, status: 'parsing', progress: 60 } : f))
      );

      const parseData = await uploadResponse.json();

      // Step 3: Process and detect account
      setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, progress: 90 } : f)));

      // Auto-detect account from statement data
      const detectedAccount = await detectAccountFromData(parseData.transactions);

      const parsedData: ParsedFileData = {
        sessionId: parseData.session_id,
        fileName: file.name,
        fileType: parseData.file_type,
        transactions: parseData.transactions.map((tx: any, index: number) => ({
          id: `${parseData.session_id}-${index}`,
          date: tx.date,
          amount: parseFloat(tx.amount),
          description: tx.description,
          category: tx.suggested_category,
          type: tx.amount > 0 ? 'income' : 'expense',
          merchant: tx.merchant_name,
          confidence: tx.confidence || 0.8,
          status: tx.confidence > 0.9 ? 'verified' : 'pending',
          originalData: tx,
        })),
        detectedAccount,
        warnings: parseData.warnings || [],
        errors: parseData.errors || [],
        stats: parseData.stats || {
          total: parseData.transactions.length,
          duplicates: parseData.duplicate_count || 0,
          errors: parseData.error_count || 0,
          confidence: parseData.confidence || 0.8,
        },
        parsing_method: parseData.parsing_method,
        parsing_time: parseData.parsing_time,
        multi_level_parsing_used: parseData.multi_level_parsing_used,
      };

      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, status: 'ready', progress: 100, data: parsedData } : f
        )
      );

      showSuccess(
        'File processed successfully',
        `Found ${parsedData.transactions.length} transactions. Click preview to review.`
      );

      // Refresh upload history to ensure persistence
      setTimeout(() => loadUploadHistory(), 1000);
    } catch (error: any) {
      console.error('File processing error:', error);

      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? {
                ...f,
                status: 'error',
                error: error.message || 'Processing failed',
              }
            : f
        )
      );

      showError('Processing failed', error.message || 'Unknown error occurred');
    }
  };

  // Auto-detect account based on statement data
  const detectAccountFromData = async (transactions: any[]): Promise<Account | undefined> => {
    if (transactions.length === 0) return undefined;

    // Look for account identifiers in transaction data
    const firstTransaction = transactions[0];

    // Check for account number patterns
    if (firstTransaction.account_number) {
      const matchingAccount = accounts.find(
        (acc) =>
          acc.account_number &&
          (acc.account_number.includes(firstTransaction.account_number) ||
            firstTransaction.account_number.includes(acc.account_number))
      );
      if (matchingAccount) return matchingAccount;
    }

    // Check for institution name matching
    if (firstTransaction.institution) {
      const matchingAccount = accounts.find(
        (acc) =>
          acc.institution &&
          acc.institution.toLowerCase().includes(firstTransaction.institution.toLowerCase())
      );
      if (matchingAccount) return matchingAccount;
    }

    // Fallback: Return the most used account for this type of transactions
    const avgAmount =
      transactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) / transactions.length;

    // Suggest account based on transaction patterns
    if (avgAmount > 1000) {
      return accounts.find((acc) => acc.account_type === 'checking');
    } else {
      return accounts.find((acc) => acc.account_type === 'credit');
    }
  };

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || []);

      const supportedFiles = selectedFiles.filter((file) => {
        const fileName = file.name.toLowerCase();
        const fileType = file.type;

        return (
          fileType === 'application/pdf' ||
          fileName.endsWith('.pdf') ||
          fileType === 'application/json' ||
          fileName.endsWith('.json') ||
          fileType === 'text/csv' ||
          fileName.endsWith('.csv') ||
          fileType === 'application/vnd.ms-excel' ||
          fileName.endsWith('.xls') ||
          fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          fileName.endsWith('.xlsx')
        );
      });

      if (supportedFiles.length === 0) {
        showError('Invalid file type', 'Please upload PDF, JSON, CSV, XLS, or XLSX files only.');
        e.target.value = '';
        return;
      }

      // Process each file
      for (const file of supportedFiles) {
        await processFile(file);
      }

      e.target.value = '';
    },
    [showError]
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const droppedFiles = Array.from(e.dataTransfer.files);
      const supportedFiles = droppedFiles.filter((file) => {
        const fileName = file.name.toLowerCase();
        const fileType = file.type;

        return (
          fileType === 'application/pdf' ||
          fileName.endsWith('.pdf') ||
          fileType === 'application/json' ||
          fileName.endsWith('.json') ||
          fileType === 'text/csv' ||
          fileName.endsWith('.csv') ||
          fileType === 'application/vnd.ms-excel' ||
          fileName.endsWith('.xls') ||
          fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          fileName.endsWith('.xlsx')
        );
      });

      if (supportedFiles.length === 0) {
        showError('Invalid file type', 'Please upload supported file types only.');
        return;
      }

      for (const file of supportedFiles) {
        await processFile(file);
      }
    },
    [showError]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handlePasswordSubmit = async (password: string) => {
    if (!showPasswordPrompt) return;

    const { file, fileId } = showPasswordPrompt;
    setShowPasswordPrompt(null);

    // Remove the failed upload and retry with password
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    await processFile(file, password);
  };

  const handlePreview = (fileData: ParsedFileData) => {
    setPreviewData(fileData);
    setShowPreview(true);
  };

  const handleMultiLevelParsingComplete = (result: any) => {
    setShowMultiLevelParser(false);
    setParsingSessionId(null);

    // Create parsed data from multi-level parsing result
    const parsedData: ParsedFileData = {
      sessionId: result.session_id || parsingSessionId || '',
      fileName: 'Multi-level parsed file',
      fileType: 'enhanced',
      transactions: result.transactions.map((tx: any, index: number) => ({
        id: `${result.session_id || 'ml'}-${index}`,
        ...tx,
        category: tx.category || null,
        account: defaultAccount || null,
        verified: false,
      })),
      warnings: [],
      errors: [],
      stats: {
        total: result.total_transactions,
        duplicates: 0,
        errors: 0,
        confidence: result.confidence,
      },
    };

    setPreviewData(parsedData);
    setShowPreview(true);

    showSuccess(
      'Parsing Complete',
      `Successfully parsed ${result.total_transactions} transactions using ${result.parsing_method}`
    );
  };

  const handleMultiLevelParsingCancel = () => {
    setShowMultiLevelParser(false);
    setParsingSessionId(null);
  };

  const handleSaveTransactions = async (transactions: any[], selectedAccount: Account) => {
    try {
      if (!previewData) return;

      const csrfToken = getCSRFToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (csrfToken) headers['X-CSRFToken'] = csrfToken;

      const response = await fetch(`/api/upload-sessions/${previewData.sessionId}/import/`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          transactions,
          account_id: selectedAccount.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save transactions');
      }

      const result = await response.json();

      // Update file status
      setFiles((prev) =>
        prev.map((f) =>
          f.data?.sessionId === previewData.sessionId ? { ...f, status: 'completed' } : f
        )
      );

      setShowPreview(false);
      setPreviewData(null);
      onUploadSuccess?.();

      showSuccess(
        'Import completed',
        `Successfully imported ${result.imported_count} transactions`
      );
    } catch (error: any) {
      showError('Import failed', error.message);
    }
  };

  // Moved to FileProcessingCard component

  const removeFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const retryFile = async (fileId: string) => {
    const file = files.find((f) => f.id === fileId);
    if (!file || !file.data?.sessionId) {
      showError('Retry not available', 'No session data found for this file.');
      return;
    }

    // Update file status to uploading
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId ? { ...f, status: 'uploading', progress: 0, error: undefined } : f
      )
    );

    try {
      const csrfToken = getCSRFToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (csrfToken) headers['X-CSRFToken'] = csrfToken;

      const response = await fetch(
        `/api/upload-sessions/${file.data.sessionId}/retry-processing/`,
        {
          method: 'POST',
          headers,
          credentials: 'include',
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Retry failed');
      }

      const retryData = await response.json();

      // Update the file with new data
      const updatedParsedData: ParsedFileData = {
        sessionId: retryData.session_id,
        fileName: retryData.original_filename,
        fileType: retryData.file_type,
        transactions: retryData.transactions.map((tx: any, index: number) => ({
          id: `${retryData.session_id}-${index}`,
          date: tx.date,
          amount: parseFloat(tx.amount),
          description: tx.description,
          category: tx.suggested_category,
          type: tx.amount > 0 ? 'income' : 'expense',
          merchant: tx.merchant_name,
          confidence: tx.confidence || 0.8,
          status: tx.confidence > 0.9 ? 'verified' : 'pending',
          originalData: tx,
        })),
        warnings: retryData.warnings || [],
        errors: retryData.errors || [],
        stats: retryData.stats || {
          total: retryData.transactions.length,
          duplicates: retryData.duplicate_count || 0,
          errors: retryData.errors?.length || 0,
          confidence: retryData.confidence || 0.8,
        },
      };

      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? {
                ...f,
                status: 'ready',
                progress: 100,
                data: updatedParsedData,
                error: undefined,
              }
            : f
        )
      );

      showSuccess(
        'Retry successful',
        `Found ${updatedParsedData.transactions.length} transactions. Click preview to review.`
      );
    } catch (error: any) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? {
                ...f,
                status: 'error',
                error: error.message || 'Retry failed',
              }
            : f
        )
      );

      showError('Retry failed', error.message || 'Unknown error occurred');
    }
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Upload Area */}
      <FileUploadZone
        isDragging={isDragging}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onBrowseClick={() => fileInputRef.current?.click()}
        acceptedTypes="PDF, CSV, JSON, XLS, XLSX"
        maxSize="50MB"
        features={[
          'Password PDFs',
          'Auto-categorization',
          'Duplicate detection',
          useMultiLevelParsing && 'Multi-level parsing',
          useMultiLevelParsing && 'Manual column mapping',
          useMultiLevelParsing && 'Regex patterns',
          useMultiLevelParsing && 'AI fallback',
        ].filter(Boolean)}
      />

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.json,.csv,.xls,.xlsx"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Multi-Level Parsing Settings */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <FlexBetween>
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Advanced Parsing Mode
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Use progressive parsing with UI column mapping, regex patterns, and AI fallback
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={useMultiLevelParsing}
              onChange={(e) => setUseMultiLevelParsing(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </FlexBetween>
      </div>

      {/* Multi-Level Parser Interface */}
      {showMultiLevelParser && parsingSessionId && (
        <MultiLevelParser
          sessionId={parsingSessionId}
          fileType="unknown"
          fileName="Uploaded File"
          onParsingComplete={handleMultiLevelParsingComplete}
          onCancel={handleMultiLevelParsingCancel}
        />
      )}

      {/* File Processing List */}
      {files.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Processing Files</h3>

          {files.map((file) => (
            <FileProcessingCard
              key={file.id}
              file={file}
              onPreview={(file) => handlePreview(file.data!)}
              onRetry={retryFile}
              onRemove={removeFile}
            />
          ))}
        </div>
      )}

      {/* Transaction Preview Modal */}
      {showPreview && previewData && (
        <TransactionPreview
          isOpen={showPreview}
          onClose={() => {
            setShowPreview(false);
            setPreviewData(null);
          }}
          transactions={previewData.transactions}
          accounts={accounts}
          categories={categories}
          detectedAccount={previewData.detectedAccount}
          onSave={handleSaveTransactions}
          fileName={previewData.fileName}
          fileType={previewData.fileType}
        />
      )}

      {/* Password Prompt */}
      {showPasswordPrompt && (
        <PasswordDialog
          isOpen={true}
          title="Password Protected File"
          message={`The file "${showPasswordPrompt.filename}" is password protected. Please enter the password to continue.`}
          placeholder="Enter file password"
          onSubmit={handlePasswordSubmit}
          onClose={() => {
            if (showPasswordPrompt) {
              // Remove the file from the list when password prompt is closed
              setFiles((prev) => prev.filter((f) => f.id !== showPasswordPrompt.fileId));
            }
            setShowPasswordPrompt(null);
          }}
        />
      )}
    </div>
  );
};

export default EnhancedUpload;

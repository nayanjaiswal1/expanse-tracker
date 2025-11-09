import { Button } from '../../../../components/ui/Button';
import { FlexBetween, HStack } from '../../../../components/ui/Layout';
/**
 * Main statement upload flow component with split-view interface.
 * Left: PDF viewer with region selection
 * Right: Parsed data viewer with format toggle
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  uploadStatement,
  parseStatement,
  extractTableFromRegion,
  checkDuplicates,
  saveTransactions,
  getPDFPage,
  type BoundingBox,
  type ParsedTransaction,
  type ExtractedTable,
} from '../../../../api/statementApi';
import { PDFViewer } from './PDFViewer';
import { DataViewer } from './DataViewer';

interface StatementUploadFlowProps {
  accountId?: number;
  onComplete?: (sessionId: number) => void;
}

type FlowStep = 'upload' | 'parsing' | 'review' | 'duplicate-check' | 'saving';

export const StatementUploadFlow: React.FC<StatementUploadFlowProps> = ({
  accountId,
  onComplete,
}) => {
  const navigate = useNavigate();

  // State
  const [step, setStep] = useState<FlowStep>('upload');
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [pageCount, setPageCount] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pdfImageUrl, setPdfImageUrl] = useState<string>('');
  const [processingMethod, setProcessingMethod] = useState<
    'auto' | 'ocr_only' | 'ai_only' | 'both'
  >('auto');

  const [tables, setTables] = useState<ExtractedTable[]>([]);
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
  const [metadata, setMetadata] = useState<Record<string, any>>({});

  const [isDrawingEnabled, setIsDrawingEnabled] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const [duplicates, setDuplicates] = useState<ParsedTransaction[]>([]);
  const [uniqueTransactions, setUniqueTransactions] = useState<ParsedTransaction[]>([]);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<number>>(new Set());

  // Load PDF page image when session/page changes
  useEffect(() => {
    if (sessionId && step !== 'upload' && step !== 'parsing') {
      loadPDFPage(sessionId, currentPage);
    }
  }, [sessionId, currentPage, step]);

  const loadPDFPage = async (sid: number, page: number) => {
    try {
      const response = await getPDFPage(sid, page, 2.0);
      setPdfImageUrl(response.image);
    } catch (error: any) {
      console.error('Failed to load PDF page:', error);
      toast.error('Failed to load PDF page');
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    setIsProcessing(true);
    try {
      const response = await uploadStatement(file, accountId);
      setSessionId(response.session_id);
      setFileName(response.file_name);
      setPageCount(response.page_count);

      toast.success('File uploaded successfully');

      // Auto-parse
      setStep('parsing');
      await handleParse(response.session_id);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Upload failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleParse = async (sid: number) => {
    setIsProcessing(true);
    try {
      const response = await parseStatement(sid, processingMethod, 'anthropic_claude_sonnet');

      setTables(response.tables);
      setTransactions(response.transactions);
      setMetadata(response.metadata);

      toast.success(`Parsed ${response.total_transactions} transactions`);
      setStep('review');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Parsing failed');
      setStep('review'); // Allow manual table extraction
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRegionSelected = async (box: BoundingBox) => {
    if (!sessionId) return;

    setIsProcessing(true);
    setIsDrawingEnabled(false);

    try {
      const response = await extractTableFromRegion(sessionId, {
        page_number: currentPage,
        bounding_box: box,
        table_type: 'transactions',
      });

      // Add new table and transactions
      setTables((prev) => [...prev, response.table]);
      setTransactions((prev) => [...prev, ...response.transactions]);

      toast.success(`Extracted ${response.total_transactions_extracted} transactions`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Table extraction failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCheckDuplicates = async () => {
    if (!sessionId) return;

    setIsProcessing(true);
    try {
      const response = await checkDuplicates(sessionId);

      setDuplicates(response.duplicates);
      setUniqueTransactions(response.unique);

      // Pre-select all unique transactions
      const uniqueIndices = new Set(response.unique.map((_, idx) => idx));
      setSelectedTransactions(uniqueIndices);

      toast.success(
        `Found ${response.duplicate_count} duplicates, ${response.unique_count} unique`
      );
      setStep('duplicate-check');
    } catch (error: any) {
      toast.error('Duplicate check failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveTransactions = async () => {
    if (!sessionId) return;

    // Get selected transactions
    const txsToSave = Array.from(selectedTransactions).map((idx) => uniqueTransactions[idx]);

    if (txsToSave.length === 0) {
      toast.error('Please select at least one transaction');
      return;
    }

    setIsProcessing(true);
    setStep('saving');

    try {
      const response = await saveTransactions(sessionId, {
        transactions: txsToSave,
        skip_duplicates: true,
        add_tag: 'statement-import',
      });

      toast.success(
        `Saved ${response.created} transactions (${response.skipped_duplicates} duplicates skipped)`
      );

      onComplete?.(sessionId);

      // Navigate to transactions page
      setTimeout(() => {
        navigate('/finance/transactions');
      }, 1500);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save transactions');
      setStep('duplicate-check');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTransactionToggle = (tx: ParsedTransaction) => {
    const idx = uniqueTransactions.indexOf(tx);
    if (idx === -1) return;

    setSelectedTransactions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(idx)) {
        newSet.delete(idx);
      } else {
        newSet.add(idx);
      }
      return newSet;
    });
  };

  // Render upload step
  if (step === 'upload') {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-lg max-w-md w-full">
          <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">
            Upload Bank Statement
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Upload a PDF bank statement to extract and import transactions
          </p>

          {/* Processing Method Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Parsing Method
            </label>
            <div className="space-y-2">
              <label className="flex items-start p-3 border-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-slate-700 dark:border-slate-600">
                <input
                  type="radio"
                  name="processing-method"
                  value="auto"
                  checked={processingMethod === 'auto'}
                  onChange={(e) => setProcessingMethod(e.target.value as typeof processingMethod)}
                  className="mt-1 mr-3"
                />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    Auto-detect (Recommended)
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Automatically chooses the best method
                  </div>
                </div>
              </label>

              <label className="flex items-start p-3 border-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-slate-700 dark:border-slate-600">
                <input
                  type="radio"
                  name="processing-method"
                  value="ai_only"
                  checked={processingMethod === 'ai_only'}
                  onChange={(e) => setProcessingMethod(e.target.value as typeof processingMethod)}
                  className="mt-1 mr-3"
                />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">AI-powered</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Most accurate, uses AI credits
                  </div>
                </div>
              </label>

              <label className="flex items-start p-3 border-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-slate-700 dark:border-slate-600">
                <input
                  type="radio"
                  name="processing-method"
                  value="ocr_only"
                  checked={processingMethod === 'ocr_only'}
                  onChange={(e) => setProcessingMethod(e.target.value as typeof processingMethod)}
                  className="mt-1 mr-3"
                />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">OCR only</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Fast and free, basic extraction
                  </div>
                </div>
              </label>

              <label className="flex items-start p-3 border-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-slate-700 dark:border-slate-600">
                <input
                  type="radio"
                  name="processing-method"
                  value="both"
                  checked={processingMethod === 'both'}
                  onChange={(e) => setProcessingMethod(e.target.value as typeof processingMethod)}
                  className="mt-1 mr-3"
                />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Both (AI + OCR)</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Most comprehensive, uses AI credits
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
              className="hidden"
              id="file-upload"
              disabled={isProcessing}
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              {isProcessing ? (
                <FlexBetween>
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2">Uploading...</span>
                </FlexBetween>
              ) : (
                <div>
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <p className="mt-2 text-sm">Click to upload or drag and drop</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">PDF files only</p>
                </div>
              )}
            </label>
          </div>
        </div>
      </div>
    );
  }

  // Render parsing step
  if (step === 'parsing') {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <h2 className="text-2xl font-bold mt-4">Parsing Statement</h2>
          <p className="text-gray-600 mt-2">Extracting tables and transactions using AI...</p>
        </div>
      </div>
    );
  }

  // Render main split-view (review or duplicate-check)
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <FlexBetween>
          <div>
            <h1 className="text-xl font-bold">{fileName}</h1>
            <p className="text-sm text-gray-600">
              {step === 'duplicate-check'
                ? 'Review and select transactions'
                : 'Review extracted data'}
            </p>
          </div>

          <HStack className="gap-2">
            {step === 'review' && (
              <>
                <Button
                  onClick={() => setIsDrawingEnabled(!isDrawingEnabled)}
                  variant={isDrawingEnabled ? 'success' : 'secondary'}
                  disabled={isProcessing}
                >
                  {isDrawingEnabled ? 'Drawing Mode ON' : 'Draw Table Region'}
                </Button>
                <Button
                  onClick={handleCheckDuplicates}
                  variant="primary-card"
                  disabled={isProcessing || transactions.length === 0}
                >
                  Continue →
                </Button>
              </>
            )}

            {step === 'duplicate-check' && (
              <Button
                onClick={handleSaveTransactions}
                variant="success"
                disabled={isProcessing || selectedTransactions.size === 0}
              >
                {isProcessing ? 'Saving...' : `Save ${selectedTransactions.size} Transactions`}
              </Button>
            )}
          </HStack>
        </FlexBetween>

        {/* Page navigation */}
        {pageCount > 1 && (
          <HStack className="gap-4 mt-3">
            <Button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              variant="link"
            >
              ← Previous
            </Button>
            <span className="text-sm text-gray-600">
              Page {currentPage} of {pageCount}
            </span>
            <Button
              onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
              disabled={currentPage === pageCount}
              variant="link"
            >
              Next →
            </Button>
          </HStack>
        )}
      </div>

      {/* Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: PDF Viewer */}
        <div className="w-1/2 p-4">
          {pdfImageUrl && (
            <PDFViewer
              imageUrl={pdfImageUrl}
              onRegionSelected={handleRegionSelected}
              existingRegions={tables
                .filter((t) => t.page_number === currentPage)
                .map((t, idx) => ({
                  ...t.bounding_box!,
                  id: `table-${idx}`,
                  label: `Table ${idx + 1}`,
                }))}
              isDrawingEnabled={isDrawingEnabled}
            />
          )}
        </div>

        {/* Right: Data Viewer */}
        <div className="w-1/2 p-4 border-l">
          {step === 'duplicate-check' ? (
            <div className="h-full flex flex-col">
              <h2 className="text-lg font-bold mb-4">Select Transactions to Import</h2>

              {duplicates.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-yellow-800">
                    <strong>{duplicates.length}</strong> duplicate transactions found and will be
                    skipped
                  </p>
                </div>
              )}

              <div className="flex-1 overflow-auto">
                <DataViewer
                  tables={[]}
                  transactions={uniqueTransactions}
                  metadata={metadata}
                  onTransactionSelect={handleTransactionToggle}
                  selectedTransactions={selectedTransactions}
                />
              </div>
            </div>
          ) : (
            <DataViewer tables={tables} transactions={transactions} metadata={metadata} />
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Lock,
  Unlock,
  Eye,
  Upload,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Key,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import { FlexBetween, HStack } from '../../components/ui/Layout';

import {
  usePdfCapabilities,
  useUnprocessedPdfs,
  usePdfProcessingHistory,
  useProcessPdfMutation,
  useUnlockPdfMutation,
  usePdfBatchProcessMutation,
  useExtractionResult,
  type ProcessingCapabilities,
  type PDFDocument,
  type ProcessedPDF,
  type ExtractionResult,
} from './hooks/queries';

// Types moved to api layer

const PDFProcessor: React.FC = () => {
  const [unprocessedPDFs, setUnprocessedPDFs] = useState<PDFDocument[]>([]);
  const [processingHistory, setProcessingHistory] = useState<ProcessedPDF[]>([]);
  const [capabilities, setCapabilities] = useState<ProcessingCapabilities | null>(null);

  const [password, setPassword] = useState<string>('');
  const [processing, setProcessing] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('unprocessed');
  const [batchPasswords, setBatchPasswords] = useState<Record<string, string>>({});
  const [showPasswordModal, setShowPasswordModal] = useState<string | null>(null);
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);
  const [extractionId, setExtractionId] = useState<string | null>(null);

  const { showSuccess, showError } = useToast();

  // React Query hooks
  const { data: capData, isLoading: capLoading } = usePdfCapabilities();
  const { data: unprocessedData, isLoading: unprocessedLoading } = useUnprocessedPdfs();
  const {
    data: historyData,
    isLoading: historyLoading,
    refetch: refetchHistory,
  } = usePdfProcessingHistory();
  const processMutation = useProcessPdfMutation();
  const unlockMutation = useUnlockPdfMutation();
  const batchMutation = usePdfBatchProcessMutation();
  const { data: extractedData } = useExtractionResult(extractionId);

  useEffect(() => {
    if (capData?.capabilities) setCapabilities(capData.capabilities);
  }, [capData]);

  useEffect(() => {
    if (unprocessedData?.unprocessed_pdfs) setUnprocessedPDFs(unprocessedData.unprocessed_pdfs);
  }, [unprocessedData]);

  useEffect(() => {
    if (historyData?.processing_history) setProcessingHistory(historyData.processing_history);
  }, [historyData]);

  useEffect(() => {
    setLoading(capLoading || unprocessedLoading || historyLoading);
  }, [capLoading, unprocessedLoading, historyLoading]);

  useEffect(() => {
    if (extractedData) setExtractionResult(extractedData);
  }, [extractedData]);

  const processPDF = async (pdfId: string, pdfPassword: string = '') => {
    setProcessing(pdfId);
    try {
      const data = await processMutation.mutateAsync({ id: pdfId, password: pdfPassword });
      if (data.success) {
        showSuccess('PDF processed successfully', `Document type: ${data.document_type}`);

        // Lists are invalidated by mutation onSuccess

        // Clear password
        setPassword('');
        setBatchPasswords((prev) => {
          const updated = { ...prev };
          delete updated[pdfId];
          return updated;
        });
      } else {
        if ((data as any).error && (data as any).error.includes('password')) {
          showError('PDF is password protected. Please enter the password.');
          setShowPasswordModal(pdfId);
        } else {
          showError('Failed to process PDF', (data as any).error);
        }
      }
    } catch (_error) {
      showError('Error processing PDF');
    } finally {
      setProcessing(null);
    }
  };

  const unlockPDF = async (pdfId: string, pdfPassword: string) => {
    setUnlocking(pdfId);
    try {
      const data = await unlockMutation.mutateAsync({ id: pdfId, password: pdfPassword });
      if (data.success) {
        showSuccess('PDF unlocked and processed successfully!');

        // Lists are invalidated by mutation onSuccess

        // Clear password and close modal
        setPassword('');
        setShowPasswordModal('');
      } else {
        showError('Failed to unlock PDF', (data as any).error);
      }
    } catch (_error) {
      showError('Error unlocking PDF');
    } finally {
      setUnlocking(null);
    }
  };

  const batchProcess = async () => {
    setProcessing('batch');
    try {
      const data = await batchMutation.mutateAsync({ password_attempts: batchPasswords });
      if (data.success) {
        showSuccess(
          'Batch processing completed',
          `${data.success_count ?? 0} PDFs processed successfully.`
        );

        // Lists are invalidated by mutation onSuccess

        // Clear passwords
        setBatchPasswords({});
      } else {
        showError('Batch processing failed', (data as any).error);
      }
    } catch (_error) {
      showError('Error in batch processing');
    } finally {
      setProcessing(null);
    }
  };

  const viewExtractionResult = async (pdfId: string) => {
    setExtractionId(pdfId);
    // useExtractionResult hook will populate extractionResult via effect
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (success: boolean) => {
    if (success) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else {
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const tabs = [
    { id: 'unprocessed', label: 'Unprocessed PDFs', icon: FileText },
    { id: 'history', label: 'Processing History', icon: CheckCircle },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!capabilities?.pdf_processing_enabled) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <div className="p-8 text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-secondary-900 dark:text-secondary-100 mb-2">
              PDF Processing Not Available
            </h2>
            <p className="text-secondary-600 dark:text-secondary-400 mb-4">
              PDF processing libraries are not installed on this system.
            </p>
            <div className="text-left bg-secondary-50 dark:bg-secondary-800 p-4 rounded-lg">
              <h3 className="font-medium text-secondary-900 dark:text-secondary-100 mb-2">
                Required Libraries:
              </h3>
              <ul className="text-sm text-secondary-600 dark:text-secondary-400 space-y-1">
                <li>• PyPDF2 or PyMuPDF for text extraction</li>
                <li>• pdf2image and pytesseract for OCR (optional)</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-secondary-900 dark:text-secondary-100 mb-2">
          PDF Document Processor
        </h1>
        <p className="text-secondary-600 dark:text-secondary-400">
          Process PDF documents including password-protected files and extract financial data
        </p>
      </div>

      {/* Capabilities Info */}
      <Card className="mb-6">
        <div className="p-4">
          <HStack gap={4} className="text-sm">
            <HStack gap={1} className={capabilities.pypdf2 ? 'text-green-600' : 'text-red-600'}>
              {capabilities.pypdf2 ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <span>PyPDF2</span>
            </HStack>
            <HStack gap={1} className={capabilities.pymupdf ? 'text-green-600' : 'text-red-600'}>
              {capabilities.pymupdf ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <span>PyMuPDF</span>
            </HStack>
            <HStack gap={1} className={capabilities.ocr ? 'text-green-600' : 'text-yellow-600'}>
              {capabilities.ocr ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <span>OCR</span>
            </HStack>
          </HStack>
        </div>
      </Card>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-8 bg-secondary-100 dark:bg-secondary-800 rounded-lg p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const count =
            tab.id === 'unprocessed' ? unprocessedPDFs.length : processingHistory.length;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-secondary-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-secondary-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {count > 0 && (
                <span className="bg-secondary-200 dark:bg-secondary-600 text-secondary-700 dark:text-secondary-300 text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Unprocessed PDFs Tab */}
      {activeTab === 'unprocessed' && (
        <div className="space-y-6">
          {unprocessedPDFs.length > 0 && (
            <div className="flex justify-end">
              <Button
                onClick={batchProcess}
                disabled={processing === 'batch' || Object.keys(batchPasswords).length === 0}
              >
                {processing === 'batch' ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Batch Process
              </Button>
            </div>
          )}

          <Card>
            <div className="p-6">
              <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100 mb-4">
                Unprocessed PDF Documents
              </h3>

              {unprocessedPDFs.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100 mb-2">
                    No Unprocessed PDFs
                  </h3>
                  <p className="text-secondary-600 dark:text-secondary-400">
                    All PDF documents have been processed.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {unprocessedPDFs.map((pdf) => (
                    <div
                      key={pdf.id}
                      className="border border-secondary-200 dark:border-secondary-700 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <HStack gap={2} className="mb-2">
                            <FileText className="h-5 w-5 text-blue-500" />
                            <h4 className="font-medium text-secondary-900 dark:text-secondary-100">
                              {pdf.title}
                            </h4>
                            {pdf.is_password_protected && (
                              <Lock
                                className="h-4 w-4 text-red-500"
                                aria-label="Password Protected"
                              />
                            )}
                          </HStack>

                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-4">
                            <div>
                              <span className="text-secondary-600 dark:text-secondary-400">
                                Size:
                              </span>
                              <span className="ml-2 font-medium">
                                {formatFileSize(pdf.file_size)}
                              </span>
                            </div>
                            <div>
                              <span className="text-secondary-600 dark:text-secondary-400">
                                Uploaded:
                              </span>
                              <span className="ml-2 font-medium">
                                {new Date(pdf.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <div>
                              <span className="text-secondary-600 dark:text-secondary-400">
                                Status:
                              </span>
                              <span className="ml-2 font-medium">
                                {pdf.is_password_protected ? 'Password Protected' : 'Ready'}
                              </span>
                            </div>
                          </div>

                          {pdf.is_password_protected && (
                            <div className="mb-4">
                              <Input
                                type="password"
                                placeholder="Enter PDF password"
                                value={batchPasswords[pdf.id] || ''}
                                onChange={(e) =>
                                  setBatchPasswords((prev) => ({
                                    ...prev,
                                    [pdf.id]: e.target.value,
                                  }))
                                }
                                className="max-w-xs"
                              />
                            </div>
                          )}
                        </div>

                        <div className="flex space-x-2 ml-4">
                          <Button
                            onClick={() => processPDF(pdf.id, batchPasswords[pdf.id] || '')}
                            disabled={processing === pdf.id}
                            size="sm"
                          >
                            {processing === pdf.id ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Upload className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Processing History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <Card>
            <div className="p-6">
              <FlexBetween className="mb-4">
                <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100">
                  Processing History
                </h3>
                <Button variant="ghost" size="sm" onClick={() => refetchHistory()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </FlexBetween>

              {processingHistory.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100 mb-2">
                    No Processed Documents
                  </h3>
                  <p className="text-secondary-600 dark:text-secondary-400">
                    Process some PDF documents to see history here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {processingHistory.map((pdf) => (
                    <div
                      key={pdf.id}
                      className="border border-secondary-200 dark:border-secondary-700 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <HStack gap={2} className="mb-2">
                            {getStatusIcon(true)}
                            <h4 className="font-medium text-secondary-900 dark:text-secondary-100">
                              {pdf.title}
                            </h4>
                            <span className="px-2 py-1 text-xs bg-secondary-100 dark:bg-secondary-800 text-secondary-600 dark:text-secondary-400 rounded">
                              {pdf.document_type}
                            </span>
                            {pdf.password_protected && (
                              <Lock
                                className="h-4 w-4 text-orange-500"
                                aria-label="Was Password Protected"
                              />
                            )}
                          </HStack>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-secondary-600 dark:text-secondary-400">
                                Pages:
                              </span>
                              <span className="ml-2 font-medium">{pdf.page_count}</span>
                            </div>
                            <div>
                              <span className="text-secondary-600 dark:text-secondary-400">
                                Method:
                              </span>
                              <span className="ml-2 font-medium">{pdf.extraction_method}</span>
                            </div>
                            <div>
                              <span className="text-secondary-600 dark:text-secondary-400">
                                Confidence:
                              </span>
                              <span className="ml-2 font-medium">{pdf.confidence}%</span>
                            </div>
                            <div>
                              <span className="text-secondary-600 dark:text-secondary-400">
                                Processed:
                              </span>
                              <span className="ml-2 font-medium">
                                {new Date(pdf.processed_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex space-x-2 ml-4">
                          <Button
                            onClick={() => viewExtractionResult(pdf.id)}
                            variant="ghost"
                            size="sm"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-secondary-800 rounded-lg p-6 w-full max-w-md">
            <HStack gap={2} className="mb-4">
              <Key className="h-5 w-5 text-yellow-500" />
              <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100">
                Enter PDF Password
              </h3>
            </HStack>

            <p className="text-secondary-600 dark:text-secondary-400 mb-4">
              This PDF is password protected. Please enter the password to unlock and process it.
            </p>

            <Input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && showPasswordModal) {
                  unlockPDF(showPasswordModal, password);
                }
              }}
              className="mb-4"
              autoFocus
            />

            <div className="flex justify-end space-x-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowPasswordModal(null);
                  setPassword('');
                }}
                disabled={Boolean(unlocking)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => showPasswordModal && unlockPDF(showPasswordModal, password)}
                disabled={Boolean(unlocking) || !password.trim()}
              >
                {unlocking === showPasswordModal ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Unlock className="h-4 w-4 mr-2" />
                )}
                Unlock PDF
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Extraction Result Modal */}
      {extractionResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-secondary-800 rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <FlexBetween className="mb-4">
              <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100">
                Extraction Results: {extractionResult.title}
              </h3>
              <Button variant="ghost" onClick={() => setExtractionResult(null)}>
                ×
              </Button>
            </FlexBetween>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <span className="text-secondary-600 dark:text-secondary-400">Type:</span>
                <span className="ml-2 font-medium">{extractionResult.document_type}</span>
              </div>
              <div>
                <span className="text-secondary-600 dark:text-secondary-400">Pages:</span>
                <span className="ml-2 font-medium">{extractionResult.page_count}</span>
              </div>
              <div>
                <span className="text-secondary-600 dark:text-secondary-400">Method:</span>
                <span className="ml-2 font-medium">{extractionResult.extraction_method}</span>
              </div>
              <div>
                <span className="text-secondary-600 dark:text-secondary-400">Confidence:</span>
                <span className="ml-2 font-medium">{extractionResult.confidence}%</span>
              </div>
            </div>

            {extractionResult.financial_data &&
              Object.keys(extractionResult.financial_data).length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-secondary-900 dark:text-secondary-100 mb-2">
                    Financial Data Extracted
                  </h4>
                  <pre className="bg-secondary-100 dark:bg-secondary-700 p-3 rounded text-sm overflow-x-auto">
                    {JSON.stringify(extractionResult.financial_data, null, 2)}
                  </pre>
                </div>
              )}

            {extractionResult.text_preview && (
              <div>
                <h4 className="font-medium text-secondary-900 dark:text-secondary-100 mb-2">
                  Text Preview
                </h4>
                <div className="bg-secondary-100 dark:bg-secondary-700 p-3 rounded text-sm max-h-48 overflow-y-auto">
                  {extractionResult.text_preview}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PDFProcessor;

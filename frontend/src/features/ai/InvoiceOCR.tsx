import React, { useState, useEffect } from 'react';
import {
  FileImage,
  FileText,
  Scan,
  Eye,
  Plus,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Receipt,
  Zap,
  TrendingUp,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useToast } from '../../components/ui/Toast';
import { FlexBetween, HStack } from '../../components/ui/Layout';
import {
  useInvoiceCapabilities,
  useUnprocessedInvoices,
  useInvoiceProcessingHistory as useInvoiceHistory,
  useStatistics as useInvoiceStatistics,
  useProcessInvoiceMutation,
  useCreateTransactionMutation,
  useInvoiceBatchProcessMutation as useInvoiceBatchMutation,
  useInvoiceDetails,
  type OCRCapabilities,
  type InvoiceDocument,
  type ProcessedInvoice,
  type Statistics,
  type InvoiceDetails,
} from './hooks/queries';

// Types moved to api layer

const InvoiceOCR: React.FC = () => {
  const [unprocessedInvoices, setUnprocessedInvoices] = useState<InvoiceDocument[]>([]);
  const [processingHistory, setProcessingHistory] = useState<ProcessedInvoice[]>([]);
  const [capabilities, setCapabilities] = useState<OCRCapabilities | null>(null);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [processing, setProcessing] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('unprocessed');
  const [selectedInvoice, setSelectedInvoice] = useState<string>('');
  const [invoiceDetails, setInvoiceDetails] = useState<InvoiceDetails | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const { showSuccess, showError } = useToast();

  // React Query hooks
  const { data: capData, isLoading: capLoading } = useInvoiceCapabilities();
  const { data: unprocessedData, isLoading: unprocessedLoading } = useUnprocessedInvoices();
  const {
    data: historyData,
    isLoading: historyLoading,
    refetch: refetchHistory,
  } = useInvoiceHistory();
  const { data: statsData, isLoading: statsLoading } = useInvoiceStatistics();
  const processMutation = useProcessInvoiceMutation();
  const createTxnMutation = useCreateTransactionMutation();
  const batchMutation = useInvoiceBatchMutation();
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const { data: detailsData } = useInvoiceDetails(detailsId);

  useEffect(() => {
    if (capData?.capabilities) setCapabilities(capData.capabilities);
  }, [capData]);

  useEffect(() => {
    if (unprocessedData?.unprocessed_invoices)
      setUnprocessedInvoices(unprocessedData.unprocessed_invoices);
  }, [unprocessedData]);

  useEffect(() => {
    if (historyData?.processing_history) setProcessingHistory(historyData.processing_history);
  }, [historyData]);

  useEffect(() => {
    if (statsData?.statistics) setStatistics(statsData.statistics);
  }, [statsData]);

  useEffect(() => {
    setLoading(capLoading || unprocessedLoading || historyLoading || statsLoading);
  }, [capLoading, unprocessedLoading, historyLoading, statsLoading]);

  const processInvoice = async (invoiceId: string) => {
    setProcessing(invoiceId);
    try {
      const data = await processMutation.mutateAsync({ id: invoiceId });
      if (data.success) {
        showSuccess(
          'Invoice processed successfully',
          `Confidence: ${Math.round((data.confidence || 0) * 100)}%`
        );
      } else {
        showError('Failed to process invoice', (data as any).error);
      }
    } catch (_error) {
    } finally {
      setProcessing('');
    }
  };

  const createTransaction = async (invoiceId: string) => {
    setProcessing(invoiceId + '_transaction');
    try {
      const data = await createTxnMutation.mutateAsync({ id: invoiceId });
      if (data.success) {
        showSuccess('Transaction created', `$${data.amount} expense for ${data.vendor}`);
      } else {
        showError('Failed to create transaction', (data as any).error);
      }
    } catch (_error) {
      showError('Error creating transaction');
    } finally {
      setProcessing('');
    }
  };

  const batchProcess = async () => {
    setProcessing('batch');
    try {
      const data = await batchMutation.mutateAsync({ create_transactions: true });
      if (data.success) {
        showSuccess(
          'Batch processing completed',
          `${data.successful_count} invoices processed, ${data.transactions_created} transactions created.`
        );
      } else {
        showError('Batch processing failed', (data as any).error);
      }
    } catch (_error) {
      showError('Error in batch processing');
    } finally {
      setProcessing('');
    }
  };

  const viewInvoiceDetails = async (invoiceId: string) => {
    setSelectedInvoice(invoiceId);
    setShowDetailsModal(true);
    setDetailsId(invoiceId);
  };

  useEffect(() => {
    // Fetch details when selectedInvoice changes
    // useInvoiceDetails handles networking
  }, [selectedInvoice]);

  useEffect(() => {
    if (selectedInvoice) {
      const { data } = { data: detailsData };
      if (data) setInvoiceDetails(data);
    }
  }, [detailsData, selectedInvoice]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType === '.pdf') {
      return <FileText className="h-5 w-5 text-red-500" />;
    } else if (['.jpg', '.jpeg', '.png', '.tiff'].includes(fileType)) {
      return <FileImage className="h-5 w-5 text-blue-500" />;
    }
    return <Receipt className="h-5 w-5 text-gray-500" />;
  };

  const getStatusIcon = (confidence: number) => {
    if (confidence >= 80) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else if (confidence >= 50) {
      return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    } else {
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const tabs = [
    { id: 'unprocessed', label: 'Unprocessed Invoices', icon: Receipt },
    { id: 'history', label: 'Processing History', icon: CheckCircle },
    { id: 'stats', label: 'Statistics', icon: TrendingUp },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!capabilities?.ocr_enabled) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <div className="p-8 text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-secondary-900 dark:text-secondary-100 mb-2">
              OCR Processing Not Available
            </h2>
            <p className="text-secondary-600 dark:text-secondary-400 mb-4">
              OCR libraries are not installed on this system.
            </p>
            <div className="text-left bg-secondary-50 dark:bg-secondary-800 p-4 rounded-lg">
              <h3 className="font-medium text-secondary-900 dark:text-secondary-100 mb-2">
                Required Libraries:
              </h3>
              <ul className="text-sm text-secondary-600 dark:text-secondary-400 space-y-1">
                <li>• Tesseract OCR for text extraction</li>
                <li>• pdf2image for PDF to image conversion</li>
                <li>• OpenCV for image preprocessing</li>
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
          Invoice OCR & AI Processing
        </h1>
        <p className="text-secondary-600 dark:text-secondary-400">
          Automatically extract data from invoices and receipts using OCR and AI
        </p>
      </div>

      {/* OCR Capabilities */}
      <Card className="mb-6">
        <div className="p-4">
          <FlexBetween>
            <HStack gap={4} className="text-sm">
              <HStack
                gap={1}
                className={capabilities?.tesseract_working ? 'text-green-600' : 'text-red-600'}
              >
                {capabilities?.tesseract_working ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <span>Tesseract OCR</span>
              </HStack>
              <HStack
                gap={1}
                className={capabilities?.pdf2image ? 'text-green-600' : 'text-red-600'}
              >
                {capabilities?.pdf2image ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <span>PDF Processing</span>
              </HStack>
              <HStack gap={1} className="text-blue-600">
                <Zap className="h-4 w-4" />
                <span>AI Parsing</span>
              </HStack>
            </HStack>
            {statistics && (
              <div className="text-sm text-secondary-600 dark:text-secondary-400">
                {statistics.success_rate.toFixed(0)}% success rate
              </div>
            )}
          </FlexBetween>
        </div>
      </Card>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-8 bg-secondary-100 dark:bg-secondary-800 rounded-lg p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const count =
            tab.id === 'unprocessed'
              ? unprocessedInvoices.length
              : tab.id === 'history'
                ? processingHistory.length
                : 0;
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
              {count > 0 && tab.id !== 'stats' && (
                <span className="bg-secondary-200 dark:bg-secondary-600 text-secondary-700 dark:text-secondary-300 text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Statistics Tab */}
      {activeTab === 'stats' && statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card>
            <div className="p-6">
              <div className="flex items-center">
                <Receipt className="h-8 w-8 text-blue-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-secondary-600 dark:text-secondary-400">
                    Processed (30d)
                  </p>
                  <p className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
                    {statistics.total_processed_30d}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-secondary-600 dark:text-secondary-400">
                    Success Rate
                  </p>
                  <p className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
                    {statistics.success_rate.toFixed(0)}%
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="flex items-center">
                <Plus className="h-8 w-8 text-purple-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-secondary-600 dark:text-secondary-400">
                    Transactions (30d)
                  </p>
                  <p className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
                    {statistics.transactions_created_30d}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="flex items-center">
                <RefreshCw className="h-8 w-8 text-orange-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-secondary-600 dark:text-secondary-400">
                    Pending
                  </p>
                  <p className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
                    {statistics.pending_documents}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Unprocessed Invoices Tab */}
      {activeTab === 'unprocessed' && (
        <div className="space-y-6">
          {unprocessedInvoices.length > 0 && (
            <div className="flex justify-end">
              <Button
                onClick={batchProcess}
                disabled={processing === 'batch'}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {processing === 'batch' ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Scan className="h-4 w-4 mr-2" />
                )}
                Batch Process All
              </Button>
            </div>
          )}

          <Card>
            <div className="p-6">
              <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100 mb-4">
                Unprocessed Invoices & Receipts
              </h3>

              {unprocessedInvoices.length === 0 ? (
                <div className="text-center py-8">
                  <Receipt className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100 mb-2">
                    No Unprocessed Documents
                  </h3>
                  <p className="text-secondary-600 dark:text-secondary-400">
                    All documents have been processed or no invoice documents found.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {unprocessedInvoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="border border-secondary-200 dark:border-secondary-700 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <HStack gap={2} className="mb-2">
                            {getFileIcon(invoice.file_type)}
                            <h4 className="font-medium text-secondary-900 dark:text-secondary-100">
                              {invoice.title}
                            </h4>
                            <span className="px-2 py-1 text-xs bg-secondary-100 dark:bg-secondary-800 text-secondary-600 dark:text-secondary-400 rounded">
                              {invoice.document_type}
                            </span>
                          </HStack>

                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-secondary-600 dark:text-secondary-400">
                                Size:
                              </span>
                              <span className="ml-2 font-medium">
                                {formatFileSize(invoice.file_size)}
                              </span>
                            </div>
                            <div>
                              <span className="text-secondary-600 dark:text-secondary-400">
                                Type:
                              </span>
                              <span className="ml-2 font-medium">{invoice.file_type}</span>
                            </div>
                            <div>
                              <span className="text-secondary-600 dark:text-secondary-400">
                                Uploaded:
                              </span>
                              <span className="ml-2 font-medium">
                                {new Date(invoice.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="ml-4">
                          <Button
                            onClick={() => processInvoice(invoice.id)}
                            disabled={processing === invoice.id}
                            size="sm"
                          >
                            {processing === invoice.id ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Scan className="h-4 w-4" />
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
                  Process some invoice documents to see history here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {processingHistory.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="border border-secondary-200 dark:border-secondary-700 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <HStack gap={2} className="mb-2">
                          {getStatusIcon(invoice.confidence)}
                          <h4 className="font-medium text-secondary-900 dark:text-secondary-100">
                            {invoice.title}
                          </h4>
                          <span className="px-2 py-1 text-xs bg-secondary-100 dark:bg-secondary-800 text-secondary-600 dark:text-secondary-400 rounded">
                            {invoice.invoice_type}
                          </span>
                          {invoice.has_transaction && (
                            <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-800 text-green-600 dark:text-green-400 rounded">
                              Transaction Created
                            </span>
                          )}
                        </HStack>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-secondary-600 dark:text-secondary-400">
                              Amount:
                            </span>
                            <span className="ml-2 font-medium">
                              {invoice.amount ? `$${invoice.amount.toFixed(2)}` : 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-secondary-600 dark:text-secondary-400">
                              Vendor:
                            </span>
                            <span className="ml-2 font-medium">{invoice.vendor || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-secondary-600 dark:text-secondary-400">
                              Confidence:
                            </span>
                            <span className="ml-2 font-medium">{invoice.confidence}%</span>
                          </div>
                          <div>
                            <span className="text-secondary-600 dark:text-secondary-400">
                              Processed:
                            </span>
                            <span className="ml-2 font-medium">
                              {new Date(invoice.processed_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex space-x-2 ml-4">
                        <Button
                          onClick={() => viewInvoiceDetails(invoice.id)}
                          variant="ghost"
                          size="sm"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {!invoice.has_transaction && (
                          <Button
                            onClick={() => createTransaction(invoice.id)}
                            disabled={processing === invoice.id + '_transaction'}
                            size="sm"
                            variant="ghost"
                            className="text-green-600 hover:text-green-700"
                          >
                            {processing === invoice.id + '_transaction' ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Plus className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Invoice Details Modal */}
      {showDetailsModal && invoiceDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-secondary-800 rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <FlexBetween className="mb-4">
              <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100">
                Invoice Details: {invoiceDetails.title}
              </h3>
              <Button variant="ghost" onClick={() => setShowDetailsModal(false)}>
                ×
              </Button>
            </FlexBetween>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div>
                <span className="text-secondary-600 dark:text-secondary-400">Confidence:</span>
                <span className="ml-2 font-medium">{invoiceDetails.confidence}%</span>
              </div>
              <div>
                <span className="text-secondary-600 dark:text-secondary-400">Processed:</span>
                <span className="ml-2 font-medium">
                  {invoiceDetails.processed_at
                    ? new Date(invoiceDetails.processed_at).toLocaleDateString()
                    : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-secondary-600 dark:text-secondary-400">Transaction:</span>
                <span className="ml-2 font-medium">
                  {invoiceDetails.has_transaction ? 'Created' : 'Not Created'}
                </span>
              </div>
            </div>

            {invoiceDetails.invoice_data && (
              <div className="mb-6">
                <h4 className="font-medium text-secondary-900 dark:text-secondary-100 mb-2">
                  Extracted Data
                </h4>
                <div className="bg-secondary-100 dark:bg-secondary-700 p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {invoiceDetails.invoice_data.amount && (
                      <div>
                        <span className="font-medium">Amount:</span>
                        <span className="ml-2">${invoiceDetails.invoice_data.amount}</span>
                      </div>
                    )}
                    {invoiceDetails.invoice_data.vendor && (
                      <div>
                        <span className="font-medium">Vendor:</span>
                        <span className="ml-2">{invoiceDetails.invoice_data.vendor}</span>
                      </div>
                    )}
                    {invoiceDetails.invoice_data.invoice_date && (
                      <div>
                        <span className="font-medium">Date:</span>
                        <span className="ml-2">{invoiceDetails.invoice_data.invoice_date}</span>
                      </div>
                    )}
                    {invoiceDetails.invoice_data.category && (
                      <div>
                        <span className="font-medium">Category:</span>
                        <span className="ml-2">{invoiceDetails.invoice_data.category}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {invoiceDetails.extracted_text && (
              <div>
                <h4 className="font-medium text-secondary-900 dark:text-secondary-100 mb-2">
                  Extracted Text
                </h4>
                <div className="bg-secondary-100 dark:bg-secondary-700 p-4 rounded-lg max-h-64 overflow-y-auto">
                  <pre className="text-sm whitespace-pre-wrap">{invoiceDetails.extracted_text}</pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceOCR;

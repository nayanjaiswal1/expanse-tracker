import React, { useState, useEffect } from 'react';
import { Eye, Trash2, FileText, Image, Calendar, Search, Filter, ChevronDown } from 'lucide-react';
import { apiClient } from '../../api';
import { useToast } from '../../components/ui/Toast';
import { Modal } from '../../components/ui/Modal';
import { formatCurrency } from '../../utils/preferences';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { DebouncedInput } from '../../components/ui/DebouncedInput';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { HStack, FlexBetween } from '../../components/ui/Layout';

interface UploadedFile {
  id: number;
  filename: string;
  file_type: 'pdf' | 'csv' | 'xlsx' | 'image' | 'json';
  file_size: number;
  account_id?: number;
  account_name?: string;
  upload_date: string;
  status: 'completed' | 'processing' | 'failed';
  total_transactions: number;
  preview_url?: string;
  thumbnail_url?: string;
}

interface ReceiptImage {
  id: number;
  filename: string;
  file_size: number;
  upload_date: string;
  merchant_name?: string;
  amount?: number;
  processed: boolean;
  thumbnail_url?: string;
  preview_url?: string;
}

export const UploadHistory: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [receiptImages, setReceiptImages] = useState<ReceiptImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'statements' | 'receipts'>('statements');
  const [selectedFile, setSelectedFile] = useState<UploadedFile | ReceiptImage | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [fileToDelete, setFileToDelete] = useState<{
    id: number;
    type: 'statement' | 'receipt';
  } | null>(null);

  const { showSuccess, showError } = useToast();
  const { state: authState } = useAuth();

  useEffect(() => {
    loadUploadHistory();
  }, []);

  const loadUploadHistory = async () => {
    try {
      setLoading(true);

      // Load uploaded statements
      const sessions = await apiClient.getUploadSessions();
      setUploadedFiles(sessions as UploadedFile[]);

      // Load receipt images (if endpoint exists)
      try {
        // This would be a hypothetical endpoint for receipt images
        // const receipts = await apiClient.getReceiptImages();
        // setReceiptImages(receipts);
        setReceiptImages([]); // Placeholder for now
      } catch (error) {
        // Receipt endpoint might not exist yet
        setReceiptImages([]);
      }
    } catch (error) {
      console.error('Failed to load upload history:', error);
      showError('Failed to load upload history');
    } finally {
      setLoading(false);
    }
  };

  const deleteFile = async () => {
    if (!fileToDelete) return;

    try {
      if (fileToDelete.type === 'statement') {
        await apiClient.deleteUploadSession(fileToDelete.id);
        setUploadedFiles((prev) => prev.filter((f) => f.id !== fileToDelete.id));
      } else {
        // Hypothetical delete receipt endpoint
        // await apiClient.deleteReceiptImage(fileToDelete.id);
        setReceiptImages((prev) => prev.filter((f) => f.id !== fileToDelete.id));
      }
      showSuccess('File deleted successfully');
      setFileToDelete(null);
    } catch (error) {
      console.error('Failed to delete file:', error);
      showError('Failed to delete file');
      setFileToDelete(null);
    }
  };

  const viewTransactions = (fileId: number) => {
    // Navigate to transactions filtered by upload session
    window.location.href = `/transactions?upload_session=${fileId}`;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'pdf':
      case 'csv':
      case 'xlsx':
      case 'json':
        return <FileText className="h-5 w-5" />;
      case 'image':
      case 'jpg':
      case 'jpeg':
      case 'png':
        return <Image className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredFiles = uploadedFiles.filter((file) => {
    const matchesSearch =
      file.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.account_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || file.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const filteredReceipts = receiptImages.filter((receipt) => {
    const matchesSearch =
      receipt.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      receipt.merchant_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-teal-600 rounded-2xl p-6 text-white shadow-lg">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold mb-2">📂 Upload History</h1>
          <p className="text-blue-100 text-lg">
            View and manage your uploaded statements and receipt images
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <Button
            onClick={() => setActiveTab('statements')}
            variant={activeTab === 'statements' ? 'primary' : 'ghost'}
            size="sm"
            className="py-4 px-1 border-b-2 rounded-none"
          >
            <FileText className="w-5 h-5 inline mr-2" />
            Bank Statements ({filteredFiles.length})
          </Button>
          <Button
            onClick={() => setActiveTab('receipts')}
            variant={activeTab === 'receipts' ? 'primary' : 'ghost'}
            size="sm"
            className="py-4 px-1 border-b-2 rounded-none"
          >
            <Image className="w-5 h-5 inline mr-2" />
            Receipt Images ({filteredReceipts.length})
          </Button>
        </nav>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 mb-6">
        <div className="relative flex-1">
          <DebouncedInput
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={setSearchQuery}
            icon={Search}
            debounceMs={300}
          />
        </div>

        {activeTab === 'statements' && (
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Button
              onClick={() => setFilterStatus('all')}
              variant={filterStatus === 'all' ? 'primary' : 'secondary'}
              size="sm"
            >
              All
            </Button>
            <Button
              onClick={() => setFilterStatus('completed')}
              variant={filterStatus === 'completed' ? 'primary' : 'secondary'}
              size="sm"
            >
              Completed
            </Button>
            <Button
              onClick={() => setFilterStatus('processing')}
              variant={filterStatus === 'processing' ? 'primary' : 'secondary'}
              size="sm"
            >
              Processing
            </Button>
            <Button
              onClick={() => setFilterStatus('failed')}
              variant={filterStatus === 'failed' ? 'primary' : 'secondary'}
              size="sm"
            >
              Failed
            </Button>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <ChevronDown className="h-5 w-5" />
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      {activeTab === 'statements' ? (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {filteredFiles.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="h-20 w-20 text-gray-300 mx-auto mb-6" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">No Bank Statements</h3>
              <p className="text-gray-600 text-lg">
                {searchQuery || filterStatus !== 'all'
                  ? 'No files match your search criteria'
                  : 'Upload your first bank statement to get started'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      File
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Account
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Upload Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Transactions
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredFiles.map((file) => (
                    <tr key={file.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <HStack>
                          <div className="text-blue-500 mr-3">{getFileIcon(file.file_type)}</div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{file.filename}</div>
                            <div className="text-sm text-gray-500">
                              {formatFileSize(file.file_size)}
                            </div>
                          </div>
                        </HStack>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{file.account_name || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <HStack className="text-sm text-gray-900">
                          <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                          {new Date(file.upload_date).toLocaleDateString()}
                        </HStack>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                            file.status
                          )}`}
                        >
                          {file.status?.charAt(0).toUpperCase() + (file.status?.slice(1) || '') ||
                            'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {file.total_transactions}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <FlexBetween className="justify-end">
                          <div></div>
                          <HStack gap={2}>
                            <Button
                              onClick={() => viewTransactions(file.id)}
                              variant="ghost"
                              size="sm"
                              title="View Transactions"
                            >
                              <Eye className="h-5 w-5" />
                            </Button>
                            <Button
                              onClick={() => setFileToDelete({ id: file.id, type: 'statement' })}
                              variant="ghost"
                              size="sm"
                              title="Delete File"
                            >
                              <Trash2 className="h-5 w-5" />
                            </Button>
                          </HStack>
                        </FlexBetween>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {filteredReceipts.length === 0 ? (
            <div className="p-12 text-center">
              <Image className="h-20 w-20 text-gray-300 mx-auto mb-6" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">No Receipt Images</h3>
              <p className="text-gray-600 text-lg">
                {searchQuery
                  ? 'No receipt images match your search'
                  : 'Upload your first receipt image to get started'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {filteredReceipts.map((receipt) => (
                <div
                  key={receipt.id}
                  className="border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="aspect-w-16 aspect-h-9">
                    {receipt.thumbnail_url ? (
                      <img
                        src={receipt.thumbnail_url}
                        alt={receipt.filename}
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                        <Image className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="text-base font-semibold text-gray-900 truncate mb-2">
                      {receipt.filename}
                    </h3>
                    <div className="space-y-1">
                      {receipt.merchant_name && (
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Merchant:</span> {receipt.merchant_name}
                        </p>
                      )}
                      {receipt.amount && (
                        <p className="text-sm font-medium text-gray-900">
                          <span className="text-gray-700">Amount:</span>{' '}
                          {formatCurrency(receipt.amount, authState.user)}
                        </p>
                      )}
                      <FlexBetween className="text-xs text-gray-500 pt-2 border-t border-gray-100 mt-2">
                        <span>{formatFileSize(receipt.file_size)}</span>
                        <span>{new Date(receipt.upload_date).toLocaleDateString()}</span>
                      </FlexBetween>
                    </div>
                    <FlexBetween className="mt-4">
                      <span
                        className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                          receipt.processed ? 'completed' : 'processing'
                        )}`}
                      >
                        {receipt.processed ? 'Processed' : 'Processing'}
                      </span>
                      <HStack gap={1}>
                        <Button
                          onClick={() => {
                            setSelectedFile(receipt);
                            setShowPreviewModal(true);
                          }}
                          variant="ghost"
                          size="sm"
                          title="View Image"
                        >
                          <Eye className="h-5 w-5" />
                        </Button>
                        <Button
                          onClick={() => setFileToDelete({ id: receipt.id, type: 'receipt' })}
                          variant="ghost"
                          size="sm"
                          title="Delete Image"
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </HStack>
                    </FlexBetween>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Preview Modal */}
      <Modal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        title="Preview File"
      >
        {selectedFile && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">{selectedFile.filename}</h3>
            {(selectedFile as ReceiptImage).preview_url && (
              <div className="max-w-full max-h-96 overflow-auto">
                <img
                  src={(selectedFile as ReceiptImage).preview_url}
                  alt={selectedFile.filename}
                  className="w-full h-auto"
                />
              </div>
            )}
            <div className="text-sm text-gray-600">
              <p>File size: {formatFileSize(selectedFile.file_size)}</p>
              <p>Upload date: {new Date(selectedFile.upload_date).toLocaleString()}</p>
              {(selectedFile as ReceiptImage).merchant_name && (
                <p>Merchant: {(selectedFile as ReceiptImage).merchant_name}</p>
              )}
              {(selectedFile as ReceiptImage).amount && (
                <p>
                  Amount: {formatCurrency((selectedFile as ReceiptImage).amount!, authState.user)}
                </p>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!fileToDelete}
        onClose={() => setFileToDelete(null)}
        onConfirm={deleteFile}
        title="Delete File"
        message="Are you sure you want to delete this file? This will also delete associated transactions."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};

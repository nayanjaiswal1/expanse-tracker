import React, { useState, useCallback } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { invoiceApi, ParsedInvoiceData } from '../../../api/invoiceApi';
import InvoiceReviewForm from './InvoiceReviewForm';
import { Button } from '../../../components/ui/Button';
import { FlexBetween, HStack } from '../../../components/ui/Layout';

interface InvoiceUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type UploadState = 'idle' | 'uploading' | 'parsing' | 'review' | 'submitting' | 'success' | 'error';

const InvoiceUploadModal: React.FC<InvoiceUploadModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [parsedData, setParsedData] = useState<ParsedInvoiceData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);

  const handleReset = () => {
    setUploadState('idle');
    setParsedData(null);
    setErrorMessage('');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleFileChange = async (file: File) => {
    if (!file) return;

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      setErrorMessage('Please upload a PDF, JPG, or PNG file');
      setUploadState('error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('File size must be less than 10MB');
      setUploadState('error');
      return;
    }

    setUploadState('uploading');
    setErrorMessage('');

    try {
      setUploadState('parsing');
      const data = await invoiceApi.uploadInvoice(file);

      if (!data.line_items || data.line_items.length === 0) {
        setErrorMessage('No line items found in the invoice. Please check the file and try again.');
        setUploadState('error');
        return;
      }

      setParsedData(data);
      setUploadState('review');
    } catch (error: any) {
      console.error('Invoice upload error:', error);
      setErrorMessage(
        error.response?.data?.error || 'Failed to process invoice. Please try again.'
      );
      setUploadState('error');
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileChange(e.target.files[0]);
    }
  };

  const handleApprovalSuccess = () => {
    setUploadState('success');
    setTimeout(() => {
      handleClose();
      if (onSuccess) onSuccess();
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <FlexBetween className="p-6 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {uploadState === 'review' ? 'Review Invoice' : 'Upload Invoice'}
          </h2>
          <Button onClick={handleClose} variant="ghost-neutral">
            <X className="w-5 h-5" />
          </Button>
        </FlexBetween>

        <div className="flex-1 overflow-y-auto p-6">
          {uploadState === 'idle' && (
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center ${
                dragActive
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-slate-600'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Upload Invoice
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Drag and drop your invoice file here, or click to browse
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">
                Supports PDF, JPG, PNG (Max 10MB)
              </p>
              <label
                htmlFor="invoice-file-input"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition"
              >
                Choose File
              </label>
              <input
                id="invoice-file-input"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileInput}
                className="hidden"
              />
            </div>
          )}

          {(uploadState === 'uploading' || uploadState === 'parsing') && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader className="w-12 h-12 text-blue-600 animate-spin mb-4" />
              <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {uploadState === 'uploading' ? 'Uploading...' : 'Processing Invoice...'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {uploadState === 'parsing' && 'Extracting invoice data with AI'}
              </p>
            </div>
          )}

          {uploadState === 'error' && (
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Upload Failed
              </h3>
              <p className="text-sm text-red-600 dark:text-red-400 mb-6">{errorMessage}</p>
              <Button onClick={handleReset} variant="primary">
                Try Again
              </Button>
            </div>
          )}

          {uploadState === 'review' && parsedData && (
            <InvoiceReviewForm
              parsedData={parsedData}
              onSuccess={handleApprovalSuccess}
              onCancel={handleReset}
            />
          )}

          {uploadState === 'success' && (
            <div className="text-center py-16">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Invoice Imported Successfully!
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Transaction and line items have been created
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvoiceUploadModal;

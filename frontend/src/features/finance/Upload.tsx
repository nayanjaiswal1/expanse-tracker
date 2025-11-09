import { useState, useCallback } from 'react';
import { Upload as UploadIcon, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { apiClient } from '../../api';
import type { Account } from '../../types';
import { useToast } from '../../components/ui/Toast';
import { PasswordDialog } from '../../components/ui/PasswordDialog';
import { Button } from '../../components/ui/Button';
import { FlexBetween, HStack } from '../../components/ui/Layout';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'processing' | 'completed' | 'error';
  transactions?: number;
  errors?: string[];
}

interface AccountSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (accountId: number) => void;
  accounts: Account[];
  filename: string;
}

const AccountSelectModal = ({
  isOpen,
  onClose,
  onSelect,
  accounts,
  filename,
}: AccountSelectModalProps) => {
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-96">
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
          Select Account for "{filename}"
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
              Account
            </label>
            <select
              value={selectedAccountId || ''}
              onChange={(e) => setSelectedAccountId(e.target.value ? Number(e.target.value) : null)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            >
              <option value="">Select account...</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.account_type})
                </option>
              ))}
            </select>
          </div>
          <FlexBetween className="justify-end">
            <div></div>
            <HStack gap={3}>
              <Button onClick={onClose} variant="ghost-secondary">
                Cancel
              </Button>
              <Button
                onClick={() => selectedAccountId && onSelect(selectedAccountId)}
                disabled={!selectedAccountId}
                className="px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Upload
              </Button>
            </HStack>
          </FlexBetween>
        </div>
      </div>
    </div>
  );
};

export const Upload = ({
  accounts,
  onUploadSuccess,
}: {
  accounts: Account[];
  onUploadSuccess?: () => void;
}) => {
  const { showSuccess, showError } = useToast();

  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState<{
    file: File;
    fileId: string;
    filename: string;
  } | null>(null);
  const [showAccountModal, setShowAccountModal] = useState<{ file: File; fileId: string } | null>(
    null
  );
  const [selectedAccountForUpload, setSelectedAccountForUpload] = useState<number | null>(null);

  const uploadFile = async (
    file: File,
    accountId: number,
    password?: string
  ): Promise<UploadedFile> => {
    try {
      const response = (await apiClient.uploadFile(file, password, accountId)) as any;

      return {
        id: response.session_id.toString(),
        name: file.name,
        size: file.size,
        type: file.type,
        status: response.status as 'processing' | 'completed' | 'error',
        transactions: response.total_transactions,
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Upload failed';

      if (errorMessage.toLowerCase().includes('password')) {
        throw new Error('PASSWORD_REQUIRED');
      }

      throw new Error(errorMessage);
    }
  };

  const processFile = async (file: File, accountId: number, password?: string) => {
    const fileId = Math.random().toString(36).substr(2, 9);

    const uploadedFile: UploadedFile = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'processing',
    };

    setFiles((prev) => [...prev, uploadedFile]);

    try {
      const result = await uploadFile(file, accountId, password);
      setFiles((prev) => prev.map((f) => (f.id === fileId ? result : f)));
      showSuccess('File uploaded successfully', `${file.name} has been processed.`);
      onUploadSuccess?.();
    } catch (error: any) {
      if (error.message === 'PASSWORD_REQUIRED') {
        setShowPasswordPrompt({ file, fileId, filename: file.name });
        return;
      }

      const errorFile: UploadedFile = {
        ...uploadedFile,
        status: 'error',
        errors: [error.message],
      };

      setFiles((prev) => prev.map((f) => (f.id === fileId ? errorFile : f)));
      showError('Upload failed', error.message);
    }
  };

  const handleAccountSelect = async (accountId: number) => {
    if (!showAccountModal) return;

    const { file } = showAccountModal;
    setShowAccountModal(null);
    setSelectedAccountForUpload(accountId);

    await processFile(file, accountId);
  };

  const handlePasswordSubmit = async (password: string) => {
    if (!showPasswordPrompt) return;

    const { file, fileId } = showPasswordPrompt;
    setShowPasswordPrompt(null);

    try {
      const result = await uploadFile(file, selectedAccountForUpload || 1, password);
      setFiles((prev) => prev.map((f) => (f.id === fileId ? result : f)));
      showSuccess('File uploaded successfully', `${file.name} has been processed.`);
      onUploadSuccess?.();
    } catch (error: any) {
      if (error.message === 'PASSWORD_REQUIRED') {
        setShowPasswordPrompt({ file, fileId, filename: file.name });
      } else {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId ? { ...f, status: 'error', errors: [error.message] } : f
          )
        );
        showError('Upload failed', error.message);
      }
    }
  };

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || []);

      const supportedFiles = selectedFiles.filter(
        (file) =>
          file.type === 'application/pdf' ||
          file.name.toLowerCase().endsWith('.pdf') ||
          file.type === 'application/json' ||
          file.name.toLowerCase().endsWith('.json') ||
          file.type === 'text/csv' ||
          file.name.toLowerCase().endsWith('.csv')
      );

      if (supportedFiles.length === 0) {
        showError('Invalid file type', 'Please upload PDF, JSON, or CSV files only.');
        e.target.value = '';
        return;
      }

      // Show account selection modal for the first file
      if (supportedFiles.length > 0) {
        const fileId = Math.random().toString(36).substr(2, 9);
        setShowAccountModal({ file: supportedFiles[0], fileId });
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
      const supportedFiles = droppedFiles.filter(
        (file) =>
          file.type === 'application/pdf' ||
          file.name.toLowerCase().endsWith('.pdf') ||
          file.type === 'application/json' ||
          file.name.toLowerCase().endsWith('.json') ||
          file.type === 'text/csv' ||
          file.name.toLowerCase().endsWith('.csv')
      );

      if (supportedFiles.length === 0) {
        showError('Invalid file type', 'Please upload PDF, JSON, or CSV files only.');
        return;
      }

      // Show account selection modal for the first file
      if (supportedFiles.length > 0) {
        const fileId = Math.random().toString(36).substr(2, 9);
        setShowAccountModal({ file: supportedFiles[0], fileId });
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'processing':
        return (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-600"></div>
        );
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? 'border-slate-400 bg-slate-50 dark:bg-slate-800'
            : 'border-slate-300 dark:border-slate-600 hover:border-slate-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <UploadIcon className="mx-auto h-10 w-10 text-slate-400" />
        <div className="mt-3">
          <p className="text-slate-900 dark:text-white">
            Drop files here or{' '}
            <label className="text-slate-900 dark:text-white font-medium cursor-pointer hover:text-slate-700 dark:hover:text-slate-300">
              browse
              <input
                type="file"
                multiple
                accept=".pdf,.json,.csv"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            PDF, JSON, CSV files up to 10MB
          </p>
        </div>
      </div>

      {/* Current Files */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => (
            <FlexBetween key={file.id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <HStack gap={3} className="flex-1 min-w-0">
                <FileText className="h-4 w-4 text-slate-600 dark:text-slate-400 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {formatFileSize(file.size)}
                  </p>
                  {file.status === 'completed' && file.transactions !== undefined && (
                    <p className="text-xs text-green-600 dark:text-green-400">
                      {file.transactions} transactions imported
                    </p>
                  )}
                  {file.status === 'error' && file.errors && file.errors.length > 0 && (
                    <p className="text-xs text-red-600 dark:text-red-400">{file.errors[0]}</p>
                  )}
                </div>
              </HStack>

              <HStack gap={2}>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    file.status === 'completed'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                      : file.status === 'error'
                        ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  }`}
                >
                  {file.status}
                </span>
                {getStatusIcon(file.status)}
              </HStack>
            </FlexBetween>
          ))}
        </div>
      )}

      {/* Account Selection Modal */}
      {showAccountModal && (
        <AccountSelectModal
          isOpen={true}
          onClose={() => setShowAccountModal(null)}
          onSelect={handleAccountSelect}
          accounts={accounts}
          filename={showAccountModal.file.name}
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
          onClose={() => setShowPasswordPrompt(null)}
        />
      )}
    </div>
  );
};

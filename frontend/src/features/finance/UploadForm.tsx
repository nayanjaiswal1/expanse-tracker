import React, { useState, useCallback } from 'react';
import {
  Upload as UploadIcon,
  FileText,
  AlertCircle,
  CheckCircle,
  Trash2,
  Eye,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAccounts } from '../../hooks/finance';
import { ObjectForm } from '../../components/forms';
import { PasswordDialog } from '../../components/ui/PasswordDialog';
import { createUploadFileFormConfig } from '../../shared/forms';
import { UploadFileFormData } from '../../shared/schemas';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { apiClient } from '../../api';
import { FlexBetween, HStack } from '../../components/ui/Layout';

interface UploadSession {
  id: number;
  filename: string;
  status: string;
  total_transactions: number;
  created_at: string;
  updated_at: string;
}

export const UploadForm = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const accountsQuery = useAccounts();

  const [files, setFiles] = useState<UploadSession[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [pendingFile, setPendingFile] = useState<{
    file: File;
    formData: UploadFileFormData;
  } | null>(null);

  const accounts = Array.isArray(accountsQuery.data)
    ? accountsQuery.data.map((acc) => ({ value: acc.id, label: acc.name }))
    : [];

  const handleUpload = async (data: UploadFileFormData) => {
    setIsUploading(true);

    try {
      const response = await apiClient.uploadFile(data.file, data.password, data.account_id);

      setFiles((prev) => [response, ...prev]);
      showSuccess(`File "${data.file.name}" uploaded successfully!`);

      // Poll for completion
      if (response.id) {
        pollUploadStatus(response.id);
      }
    } catch (error: any) {
      if (error.response && error.response.data && error.response.data.requires_password) {
        setPendingFile({ file: data.file, formData: data });
        setShowPasswordPrompt(true);
      } else {
        showError(error.message || 'Failed to upload file');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handlePasswordSubmit = async (password: string) => {
    if (!pendingFile) return;

    const updatedData = { ...pendingFile.formData, password };

    setShowPasswordPrompt(false);
    setPendingFile(null);

    await handleUpload(updatedData);
  };

  const handlePasswordCancel = () => {
    setShowPasswordPrompt(false);
    setPendingFile(null);
    setIsUploading(false);
  };

  const pollUploadStatus = async (sessionId: number) => {
    try {
      const interval = setInterval(async () => {
        try {
          const status = await apiClient.getUploadStatus(sessionId);

          setFiles((prev) =>
            prev.map((file) =>
              file.id === sessionId
                ? {
                    ...file,
                    status: status.status,
                    total_transactions: status.total_transactions,
                  }
                : file
            )
          );

          if (status.status === 'completed' || status.status === 'error') {
            clearInterval(interval);

            if (status.status === 'completed') {
              showSuccess(
                `Processing complete! ${status.total_transactions || 0} transactions imported.`
              );
            } else {
              showError('File processing failed. Please check the file format and try again.');
            }
          }
        } catch (error) {
          clearInterval(interval);
          console.error('Error polling upload status:', error);
        }
      }, 2000);

      // Clean up interval after 5 minutes
      setTimeout(() => clearInterval(interval), 5 * 60 * 1000);
    } catch (error) {
      console.error('Error starting upload status polling:', error);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const droppedFiles = Array.from(e.dataTransfer.files);
      if (droppedFiles.length > 0) {
        // For now, just show that files were dropped
        // The actual upload will happen through the form
        showSuccess(`${droppedFiles.length} file(s) ready for upload configuration`);
      }
    },
    [showSuccess]
  );

  const removeFile = (fileId: number) => {
    setFiles((prev) => prev.filter((file) => file.id !== fileId));
  };

  const viewTransactions = (sessionId: number) => {
    navigate(`/transactions?session=${sessionId}`);
  };

  const formConfig = createUploadFileFormConfig(handleUpload, accounts, isUploading);

  return (
    <div className="space-y-4">
      {/* Header */}
      <FlexBetween>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Upload Financial Data
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Import transactions from CSV, PDF, or Excel files
          </p>
        </div>
      </FlexBetween>

      {/* Upload Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <ObjectForm config={formConfig} />
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        }`}
      >
        <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Drag and drop files here, or use the form above
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500">
          Supports CSV, PDF, Excel, TXT, JSON (max 50MB)
        </p>
      </div>

      {/* Upload History */}
      {files.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Upload History</h3>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {files.map((file) => (
              <FlexBetween key={file.id} className="px-6 py-4">
                <HStack gap={3}>
                  <FileText className="h-8 w-8 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {file.filename}
                    </p>
                    <HStack gap={4} className="text-xs text-gray-500 dark:text-gray-400">
                      <span>{file.total_transactions} transactions</span>
                    </HStack>
                  </div>
                </HStack>

                <HStack gap={3}>
                  {/* Status Badge */}
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      file.status === 'completed'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : file.status === 'processing'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}
                  >
                    {file.status === 'completed' ? (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Completed
                      </>
                    ) : file.status === 'processing' ? (
                      <>
                        <div className="animate-spin h-3 w-3 mr-1 border border-current border-t-transparent rounded-full" />
                        Processing
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Error
                      </>
                    )}
                  </span>

                  {/* Actions */}
                  <HStack gap={1}>
                    {file.status === 'completed' && file.id && (
                      <Button variant="ghost" size="sm" onClick={() => viewTransactions(file.id!)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(file.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </HStack>
                </HStack>
              </FlexBetween>
            ))}
          </div>
        </div>
      )}

      {/* Password Prompt Modal */}
      {showPasswordPrompt && pendingFile && (
        <PasswordDialog
          isOpen={showPasswordPrompt}
          onClose={handlePasswordCancel}
          onSubmit={handlePasswordSubmit}
          title="Password Required"
          message={`The file "${pendingFile.file.name}" is password protected. Please enter the password to continue.`}
        />
      )}
    </div>
  );
};

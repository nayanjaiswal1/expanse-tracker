import React, { useState, useCallback } from 'react';
import { apiClient } from '../../../api/client';
import { useToast } from '../../../components/ui/Toast';
import type { Account } from '../../../types';

export const useAccountDragDrop = (accounts: Account[]) => {
  const [isPageDragOver, setIsPageDragOver] = useState(false);
  const [dragOverAccount, setDragOverAccount] = useState<number | null>(null);
  const { showSuccess, showError } = useToast();

  const handleDragOver = useCallback((e: React.DragEvent, accountId: number) => {
    e.preventDefault();
    setDragOverAccount(accountId);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOverAccount(null);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent, accountId: number) => {
      e.preventDefault();
      setDragOverAccount(null);

      const files = Array.from(e.dataTransfer.files);
      const supportedFiles = files.filter(
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

      // Upload each file to this account
      for (const file of supportedFiles) {
        try {
          showSuccess('Uploading...', `Uploading ${file.name}`);
          await apiClient.uploadFile(file, undefined, accountId);
          showSuccess('Upload successful', `${file.name} uploaded to account successfully`);
        } catch (error: unknown) {
          const errorMessage =
            typeof error === 'object' &&
            error !== null &&
            'response' in error &&
            typeof (error as { response?: { data?: { error?: string } } }).response?.data?.error ===
              'string'
              ? ((error as { response?: { data?: { error?: string } } }).response?.data?.error ??
                'Upload failed')
              : 'Upload failed';
          if (errorMessage.toLowerCase().includes('password')) {
            showError(
              'Password required',
              `${file.name} is password protected. Please use the upload modal instead.`
            );
          } else {
            showError('Upload failed', `Failed to upload ${file.name}: ${errorMessage}`);
          }
        }
      }
    },
    [showError, showSuccess]
  );

  // Page-wide drag and drop handlers
  const handlePageDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsPageDragOver(true);
  }, []);

  const handlePageDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    // Only hide if leaving the main container
    if (e.currentTarget === e.target) {
      setIsPageDragOver(false);
    }
  }, []);

  const handlePageDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsPageDragOver(false);

      if (accounts.length === 0) {
        showError('No accounts', 'Please add an account first before uploading files.');
        return;
      }

      const files = Array.from(e.dataTransfer.files);
      const supportedFiles = files.filter(
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

      // TODO: Implement account selection modal for file upload
      showError(
        'Feature not implemented',
        'Account selection for file upload is not yet implemented.'
      );
    },
    [accounts.length, showError]
  );

  return {
    isPageDragOver,
    dragOverAccount,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handlePageDragOver,
    handlePageDragLeave,
    handlePageDrop,
  };
};

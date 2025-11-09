import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import type { Account } from '../../types';
import BankStatementUpload from './BankStatementUpload';

export const BankStatementUploadWrapper: React.FC = () => {
  const {
    data: accounts = [],
    isLoading,
    error,
  } = useQuery<Account[], Error>({
    queryKey: ['accounts'],
    queryFn: () => apiClient.getAccounts(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 dark:border-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 dark:text-red-400">Failed to load accounts</p>
      </div>
    );
  }

  return <BankStatementUpload accounts={accounts} />;
};

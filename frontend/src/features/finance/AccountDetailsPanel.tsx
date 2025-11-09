import React, { useState } from 'react';
import { Plus, Calendar, Save, FileText, History as HistoryIcon, TrendingUp } from 'lucide-react';
import { CurrencySymbol } from '../../components/ui/CurrencySymbol';
import { useBalanceRecords, useCreateBalanceRecord } from './hooks/queries/useAccounts';
import { Account, type UploadSession } from '../../types';
import { Button } from '../../components/ui/Button';
import { FormLayout, FormField } from '../../components/ui/FormLayout';
import { Input } from '../../components/ui/Input';
import { apiClient } from '../../api/client';
import { useToast } from '../../components/ui/Toast';
import { useQuery } from '@tanstack/react-query';
import { BalanceHistoryTab } from './components/BalanceHistoryTab';
import { StatementsTab } from './components/StatementsTab';
import { TransactionsTab } from './components/TransactionsTab';
import { UploadButton } from './components/UploadButton';
import { FlexBetween, HStack } from '../../components/ui/Layout';
import { balanceEntryTypeOptions } from './constants/transactionConstants';

interface AccountDetailsPanelProps {
  account: Account;
  className?: string;
  onStatementClick?: (session: UploadSession) => void;
}

export const AccountDetailsPanel: React.FC<AccountDetailsPanelProps> = ({
  account,
  className = '',
  onStatementClick,
}) => {
  const balanceRecordsQuery = useBalanceRecords(account.id);
  const createBalanceRecord = useCreateBalanceRecord();

  const [showAddForm, setShowAddForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'history' | 'statements' | 'transactions'>('history');
  const [isUploading, setIsUploading] = useState(false);
  const [showInlineSuccess, setShowInlineSuccess] = useState(false);
  const { showSuccess: pushToastSuccess, showError: pushToastError } = useToast();

  // Fetch upload sessions for this account (API filtering)
  const uploadSessionsQuery = useQuery({
    queryKey: ['upload-sessions', account.id],
    queryFn: () => apiClient.getUploadSessions(account.id),
    enabled: activeTab === 'statements',
  });

  // Fetch transactions for this account (API filtering)
  const transactionsQuery = useQuery({
    queryKey: ['transactions', account.id],
    queryFn: () => apiClient.getTransactions({ account_id: account.id }),
    enabled: activeTab === 'transactions',
  });

  const accountTransactions = transactionsQuery.data?.results || [];
  const [newBalance, setNewBalance] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newDate, setNewDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [entryType, setEntryType] = useState<'manual' | 'monthly' | 'reconciliation'>('manual');
  const [formError, setFormError] = useState<string>('');

  // Safe wrapper for setFormError to ensure only strings are set
  const safeSetFormError = (error: unknown) => {
    if (typeof error === 'string') {
      setFormError(error);
    } else if (error && typeof error === 'object') {
      if ('message' in error && typeof (error as { message?: string }).message === 'string') {
        setFormError((error as { message?: string }).message ?? 'An error occurred');
      } else {
        setFormError(JSON.stringify(error));
      }
    } else {
      setFormError('An error occurred');
    }
  };

  const handleAddBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setShowInlineSuccess(false);

    // Validation
    if (!newBalance.trim()) {
      setFormError('Balance is required');
      return;
    }

    const balanceValue = parseFloat(newBalance);
    if (isNaN(balanceValue)) {
      setFormError('Please enter a valid balance amount');
      return;
    }

    if (!newDate) {
      setFormError('Date is required');
      return;
    }

    // Check if date is not in the future for monthly entries
    if (entryType === 'monthly') {
      const selectedDate = new Date(newDate);
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      if (selectedDate > today) {
        setFormError('Monthly entries cannot be in the future');
        return;
      }
    }

    try {
      await createBalanceRecord.mutateAsync({
        account: account.id,
        balance: balanceValue,
        date: newDate,
        entry_type: entryType,
        notes: newNotes.trim() || undefined,
      });

      // Clear form
      setNewBalance('');
      setNewNotes('');
      setNewDate(new Date().toISOString().split('T')[0]);
      setEntryType('manual');
      setShowAddForm(false);
      setShowInlineSuccess(true);

      setTimeout(() => setShowInlineSuccess(false), 3000);
    } catch (error: unknown) {
      let errorMessage = 'Failed to add balance record. Please try again.';

      if (error && typeof error === 'object' && 'response' in error) {
        const errorData =
          (error as { response?: { data?: Record<string, unknown> } }).response?.data ?? {};

        if (typeof (errorData as { details?: { detail?: string } }).details?.detail === 'string') {
          errorMessage =
            (errorData as { details?: { detail?: string } }).details?.detail ?? errorMessage;
        } else if (typeof (errorData as { detail?: string }).detail === 'string') {
          errorMessage = (errorData as { detail?: string }).detail ?? errorMessage;
        } else if (typeof (errorData as { message?: string }).message === 'string') {
          errorMessage = (errorData as { message?: string }).message ?? errorMessage;
        } else if (typeof (errorData as { error?: string }).error === 'string') {
          errorMessage = (errorData as { error?: string }).error ?? errorMessage;
        }
      } else if (error instanceof Error && error.message) {
        errorMessage = error.message;
      }

      safeSetFormError(errorMessage);
    }
  };

  const clearFormAndErrors = () => {
    setShowAddForm(false);
    setFormError('');
    setShowInlineSuccess(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      await apiClient.uploadFile(file, undefined, account.id);
      pushToastSuccess('Statement uploaded successfully', `Processing ${file.name}...`);
      uploadSessionsQuery.refetch();
      setActiveTab('statements');
    } catch (error: unknown) {
      const errorMessage =
        error &&
        typeof error === 'object' &&
        'response' in error &&
        typeof (error as { response?: { data?: { detail?: string } } }).response?.data?.detail ===
          'string'
          ? ((error as { response?: { data?: { detail?: string } } }).response?.data?.detail ??
            'Failed to upload statement')
          : 'Failed to upload statement';
      pushToastError('Upload failed', errorMessage);
    } finally {
      setIsUploading(false);
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const records = balanceRecordsQuery.data || [];

  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 shadow-md ${className}`}
    >
      {/* Header - Sticky Tabs */}
      <div className="sticky top-0 z-30 bg-white dark:bg-slate-800 p-3 flex-shrink-0 rounded-t-lg">
        {/* Tabs and Action Buttons */}
        <FlexBetween>
          <HStack gap={1}>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors outline-none focus:outline-none ${
                activeTab === 'history'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <HistoryIcon className="inline w-3 h-3 mr-1" />
              History
            </button>
            <button
              onClick={() => setActiveTab('statements')}
              className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors outline-none focus:outline-none ${
                activeTab === 'statements'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <FileText className="inline w-3 h-3 mr-1" />
              Statements
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors outline-none focus:outline-none ${
                activeTab === 'transactions'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <TrendingUp className="inline w-3 h-3 mr-1" />
              Transactions
            </button>
          </HStack>

          {/* Action Buttons */}
          <HStack gap={2}>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
              title="Add Balance Record"
            >
              <Plus className="h-3 w-3" />
              Add
            </button>
            <UploadButton isUploading={isUploading} onFileChange={handleFileUpload} />
          </HStack>
        </FlexBetween>

        {/* Horizontal line below tabs */}
        <div className="border-t border-gray-200 dark:border-slate-700 -mx-3 mt-2"></div>
      </div>

      {/* Add Balance Form */}
      {showAddForm && (
        <div className="p-4 bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Add Balance Record
          </h4>
          <form onSubmit={handleAddBalance}>
            <FormLayout>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Balance" required>
                  <div className="relative">
                    <CurrencySymbol
                      currency={account.currency}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      value={newBalance}
                      onChange={(e) => {
                        setNewBalance(e.target.value);
                        if (formError) setFormError('');
                      }}
                      className="pl-10"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </FormField>

                <FormField label="Date" required>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="date"
                      value={newDate}
                      onChange={(e) => {
                        setNewDate(e.target.value);
                        if (formError) setFormError('');
                      }}
                      className="pl-10"
                      required
                    />
                  </div>
                </FormField>
              </div>

              <FormField label="Entry Type">
                <select
                  value={entryType}
                  onChange={(e) =>
                    setEntryType(e.target.value as 'manual' | 'monthly' | 'reconciliation')
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {balanceEntryTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Notes" helpText="Optional notes about this balance record">
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <textarea
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    rows={2}
                    className="w-full pl-10 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Add notes..."
                  />
                </div>
              </FormField>

              {formError && (
                <div className="text-xs text-red-600 dark:text-red-400">
                  {typeof formError === 'string' ? formError : JSON.stringify(formError)}
                </div>
              )}

              {showInlineSuccess && (
                <div className="text-xs text-green-600 dark:text-green-400">
                  Balance record added successfully!
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={createBalanceRecord.isPending} className="flex-1">
                  {createBalanceRecord.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                      Adding...
                    </>
                  ) : (
                    <>
                      <Save className="h-3 w-3 mr-2" />
                      Add Record
                    </>
                  )}
                </Button>
                <Button type="button" onClick={clearFormAndErrors} variant="pill-muted">
                  Cancel
                </Button>
              </div>
            </FormLayout>
          </form>
        </div>
      )}

      {/* Tab Content */}
      <div className="p-3">
        {activeTab === 'history' && (
          <BalanceHistoryTab
            records={records}
            isLoading={balanceRecordsQuery.isLoading}
            error={balanceRecordsQuery.error}
          />
        )}

        {activeTab === 'statements' && (
          <StatementsTab
            sessions={uploadSessionsQuery.data || []}
            isLoading={uploadSessionsQuery.isLoading}
            onStatementClick={onStatementClick}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionsTab
            transactions={accountTransactions}
            isLoading={transactionsQuery.isLoading}
            error={transactionsQuery.error}
          />
        )}
      </div>
    </div>
  );
};

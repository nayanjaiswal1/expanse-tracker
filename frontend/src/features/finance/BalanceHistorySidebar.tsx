import React, { useState } from 'react';
import {
  X,
  Plus,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Save,
  Edit3,
  Settings,
  Eye,
  BarChart3,
  Trash2,
  MoreVertical,
} from 'lucide-react';
import { useBalanceRecords, useCreateBalanceRecord } from './hooks/queries/useAccounts';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../utils/preferences';
import { Account } from '../../types';
import { balanceEntryTypeOptions } from './constants/transactionConstants';
import { Button } from '../../../components/ui/Button';
import { FlexBetween, HStack } from '../../components/ui/Layout';

interface BalanceHistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  account: Account | null;
  onEditAccount?: (account: Account) => void;
  onDeleteAccount?: (account: Account) => void;
}

export const BalanceHistorySidebar: React.FC<BalanceHistorySidebarProps> = ({
  isOpen,
  onClose,
  account,
  onEditAccount,
  onDeleteAccount,
}) => {
  const { state: authState } = useAuth();
  const balanceRecordsQuery = useBalanceRecords(account?.id || 0);
  const createBalanceRecord = useCreateBalanceRecord();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newBalance, setNewBalance] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newDate, setNewDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [entryType, setEntryType] = useState<'manual' | 'monthly' | 'reconciliation'>('manual');
  const [formError, setFormError] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleAddBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setShowSuccess(false);

    // Validation
    if (!account) {
      setFormError('No account selected');
      return;
    }

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
      today.setHours(23, 59, 59, 999); // End of today

      if (selectedDate > today) {
        setFormError('Monthly balance date cannot be in the future');
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
        source: 'sidebar_manual',
        is_month_end: entryType === 'monthly',
        reconciliation_status: entryType === 'reconciliation' ? 'pending' : 'reconciled',
      });

      // Show success feedback
      setShowSuccess(true);

      // Reset form after short delay
      setTimeout(() => {
        setNewBalance('');
        setNewNotes('');
        setNewDate(new Date().toISOString().split('T')[0]);
        setEntryType('manual');
        setShowSuccess(false);
        setShowAddForm(false);
      }, 1500);
    } catch (error: any) {
      console.error('Failed to add balance record:', error);

      // Handle specific error types
      let errorMessage = 'Failed to add balance record. Please try again.';

      if (error?.response?.data) {
        const errorData = error.response.data;

        // Handle unique constraint violation
        if (errorData.non_field_errors && Array.isArray(errorData.non_field_errors)) {
          const uniqueError = errorData.non_field_errors.find((err: string) =>
            err.includes('fields account, date, entry_type must make a unique set')
          );
          if (uniqueError) {
            errorMessage = `A ${entryType} balance record already exists for ${newDate}. Please choose a different date or entry type.`;
          } else {
            errorMessage = errorData.non_field_errors[0];
          }
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (typeof errorData === 'string') {
          errorMessage = errorData;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }

      setFormError(errorMessage);
    }
  };

  const clearFormAndErrors = () => {
    setShowAddForm(false);
    setFormError('');
    setShowSuccess(false);
  };

  const getChangeIcon = (current: number, previous: number) => {
    if (current > previous) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (current < previous) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getChangeColor = (current: number, previous: number) => {
    if (current > previous) return 'text-green-600 dark:text-green-400';
    if (current < previous) return 'text-red-600 dark:text-red-400';
    return 'text-gray-500 dark:text-gray-400';
  };

  if (!isOpen) return null;

  const records = balanceRecordsQuery.data || [];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-slate-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex-shrink-0">
          <FlexBetween className="mb-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Account Details
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{account?.name}</p>
            </div>
            <Button onClick={onClose} variant="icon-soft-sm">
              <X className="h-4 w-4" />
            </Button>
          </FlexBetween>

          {/* Edit/Delete Dropdown */}
          {account && (
            <div className="flex justify-end">
              <div className="relative">
                <Button
                  onClick={() => setShowDropdown(!showDropdown)}
                  variant="icon-soft-sm"
                  title="Account options"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>

                {/* Dropdown Menu */}
                {showDropdown && (
                  <>
                    {/* Backdrop to close dropdown */}
                    <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />

                    {/* Dropdown content */}
                    <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg z-20">
                      <Button
                        onClick={() => {
                          onEditAccount?.(account);
                          setShowDropdown(false);
                        }}
                        variant="ghost-compact"
                      >
                        <Edit3 className="h-4 w-4 text-blue-500" />
                        Edit Account
                      </Button>

                      <Button
                        onClick={() => {
                          onDeleteAccount?.(account);
                          setShowDropdown(false);
                        }}
                        variant="danger-compact"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete Account
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 [&_.space-y-4>:first-child]:mt-0 [&_.space-y-6>:first-child]:mt-0">
          {/* Account Summary */}
          {account && (
            <div className="p-4 border-b border-gray-200 dark:border-slate-700">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Current Balance</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {formatCurrency(account.balance, authState.user)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Account Type</p>
                  <p className="text-xs font-medium text-gray-900 dark:text-white capitalize">
                    {account.account_type}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Add Balance Form */}
          {showAddForm && (
            <div className="p-4 bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                Add Balance Record
              </h3>
              <form onSubmit={handleAddBalance} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Balance
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newBalance}
                    onChange={(e) => {
                      setNewBalance(e.target.value);
                      if (formError) setFormError('');
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter balance"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => {
                      setNewDate(e.target.value);
                      if (formError) setFormError('');
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Type
                  </label>
                  <select
                    value={entryType}
                    onChange={(e) =>
                      setEntryType(e.target.value as 'manual' | 'monthly' | 'reconciliation')
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {balanceEntryTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    placeholder="Add notes..."
                  />
                </div>

                {/* Success Message */}
                {showSuccess && (
                  <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center dark:bg-green-900/20 dark:border-green-800 dark:text-green-300">
                    <div className="w-4 h-4 mr-2 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                    Balance record added successfully!
                  </div>
                )}

                {/* Error Message */}
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
                    <svg
                      className="w-4 h-4 mr-2 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {formError}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={createBalanceRecord.isPending}
                    variant="primary-compact"
                  >
                    {createBalanceRecord.isPending ? (
                      <>
                        <div className="w-3 h-3 mr-1 border border-white border-t-transparent rounded-full animate-spin"></div>
                        Adding...
                      </>
                    ) : (
                      <>
                        <Save className="h-3 w-3 mr-1" />
                        Add Record
                      </>
                    )}
                  </Button>
                  <Button type="button" onClick={clearFormAndErrors} variant="pill-muted">
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Balance History */}
          <div className="p-4">
            <FlexBetween className="mb-3">
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  Balance History
                </h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {records.length} records
                </span>
              </div>
              <Button
                onClick={() => setShowAddForm(!showAddForm)}
                variant="primary-compact"
                title="Add Balance Record"
              >
                <Plus className="h-3 w-3" />
                Add Record
              </Button>
            </FlexBetween>

            {balanceRecordsQuery.isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : balanceRecordsQuery.error ? (
              <div className="text-center py-8">
                <p className="text-sm text-red-600 dark:text-red-400">
                  Failed to load balance history
                </p>
              </div>
            ) : records.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500 dark:text-gray-400">No balance records yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {records.map((record, index) => {
                  const previousRecord = records[index + 1];
                  const change = previousRecord ? record.balance - previousRecord.balance : 0;

                  return (
                    <div
                      key={record.id}
                      className="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-600"
                    >
                      <FlexBetween className="mb-2">
                        <HStack gap={2}>
                          {previousRecord && getChangeIcon(record.balance, previousRecord.balance)}
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {formatCurrency(record.balance, authState.user)}
                          </span>
                        </HStack>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {record.date_display}
                        </span>
                      </FlexBetween>

                      <FlexBetween className="text-xs">
                        <span className="text-gray-500 dark:text-gray-400 capitalize">
                          {record.entry_type_display || record.entry_type}
                        </span>
                        {previousRecord && change !== 0 && (
                          <span
                            className={`font-medium ${getChangeColor(record.balance, previousRecord.balance)}`}
                          >
                            {change > 0 ? '+' : ''}
                            {formatCurrency(change, authState.user)}
                          </span>
                        )}
                      </FlexBetween>

                      {record.notes && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                          {record.notes}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

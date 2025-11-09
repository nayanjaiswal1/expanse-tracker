import React, { useState } from 'react';
import { Calendar, Save, AlertCircle, CheckCircle, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';

import { useBulkUpdateMonthlyBalances } from './hooks/queries/useAccounts';
import { formatCurrency } from '../../utils/preferences';
import { Account } from '../../types';
import { FlexBetween, HStack } from '../../components/ui/Layout';

interface MonthlyBalanceUpdateProps {
  isOpen: boolean;
  onClose: () => void;
  account: Account | null;
}

export const MonthlyBalanceUpdate: React.FC<MonthlyBalanceUpdateProps> = ({
  isOpen,
  onClose,
  account,
}) => {
  const bulkUpdateMutation = useBulkUpdateMonthlyBalances();

  const [selectedDate, setSelectedDate] = useState(() => {
    // Default to last day of current month
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return lastDay.toISOString().split('T')[0];
  });

  const [balance, setBalance] = useState('');
  const [notes, setNotes] = useState('');

  React.useEffect(() => {
    if (account && isOpen) {
      setBalance(account.balance.toString());
      setNotes('');
    }
  }, [account, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!account || balance.trim() === '') {
      return;
    }

    const newBalance = parseFloat(balance);
    if (isNaN(newBalance)) {
      return;
    }

    const updates = [
      {
        account_id: account.id,
        balance: newBalance,
        notes: notes.trim(),
      },
    ];

    try {
      await bulkUpdateMutation.mutateAsync({
        updates,
        date: selectedDate,
      });
      onClose();
    } catch (error) {
      console.error('Failed to update monthly balance:', error);
    }
  };

  const getBalanceChange = () => {
    if (!account) return 0;
    const newBalance = parseFloat(balance);
    if (isNaN(newBalance)) return 0;
    return newBalance - account.balance;
  };

  if (!isOpen) return null;

  return (
    <HStack className="fixed inset-0 bg-black bg-opacity-50 z-50 p-4 justify-center">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
        <FlexBetween className="p-6 border-b border-gray-200 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Monthly Balance Update
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{account?.name}</p>
          </div>
          <Button onClick={onClose} variant="icon-soft">
            <X className="h-4 w-4" />
          </Button>
        </FlexBetween>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Account Info */}
          {account && (
            <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
              <FlexBetween className="mb-3">
                <h3 className="font-medium text-slate-900 dark:text-white">{account.name}</h3>
                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">
                  {account.account_type}
                </span>
              </FlexBetween>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500 dark:text-slate-400">Current Balance</p>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {formatCurrency(account.balance)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400">Currency</p>
                  <p className="font-medium text-slate-900 dark:text-white">{account.currency}</p>
                </div>
              </div>
            </div>
          )}

          {/* Date Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Update Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                required
              />
              <Calendar className="absolute right-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Balance Update Form */}
          <div className="space-y-6">
            {/* New Balance */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                New Balance
              </label>
              <input
                type="number"
                step="0.01"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                className="w-full px-4 py-2.5 text-lg border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Enter new balance"
                required
              />
            </div>

            {/* Balance Change Display */}
            {account && balance && !isNaN(parseFloat(balance)) && (
              <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-600">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Balance Change
                </label>
                <FlexBetween
                  className={`px-4 py-3 rounded-lg text-sm font-semibold ${
                    getBalanceChange() > 0
                      ? 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800'
                      : getBalanceChange() < 0
                        ? 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800'
                        : 'bg-slate-50 text-slate-700 border border-slate-200 dark:bg-slate-700/50 dark:text-slate-300 dark:border-slate-600'
                  }`}
                >
                  <span>
                    {getBalanceChange() >= 0
                      ? `+${formatCurrency(getBalanceChange())}`
                      : formatCurrency(getBalanceChange())}
                  </span>
                  <span className="text-xs opacity-75">
                    {getBalanceChange() > 0
                      ? 'Increase'
                      : getBalanceChange() < 0
                        ? 'Decrease'
                        : 'No change'}
                  </span>
                </FlexBetween>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                placeholder="Add any notes about this balance update..."
              />
            </div>
          </div>

          {/* Error/Success Messages */}
          {bulkUpdateMutation.isError && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
              <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0" />
              <span>Failed to update balance. Please try again.</span>
            </div>
          )}

          {bulkUpdateMutation.isSuccess && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center dark:bg-green-900/20 dark:border-green-800 dark:text-green-300">
              <CheckCircle className="h-5 w-5 mr-3 flex-shrink-0" />
              <span>Monthly balance updated successfully!</span>
            </div>
          )}

          {/* Action Buttons */}
          <FlexBetween className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 justify-end">
            <div></div>
            <HStack gap={3}>
              <Button type="button" onClick={onClose} variant="secondary-muted">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={bulkUpdateMutation.isPending || !balance || !account}
                variant="primary-compact-lg"
              >
                {bulkUpdateMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Update Balance
                  </>
                )}
              </Button>
            </HStack>
          </FlexBetween>
        </form>
      </div>
    </HStack>
  );
};

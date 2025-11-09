import React, { useState, useEffect, useCallback } from 'react';
import {
  Upload,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  Trash2,
  Check,
  CheckSquare,
  Square,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { useToast } from '../../../components/ui/Toast';
import { useAuth } from '../../../contexts/AuthContext';
import { TransactionPreviewStats } from '../../../components/ui/TransactionPreviewStats';
import { TransactionEditRow } from '../../../components/ui/TransactionEditRow';
import { AccountMismatchWarning } from '../../../components/ui/AccountMismatchWarning';
import type { Account, Category } from '../../../types';
import { FlexBetween, HStack } from '../../../components/ui/Layout';

interface ParsedTransaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  category?: string;
  accountId?: number;
  type: 'income' | 'expense' | 'transfer';
  merchant?: string;
  notes?: string;
  confidence?: number;
  status: 'pending' | 'verified' | 'edited' | 'error';
  errors?: string[];
  originalData?: Record<string, any>;
}

interface TransactionPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: ParsedTransaction[];
  accounts: Account[];
  categories: Category[];
  detectedAccount?: Account;
  onSave: (transactions: ParsedTransaction[], selectedAccount: Account) => Promise<void>;
  fileName: string;
  fileType: string;
}

const TransactionPreview: React.FC<TransactionPreviewProps> = ({
  isOpen,
  onClose,
  transactions: initialTransactions,
  accounts,
  categories,
  detectedAccount,
  onSave,
  fileName,
  fileType,
}) => {
  const { state: authState } = useAuth();
  const { showSuccess, showError } = useToast();

  const [transactions, setTransactions] = useState<ParsedTransaction[]>(initialTransactions);
  const [selectedAccount, setSelectedAccount] = useState<Account>(detectedAccount || accounts[0]);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [editingTransaction, setEditingTransaction] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'verified' | 'error'>('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAccountWarning, setShowAccountWarning] = useState(false);

  // Check for account mismatch warning
  useEffect(() => {
    if (detectedAccount && selectedAccount.id !== detectedAccount.id) {
      setShowAccountWarning(true);
    } else {
      setShowAccountWarning(false);
    }
  }, [selectedAccount, detectedAccount]);

  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch =
      tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.merchant?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.amount.toString().includes(searchTerm);

    const matchesStatus = filterStatus === 'all' || tx.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const handleTransactionEdit = useCallback(
    (id: string, field: keyof ParsedTransaction, value: any) => {
      setTransactions((prev) =>
        prev.map((tx) =>
          tx.id === id
            ? {
                ...tx,
                [field]: value,
                status: tx.status === 'pending' ? 'edited' : tx.status,
              }
            : tx
        )
      );
    },
    []
  );

  const handleSelectAll = () => {
    if (selectedTransactions.size === filteredTransactions.length) {
      setSelectedTransactions(new Set());
    } else {
      setSelectedTransactions(new Set(filteredTransactions.map((tx) => tx.id)));
    }
  };

  const handleBulkAction = (action: 'verify' | 'delete' | 'duplicate') => {
    const selectedIds = Array.from(selectedTransactions);

    if (action === 'verify') {
      setTransactions((prev) =>
        prev.map((tx) =>
          selectedIds.includes(tx.id) ? { ...tx, status: 'verified' as const } : tx
        )
      );
    } else if (action === 'delete') {
      setTransactions((prev) => prev.filter((tx) => !selectedIds.includes(tx.id)));
    }

    setSelectedTransactions(new Set());
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const validTransactions = transactions.filter((tx) => tx.status !== 'error');
      await onSave(validTransactions, selectedAccount);
      showSuccess('Success', `Imported ${validTransactions.length} transactions successfully`);
      onClose();
    } catch (error: any) {
      showError('Import failed', error.message || 'Failed to import transactions');
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusColor = (status: ParsedTransaction['status']) => {
    switch (status) {
      case 'verified':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'edited':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    }
  };

  const stats = {
    total: transactions.length,
    pending: transactions.filter((tx) => tx.status === 'pending').length,
    verified: transactions.filter((tx) => tx.status === 'verified').length,
    edited: transactions.filter((tx) => tx.status === 'edited').length,
    errors: transactions.filter((tx) => tx.status === 'error').length,
    totalAmount: transactions.reduce((sum, tx) => sum + tx.amount, 0),
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Transaction Preview & Verification" size="full">
      <div className="flex flex-col h-full max-h-[90vh]">
        {/* Header */}
        <div className="flex-shrink-0 space-y-4 p-6 border-b border-gray-200 dark:border-gray-700">
          {/* File info and account selection */}
          <FlexBetween>
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {fileName} ({fileType.toUpperCase()})
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {stats.total} transactions found
              </p>
            </div>

            <HStack className="space-x-4">
              <HStack className="space-x-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Import to Account:
                </label>
                <select
                  value={selectedAccount.id}
                  onChange={(e) => {
                    const account = accounts.find((a) => a.id === Number(e.target.value));
                    if (account) setSelectedAccount(account);
                  }}
                  className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1 text-sm"
                >
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({account.account_type})
                    </option>
                  ))}
                </select>
              </HStack>
            </HStack>
          </FlexBetween>

          {/* Account warning */}
          {showAccountWarning && detectedAccount && (
            <AccountMismatchWarning
              detectedAccount={detectedAccount}
              selectedAccount={selectedAccount}
              onSwitchAccount={setSelectedAccount}
            />
          )}

          {/* Statistics */}
          <TransactionPreviewStats stats={stats} authUser={authState.user} />

          {/* Controls */}
          <FlexBetween>
            <HStack className="space-x-4">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm w-64"
                />
              </div>

              {/* Status filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="error">Errors</option>
              </select>

              {/* Bulk actions */}
              {selectedTransactions.size > 0 && (
                <HStack className="space-x-2">
                  <span className="text-sm text-gray-500">
                    {selectedTransactions.size} selected
                  </span>
                  <Button size="sm" variant="outline" onClick={() => handleBulkAction('verify')}>
                    <Check className="w-4 h-4 mr-1" />
                    Verify
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleBulkAction('delete')}>
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </HStack>
              )}
            </HStack>

            <HStack className="space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              >
                <Filter className="w-4 h-4 mr-1" />
                Filters
                {showAdvancedFilters ? (
                  <ChevronUp className="w-4 h-4 ml-1" />
                ) : (
                  <ChevronDown className="w-4 h-4 ml-1" />
                )}
              </Button>
            </HStack>
          </FlexBetween>
        </div>

        {/* Transaction table */}
        <div className="flex-1 overflow-auto">
          <div className="min-w-full">
            <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                <tr>
                  <th className="w-8 px-4 py-3">
                    <button onClick={handleSelectAll}>
                      {selectedTransactions.size === filteredTransactions.length ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredTransactions.map((transaction) => (
                  <TransactionEditRow
                    key={transaction.id}
                    transaction={transaction}
                    categories={categories}
                    isSelected={selectedTransactions.has(transaction.id)}
                    isEditing={editingTransaction === transaction.id}
                    authUser={authState.user}
                    onSelect={(selected) => {
                      const newSelected = new Set(selectedTransactions);
                      if (selected) {
                        newSelected.add(transaction.id);
                      } else {
                        newSelected.delete(transaction.id);
                      }
                      setSelectedTransactions(newSelected);
                    }}
                    onEdit={handleTransactionEdit}
                    onStartEdit={() => setEditingTransaction(transaction.id)}
                    onStopEdit={() => setEditingTransaction(null)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <FlexBetween className="flex-shrink-0 p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Showing {filteredTransactions.length} of {transactions.length} transactions
          </div>

          <HStack className="space-x-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={isSaving} disabled={stats.errors > 0}>
              <Upload className="w-4 h-4 mr-2" />
              Import {transactions.filter((tx) => tx.status !== 'error').length} Transactions
            </Button>
          </HStack>
        </FlexBetween>
      </div>
    </Modal>
  );
};

// TransactionRow moved to separate TransactionEditRow component for better single responsibility

export default TransactionPreview;

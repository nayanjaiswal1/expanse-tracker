import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Edit3,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  Trash2,
  Save,
  Eye,
} from 'lucide-react';
import { apiClient } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { useAccounts, useCategories } from '../../hooks/finance';
import { formatCurrency } from '../../utils/preferences';
import { useToast } from '../../components/ui/Toast';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { checkboxClassName } from '../../components/ui/Checkbox';
import { Button } from '../../components/ui/Button';
import type { Transaction } from '../../types';
import { FlexBetween, HStack } from '../../components/ui/Layout';

interface StatementViewerProps {}

interface EditableTransaction extends Omit<Transaction, 'id' | 'amount'> {
  id: string;
  amount: number;
  isEditing?: boolean;
  originalData?: Partial<Transaction>;
}

export const StatementViewer: React.FC<StatementViewerProps> = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { state: authState } = useAuth();
  const accountsQuery = useAccounts();
  const categoriesQuery = useCategories();
  const { showSuccess, showError } = useToast();

  const uploadSessionId = searchParams.get('upload_session');
  const [transactions, setTransactions] = useState<EditableTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadSession, setUploadSession] = useState<any>(null);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<keyof Transaction>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);

  // Bulk edit state
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [bulkEditData, setBulkEditData] = useState<{
    account_id?: number;
    category_id?: string;
    tags?: string[];
    verified?: boolean;
  }>({});

  // Load transactions for the upload session
  useEffect(() => {
    const loadData = async () => {
      if (!uploadSessionId) {
        navigate('/upload');
        return;
      }

      try {
        setLoading(true);

        // Load upload session details
        const sessions = await apiClient.getUploadSessions();
        const session = sessions.find((s: any) => s.id.toString() === uploadSessionId);
        if (!session) {
          showError('Upload session not found');
          navigate('/upload');
          return;
        }
        setUploadSession(session);

        // Load transactions for this session
        const response = await apiClient.getTransactions({
          upload_session: parseInt(uploadSessionId),
        });

        setTransactions(response.results || []);
      } catch (error) {
        console.error('Failed to load statement data:', error);
        showError('Failed to load statement data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [uploadSessionId, navigate, showError]);

  // Filter and sort transactions
  const filteredAndSortedTransactions = useMemo(() => {
    const filtered = transactions.filter((transaction) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          transaction.description.toLowerCase().includes(query) ||
          transaction.category_name?.toLowerCase().includes(query) ||
          transaction.account_name?.toLowerCase().includes(query) ||
          transaction.tags.some((tag) => tag.toLowerCase().includes(query))
        );
      }
      return true;
    });

    // Sort transactions
    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (sortField === 'amount') {
        // amount is already a number
      } else if (sortField === 'date') {
        aValue = new Date(aValue as string).getTime();
        bValue = new Date(bValue as string).getTime();
      }

      if (sortDirection === 'asc') {
        return (aValue || 0) > (bValue || 0) ? 1 : -1;
      } else {
        return (aValue || 0) < (bValue || 0) ? 1 : -1;
      }
    });

    return filtered;
  }, [transactions, searchQuery, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredAndSortedTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSort = (field: keyof Transaction) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleSelectTransaction = (transactionId: string) => {
    const newSelected = new Set(selectedTransactions);
    if (newSelected.has(transactionId)) {
      newSelected.delete(transactionId);
    } else {
      newSelected.add(transactionId);
    }
    setSelectedTransactions(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedTransactions.size === paginatedTransactions.length) {
      setSelectedTransactions(new Set());
    } else {
      setSelectedTransactions(new Set(paginatedTransactions.map((t) => t.id.toString())));
    }
  };

  const startEditing = (transactionId: string) => {
    setTransactions((prev) =>
      prev.map((t) =>
        t.id === transactionId ? { ...t, isEditing: true, originalData: { ...t } } : t
      )
    );
  };

  const cancelEditing = (transactionId: string) => {
    setTransactions((prev) =>
      prev.map((t) =>
        t.id === transactionId && t.originalData
          ? { ...t, ...t.originalData, isEditing: false, originalData: undefined }
          : { ...t, isEditing: false, originalData: undefined }
      )
    );
  };

  const saveTransaction = async (transactionId: string) => {
    const transaction = transactions.find((t) => t.id === transactionId);
    if (!transaction) return;

    try {
      const updatedTransaction = await apiClient.updateTransaction(transactionId, {
        description: transaction.description,
        amount: transaction.amount,
        date: transaction.date,
        account_id: transaction.account_id,
        category_id: transaction.category_id,
        notes: transaction.notes || '',
        tags: transaction.tags,
        verified: transaction.verified,
      });

      setTransactions((prev) =>
        prev.map((t) =>
          t.id === transactionId
            ? { ...updatedTransaction, isEditing: false, originalData: undefined }
            : t
        )
      );

      showSuccess('Transaction updated successfully');
    } catch (error) {
      showError('Failed to update transaction');
      console.error('Update failed:', error);
    }
  };

  const updateTransactionField = (transactionId: string, field: keyof Transaction, value: any) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === transactionId ? { ...t, [field]: value } : t))
    );
  };

  const deleteTransaction = async () => {
    if (!transactionToDelete) return;

    try {
      await apiClient.deleteTransaction(transactionToDelete);
      setTransactions((prev) => prev.filter((t) => t.id !== transactionToDelete));
      showSuccess('Transaction deleted successfully');
      setTransactionToDelete(null);
    } catch (error) {
      showError('Failed to delete transaction');
      setTransactionToDelete(null);
    }
  };

  const handleBulkEdit = async () => {
    if (selectedTransactions.size === 0) return;

    try {
      const selectedIds = Array.from(selectedTransactions);

      // Apply bulk changes
      const updates: any = {};
      if (bulkEditData.account_id) updates.account_id = bulkEditData.account_id;
      if (bulkEditData.category_id) updates.category_id = bulkEditData.category_id;
      if (bulkEditData.tags && bulkEditData.tags.length > 0) updates.tags = bulkEditData.tags;
      if (bulkEditData.verified !== undefined) updates.verified = bulkEditData.verified;

      await apiClient.bulkUpdateTransactions(selectedIds, updates);

      // Update local state
      setTransactions((prev) =>
        prev.map((t) => (selectedIds.includes(t.id) ? { ...t, ...updates } : t))
      );

      setSelectedTransactions(new Set());
      setBulkEditMode(false);
      setBulkEditData({});
      showSuccess(`Updated ${selectedIds.length} transactions`);
    } catch (error) {
      showError('Failed to update transactions');
    }
  };

  const handleExport = async () => {
    try {
      const blob = await apiClient.exportTransactions('excel', Array.from(selectedTransactions));
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `statement-${uploadSession?.filename || 'export'}-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showSuccess('Transactions exported successfully');
    } catch (error) {
      showError('Failed to export transactions');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!uploadSession) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Upload session not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <FlexBetween>
        <HStack gap={4}>
          <Button onClick={() => navigate('/upload')} variant="icon-toolbar" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Statement Viewer</h1>
            <p className="text-gray-600">{uploadSession.filename}</p>
          </div>
        </HStack>

        <HStack gap={3}>
          {uploadSession.original_filename && (
            <Button
              onClick={() => setShowPdfPreview(true)}
              variant="outline-white"
              size="none"
              className="flex items-center gap-2 px-4 py-2 text-sm"
            >
              <Eye className="w-4 h-4" />
              View PDF
            </Button>
          )}

          <Button
            onClick={handleExport}
            disabled={selectedTransactions.size === 0}
            variant="success"
            className="flex items-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" />
            Export Selected
          </Button>
        </HStack>
      </FlexBetween>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="text-2xl font-bold text-gray-900">{transactions.length}</div>
          <div className="text-sm text-gray-600">Total Transactions</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(
              transactions.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0),
              authState.user
            )}
          </div>
          <div className="text-sm text-gray-600">Total Income</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="text-2xl font-bold text-red-600">
            {formatCurrency(
              Math.abs(
                transactions.filter((t) => t.amount < 0).reduce((sum, t) => sum + t.amount, 0)
              ),
              authState.user
            )}
          </div>
          <div className="text-sm text-gray-600">Total Expenses</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="text-2xl font-bold text-blue-600">{selectedTransactions.size}</div>
          <div className="text-sm text-gray-600">Selected</div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <HStack gap={4}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {selectedTransactions.size > 0 && (
              <button
                onClick={() => setBulkEditMode(!bulkEditMode)}
                className="flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Bulk Edit ({selectedTransactions.size})
              </button>
            )}
          </HStack>

          <HStack gap={4}>
            <select
              value={`${sortField}-${sortDirection}`}
              onChange={(e) => {
                const [field, direction] = e.target.value.split('-');
                setSortField(field as keyof Transaction);
                setSortDirection(direction as 'asc' | 'desc');
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="date-desc">Date (Newest First)</option>
              <option value="date-asc">Date (Oldest First)</option>
              <option value="amount-desc">Amount (High to Low)</option>
              <option value="amount-asc">Amount (Low to High)</option>
              <option value="description-asc">Description (A-Z)</option>
              <option value="description-desc">Description (Z-A)</option>
            </select>

            <select
              value={itemsPerPage}
              onChange={() => setCurrentPage(1)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          </HStack>
        </div>

        {/* Bulk Edit Panel */}
        {bulkEditMode && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-sm font-medium text-blue-900 mb-3">
              Bulk Edit {selectedTransactions.size} Transactions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Account</label>
                <select
                  value={bulkEditData.account_id || ''}
                  onChange={(e) =>
                    setBulkEditData((prev) => ({
                      ...prev,
                      account_id: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Keep current</option>
                  {(accountsQuery.data || []).map((account: Account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={bulkEditData.category_id || ''}
                  onChange={(e) =>
                    setBulkEditData((prev) => ({
                      ...prev,
                      category_id: e.target.value || undefined,
                    }))
                  }
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Keep current</option>
                  {(categoriesQuery.data || []).map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Verified</label>
                <select
                  value={
                    bulkEditData.verified === undefined ? '' : bulkEditData.verified.toString()
                  }
                  onChange={(e) =>
                    setBulkEditData((prev) => ({
                      ...prev,
                      verified: e.target.value === '' ? undefined : e.target.value === 'true',
                    }))
                  }
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Keep current</option>
                  <option value="true">Verified</option>
                  <option value="false">Unverified</option>
                </select>
              </div>

              <HStack gap={2} className="items-end">
                <Button
                  onClick={handleBulkEdit}
                  variant="primary"
                  className="flex items-center gap-2 text-sm"
                >
                  <Save className="w-4 h-4" />
                  Apply
                </Button>
                <Button
                  onClick={() => {
                    setBulkEditMode(false);
                    setBulkEditData({});
                  }}
                  variant="outline-white"
                  size="none"
                  className="px-4 py-2 text-sm"
                >
                  Cancel
                </Button>
              </HStack>
            </div>
          </div>
        )}
      </div>

      {/* Excel-like Table */}
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="overflow-x-auto max-h-600px">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="w-12 px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={
                      selectedTransactions.size === paginatedTransactions.length &&
                      paginatedTransactions.length > 0
                    }
                    onChange={handleSelectAll}
                    className={checkboxClassName}
                  />
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('date')}
                >
                  Date {sortField === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('description')}
                >
                  Description {sortField === 'description' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('amount')}
                >
                  Amount {sortField === 'amount' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Account
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedTransactions.map((transaction, index) => (
                <tr
                  key={transaction.id}
                  className={`hover:bg-gray-50 ${selectedTransactions.has(transaction.id) ? 'bg-blue-50' : index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedTransactions.has(transaction.id)}
                      onChange={() => handleSelectTransaction(transaction.id)}
                      className={checkboxClassName}
                    />
                  </td>

                  <td className="px-4 py-3 text-sm">
                    {transaction.isEditing ? (
                      <input
                        type="date"
                        value={transaction.date}
                        onChange={(e) =>
                          updateTransactionField(transaction.id, 'date', e.target.value)
                        }
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      new Date(transaction.date).toLocaleDateString()
                    )}
                  </td>

                  <td className="px-4 py-3 text-sm">
                    {transaction.isEditing ? (
                      <input
                        type="text"
                        value={transaction.description}
                        onChange={(e) =>
                          updateTransactionField(transaction.id, 'description', e.target.value)
                        }
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <div className="max-w-xs truncate" title={transaction.description}>
                        {transaction.description}
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3 text-sm">
                    {transaction.isEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        value={transaction.amount}
                        onChange={(e) =>
                          updateTransactionField(
                            transaction.id,
                            'amount',
                            parseFloat(e.target.value)
                          )
                        }
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <span
                        className={
                          transaction.amount >= 0
                            ? 'text-green-600 font-medium'
                            : 'text-red-600 font-medium'
                        }
                      >
                        {formatCurrency(transaction.amount, authState.user)}
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-sm">
                    {transaction.isEditing ? (
                      <select
                        value={transaction.category_id || ''}
                        onChange={(e) =>
                          updateTransactionField(
                            transaction.id,
                            'category_id',
                            e.target.value || null
                          )
                        }
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">No category</option>
                        {(categoriesQuery.data || []).map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-gray-900">
                        {transaction.category_name || 'Uncategorized'}
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-sm">
                    {transaction.isEditing ? (
                      <select
                        value={transaction.account_id || ''}
                        onChange={(e) =>
                          updateTransactionField(
                            transaction.id,
                            'account_id',
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select account</option>
                        {(accountsQuery.data || []).map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-gray-900">{transaction.account_name}</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        transaction.verified
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {transaction.verified ? 'Verified' : 'Pending'}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-sm">
                    <HStack gap={2}>
                      {transaction.isEditing ? (
                        <>
                          <button
                            onClick={() => saveTransaction(transaction.id)}
                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                            title="Save changes"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => cancelEditing(transaction.id)}
                            className="p-1 text-gray-400 hover:bg-gray-50 rounded"
                            title="Cancel editing"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEditing(transaction.id)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit transaction"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setTransactionToDelete(transaction.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Delete transaction"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </HStack>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
            <FlexBetween>
              <HStack className="text-sm text-gray-700">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                {Math.min(currentPage * itemsPerPage, filteredAndSortedTransactions.length)} of{' '}
                {filteredAndSortedTransactions.length} transactions
              </HStack>
              <HStack gap={2}>
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                <HStack gap={1}>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 text-sm rounded ${
                          currentPage === page
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </HStack>

                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </HStack>
            </FlexBetween>
          </div>
        )}
      </div>

      {/* PDF Preview Modal */}
      {showPdfPreview && uploadSession.original_filename && (
        <HStack className="fixed inset-0 bg-black bg-opacity-50 z-50 justify-center">
          <div className="bg-white rounded-lg w-11/12 h-5/6 flex flex-col">
            <FlexBetween className="p-4 border-b">
              <h3 className="text-lg font-medium">PDF Preview - {uploadSession.filename}</h3>
              <button
                onClick={() => setShowPdfPreview(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </FlexBetween>
            <div className="flex-1 p-4">
              <iframe
                src={`/api/v1/uploads/${uploadSessionId}/preview/`}
                className="w-full h-full border rounded"
                title="PDF Preview"
              />
            </div>
          </div>
        </HStack>
      )}

      <ConfirmDialog
        isOpen={!!transactionToDelete}
        onClose={() => setTransactionToDelete(null)}
        onConfirm={deleteTransaction}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction?"
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};

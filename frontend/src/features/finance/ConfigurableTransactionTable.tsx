import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ConfigurableNotionTable } from '../../components/ui/NotionTable/ConfigurableNotionTable';
import { useAuth } from '../../contexts/AuthContext';
import { createTransactionTableConfig } from './configs/transactionTableConfig';
import type { Transaction } from '../../types';
import { BulkActionsPanel } from './components/BulkActionsPanel';
import { TransactionFilters } from './components/TransactionFilters';
import { TransactionCardList } from './components/TransactionCardList';
import { useTransactionData } from './hooks/useTransactionData';
import { useTransactionFiltersWithURL } from './hooks/useTransactionFiltersWithURL';
import { apiClient } from '../../api/client';
import { ConversationalTransactionChat } from './components/ConversationalTransactionChat';
import InvoiceUploadModal from './components/InvoiceUploadModal';

const normalizeTablePreferences = (prefs: Record<string, any> | undefined | null) => {
  if (!prefs || typeof prefs !== 'object') {
    return {} as Record<
      string,
      { visibility: Record<string, boolean>; sizing: Record<string, number> }
    >;
  }

  const result: Record<
    string,
    { visibility: Record<string, boolean>; sizing: Record<string, number> }
  > = {};

  Object.entries(prefs).forEach(([table, config]) => {
    if (config && typeof config === 'object' && ('visibility' in config || 'sizing' in config)) {
      result[table] = {
        visibility: { ...(config.visibility || {}) },
        sizing: { ...(config.sizing || {}) },
      };
    } else if (config && typeof config === 'object') {
      result[table] = {
        visibility: { ...config },
        sizing: {},
      };
    } else {
      result[table] = {
        visibility: {},
        sizing: {},
      };
    }
  });

  return result;
};

export const ConfigurableTransactionTable = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { state: authState, updateUser } = useAuth();
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);

  // Handle pagination from URL
  const handlePageChange = useCallback(
    (page: number) => {
      const newParams = new URLSearchParams(searchParams);
      newParams.set('page', String(page));
      setSearchParams(newParams);
    },
    [searchParams, setSearchParams]
  );

  const normalizedPreferences = useMemo(
    () => normalizeTablePreferences(authState.user?.table_column_preferences),
    [authState.user?.table_column_preferences]
  );

  // Memoize the sizing object to prevent unnecessary updates
  const serverSizing = useMemo(
    () => normalizedPreferences.transactions?.sizing || {},
    [normalizedPreferences.transactions?.sizing]
  );

  // Use a ref to track if we're currently updating from user action
  const isUserResizing = useRef(false);

  const [columnSizing, setColumnSizing] = useState<Record<string, number>>(serverSizing);

  useEffect(() => {
    // Only update from server if we're not currently resizing
    if (isUserResizing.current) return;

    setColumnSizing((prev) => {
      const prevKeys = Object.keys(prev);
      const serverKeys = Object.keys(serverSizing);
      const hasDiff =
        prevKeys.length !== serverKeys.length ||
        serverKeys.some((key) => prev[key] !== serverSizing[key]);
      return hasDiff ? { ...serverSizing } : prev;
    });
  }, [serverSizing]);

  const saveSizingTimeout = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (saveSizingTimeout.current) {
        window.clearTimeout(saveSizingTimeout.current);
      }
    },
    []
  );

  const persistColumnSizing = useCallback(
    (sizing: Record<string, number>) => {
      if (saveSizingTimeout.current) {
        window.clearTimeout(saveSizingTimeout.current);
      }

      saveSizingTimeout.current = window.setTimeout(async () => {
        try {
          const normalizedSizing: Record<string, number> = {};
          Object.entries(sizing).forEach(([key, value]) => {
            normalizedSizing[key] = Number(value);
          });

          const existingPrefs = normalizeTablePreferences(authState.user?.table_column_preferences);
          const updatedPrefs = {
            ...existingPrefs,
            transactions: {
              visibility: { ...(existingPrefs.transactions?.visibility || {}) },
              sizing: normalizedSizing,
            },
          };

          const updatedUser = await apiClient.updateUserPreferences({
            table_column_preferences: updatedPrefs,
          });
          updateUser(updatedUser);
        } catch (error) {
          console.error('Failed to persist column sizing preferences', error);
        } finally {
          saveSizingTimeout.current = null;
        }
      }, 800);
    },
    [authState.user?.table_column_preferences, updateUser]
  );

  const handleColumnSizingChange = useCallback(
    (sizing: Record<string, number>) => {
      isUserResizing.current = true;
      setColumnSizing(sizing);
      persistColumnSizing(sizing);
      // Reset the flag after a short delay
      setTimeout(() => {
        isUserResizing.current = false;
      }, 100);
    },
    [persistColumnSizing]
  );

  // Custom hooks for data and filtering
  const {
    transactions,
    accounts,
    categories,
    accountSelectOptions,
    categorySelectOptions,
    transactionsQuery,
    updateTransactionMutation,
    deleteTransactionMutation,
    createTransactionMutation,
    bulkUpdateTransactionsMutation,
    bulkDeleteTransactionsMutation,
    paginationInfo,
  } = useTransactionData();

  const handleUpdate = useCallback(
    async (id: number, field: keyof Transaction, value: any) => {
      let processedValue = value;

      if (field === 'account_id' && typeof value === 'string' && value !== '') {
        processedValue = parseInt(value, 10);
      }

      if ((field === 'category_id' || field === 'account_id') && value === '') {
        processedValue = null;
      }

      await updateTransactionMutation.mutateAsync({
        id,
        data: { [field]: processedValue },
      });
    },
    [updateTransactionMutation]
  );

  const handleMultiFieldUpdate = useCallback(
    async (id: number, fields: Partial<Transaction>) => {
      await updateTransactionMutation.mutateAsync({
        id,
        data: fields,
      });
    },
    [updateTransactionMutation]
  );

  // Use URL-based filter hook for backend filtering
  const {
    dateFilterMode,
    customDateRange,
    accountFilter,
    categoryFilter,
    statusFilter,
    searchQuery,
    setDateFilterMode,
    setCustomDateRange,
    setAccountFilter,
    setCategoryFilter,
    setStatusFilter,
    setSearchQuery,
    sorting,
    setSorting,
    dateFilterDisplay,
    clearAllFilters,
  } = useTransactionFiltersWithURL();

  // Temporary: verification filter (can be added to URL-based hook later)
  const [verificationFilter, setVerificationFilter] = useState<string[]>([]);

  // Bulk actions state
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkAccount, setBulkAccount] = useState<string>('');
  const [bulkCategory, setBulkCategory] = useState<string>('');
  const [bulkVerified, setBulkVerified] = useState<boolean | null>(null);

  // Bulk action handlers
  const handleBulkDelete = async () => {
    if (selectedRows.length > 0) {
      await bulkDeleteTransactionsMutation.mutateAsync(selectedRows);
      setSelectedRows([]);
      setShowBulkActions(false);
    }
  };

  const handleBulkUpdateFields = async () => {
    if (selectedRows.length === 0) return;

    const updates = selectedRows.map((id) => {
      const update: any = { id };
      if (bulkAccount) update.account_id = parseInt(bulkAccount);
      if (bulkCategory) update.category_id = bulkCategory;
      if (bulkVerified !== null) update.verified = bulkVerified;
      return update;
    });

    await bulkUpdateTransactionsMutation.mutateAsync(updates);
    setSelectedRows([]);
    setShowBulkActions(false);
    setBulkAccount('');
    setBulkCategory('');
    setBulkVerified(null);
  };

  // Filter rendering
  const renderFilters = useCallback(
    () => (
      <TransactionFilters
        dateFilterMode={dateFilterMode}
        onDateFilterModeChange={setDateFilterMode}
        customDateRange={customDateRange}
        onCustomDateRangeChange={setCustomDateRange}
        accountFilter={accountFilter}
        onAccountFilterChange={setAccountFilter}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        verificationFilter={verificationFilter}
        onVerificationFilterChange={setVerificationFilter}
        accountOptions={accountSelectOptions}
        categoryOptions={categorySelectOptions}
        dateFilterDisplay={dateFilterDisplay}
        onClearAll={clearAllFilters}
        selectedCount={selectedRows.length}
        onBulkActionsClick={() => {
          if (selectedRows.length > 0) {
            setShowBulkActions((current) => !current);
          }
        }}
        searchQuery={searchQuery}
        onUploadInvoice={() => setShowInvoiceModal(true)}
        onSearchQueryChange={setSearchQuery}
      />
    ),
    [
      dateFilterMode,
      customDateRange,
      accountFilter,
      categoryFilter,
      statusFilter,
      verificationFilter,
      searchQuery,
      accountSelectOptions,
      categorySelectOptions,
      dateFilterDisplay,
      selectedRows.length,
      clearAllFilters,
      setSearchQuery,
    ]
  );

  const handleBulkUpdate = useCallback(
    async (updates: Array<{ id: number } & Partial<Transaction>>) => {
      const processedUpdates = updates.map((update) => {
        const processed: any = { ...update };

        if (processed.account !== undefined) {
          processed.account_id =
            typeof processed.account === 'string' ? parseInt(processed.account) : processed.account;
          delete processed.account;
        }

        if (processed.category !== undefined) {
          processed.category_id = processed.category;
          delete processed.category;
        }

        return processed;
      });

      await bulkUpdateTransactionsMutation.mutateAsync(processedUpdates);
    },
    [bulkUpdateTransactionsMutation]
  );

  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isMobile && selectedRows.length > 0) {
      setSelectedRows([]);
    }
  }, [isMobile, selectedRows.length]);

  useEffect(() => {
    if (selectedRows.length === 0 && showBulkActions) {
      setShowBulkActions(false);
    }
  }, [selectedRows.length, showBulkActions]);

  const showCurrency = useMemo(() => {
    if (transactions.length === 0) return true;

    const currencies = new Set(
      transactions.map(
        (t) =>
          t.currency ||
          authState.user?.preferred_currency ||
          authState.user?.default_currency ||
          'USD'
      )
    );

    return currencies.size > 1;
  }, [transactions, authState.user?.preferred_currency, authState.user?.default_currency]);

  const tableConfig = useMemo(
    () => ({
      ...createTransactionTableConfig(
        accounts,
        categories,
        authState,
        columnSizing,
        handleUpdate,
        showCurrency,
        handleMultiFieldUpdate
      ),
      onBulkUpdate: handleBulkUpdate,
      onBulkDelete: handleBulkDelete,
      renderFilters,
      onColumnSizeChange: handleColumnSizingChange,
    }),
    [
      accounts,
      categories,
      authState,
      columnSizing,
      handleUpdate,
      showCurrency,
      handleMultiFieldUpdate,
      handleBulkUpdate,
      renderFilters,
      handleColumnSizingChange,
    ]
  );

  const handleDelete = async (transaction: Transaction) => {
    await deleteTransactionMutation.mutateAsync(transaction.id);
  };

  const handleDuplicate = async (transaction: Transaction) => {
    const { id, user_id, created_at, updated_at, ...transactionData } = transaction;
    await createTransactionMutation.mutateAsync(transactionData);
  };

  // Pagination info from API response
  const currentPage = paginationInfo?.page || 1;
  const totalPages = paginationInfo?.totalPages || 1;
  const pageSize = paginationInfo?.pageSize || 50;
  const totalCount = paginationInfo?.count || 0;

  // ESC key to unselect all
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedRows.length > 0) {
        setSelectedRows([]);
        setShowBulkActions(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [selectedRows.length, setSelectedRows]);

  return (
    <div className="h-full flex flex-col relative">
      {isMobile ? (
        <div className="flex-1 overflow-auto pb-12">
          <div className="mb-3">{renderFilters()}</div>
          <TransactionCardList
            transactions={transactions}
            accounts={accounts}
            categories={categories}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
          />
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          <ConfigurableNotionTable
            data={transactions}
            config={tableConfig}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
            isLoading={transactionsQuery.isLoading}
            selectedRows={selectedRows}
            setSelectedRows={setSelectedRows}
            pagination={{
              currentPage,
              totalPages,
              pageSize,
              totalCount,
              onPageChange: handlePageChange,
            }}
            virtualize
            sorting={sorting}
            onSortingChange={setSorting}
            manualSorting
          />
        </div>
      )}

      {!isMobile && (
        <BulkActionsPanel
          isOpen={showBulkActions}
          onClose={() => setShowBulkActions(false)}
          selectedCount={selectedRows.length}
          bulkAccount={bulkAccount}
          onBulkAccountChange={setBulkAccount}
          bulkCategory={bulkCategory}
          onBulkCategoryChange={setBulkCategory}
          bulkVerified={bulkVerified}
          onBulkVerifiedChange={setBulkVerified}
          accountOptions={accountSelectOptions}
          categoryOptions={categorySelectOptions}
          onApplyChanges={handleBulkUpdateFields}
          onDelete={handleBulkDelete}
          isApplyDisabled={!bulkAccount && !bulkCategory && bulkVerified === null}
        />
      )}

      {!isMobile && (
        <ConversationalTransactionChat
          accounts={accounts}
          categories={categories}
          onTransactionsMutated={() => transactionsQuery.refetch()}
        />
      )}

      <InvoiceUploadModal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        onSuccess={() => transactionsQuery.refetch()}
      />
    </div>
  );
};

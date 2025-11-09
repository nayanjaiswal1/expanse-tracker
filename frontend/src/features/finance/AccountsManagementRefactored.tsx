import React, { useEffect, useRef, useState } from 'react';
import {
  Plus,
  CreditCard,
  PiggyBank,
  TrendingUp,
  Wallet,
  Building,
  Eye,
  EyeOff,
  CheckCircle,
  ArrowUp,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../utils/preferences';
import { useScrollToTop } from '../../hooks/useScrollToTop';
import { useAccountFilters, type AccountFilters } from './hooks/useAccountFilters';
import type { Account } from '../../types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';

import { AccountManagementFormData } from './schemas';
import { type FilterOption as FilterSelectOption } from './components/AccountFiltersBar';
import { PageToolbar } from '../../components/layout/PageToolbar';
import { Button } from '../../components/ui/Button';

// Import new components
import { AccountGrid } from './components/AccountGrid';
import { EmptyState } from './components/EmptyState';
import { AccountModal } from './components/AccountModal';
import { LoadingState } from './components/LoadingState';
import { ErrorState } from './components/ErrorState';
import { DragOverlay } from './components/DragOverlay';
import { FilterChips } from './components/FilterChips';
import { AccountsSidebar } from './components/AccountsSidebar';
import { accountStatusOptions, accountTypeOptions } from './constants/accountConstants';

export const AccountsManagement = () => {
  const { state: authState } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { filters, setFilter, clearAllFilters, hasActiveFilters } = useAccountFilters();

  // Build API filters from URL params
  const apiFilters = React.useMemo(() => {
    const params: Record<string, string> = {};
    if (filters.search) params.search = filters.search;
    if (filters.status && filters.status !== 'all') params.status = filters.status;
    if (filters.account_type) params.account_type = filters.account_type;
    if (filters.currency) params.currency = filters.currency;
    if (filters.institution) params.institution = filters.institution;
    return params;
  }, [filters]);

  const {
    data: accounts = [],
    isLoading: isLoadingAccounts,
    error: accountsError,
  } = useQuery<Account[], Error>({
    queryKey: ['accounts', apiFilters],
    queryFn: async () => {
      type AccountsResponse = Account[] | { results?: Account[] };
      const response = await apiClient.client.get<AccountsResponse>('/accounts/', {
        params: apiFilters,
      });
      return Array.isArray(response.data) ? response.data : (response.data.results ?? []);
    },
  });

  const { data: currencies = [] } = useQuery<{ code: string; name: string }[], Error>({
    queryKey: ['currencies'],
    queryFn: async () => {
      const response = await apiClient.client.get<{ currencies: { code: string; name: string }[] }>(
        '/integrations/currencies/'
      );
      return response.data.currencies;
    },
  });

  const { data: bankIcons = [] } = useQuery({
    queryKey: ['bank-icons'],
    queryFn: async () => {
      const response = await apiClient.client.get('/bank-icons/');
      return response.data;
    },
  });

  const currencyOptions = React.useMemo<FilterSelectOption[]>(
    () =>
      currencies.map((currency) => ({
        value: currency.code,
        label: `${currency.code} · ${currency.name}`,
      })),
    [currencies]
  );

  const institutionOptions = React.useMemo<FilterSelectOption[]>(() => {
    const unique = new Set(
      accounts
        .map((account) => account.institution?.trim())
        .filter((institution): institution is string => Boolean(institution))
    );

    const options = Array.from(unique)
      .sort((a, b) => a.localeCompare(b))
      .map((institution) => ({
        value: institution,
        label: institution,
      }));

    return options;
  }, [accounts]);

  const updateFilter = React.useCallback(
    <K extends keyof AccountFilters>(key: K, value: AccountFilters[K]) => {
      const normalized =
        typeof value === 'string' && value.trim() === '' ? (undefined as AccountFilters[K]) : value;
      setFilter(key, normalized);
    },
    [setFilter]
  );

  const createAccountMutation = useMutation<
    Account,
    Error,
    Omit<Account, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  >({
    mutationFn: (accountData) => apiClient.createAccount(accountData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setShowAddModal(false);
    },
  });

  const updateAccountMutation = useMutation<
    Account,
    Error,
    { id: number; account: Partial<Account> }
  >({
    mutationFn: (variables) => apiClient.updateAccount(variables.id, variables.account),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setShowAddModal(false);
    },
  });

  const deleteAccountMutation = useMutation<void, Error, number>({
    mutationFn: apiClient.deleteAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });

  // Account management state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [showBalances, setShowBalances] = useState(true);
  const [activeSidePanel, setActiveSidePanel] = useState<'filters' | 'overview' | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [selectedAccountForHistory, setSelectedAccountForHistory] = useState<Account | null>(null);
  const [isPageDragOver, setIsPageDragOver] = useState(false);

  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [dragOverAccount, setDragOverAccount] = useState<number | null>(null);
  const { showSuccess, showError } = useToast();
  const filterPanelRef = useRef<HTMLDivElement>(null);
  const overviewPanelRef = useRef<HTMLDivElement>(null);

  const handleTogglePanel = (panel: 'filters' | 'overview') => {
    setActiveSidePanel((previous) => {
      const next = previous === panel ? null : panel;
      const target = panel === 'filters' ? filterPanelRef.current : overviewPanelRef.current;
      requestAnimationFrame(() => {
        if (next === panel && target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
      return next;
    });
  };

  // Scroll to top functionality
  const { showScrollTop, scrollToTop } = useScrollToTop(300);

  useEffect(() => {
    const state = location.state as { openAddAccountModal?: boolean } | undefined;
    if (state?.openAddAccountModal) {
      setShowAddModal(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  const handleAccountSubmit = async (data: AccountManagementFormData) => {
    try {
      const accountData = {
        name: data.name,
        account_type: data.account_type,
        balance: String(data.balance || '0'),
        currency: data.currency || 'USD',
        institution: data.institution || '',
        account_number: data.account_number || '',
        icon: data.icon || '',
        is_active: data.is_active !== false,
        status: 'active' as const,
        priority: 'medium' as const,
        available_balance: '',
        minimum_balance: '',
        maximum_balance: '',
        credit_limit: '',
        interest_rate: '',
        routing_number: '',
        notes: '',
        tags: [],
        is_primary: false,
        include_in_budget: true,
        track_balance: true,
        metadata: {},
      };

      if (editingAccount) {
        await updateAccountMutation.mutateAsync({
          id: editingAccount.id,
          account: accountData,
        });
      } else {
        await createAccountMutation.mutateAsync(accountData);
      }

      setShowAddModal(false);
      setEditingAccount(null);
    } catch (error: unknown) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'An error occurred while saving the account.';
      throw new Error(message);
    }
  };

  const handleDelete = (account: Account) => {
    setAccountToDelete(account);
    setShowConfirmDelete(true);
  };

  const confirmDelete = async () => {
    if (accountToDelete) {
      try {
        await deleteAccountMutation.mutateAsync(accountToDelete.id);
        setShowConfirmDelete(false);
        setAccountToDelete(null);
      } catch (error: unknown) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : 'An error occurred while deleting the account.';
        showError('Delete failed', message);
      }
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent, accountId: number) => {
    e.preventDefault();
    setDragOverAccount(accountId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverAccount(null);
  };

  const handleDrop = async (e: React.DragEvent, accountId: number) => {
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
  };

  // Page-wide drag and drop handlers
  const handlePageDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsPageDragOver(true);
  };

  const handlePageDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // Only hide if leaving the main container
    if (e.currentTarget === e.target) {
      setIsPageDragOver(false);
    }
  };

  const handlePageDrop = (e: React.DragEvent) => {
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
  };

  const displayAccounts = accounts;

  const totalBalance = displayAccounts.reduce(
    (sum, account) => sum + parseFloat(account.balance.toString()),
    0
  );
  const accountTypeGroups = displayAccounts.reduce(
    (groups, account) => {
      if (!groups[account.account_type]) {
        groups[account.account_type] = [];
      }
      groups[account.account_type].push(account);
      return groups;
    },
    {} as Record<string, Account[]>
  );

  const overviewSummaryCards = React.useMemo(
    () => [
      {
        id: 'total',
        label: 'Total Accounts',
        value: displayAccounts.length,
        icon: CreditCard,
        iconColor: 'text-blue-500 dark:text-blue-300',
      },
      {
        id: 'balance',
        label: showBalances ? 'Total Balance' : 'Hidden',
        value: showBalances ? formatCurrency(totalBalance, authState.user) : '•••••',
        icon: showBalances ? Wallet : EyeOff,
        iconColor: showBalances
          ? 'text-emerald-500 dark:text-emerald-300'
          : 'text-secondary-400 dark:text-secondary-500',
      },
      {
        id: 'active',
        label: 'Active Accounts',
        value: displayAccounts.filter((account) => account.is_active).length,
        icon: CheckCircle,
        iconColor: 'text-emerald-500 dark:text-emerald-300',
      },
      {
        id: 'types',
        label: 'Account Types',
        value: Object.keys(accountTypeGroups).length,
        icon: Building,
        iconColor: 'text-purple-500 dark:text-purple-300',
      },
    ],
    [authState.user, accountTypeGroups, displayAccounts, showBalances, totalBalance]
  );

  const overviewActions = React.useMemo(
    () => [
      {
        id: 'toggle-balance',
        label: showBalances ? 'Hide amounts' : 'Show amounts',
        icon: showBalances ? EyeOff : Eye,
        onClick: () => setShowBalances((current) => !current),
        variant: 'ghost' as const,
      },
      {
        id: 'add-account',
        label: 'Add account',
        icon: Plus,
        onClick: () => setShowAddModal(true),
        variant: 'primary' as const,
      },
    ],
    [showBalances, setShowBalances, setShowAddModal]
  );

  const appliedFilterChips = React.useMemo(() => {
    const chips: Array<{ key: keyof AccountFilters; label: string }> = [];

    if (filters.search && filters.search.trim()) {
      chips.push({ key: 'search', label: `Search: ${filters.search.trim()}` });
    }

    if (filters.account_type) {
      const match = accountTypeOptions.find((option) => option.value === filters.account_type);
      chips.push({ key: 'account_type', label: match?.label || `Type: ${filters.account_type}` });
    }

    if (filters.status && filters.status !== 'all') {
      const match = accountStatusOptions.find((option) => option.value === filters.status);
      chips.push({ key: 'status', label: match?.label || `Status: ${filters.status}` });
    }

    if (filters.currency) {
      const match = currencyOptions.find((option) => option.value === filters.currency);
      chips.push({ key: 'currency', label: match?.label || `Currency: ${filters.currency}` });
    }

    if (filters.institution) {
      chips.push({ key: 'institution', label: filters.institution });
    }

    return chips;
  }, [currencyOptions, filters]);

  const handleFilterChipRemove = (key: keyof AccountFilters) => {
    if (key === 'status') {
      setFilter('status', 'all');
    } else if (key === 'search') {
      setFilter('search', '');
    } else {
      setFilter(key, undefined as AccountFilters[typeof key]);
    }
  };

  return (
    <div
      className="space-y-6 relative min-h-screen pt-6 px-4 sm:px-6 lg:px-8 pb-12"
      onDragOver={handlePageDragOver}
      onDragLeave={handlePageDragLeave}
      onDrop={handlePageDrop}
    >
      <DragOverlay isVisible={isPageDragOver} />

      {/* Modern Header with SummaryCards */}
      <PageToolbar
        searchValue={filters.search ?? ''}
        onSearchChange={(value) => setFilter('search', value)}
        onFilterClick={() => handleTogglePanel('filters')}
        onOverviewClick={() => handleTogglePanel('overview')}
        onAddClick={() => setShowAddModal(true)}
        addButtonLabel="Add Account"
        searchPlaceholder="Search accounts"
        hideAddButton={displayAccounts.length === 0}
      />

      <FilterChips
        chips={appliedFilterChips}
        onRemoveChip={handleFilterChipRemove}
        onClearAll={clearAllFilters}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          {isLoadingAccounts ? (
            <LoadingState />
          ) : accountsError ? (
            <ErrorState error={accountsError as Error} />
          ) : displayAccounts.length === 0 ? (
            <EmptyState
              hasActiveFilters={hasActiveFilters || Boolean(filters.search?.trim())}
              onButtonClick={() => setShowAddModal(true)}
              onClearFilters={clearAllFilters}
              title={
                hasActiveFilters || Boolean(filters.search?.trim())
                  ? 'No accounts found'
                  : 'No accounts yet'
              }
              message={
                hasActiveFilters || Boolean(filters.search?.trim())
                  ? 'Try adjusting your search or filters.'
                  : 'Add your first account to start tracking your finances.'
              }
              buttonText="Add Your First Account"
              icon={<CreditCard className="h-8 w-8 text-gray-500 dark:text-gray-400" />}
            />
          ) : (
            <AccountGrid
              accounts={displayAccounts}
              showBalances={showBalances}
              user={authState.user || { id: 0 }}
              dragOverAccount={dragOverAccount}
              selectedAccountForHistory={selectedAccountForHistory}
              onAccountEdit={(account) => {
                setEditingAccount(account);
                setShowAddModal(true);
              }}
              onAccountDelete={handleDelete}
              onAccountSelect={setSelectedAccountForHistory}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            />
          )}
        </div>

        <AccountsSidebar
          activeSidePanel={activeSidePanel}
          filters={filters}
          hasActiveFilters={hasActiveFilters}
          overviewSummaryCards={overviewSummaryCards}
          overviewActions={overviewActions}
          filterOptions={{
            accountTypes: accountTypeOptions,
            statuses: accountStatusOptions,
            currencies: currencyOptions,
            institutions: institutionOptions,
          }}
          filterPanelRef={filterPanelRef}
          overviewPanelRef={overviewPanelRef}
          onTogglePanel={handleTogglePanel}
          onFilterChange={updateFilter}
          onClearFilters={clearAllFilters}
        />
      </div>

      <AccountModal
        isOpen={showAddModal}
        editingAccount={editingAccount}
        isLoading={createAccountMutation.isPending || updateAccountMutation.isPending}
        currencies={currencies.map((c) => ({ ...c, symbol: c.code }))}
        bankIcons={bankIcons}
        onClose={() => {
          setShowAddModal(false);
          setEditingAccount(null);
        }}
        onSubmit={handleAccountSubmit}
      />

      <ConfirmDialog
        isOpen={showConfirmDelete}
        onClose={() => setShowConfirmDelete(false)}
        onConfirm={confirmDelete}
        title="Delete Account"
        message={`Are you sure you want to delete the account "${accountToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <Button
          onClick={scrollToTop}
          variant="fab"
          className="fixed bottom-6 right-6 z-50"
          title="Scroll to top"
        >
          <ArrowUp className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
};

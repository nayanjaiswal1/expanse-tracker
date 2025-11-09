import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { AccountManagementModals } from './components/AccountManagementModals';
import { FilterChips } from './components/FilterChips';
import { Button } from '../../components/ui/Button';
import { Search as SearchIcon, Plus, Filter } from 'lucide-react';
import { AccountCard } from './components/AccountCard';
import type { Account } from '../../types';

import { useAccountManagement } from './hooks/useAccountManagement';
import { useAccountFiltersManager } from './hooks/useAccountFiltersManager';
import { useAccountsData } from './hooks/useAccountsData';
import { useAccountFilters } from './hooks/useAccountFilters';

export const AccountsManagement = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    showAddModal,
    editingAccount,
    showConfirmDelete,
    accountToDelete,
    selectedAccountForHistory,
    setShowAddModal,
    setSelectedAccountForHistory,
    handleAccountSubmit,
    handleDelete,
    handleAccountEdit,
    handleAccountSelect,
    handleCloseAddModal,
    handleCloseConfirmDelete,
  } = useAccountManagement();

  const handleViewStatements = (account: Account) => {
    console.log('View statements for account:', account.id);
  };

  const handleViewTransactions = (account: Account) => {
    console.log('View transactions for account:', account.id);
  };

  const handleViewPending = (account: Account) => {
    console.log('View pending transactions for account:', account.id);
  };

  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const { filters, setFilter } = useAccountFilters();

  const apiFilters = React.useMemo(
    () => ({
      search: filters.search || '',
      account_type: filters.account_type || '',
      currency: filters.currency || '',
      institution: filters.institution || '',
      status: filters.status === 'active' ? 'true' : filters.status === 'inactive' ? 'false' : '',
    }),
    [filters]
  );

  const {
    accounts,
    isLoading: isLoadingAccounts,
    error: accountsError,
    currencies = [],
  } = useAccountsData({ apiFilters });

  const safeAccounts = React.useMemo(() => (Array.isArray(accounts) ? accounts : []), [accounts]);

  const { appliedFilterChips, handleFilterChipRemove, clearAllFilters } = useAccountFiltersManager({
    accounts,
    currencies,
  });

  const [showScrollTop, setShowScrollTop] = useState(false);

  const checkScrollTop = () => {
    if (!showScrollTop && window.pageYOffset > 400) {
      setShowScrollTop(true);
    } else if (showScrollTop && window.pageYOffset <= 400) {
      setShowScrollTop(false);
    }
  };

  useEffect(() => {
    window.addEventListener('scroll', checkScrollTop);
    return () => window.removeEventListener('scroll', checkScrollTop);
  }, [showScrollTop]);

  useEffect(() => {
    const state = location.state as { openAddAccountModal?: boolean } | undefined;
    if (state?.openAddAccountModal) {
      setShowAddModal(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate, setShowAddModal]);

  const hasActiveFilters = appliedFilterChips.length > 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header Section */}
        <div className="md:flex md:items-center md:justify-between mb-6">
          <div className="min-w-0 flex-1">
            <div className="flex items-center">
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Accounts</h1>
              <div className="ml-4 flex items-center">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {safeAccounts.length} Accounts
                </span>
              </div>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              View and manage all your financial accounts in one place
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
            <Button onClick={() => setShowAddModal(true)} variant="solid" color="blue">
              <Plus className="h-4 w-4 mr-2" />
              Add Account
            </Button>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg leading-5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Search accounts..."
                value={filters.search || ''}
                onChange={(e) => setFilter('search', e.target.value)}
              />
            </div>
            <Button
              onClick={() => setShowFiltersModal(true)}
              variant="outline"
              className={hasActiveFilters ? 'ring-2 ring-blue-500' : ''}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
          {hasActiveFilters && (
            <div className="mt-4">
              <FilterChips
                chips={appliedFilterChips}
                onRemoveChip={handleFilterChipRemove}
                onClearAll={clearAllFilters}
              />
            </div>
          )}
        </div>

        {/* Accounts Grid */}
        <div>
          {isLoadingAccounts ? (
            <LoadingState message="Loading accounts..." />
          ) : accountsError ? (
            <ErrorState
              title="Error loading accounts"
              message={accountsError.message || 'An unexpected error occurred.'}
            />
          ) : safeAccounts.length === 0 ? (
            <EmptyState
              title="No accounts found"
              message={
                hasActiveFilters
                  ? 'Try adjusting your filters or add a new account.'
                  : 'Get started by adding a new account.'
              }
              actions={[
                <Button key="add-account" onClick={() => setShowAddModal(true)} variant="solid">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Account
                </Button>,
              ]}
            />
          ) : (
            <div className="flex overflow-x-auto space-x-6 pb-4 -mx-4 px-4">
              {safeAccounts.map((account) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  onSelect={handleAccountSelect}
                  isSelected={selectedAccountForHistory?.id === account.id}
                  onEdit={handleAccountEdit}
                  onDelete={handleDelete}
                  onViewDetails={() => {
                    console.log('Viewing details for account:', account.id);
                    // navigate(`/accounts/${account.id}`);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AccountManagementModals
        showAddModal={showAddModal}
        editingAccount={editingAccount}
        showConfirmDelete={showConfirmDelete}
        accountToDelete={accountToDelete}
        onCloseAddModal={handleCloseAddModal}
        onCloseConfirmDelete={handleCloseConfirmDelete}
        onAccountSubmit={handleAccountSubmit}
        onDelete={handleDelete}
      />
    </div>
  );
};

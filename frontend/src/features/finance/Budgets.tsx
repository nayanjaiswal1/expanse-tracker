import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PiggyBank, Sparkles } from 'lucide-react';
import {
  useBudgets,
  useCreateBudget,
  useUpdateBudget,
  useDeleteBudget,
  useBudgetsSummary,
} from '../../hooks/finance';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { formatCurrency } from '../../utils/preferences';
import { Modal } from '../../components/ui/Modal';
import { FilterModal } from '../../components/ui/FilterModal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Button } from '../../components/ui/Button';
import { useTranslation } from 'react-i18next';

import { PageToolbar } from '../../components/layout/PageToolbar';
import { BudgetGrid, BudgetForm, CurrentBudgetDisplay, EmptyState } from './components';
import { Pagination } from '../../components/ui/Pagination';
import { BudgetOverviewSidebar } from './components/BudgetOverviewSidebar';
import type { Budget, CreateBudgetData } from './api/budgets';
import { useBudgetFilters } from './hooks/useBudgetFilters';
// import { BudgetFiltersPanel } from './components/BudgetFiltersPanel';
// import { FlexBetween, HStack } from '../../components/ui/Layout';
import { useFilterManager } from '../../hooks/useFilterManager';
import { useCrudModals, useModalStates } from '../../hooks/useCrudModals';
import {
  budgetStatusOptionConfigs,
  budgetPeriodTypeOptionConfigs,
  mapBudgetOptions,
  budgetStatusColorMap,
} from './constants/budgetConstants';

export const Budgets = () => {
  const { t } = useTranslation('finance');
  const navigate = useNavigate();
  const createBudgetMutation = useCreateBudget();
  const updateBudgetMutation = useUpdateBudget();
  const deleteBudgetMutation = useDeleteBudget();
  const { state: authState } = useAuth();
  const { showError, showSuccess } = useToast();
  const { filters, setFilter, clearAllFilters } = useBudgetFilters();
  const statusColors = budgetStatusColorMap;

  // Status and period type options
  const statusOptions = React.useMemo(() => mapBudgetOptions(budgetStatusOptionConfigs, t), [t]);

  const periodTypeOptions = React.useMemo(
    () => mapBudgetOptions(budgetPeriodTypeOptionConfigs, t),
    [t]
  );

  // Filter manager - handles API params, chips, and removal
  const {
    apiParams,
    filterChips: appliedFilterChips,
    removeFilter: handleFilterRemove,
    hasActiveFilters,
  } = useFilterManager(filters, setFilter, {
    excludeDefaults: { status: 'all', period_type: 'all' },
    optionMaps: {
      status: statusOptions,
      period_type: periodTypeOptions,
    },
  });

  // Pagination state (page number pagination from backend)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Combine filters with pagination params for API
  const paginatedParams = React.useMemo(
    () => ({ ...apiParams, page, page_size: pageSize }),
    [apiParams, page, pageSize]
  );

  // Budgets query with backend filters + pagination
  const budgetsQuery = useBudgets(paginatedParams);
  const { data: budgetsSummary } = useBudgetsSummary();

  // Modal management
  const {
    showAddModal,
    showDeleteDialog,
    editingItem: editingBudget,
    itemToDelete: budgetToDelete,
    openAddModal,
    closeAddModal,
    openEditModal,
    openDeleteDialog,
    closeDeleteDialog,
  } = useCrudModals<Budget>();

  const { states: modalStates, toggle: toggleModal } = useModalStates({
    filters: false,
    overview: false,
  });

  const [activeFilterSection, setActiveFilterSection] = useState<'status' | 'period_type'>(
    'status'
  );

  const handleSubmit = async (formData: any) => {
    try {
      if (editingBudget) {
        await updateBudgetMutation.mutateAsync({
          id: editingBudget.id,
          data: formData as CreateBudgetData,
        });
        showSuccess(t('budgets.form.updateSuccess'));
      } else {
        await createBudgetMutation.mutateAsync(formData as CreateBudgetData);
        showSuccess(t('budgets.form.createSuccess'));
      }
      closeAddModal();
    } catch (error: any) {
      showError(error?.response?.data?.detail || t('budgets.form.saveError'));
    }
  };

  const handleDelete = async () => {
    if (!budgetToDelete) return;

    try {
      await deleteBudgetMutation.mutateAsync(budgetToDelete.id);
      showSuccess(t('budgets.delete.success'));
      closeDeleteDialog();
    } catch (error: any) {
      showError(error?.response?.data?.detail || t('budgets.delete.error'));
    }
  };

  const handleViewDetails = (budget: Budget) => {
    if (!budget || !budget.id) {
      console.error('Budget or Budget ID is undefined!', budget);
      showError(t('budgets.details.missingIdError'));
      return;
    }
    navigate(`/budgets/${budget.id}`);
  };

  const handleRefresh = () => {
    budgetsQuery.refetch();
  };

  // Extract budgets array from paginated response (DRF PageNumberPagination)
  const budgets = Array.isArray(budgetsQuery.data?.results)
    ? budgetsQuery.data.results
    : Array.isArray(budgetsQuery.data)
      ? budgetsQuery.data
      : [];

  // Pagination metadata (fallbacks if undefined)
  const totalCount: number = budgetsQuery.data?.count ?? budgets.length;
  const totalPages: number =
    budgetsQuery.data?.total_pages ?? Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage: number = budgetsQuery.data?.page ?? page;

  // Sync backend-provided page if it differs (e.g., out-of-range after filtering)
  React.useEffect(() => {
    if (budgetsQuery.data?.page && budgetsQuery.data.page !== page) {
      setPage(budgetsQuery.data.page);
    }
  }, [budgetsQuery.data?.page]);

  // Reset to first page when core filters change
  React.useEffect(() => {
    setPage(1);
  }, [filters.status, filters.period_type, filters.search]);
  const currentBudget = budgets.find((budget: Budget) => budget.is_current);

  // (Summary computations removed since they were unused here)

  const getStatusDisplay = (budget: Budget) => {
    const spentPercentage = parseFloat(budget.spent_percentage);
    if (!budget.is_current) {
      return budget.end_date < new Date().toISOString().split('T')[0] ? 'completed' : 'upcoming';
    }
    if (spentPercentage >= 100) return 'over_budget';
    if (spentPercentage >= 80) return 'approaching_limit';
    return 'on_track';
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'on_track':
        return t('common:status.onTrack');
      case 'approaching_limit':
        return t('common:status.approachingLimit');
      case 'over_budget':
        return t('common:status.overBudget');
      case 'completed':
        return t('common:status.completed');
      case 'upcoming':
        return t('common:status.upcoming');
      default:
        return t('common:status.unknown');
    }
  };

  // Only show the big skeleton when we truly have no data yet
  if (budgetsQuery.isLoading && !budgetsQuery.data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-2xl mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (budgetsQuery.isError) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <h2 className="text-lg font-medium text-red-800 dark:text-red-200 mb-2">
              {t('common:error.loadError.title')}
            </h2>
            <p className="text-red-600 dark:text-red-400">
              {budgetsQuery.error?.message || t('common:error.loadError.message')}
            </p>
            <p className="text-sm text-red-500 mt-2">
              {t('common:error.details')} {JSON.stringify(budgetsQuery.error, null, 2)}
            </p>
            <div className="flex space-x-2 mt-4">
              <Button onClick={() => budgetsQuery.refetch()} variant="danger">
                {t('common:error.loadError.retryButton')}
              </Button>
              <Button onClick={() => window.location.reload()} variant="secondary">
                {t('common:actions.reloadPage')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={`min-h-screen ${modalStates.overview ? 'grid xl:grid-cols-[minmax(0,1fr)_400px]' : ''}`}
      >
        <div className="space-y-4 pb-6 pt-4 px-4 sm:px-6 lg:px-8">
          {/* Subtle fetching indicator to avoid full-page flicker */}
          {budgetsQuery.isFetching && budgetsQuery.data ? (
            <div className="h-1 w-full rounded bg-gradient-to-r from-emerald-400/50 via-emerald-500 to-emerald-400/50 animate-pulse" />
          ) : null}
          <PageToolbar
            searchValue={filters.search}
            onSearchChange={(value) => setFilter('search', value)}
            onFilterClick={() => toggleModal('filters')}
            onOverviewClick={() => toggleModal('overview')}
            onAddClick={openAddModal}
            addButtonLabel={t('budgets.toolbar.addBudget')}
            searchPlaceholder={t('common:toolbar.search', { items: 'budgets' })}
            hideAddButton={budgets.length === 0}
            actions={
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="inline-flex items-center gap-2 h-10 px-4"
                onClick={() => navigate('/budgets/ai')}
              >
                <Sparkles className="h-4 w-4" />
                AI Builder
              </Button>
            }
          />

          {appliedFilterChips.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-700/30 bg-gray-800/30 px-4 py-2.5 text-sm">
              {appliedFilterChips.map((chip) => (
                <span
                  key={`${chip.key}-${chip.label}`}
                  className="inline-flex items-center gap-2 rounded-md bg-indigo-500/20 border border-indigo-500/30 px-3 py-1 text-sm font-medium text-indigo-300"
                >
                  {chip.label}
                  <Button
                    type="button"
                    variant="link-indigo"
                    onClick={() => handleFilterRemove(chip.key)}
                    aria-label={t('common:filters.removeChip', { label: chip.label })}
                  >
                    ×
                  </Button>
                </span>
              ))}
              <Button type="button" variant="link-muted-uppercase" onClick={clearAllFilters}>
                {t('common:filters.clearAll')}
              </Button>
            </div>
          )}
          {/* Current Budget Highlight */}
          {currentBudget && (
            <CurrentBudgetDisplay
              budget={currentBudget}
              statusColors={statusColors}
              defaultCurrency={authState.user?.default_currency}
              onViewDetails={handleViewDetails}
              getStatusDisplay={getStatusDisplay}
              getStatusText={getStatusText}
            />
          )}

          {/* All Budgets Grid */}
          {budgets.length === 0 ? (
            <EmptyState
              hasActiveFilters={hasActiveFilters}
              onButtonClick={openAddModal}
              onClearFilters={clearAllFilters}
              title={
                hasActiveFilters
                  ? t('common:emptyState.noResults.title')
                  : t('common:emptyState.noItems.title', { items: 'budgets' })
              }
              message={
                hasActiveFilters
                  ? t('common:emptyState.noResults.message')
                  : t('common:emptyState.noItems.message', { item: 'budget' })
              }
              buttonText={t('budgets.emptyState.createBudgetButton')}
              icon={<PiggyBank className="h-8 w-8 text-secondary-500 dark:text-secondary-400" />}
            />
          ) : (
            <BudgetGrid
              budgets={budgets}
              statusColors={statusColors}
              defaultCurrency={authState.user?.default_currency}
              onEdit={openEditModal}
              onDelete={openDeleteDialog}
              onViewDetails={handleViewDetails}
              onCreateBudget={openAddModal}
              getStatusDisplay={getStatusDisplay}
              getStatusText={getStatusText}
            />
          )}

          {/* Pagination Controls */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalCount={totalCount}
            onPageChange={(p) => {
              setPage(p);
              budgetsQuery.refetch();
            }}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1); // reset to first page on size change
              budgetsQuery.refetch();
            }}
          />
        </div>

        {/* Overview Right Panel - Full Height Sidebar */}
        {modalStates.overview && (
          <BudgetOverviewSidebar
            totalBudgets={budgetsSummary?.total_budgets || 0}
            activeBudgets={budgetsSummary?.active_budgets || 0}
            totalBudgetAmount={formatCurrency(
              budgetsSummary?.total_budget_amount || 0,
              authState.user
            )}
            totalSpent={formatCurrency(budgetsSummary?.total_spent || 0, authState.user)}
            onClose={() => toggleModal('overview')}
            onRefresh={handleRefresh}
            onCreateBudget={openAddModal}
          />
        )}
      </div>

      {/* Filters Modal */}
      <FilterModal
        isOpen={modalStates.filters}
        onClose={() => toggleModal('filters')}
        title={t('budgets.filters.modalTitle')}
        sections={[
          {
            id: 'status',
            label: t('budgets.filters.statusSectionTitle'),
            options: statusOptions,
            selectedValue: filters.status,
            onSelect: (value) => setFilter('status', value),
          },
          {
            id: 'period_type',
            label: t('budgets.filters.periodTypeSectionTitle'),
            options: periodTypeOptions,
            selectedValue: filters.period_type,
            onSelect: (value) => setFilter('period_type', value),
          },
        ]}
        activeSection={activeFilterSection}
        onSectionChange={(section) => setActiveFilterSection(section as 'status' | 'period_type')}
        onClearAll={clearAllFilters}
      />

      {/* Add/Edit Budget Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={closeAddModal}
        title={
          editingBudget
            ? t('budgets.modal.editBudgetTitle')
            : t('budgets.modal.createNewBudgetTitle')
        }
      >
        <BudgetForm
          editingBudget={editingBudget}
          isSubmitting={createBudgetMutation.isPending || updateBudgetMutation.isPending}
          onSubmit={handleSubmit}
          onCancel={closeAddModal}
        />
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={closeDeleteDialog}
        onConfirm={handleDelete}
        titleKey="budgets.confirmDialog.deleteBudgetTitle"
        messageKey="budgets.confirmDialog.deleteBudgetMessage"
        messageValues={{ budgetName: budgetToDelete?.name }}
        confirmTextKey="budgets.confirmDialog.deleteButton"
        confirmLoading={deleteBudgetMutation.isPending}
      />
    </>
  );
};

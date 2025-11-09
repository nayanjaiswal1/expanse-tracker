import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Target } from 'lucide-react';
import { useGoals, useGoalsSummary } from '../../hooks/finance';
import { useAuth } from '../../contexts/AuthContext';
import { useGoalFilters } from './hooks/useGoalFilters';
import { useGoalModals } from './hooks/useGoalModals';
import { useGoalOperations } from './hooks/useGoalOperations';
import { useGoalForm, type GoalFormValues } from './hooks/useGoalForm';
import { useFilterManager } from '../../hooks/useFilterManager';
import { PageToolbar } from '../../components/layout/PageToolbar';
import { Modal } from '../../components/ui/Modal';
import { FilterModal } from '../../components/ui/FilterModal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { GoalForm, GoalGrid, ProgressUpdateModal, EmptyState } from './components';
import { GoalOverviewSidebar } from './components/GoalOverviewSidebar';
import { FilterChips } from './components/goals/FilterChips';
import { formatCurrency } from '../../utils/preferences';
import { filterActiveGoals, filterCompletedGoals, filterOtherGoals } from './utils/goalUtils';
import type { Goal } from '../../types';
import { mapGoalStatusOptions } from './constants/goalConstants';

export const Goals: React.FC = () => {
  const { t } = useTranslation('finance');
  const { state: authState } = useAuth();

  // Filters
  const { filters, setFilter, clearAllFilters } = useGoalFilters();

  // Modals state
  const modals = useGoalModals();

  // Operations
  const operations = useGoalOperations();

  // Form
  const { form, prepareFormData } = useGoalForm(modals.editingGoal);

  // UI state
  const [showAmounts, setShowAmounts] = useState(true);
  const [progressAmount, setProgressAmount] = useState('');
  const [quickAmount, setQuickAmount] = useState('');
  const [activeFilterSection, setActiveFilterSection] = useState<'goal_type' | 'status'>(
    'goal_type'
  );

  // Status options (static)
  const statusOptions = useMemo(() => mapGoalStatusOptions(t), [t]);

  // Filter manager - handles API params, chips, and removal
  const {
    apiParams,
    filterChips: appliedFilterChips,
    removeFilter: handleFilterRemove,
  } = useFilterManager(filters, setFilter, {
    excludeDefaults: { status: 'all' },
    optionMaps: {
      status: statusOptions,
    },
  });

  // Data fetching
  const goalsQuery = useGoals(apiParams);
  const { data: goalsSummary, refetch: refetchSummary } = useGoalsSummary();

  const goals = goalsQuery.data || [];

  // Filtered goals
  const activeGoals = useMemo(() => filterActiveGoals(goals), [goals]);
  const completedGoals = useMemo(() => filterCompletedGoals(goals), [goals]);
  const otherGoals = useMemo(() => filterOtherGoals(goals), [goals]);

  // Goal type options (dynamic from data)
  const goalTypeOptions = useMemo(() => {
    const uniqueTypes = Array.from(
      new Set(
        goals.map((g: Goal) => g.goal_type).filter((type: unknown): type is string => Boolean(type))
      )
    ) as string[];

    return [
      { value: '', label: t('goals.goalTypes.all') },
      ...uniqueTypes.map((type) => ({
        value: type,
        label: t(`goals.goalTypes.${type}`, { defaultValue: type }),
      })),
    ];
  }, [goals, t]);

  // Handlers
  const handleSubmit = async (values: GoalFormValues) => {
    const formData = prepareFormData(values);

    const success = modals.editingGoal
      ? await operations.handleUpdate(modals.editingGoal.id, formData)
      : await operations.handleCreate(formData);

    if (success) {
      modals.closeAddModal();
      form.reset();
    }
  };

  const handleDeleteFromForm = () => {
    if (modals.editingGoal) {
      modals.closeAddModal();
      modals.openDeleteDialog(modals.editingGoal);
    }
  };

  const confirmDeleteGoal = async () => {
    if (!modals.goalToDelete) return;

    const success = await operations.handleDelete(modals.goalToDelete.id);
    if (success) {
      modals.closeDeleteDialog();
    }
  };

  const handleUpdateProgress = async () => {
    if (!modals.progressGoal || !progressAmount) return;

    const success = await operations.handleUpdateProgress(
      modals.progressGoal.id,
      parseFloat(progressAmount)
    );

    if (success) {
      modals.closeProgressModal();
      setProgressAmount('');
    }
  };

  const handleQuickUpdate = async (goalId: number, amount: string) => {
    if (!amount || isNaN(parseFloat(amount))) return;

    const success = await operations.handleUpdateProgress(goalId, parseFloat(amount));
    if (success) {
      modals.cancelInlineEdit();
      setQuickAmount('');
    }
  };

  const handleToggleStatus = async (goal: Goal, newStatus: 'active' | 'paused' | 'cancelled') => {
    await operations.handleToggleStatus(goal.id, newStatus);
  };

  const handleQuickEdit = (goalId: number) => {
    const goal = goals.find((g: Goal) => g.id === goalId);
    if (goal) {
      modals.startInlineEdit(goalId);
      setQuickAmount(goal.current_amount);
    }
  };

  return (
    <>
      <div
        className={`min-h-screen ${modals.showOverviewModal ? 'grid xl:grid-cols-[minmax(0,1fr)_400px]' : ''}`}
      >
        <div className="space-y-4 pb-6 pt-4 px-4 sm:px-6 lg:px-8">
          <PageToolbar
            searchValue={filters.search}
            onSearchChange={(value) => setFilter('search', value)}
            onFilterClick={modals.toggleFiltersModal}
            onOverviewClick={modals.toggleOverviewModal}
            onAddClick={modals.openAddModal}
            addButtonLabel={t('goals.toolbar.addGoal')}
            searchPlaceholder={t('goals.toolbar.searchGoals')}
            hideAddButton={goals.length === 0}
          />

          <FilterChips
            chips={appliedFilterChips}
            onRemove={handleFilterRemove}
            onClearAll={clearAllFilters}
          />

          {goalsQuery.isLoading ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : goals.length === 0 ? (
            <EmptyState
              hasActiveFilters={appliedFilterChips.length > 0}
              onButtonClick={modals.openAddModal}
              onClearFilters={clearAllFilters}
              title={t(
                appliedFilterChips.length > 0
                  ? 'goals.emptyState.noGoalsFound.title'
                  : 'goals.emptyState.noGoalsYet.title'
              )}
              message={t(
                appliedFilterChips.length > 0
                  ? 'goals.emptyState.noGoalsFound.message'
                  : 'goals.emptyState.noGoalsYet.message'
              )}
              buttonText={t('goals.emptyState.createButton')}
              icon={<Target className="h-8 w-8 text-secondary-500 dark:text-secondary-400" />}
            />
          ) : (
            <div className="space-y-6">
              {activeGoals.length > 0 && (
                <GoalGrid
                  goals={activeGoals}
                  showAmounts={showAmounts}
                  user={authState.user}
                  inlineEditGoal={modals.inlineEditGoal}
                  quickAmount={quickAmount}
                  onEdit={modals.openEditModal}
                  onDelete={modals.openDeleteDialog}
                  onToggleStatus={handleToggleStatus}
                  onQuickEdit={handleQuickEdit}
                  onQuickUpdate={handleQuickUpdate}
                  onQuickCancel={modals.cancelInlineEdit}
                  onQuickAmountChange={setQuickAmount}
                  variant="active"
                  title={t('goals.sections.activeGoals')}
                />
              )}

              {completedGoals.length > 0 && (
                <GoalGrid
                  goals={completedGoals}
                  showAmounts={showAmounts}
                  user={authState.user}
                  inlineEditGoal={modals.inlineEditGoal}
                  quickAmount={quickAmount}
                  onEdit={modals.openEditModal}
                  onDelete={modals.openDeleteDialog}
                  onToggleStatus={handleToggleStatus}
                  onQuickEdit={handleQuickEdit}
                  onQuickUpdate={handleQuickUpdate}
                  onQuickCancel={modals.cancelInlineEdit}
                  onQuickAmountChange={setQuickAmount}
                  variant="completed"
                  title={t('goals.sections.completedGoals')}
                />
              )}

              {otherGoals.length > 0 && (
                <GoalGrid
                  goals={otherGoals}
                  showAmounts={showAmounts}
                  user={authState.user}
                  inlineEditGoal={modals.inlineEditGoal}
                  quickAmount={quickAmount}
                  onEdit={modals.openEditModal}
                  onDelete={modals.openDeleteDialog}
                  onToggleStatus={handleToggleStatus}
                  onQuickEdit={handleQuickEdit}
                  onQuickUpdate={handleQuickUpdate}
                  onQuickCancel={modals.cancelInlineEdit}
                  onQuickAmountChange={setQuickAmount}
                  variant="other"
                  title={t('goals.sections.otherGoals')}
                />
              )}
            </div>
          )}
        </div>

        {modals.showOverviewModal && (
          <GoalOverviewSidebar
            totalGoals={goalsSummary?.total_goals || 0}
            activeGoals={goalsSummary?.active_goals || 0}
            completedGoals={goalsSummary?.completed_goals || 0}
            totalTargetAmount={formatCurrency(
              goalsSummary?.total_target_amount || 0,
              authState.user
            )}
            showAmounts={showAmounts}
            onClose={modals.toggleOverviewModal}
            onToggleAmounts={() => setShowAmounts((current) => !current)}
            onCreateGoal={modals.openAddModal}
            onRefresh={refetchSummary}
          />
        )}
      </div>

      {/* Filters Modal */}
      <FilterModal
        isOpen={modals.showFiltersModal}
        onClose={modals.toggleFiltersModal}
        title={t('goals.filters.title')}
        sections={[
          {
            id: 'goal_type',
            label: t('goals.filters.goalType'),
            options: goalTypeOptions,
            selectedValue: filters.goal_type,
            onSelect: (value) => setFilter('goal_type', value),
          },
          {
            id: 'status',
            label: t('goals.filters.status'),
            options: statusOptions,
            selectedValue: filters.status,
            onSelect: (value) => setFilter('status', value),
          },
        ]}
        activeSection={activeFilterSection}
        onSectionChange={(section) => setActiveFilterSection(section as 'goal_type' | 'status')}
        onClearAll={clearAllFilters}
      />

      {/* Add/Edit Goal Modal */}
      <Modal
        isOpen={modals.showAddModal}
        onClose={modals.closeAddModal}
        title={t(modals.editingGoal ? 'goals.form.editTitle' : 'goals.form.addTitle')}
      >
        <GoalForm
          formData={{
            ...form.getValues(),
            description: form.getValues().description || '',
            target_date: form.getValues().target_date || '',
            images:
              form.getValues().images?.map((img) => ({
                id: Math.random().toString(),
                file: img.file,
                preview: URL.createObjectURL(img.file),
                caption: img.caption,
              })) || [],
          }}
          onFormDataChange={(data) => form.reset(data)}
          editingGoal={modals.editingGoal}
          onSubmit={form.handleSubmit(handleSubmit)}
          onCancel={modals.closeAddModal}
          onDelete={handleDeleteFromForm}
          isSubmitting={operations.isSubmitting}
        />
      </Modal>

      {/* Progress Update Modal */}
      <ProgressUpdateModal
        isOpen={modals.showProgressModal}
        onClose={modals.closeProgressModal}
        goal={modals.progressGoal}
        progressAmount={progressAmount}
        onProgressAmountChange={setProgressAmount}
        onUpdateProgress={handleUpdateProgress}
        user={authState.user}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={modals.showDeleteDialog}
        onClose={modals.closeDeleteDialog}
        onConfirm={confirmDeleteGoal}
        titleKey="common.modals.deleteConfirmation.title"
        messageKey="finance.goals.delete.message"
        messageValues={{ name: modals.goalToDelete?.name }}
        confirmTextKey="common.actions.delete"
        cancelTextKey="common.actions.cancel"
        variant="danger"
      />
    </>
  );
};

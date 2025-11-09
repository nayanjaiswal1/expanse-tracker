import React from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { BudgetForm } from './BudgetForm';
import { checkboxClassName } from '../../../components/ui/Checkbox';
import type { Budget, BudgetCategory } from '../api/budgets';

interface CategoryFormData {
  category: number;
  allocated_amount: string;
  alert_threshold: string;
  notes: string;
  is_essential: boolean;
}

interface ExpenseFormData {
  description: string;
  amount: string;
  account_id: string;
  date: string;
}

interface Account {
  id: number;
  name: string;
  account_type: string;
}

interface Category {
  id: number;
  name: string;
}

interface BudgetModalsProps {
  showAddCategoryModal: boolean;
  showEditBudgetModal: boolean;
  showExpenseModal: boolean;
  categoryToDelete: BudgetCategory | null;
  budgetToDelete: Budget | null;
  editingCategory: BudgetCategory | null;
  selectedCategoryForExpense: BudgetCategory | null;
  categoryFormData: CategoryFormData;
  expenseFormData: ExpenseFormData;
  budget: Budget;
  availableCategories: Category[];
  accounts: Account[];
  isSubmittingCategory: boolean;
  isSubmittingBudget: boolean;
  isSubmittingExpense: boolean;
  isDeletingCategory: boolean;
  isDeletingBudget: boolean;
  onCloseAddCategoryModal: () => void;
  onCloseEditBudgetModal: () => void;
  onCloseExpenseModal: () => void;
  onCloseCategoryDelete: () => void;
  onCloseBudgetDelete: () => void;
  onCategorySubmit: (e: React.FormEvent) => void;
  onBudgetSubmit: (formData: any) => void;
  onExpenseSubmit: (e: React.FormEvent) => void;
  onCategoryDelete: () => void;
  onBudgetDelete: () => void;
  onCategoryFormChange: (data: Partial<CategoryFormData>) => void;
  onExpenseFormChange: (data: Partial<ExpenseFormData>) => void;
}

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingCategory: BudgetCategory | null;
  formData: CategoryFormData;
  availableCategories: Category[];
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onFormChange: (data: Partial<CategoryFormData>) => void;
}

interface BudgetEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  budget: Budget;
  isSubmitting: boolean;
  onSubmit: (formData: any) => void;
}

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCategory: BudgetCategory | null;
  formData: ExpenseFormData;
  accounts: Account[];
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onFormChange: (data: Partial<ExpenseFormData>) => void;
}

interface DeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  titleKey?: string;
  message?: string;
  messageKey?: string;
  messageValues?: Record<string, any>;
  confirmText?: string;
  confirmTextKey?: string;
  cancelText?: string;
  cancelTextKey?: string;
  isProcessing?: boolean;
}

const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  onClose,
  editingCategory,
  formData,
  availableCategories,
  isSubmitting,
  onSubmit,
  onFormChange,
}) => {
  const { t } = useTranslation('finance');
  const title = editingCategory
    ? t('finance.budgets.modals.category.editTitle')
    : t('finance.budgets.modals.category.addTitle');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} showDefaultSubtitle={false}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('finance.budgets.modals.category.fields.categoryLabel')}
          </label>
          <select
            value={formData.category}
            onChange={(e) => onFormChange({ category: parseInt(e.target.value, 10) })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            required
          >
            <option value={0}>
              {t('finance.budgets.modals.category.fields.categoryPlaceholder')}
            </option>
            {availableCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('finance.budgets.modals.category.fields.allocatedLabel')}
          </label>
          <Input
            type="number"
            step="0.01"
            value={formData.allocated_amount}
            onChange={(e) => onFormChange({ allocated_amount: e.target.value })}
            placeholder={t('finance.budgets.modals.category.fields.allocatedPlaceholder')}
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('finance.budgets.modals.category.fields.thresholdLabel')}
          </label>
          <Input
            type="number"
            min="0"
            max="100"
            value={formData.alert_threshold}
            onChange={(e) => onFormChange({ alert_threshold: e.target.value })}
            placeholder={t('finance.budgets.modals.category.fields.thresholdPlaceholder')}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('finance.budgets.modals.category.fields.notesLabel')}
          </label>
          <Input
            type="text"
            value={formData.notes}
            onChange={(e) => onFormChange({ notes: e.target.value })}
            placeholder={t('finance.budgets.modals.category.fields.notesPlaceholder')}
          />
        </div>

        <div>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={formData.is_essential}
              onChange={(e) => onFormChange({ is_essential: e.target.checked })}
              className={checkboxClassName}
            />
            <span className="text-sm text-gray-900 dark:text-gray-100">
              {t('finance.budgets.modals.category.fields.essentialLabel')}
            </span>
          </label>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {editingCategory
              ? t('finance.budgets.modals.category.submitUpdate')
              : t('finance.budgets.modals.category.submitCreate')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const BudgetEditModal: React.FC<BudgetEditModalProps> = ({
  isOpen,
  onClose,
  budget,
  isSubmitting,
  onSubmit,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      titleKey="finance.budgets.modals.editBudget.title"
      showDefaultSubtitle={false}
    >
      <BudgetForm
        editingBudget={budget}
        isSubmitting={isSubmitting}
        onSubmit={onSubmit}
        onCancel={onClose}
      />
    </Modal>
  );
};

const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  selectedCategory,
  formData,
  accounts,
  isSubmitting,
  onSubmit,
  onFormChange,
}) => {
  const { t } = useTranslation('finance');
  const expenseTitle = selectedCategory?.category_name
    ? t('finance.budgets.modals.expense.title', {
        category: selectedCategory.category_name,
      })
    : t('finance.budgets.modals.expense.titleFallback');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={expenseTitle} showDefaultSubtitle={false}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('finance.budgets.modals.expense.fields.descriptionLabel')}
          </label>
          <Input
            type="text"
            value={formData.description}
            onChange={(e) => onFormChange({ description: e.target.value })}
            placeholder={t('finance.budgets.modals.expense.fields.descriptionPlaceholder')}
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('finance.budgets.modals.expense.fields.amountLabel')}
          </label>
          <Input
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={(e) => onFormChange({ amount: e.target.value })}
            placeholder={t('finance.budgets.modals.expense.fields.amountPlaceholder')}
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('finance.budgets.modals.expense.fields.accountLabel')}
          </label>
          <select
            value={formData.account_id}
            onChange={(e) => onFormChange({ account_id: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">
              {t('finance.budgets.modals.expense.fields.accountPlaceholder')}
            </option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {`${account.name} (${account.account_type})`}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('finance.budgets.modals.expense.fields.dateLabel')}
          </label>
          <Input
            type="date"
            value={formData.date}
            onChange={(e) => onFormChange({ date: e.target.value })}
            required
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" loading={isSubmitting} className="bg-green-600 hover:bg-green-700">
            {t('finance.budgets.modals.expense.submit')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const DeleteDialog: React.FC<DeleteDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  titleKey,
  message,
  messageKey,
  messageValues,
  confirmText,
  confirmTextKey,
  cancelText,
  cancelTextKey,
  isProcessing = false,
}) => {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={title}
      titleKey={titleKey}
      message={message}
      messageKey={messageKey}
      messageValues={messageValues}
      confirmText={confirmText}
      confirmTextKey={confirmTextKey}
      cancelText={cancelText}
      cancelTextKey={cancelTextKey}
      confirmLoading={isProcessing}
      variant="danger"
    />
  );
};

export const BudgetModals: React.FC<BudgetModalsProps> = ({
  showAddCategoryModal,
  showEditBudgetModal,
  showExpenseModal,
  categoryToDelete,
  budgetToDelete,
  editingCategory,
  selectedCategoryForExpense,
  categoryFormData,
  expenseFormData,
  budget,
  availableCategories,
  accounts,
  isSubmittingCategory,
  isSubmittingBudget,
  isSubmittingExpense,
  isDeletingCategory,
  isDeletingBudget,
  onCloseAddCategoryModal,
  onCloseEditBudgetModal,
  onCloseExpenseModal,
  onCloseCategoryDelete,
  onCloseBudgetDelete,
  onCategorySubmit,
  onBudgetSubmit,
  onExpenseSubmit,
  onCategoryDelete,
  onBudgetDelete,
  onCategoryFormChange,
  onExpenseFormChange,
}) => {
  return (
    <>
      <CategoryModal
        isOpen={showAddCategoryModal}
        onClose={onCloseAddCategoryModal}
        editingCategory={editingCategory}
        formData={categoryFormData}
        availableCategories={availableCategories}
        isSubmitting={isSubmittingCategory}
        onSubmit={onCategorySubmit}
        onFormChange={onCategoryFormChange}
      />

      <BudgetEditModal
        isOpen={showEditBudgetModal}
        onClose={onCloseEditBudgetModal}
        budget={budget}
        isSubmitting={isSubmittingBudget}
        onSubmit={onBudgetSubmit}
      />

      <ExpenseModal
        isOpen={showExpenseModal}
        onClose={onCloseExpenseModal}
        selectedCategory={selectedCategoryForExpense}
        formData={expenseFormData}
        accounts={accounts}
        isSubmitting={isSubmittingExpense}
        onSubmit={onExpenseSubmit}
        onFormChange={onExpenseFormChange}
      />

      <DeleteDialog
        isOpen={!!categoryToDelete}
        onClose={onCloseCategoryDelete}
        onConfirm={onCategoryDelete}
        titleKey="finance.budgets.modals.deleteCategory.title"
        messageKey="finance.budgets.modals.deleteCategory.message"
        messageValues={{ name: categoryToDelete?.category_name ?? '' }}
        confirmTextKey="common:actions.delete"
        cancelTextKey="common:actions.cancel"
        isProcessing={isDeletingCategory}
      />

      <DeleteDialog
        isOpen={!!budgetToDelete}
        onClose={onCloseBudgetDelete}
        onConfirm={onBudgetDelete}
        titleKey="finance.budgets.modals.deleteBudget.title"
        messageKey="finance.budgets.modals.deleteBudget.message"
        messageValues={{ name: budgetToDelete?.name ?? '' }}
        confirmTextKey="common:actions.delete"
        cancelTextKey="common:actions.cancel"
        isProcessing={isDeletingBudget}
      />
    </>
  );
};

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Trash2, Calendar } from 'lucide-react';
import {
  useBudget,
  useBudgetCategories,
  useBudgetAnalytics,
  useUpdateBudget,
  useDeleteBudget,
  useCreateBudgetCategory,
  useUpdateBudgetCategory,
  useDeleteBudgetCategory,
  useCategories,
} from '../../hooks/finance';
import { useCreateTransaction, useAccounts, useTransactions } from '../../hooks/finance';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import {
  BudgetOverview,
  BudgetAnalytics,
  BudgetCategories,
  RecentTransactions,
  BudgetModals,
} from './components';
import type { Budget, BudgetCategory, CreateBudgetCategoryData } from './api/budgets';
import { FlexBetween, HStack } from '../../components/ui/Layout';
import { budgetStatusColorMap } from './constants/budgetConstants';

interface CategoryFormData {
  category: number;
  allocated_amount: string;
  alert_threshold: string;
  notes: string;
  is_essential: boolean;
}

export const BudgetDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const budgetId = parseInt(id || '0');

  const budgetQuery = useBudget(budgetId);
  const categoriesQuery = useBudgetCategories(budgetId);
  const analyticsQuery = useBudgetAnalytics(budgetId);
  const availableCategoriesQuery = useCategories();
  const updateBudgetMutation = useUpdateBudget();
  const deleteBudgetMutation = useDeleteBudget();
  const createCategoryMutation = useCreateBudgetCategory();
  const updateCategoryMutation = useUpdateBudgetCategory();
  const deleteCategoryMutation = useDeleteBudgetCategory();
  const createTransactionMutation = useCreateTransaction();
  const accountsQuery = useAccounts();

  const { state: authState } = useAuth();
  const { showError, showSuccess } = useToast();

  // Define budget early to use in other hooks
  const budget = budgetQuery.data;

  // Get recent transactions for budget period
  const transactionsQuery = useTransactions({
    date_from: budget?.start_date,
    date_to: budget?.end_date,
    transaction_type: 'expense',
    limit: 10,
  });

  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<BudgetCategory | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<BudgetCategory | null>(null);
  const [budgetToDelete, setBudgetToDelete] = useState<Budget | null>(null);
  const [showEditBudgetModal, setShowEditBudgetModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [selectedCategoryForExpense, setSelectedCategoryForExpense] =
    useState<BudgetCategory | null>(null);

  const [categoryFormData, setCategoryFormData] = useState<CategoryFormData>({
    category: 0,
    allocated_amount: '',
    alert_threshold: '80',
    notes: '',
    is_essential: false,
  });

  const [expenseFormData, setExpenseFormData] = useState({
    description: '',
    amount: '',
    account_id: '',
    date: new Date().toISOString().split('T')[0],
  });

  const categories = Array.isArray(categoriesQuery.data) ? categoriesQuery.data : [];
  const analytics = analyticsQuery.data;
  const availableCategories = Array.isArray(availableCategoriesQuery.data)
    ? availableCategoriesQuery.data
    : [];
  const accounts = Array.isArray(accountsQuery.data) ? accountsQuery.data : [];

  const resetCategoryForm = () => {
    setCategoryFormData({
      category: 0,
      allocated_amount: '',
      alert_threshold: '80',
      notes: '',
      is_essential: false,
    });
  };

  const handleAddCategory = () => {
    if (!budget || !budget.id) {
      showError('Budget not loaded. Please refresh the page and try again.');
      return;
    }
    resetCategoryForm();
    setEditingCategory(null);
    setShowAddCategoryModal(true);
  };

  const handleEditCategory = (category: BudgetCategory) => {
    setEditingCategory(category);
    setCategoryFormData({
      category: category.category,
      allocated_amount: category.allocated_amount,
      alert_threshold: category.alert_threshold,
      notes: category.notes,
      is_essential: category.is_essential,
    });
    setShowAddCategoryModal(true);
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!budget || !budget.id) {
      showError('Budget not loaded. Please try again.');
      return;
    }

    // Validate that category is selected
    if (!categoryFormData.category || categoryFormData.category === 0) {
      showError('Please select a category.');
      return;
    }

    try {
      const categoryData = {
        ...categoryFormData,
        budget: budget.id,
      };

      if (editingCategory) {
        await updateCategoryMutation.mutateAsync({
          id: editingCategory.id,
          data: categoryData as Partial<CreateBudgetCategoryData>,
        });
        showSuccess('Category updated successfully');
      } else {
        await createCategoryMutation.mutateAsync(categoryData as CreateBudgetCategoryData);
        showSuccess('Category added successfully');
      }
      setShowAddCategoryModal(false);
      resetCategoryForm();
      setEditingCategory(null);
    } catch (error: any) {
      showError(error?.response?.data?.detail || 'Failed to save category');
    }
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;

    try {
      await deleteCategoryMutation.mutateAsync(categoryToDelete.id);
      showSuccess('Category deleted successfully');
      setCategoryToDelete(null);
    } catch (error: any) {
      showError(error?.response?.data?.detail || 'Failed to delete category');
    }
  };

  const handleDeleteBudget = async () => {
    if (!budgetToDelete) return;

    try {
      await deleteBudgetMutation.mutateAsync(budgetToDelete.id);
      showSuccess('Budget deleted successfully');
      navigate('/budgets');
    } catch (error: any) {
      showError(error?.response?.data?.detail || 'Failed to delete budget');
    }
  };

  const handleAddExpense = (category: BudgetCategory) => {
    setSelectedCategoryForExpense(category);
    setExpenseFormData({
      description: '',
      amount: '',
      account_id: '',
      date: new Date().toISOString().split('T')[0],
    });
    setShowExpenseModal(true);
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCategoryForExpense || !budget) return;

    try {
      await createTransactionMutation.mutateAsync({
        description: expenseFormData.description,
        amount: -Math.abs(parseFloat(expenseFormData.amount)), // Ensure negative for expense
        category_id: selectedCategoryForExpense.category,
        account_id: expenseFormData.account_id ? parseInt(expenseFormData.account_id) : undefined,
        date: expenseFormData.date,
        transaction_type: 'expense',
        source: 'manual',
      });

      showSuccess('Expense added successfully');
      setShowExpenseModal(false);
      setSelectedCategoryForExpense(null);
      setExpenseFormData({
        description: '',
        amount: '',
        account_id: '',
        date: new Date().toISOString().split('T')[0],
      });

      // Refresh budget data to show updated spending
      budgetQuery.refetch();
      categoriesQuery.refetch();
    } catch (error: any) {
      showError(error?.response?.data?.detail || 'Failed to add expense');
    }
  };

  const handleBudgetSubmit = async (formData: any) => {
    try {
      await updateBudgetMutation.mutateAsync({
        id: budget.id,
        data: formData,
      });
      showSuccess('Budget updated successfully');
      setShowEditBudgetModal(false);
    } catch (error: any) {
      showError(error?.response?.data?.detail || 'Failed to update budget');
    }
  };

  const getStatusDisplay = (budget: Budget) => {
    const spentPercentage = parseFloat(budget.spent_percentage || '0');
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
        return 'On Track';
      case 'approaching_limit':
        return 'Approaching Limit';
      case 'over_budget':
        return 'Over Budget';
      case 'completed':
        return 'Completed';
      case 'upcoming':
        return 'Upcoming';
      default:
        return 'Unknown';
    }
  };

  if (budgetQuery.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-6 w-48"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-2xl mb-8"></div>
            <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (budgetQuery.isError || !budget) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <h2 className="text-lg font-medium text-red-800 dark:text-red-200 mb-2">
              Budget Not Found
            </h2>
            <p className="text-red-600 dark:text-red-400">
              The budget you're looking for doesn't exist or you don't have permission to view it.
            </p>
            <Button onClick={() => navigate('/budgets')} className="mt-4">
              Back to Budgets
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const status = getStatusDisplay(budget);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <FlexBetween className="mb-8">
          <HStack>
            <Button onClick={() => navigate('/budgets')} variant="ghost" size="sm" className="mr-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Budgets
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{budget.name}</h1>
              <HStack className="text-gray-600 dark:text-gray-400 mt-1">
                <Calendar className="w-4 h-4 mr-1" />
                {budget.start_date} - {budget.end_date}
              </HStack>
            </div>
          </HStack>
          <HStack gap={3}>
            <span
              className={`px-4 py-2 rounded-full text-sm font-semibold ${
                budgetStatusColorMap[status as keyof typeof budgetStatusColorMap] ||
                budgetStatusColorMap.on_track
              }`}
            >
              {getStatusText(status)}
            </span>
            <Button
              onClick={() => setShowEditBudgetModal(true)}
              variant="ghost"
              size="sm"
              className="text-blue-500 hover:text-blue-700"
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => setBudgetToDelete(budget)}
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </HStack>
        </FlexBetween>

        {/* Budget Overview */}
        <BudgetOverview budget={budget} defaultCurrency={authState.user?.default_currency} />

        {/* Budget Analytics */}
        {analytics && (
          <BudgetAnalytics
            budget={budget}
            analytics={analytics}
            defaultCurrency={authState.user?.default_currency}
          />
        )}

        {/* Budget Categories */}
        <BudgetCategories
          categories={categories}
          defaultCurrency={authState.user?.default_currency}
          isLoading={categoriesQuery.isLoading}
          onAddCategory={handleAddCategory}
          onEditCategory={handleEditCategory}
          onDeleteCategory={setCategoryToDelete}
          onAddExpense={handleAddExpense}
        />

        {/* Recent Transactions */}
        <RecentTransactions
          transactionsQuery={transactionsQuery}
          defaultCurrency={authState.user?.default_currency}
          onViewAllTransactions={() => navigate('/transactions')}
        />

        {/* All Modals */}
        <BudgetModals
          showAddCategoryModal={showAddCategoryModal}
          showEditBudgetModal={showEditBudgetModal}
          showExpenseModal={showExpenseModal}
          categoryToDelete={categoryToDelete}
          budgetToDelete={budgetToDelete}
          editingCategory={editingCategory}
          selectedCategoryForExpense={selectedCategoryForExpense}
          categoryFormData={categoryFormData}
          expenseFormData={expenseFormData}
          budget={budget}
          availableCategories={availableCategories}
          accounts={accounts}
          isSubmittingCategory={
            createCategoryMutation.isPending || updateCategoryMutation.isPending
          }
          isSubmittingBudget={updateBudgetMutation.isPending}
          isSubmittingExpense={createTransactionMutation.isPending}
          isDeletingCategory={deleteCategoryMutation.isPending}
          isDeletingBudget={deleteBudgetMutation.isPending}
          onCloseAddCategoryModal={() => {
            setShowAddCategoryModal(false);
            setEditingCategory(null);
            resetCategoryForm();
          }}
          onCloseEditBudgetModal={() => setShowEditBudgetModal(false)}
          onCloseExpenseModal={() => {
            setShowExpenseModal(false);
            setSelectedCategoryForExpense(null);
          }}
          onCloseCategoryDelete={() => setCategoryToDelete(null)}
          onCloseBudgetDelete={() => setBudgetToDelete(null)}
          onCategorySubmit={handleCategorySubmit}
          onBudgetSubmit={handleBudgetSubmit}
          onExpenseSubmit={handleExpenseSubmit}
          onCategoryDelete={handleDeleteCategory}
          onBudgetDelete={handleDeleteBudget}
          onCategoryFormChange={(data) => setCategoryFormData((prev) => ({ ...prev, ...data }))}
          onExpenseFormChange={(data) => setExpenseFormData((prev) => ({ ...prev, ...data }))}
        />
      </div>
    </div>
  );
};

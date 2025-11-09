import React from 'react';
import { Plus, Edit2, Trash2, BarChart3, AlertTriangle } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { ProgressBar } from '../../../components/common/ProgressBar';
import { formatCurrency } from '../../../utils/preferences';
import type { BudgetCategory } from '../api/budgets';
import { FlexBetween, HStack } from '../../../components/ui/Layout';

interface BudgetCategoriesProps {
  categories: BudgetCategory[];
  defaultCurrency?: string;
  isLoading?: boolean;
  onAddCategory: () => void;
  onEditCategory: (category: BudgetCategory) => void;
  onDeleteCategory: (category: BudgetCategory) => void;
  onAddExpense: (category: BudgetCategory) => void;
}

export const BudgetCategories: React.FC<BudgetCategoriesProps> = ({
  categories,
  defaultCurrency,
  isLoading = false,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  onAddExpense,
}) => {
  // Ensure categories is always an array
  const safeCategories = Array.isArray(categories) ? categories : [];

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-8 mb-8">
      <FlexBetween className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          <HStack>
            <BarChart3 className="w-6 h-6 mr-2 text-indigo-600" />
            Budget Categories
          </HStack>
        </h2>
        <Button onClick={onAddCategory} className="bg-gradient-to-r from-purple-600 to-indigo-600">
          <Plus className="w-4 h-4 mr-2" />
          Add Category
        </Button>
      </FlexBetween>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse bg-gray-100 dark:bg-gray-700 rounded-xl p-6 h-48"
            ></div>
          ))}
        </div>
      ) : safeCategories.length === 0 ? (
        <div className="text-center py-12">
          <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No categories yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Add categories to organize and track your budget spending.
          </p>
          <Button onClick={onAddCategory}>
            <Plus className="w-4 h-4 mr-2" />
            Add First Category
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {safeCategories.map((category) => (
            <div
              key={category.id}
              className="bg-gray-50/80 dark:bg-gray-700/50 rounded-xl p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <HStack>
                  <div
                    className="w-4 h-4 rounded-full mr-3"
                    style={{ backgroundColor: category.category_color }}
                  ></div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {category.category_name}
                    </h3>
                    {category.is_essential && (
                      <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">
                        Essential
                      </span>
                    )}
                  </div>
                </HStack>
                <HStack gap={1}>
                  <Button
                    onClick={() => onAddExpense(category)}
                    variant="ghost"
                    size="sm"
                    className="text-green-500 hover:text-green-700"
                    title="Add Expense"
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                  <Button onClick={() => onEditCategory(category)} variant="ghost" size="sm">
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button
                    onClick={() => onDeleteCategory(category)}
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </HStack>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Allocated</span>
                  <span className="font-medium">
                    {formatCurrency(parseFloat(category.allocated_amount || '0'), defaultCurrency)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Spent</span>
                  <span className="font-medium">
                    {formatCurrency(parseFloat(category.spent_amount || '0'), defaultCurrency)}
                  </span>
                </div>
                <ProgressBar
                  percentage={parseFloat(category.spent_percentage || '0')}
                  className="h-2"
                />
                {category.is_over_budget && (
                  <HStack className="text-red-600 dark:text-red-400 text-sm">
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    Over budget
                  </HStack>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

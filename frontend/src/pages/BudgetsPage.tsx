/**
 * Budgets Page with Full-Page Editor
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2, Sparkles, Calendar } from 'lucide-react';
import clsx from 'clsx';

const mockBudgets = [
  {
    id: '1',
    name: 'November 2025',
    period: 'Nov 1 - Nov 30, 2025',
    total: 50000,
    spent: 35000,
    categories: [
      { name: 'Food & Dining', allocated: 15000, spent: 12000 },
      { name: 'Transport', allocated: 8000, spent: 6500 },
      { name: 'Shopping', allocated: 12000, spent: 10000 },
      { name: 'Entertainment', allocated: 5000, spent: 3500 },
      { name: 'Bills', allocated: 10000, spent: 3000 },
    ],
  },
];

const CategoryRow = ({ category }: any) => {
  const percentage = (category.spent / category.allocated) * 100;
  const isOverBudget = percentage > 100;

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-900">{category.name}</h4>
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900">
            ₹{category.spent.toLocaleString()} / ₹{category.allocated.toLocaleString()}
          </p>
          <p className={clsx(
            'text-xs',
            isOverBudget ? 'text-red-600' : 'text-gray-500'
          )}>
            {percentage.toFixed(0)}% used
          </p>
        </div>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(percentage, 100)}%` }}
          className={clsx(
            'h-full rounded-full',
            isOverBudget ? 'bg-red-600' : percentage > 80 ? 'bg-yellow-500' : 'bg-green-500'
          )}
        />
      </div>
    </div>
  );
};

export const BudgetsPage = () => {
  const [editMode, setEditMode] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState(mockBudgets[0]);

  const totalPercentage = (selectedBudget.spent / selectedBudget.total) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Budgets</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create and manage your spending budgets
          </p>
        </div>

        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
            <Sparkles size={16} />
            AI Suggest
          </button>
          <button
            onClick={() => setEditMode(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus size={16} />
            New Budget
          </button>
        </div>
      </div>

      {/* Budget Overview */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">{selectedBudget.name}</h2>
              <p className="text-sm opacity-90 mt-1 flex items-center gap-2">
                <Calendar size={14} />
                {selectedBudget.period}
              </p>
            </div>
            <button
              onClick={() => setEditMode(true)}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <Edit2 size={18} />
            </button>
          </div>

          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-sm opacity-90">Total Spent</p>
              <p className="text-4xl font-bold mt-1">
                ₹{selectedBudget.spent.toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm opacity-90">Total Budget</p>
              <p className="text-2xl font-bold mt-1">
                ₹{selectedBudget.total.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="mt-4 w-full bg-white/20 rounded-full h-3 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(totalPercentage, 100)}%` }}
              className="h-full bg-white rounded-full"
            />
          </div>

          <div className="flex justify-between mt-2 text-sm">
            <span>{totalPercentage.toFixed(0)}% of budget used</span>
            <span>₹{(selectedBudget.total - selectedBudget.spent).toLocaleString()} remaining</span>
          </div>
        </div>

        <div className="p-6 space-y-3">
          <h3 className="text-base font-semibold text-gray-900 mb-4">
            Category Breakdown
          </h3>
          {selectedBudget.categories.map((category, index) => (
            <CategoryRow key={index} category={category} />
          ))}
        </div>
      </div>

      {/* Budget Templates */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          Budget Templates
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {['Conservative', 'Balanced', 'Flexible'].map((template) => (
            <button
              key={template}
              className="p-4 border-2 border-gray-300 rounded-lg hover:border-blue-600 hover:bg-blue-50 transition-colors text-left"
            >
              <h4 className="text-sm font-medium text-gray-900 mb-1">
                {template}
              </h4>
              <p className="text-xs text-gray-500">
                Recommended for {template.toLowerCase()} spenders
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Edit Modal */}
      {editMode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Create New Budget
              </h3>
              <button
                onClick={() => setEditMode(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Budget Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., November 2025"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Budget Amount
                </label>
                <input
                  type="number"
                  placeholder="50000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Category Allocations
                  </label>
                  <button className="text-xs text-blue-600 hover:text-blue-700">
                    + Add Category
                  </button>
                </div>
                <div className="space-y-2">
                  {['Food & Dining', 'Transport', 'Shopping'].map((cat) => (
                    <div key={cat} className="flex items-center gap-3">
                      <input
                        type="text"
                        value={cat}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                      <input
                        type="number"
                        placeholder="Amount"
                        className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                      <button className="p-2 text-red-600 hover:bg-red-50 rounded">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setEditMode(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Create Budget
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

/**
 * Tags & Categories Management Page
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2, Tag, Folder, Lock } from 'lucide-react';
import clsx from 'clsx';

const mockCategories = [
  { id: '1', name: 'Food & Dining', icon: '🍔', isSystem: false, transactionCount: 45 },
  { id: '2', name: 'Transport', icon: '🚗', isSystem: false, transactionCount: 32 },
  { id: '3', name: 'Shopping', icon: '🛍️', isSystem: false, transactionCount: 28 },
  { id: '4', name: 'Income', icon: '💰', isSystem: true, transactionCount: 12 },
  { id: '5', name: 'Bills', icon: '📄', isSystem: false, transactionCount: 18 },
];

const mockTags = [
  { id: '1', name: 'regular', color: '#3b82f6', isSystem: false, usageCount: 56 },
  { id: '2', name: 'monthly', color: '#10b981', isSystem: false, usageCount: 42 },
  { id: '3', name: 'group', color: '#f59e0b', isSystem: false, usageCount: 15 },
  { id: '4', name: 'reimbursable', color: '#8b5cf6', isSystem: true, usageCount: 8 },
];

export const TagsPage = () => {
  const [activeTab, setActiveTab] = useState<'categories' | 'tags'>('categories');
  const [editModalOpen, setEditModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tags & Categories</h1>
          <p className="text-sm text-gray-500 mt-1">
            Organize your transactions with tags and categories
          </p>
        </div>

        <button
          onClick={() => setEditModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus size={16} />
          {activeTab === 'categories' ? 'New Category' : 'New Tag'}
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('categories')}
            className={clsx(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'categories'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            <Folder size={16} />
            Categories
          </button>
          <button
            onClick={() => setActiveTab('tags')}
            className={clsx(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'tags'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            <Tag size={16} />
            Tags
          </button>
        </div>
      </div>

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-base font-semibold text-gray-900">
              All Categories
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {mockCategories.map((category) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-xl">
                      {category.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium text-gray-900">
                          {category.name}
                        </h4>
                        {category.isSystem && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                            <Lock size={10} />
                            System
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {category.transactionCount} transactions
                      </p>
                    </div>
                  </div>

                  {!category.isSystem && (
                    <div className="flex gap-2">
                      <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Tags Tab */}
      {activeTab === 'tags' && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-base font-semibold text-gray-900">All Tags</h3>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockTags.map((tag) => (
              <motion.div
                key={tag.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="text-sm font-medium text-gray-900">
                      {tag.name}
                    </span>
                  </div>
                  {tag.isSystem && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                      <Lock size={10} />
                    </span>
                  )}
                </div>

                <p className="text-xs text-gray-500 mb-3">
                  Used {tag.usageCount} times
                </p>

                {!tag.isSystem && (
                  <div className="flex gap-2">
                    <button className="flex-1 px-3 py-1.5 text-xs border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors">
                      Edit
                    </button>
                    <button className="flex-1 px-3 py-1.5 text-xs border border-red-300 text-red-700 rounded hover:bg-red-50 transition-colors">
                      Delete
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

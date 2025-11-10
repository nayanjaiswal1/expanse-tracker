/**
 * Transactions Page with Notion-style Table + WhatsApp Chat
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Filter, Download, Search } from 'lucide-react';
import { WhatsAppChat } from '../components/transactions/WhatsAppChat';

// Mock data
const mockTransactions = [
  {
    id: '1',
    date: '2025-11-10',
    description: 'Grocery shopping at Whole Foods',
    amount: 1245.50,
    category: 'Groceries',
    account: 'HDFC Credit Card',
    tags: ['regular', 'monthly'],
    type: 'expense',
  },
  {
    id: '2',
    date: '2025-11-09',
    description: 'Salary - November',
    amount: 50000,
    category: 'Income',
    account: 'HDFC Savings',
    tags: ['income'],
    type: 'income',
  },
  {
    id: '3',
    date: '2025-11-08',
    description: 'Dinner with friends',
    amount: 2500,
    category: 'Food & Dining',
    account: 'HDFC Credit Card',
    tags: ['group', 'social'],
    type: 'expense',
  },
];

export const TransactionsPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [chatOpen, setChatOpen] = useState(true);

  const handleSaveTransaction = (data: any) => {
    console.log('Saving transaction:', data);
    // TODO: API call to save transaction
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-4">
      {/* Left side - Notion Table */}
      <div className={clsx(
        'bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col transition-all duration-300',
        chatOpen ? 'flex-1' : 'w-full'
      )}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Transactions</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Manage and track all your transactions
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                <Filter size={16} />
                Filter
              </button>
              <button className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                <Download size={16} />
                Export
              </button>
              <button className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                <Plus size={16} />
                Add Transaction
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Description
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Category
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Account
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Tags
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {mockTransactions.map((transaction) => (
                <motion.tr
                  key={transaction.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {new Date(transaction.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {transaction.description}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                      {transaction.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {transaction.account}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex gap-1">
                      {transaction.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className={clsx(
                    'px-4 py-3 text-sm text-right font-medium',
                    transaction.type === 'income'
                      ? 'text-green-600'
                      : 'text-red-600'
                  )}>
                    {transaction.type === 'income' ? '+' : '-'}₹
                    {transaction.amount.toLocaleString()}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right side - WhatsApp Chat */}
      {chatOpen && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 400, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          className="flex-shrink-0"
        >
          <div className="h-full">
            <WhatsAppChat onSaveTransaction={handleSaveTransaction} />
          </div>
        </motion.div>
      )}

      {/* Toggle Chat Button */}
      <button
        onClick={() => setChatOpen(!chatOpen)}
        className="fixed bottom-6 right-6 w-12 h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors z-50"
      >
        {chatOpen ? '→' : '←'}
      </button>
    </div>
  );
};

import clsx from 'clsx';

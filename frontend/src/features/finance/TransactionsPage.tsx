import React, { useState, useEffect } from 'react';
import { ConfigurableTransactionTable } from './ConfigurableTransactionTable';
import { QuickAddChat } from './components/quickAdd/QuickAddChat';

export const TransactionsPage: React.FC = () => {
  const [isMobileView, setIsMobileView] = useState(false);
  const [activeTab, setActiveTab] = useState<'transactions' | 'quick-add'>('transactions');

  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b px-4 sm:px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Transactions</h1>
          <div className="flex gap-2 sm:gap-3">
            <button className="px-3 sm:px-4 py-2 text-xs sm:text-sm border rounded-lg hover:bg-gray-50 transition-colors">
              Filters
            </button>
            <button className="px-3 sm:px-4 py-2 text-xs sm:text-sm border rounded-lg hover:bg-gray-50 transition-colors">
              Export
            </button>
            <button className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              + New
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Tabs */}
      {isMobileView && (
        <div className="bg-white border-b px-4 flex gap-4 flex-shrink-0">
          <button
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'transactions'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab('transactions')}
          >
            Transactions
          </button>
          <button
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'quick-add'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab('quick-add')}
          >
            Quick Add
          </button>
        </div>
      )}

      {/* Main Content - Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Transaction List */}
        <div
          className={`${
            isMobileView
              ? activeTab === 'transactions'
                ? 'w-full'
                : 'hidden'
              : 'w-3/5 lg:w-2/3'
          } border-r bg-white overflow-hidden flex flex-col`}
        >
          <div className="flex-1 overflow-auto">
            <ConfigurableTransactionTable />
          </div>
        </div>

        {/* Right: Quick Add Chat */}
        <div
          className={`${
            isMobileView
              ? activeTab === 'quick-add'
                ? 'w-full'
                : 'hidden'
              : 'w-2/5 lg:w-1/3'
          } bg-gray-50 overflow-hidden`}
        >
          <QuickAddChat />
        </div>
      </div>
    </div>
  );
};

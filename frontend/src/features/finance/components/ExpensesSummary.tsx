import React from 'react';
import {
  Users,
  User,
  ArrowUpRight,
  ArrowDownLeft,
  Activity,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { formatCurrency } from '../../../utils/preferences';
import { FlexBetween, HStack } from '../../../components/ui/Layout';

interface ExpensesSummaryProps {
  totalLent: number;
  totalBorrowed: number;
  totalActivity: number;
  activeGroups: number;
  netBalance: number;
  showBalances: boolean;
  user: any;
  activeTab: 'individual' | 'groups';
}

export const ExpensesSummary: React.FC<ExpensesSummaryProps> = ({
  totalLent,
  totalBorrowed,
  totalActivity,
  activeGroups,
  netBalance,
  showBalances,
  user,
  activeTab,
}) => {
  return (
    <div className="h-full flex flex-col">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {activeTab === 'individual' ? 'Personal Lending' : 'Group Expenses'}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {activeTab === 'individual'
            ? 'Keep track of money lent to and borrowed from individuals'
            : 'Manage shared expenses and split bills with groups'}
        </p>
      </div>

      {/* Net Balance - Highlighted */}
      <div
        className={`mb-6 p-6 rounded-xl border-2 relative overflow-hidden ${
          netBalance >= 0
            ? 'bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950 border-emerald-200 dark:border-emerald-800'
            : 'bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-950 dark:to-red-950 border-rose-200 dark:border-rose-800'
        }`}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div
            className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl ${
              netBalance >= 0 ? 'bg-emerald-400' : 'bg-rose-400'
            }`}
          ></div>
        </div>

        <div className="relative">
          <FlexBetween className="mb-4">
            <div>
              <HStack gap={2} className="mb-2">
                <Wallet
                  className={`w-5 h-5 ${
                    netBalance >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Net Balance
                </span>
              </HStack>
              <p
                className={`text-4xl font-bold ${
                  netBalance >= 0
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-rose-700 dark:text-rose-300'
                }`}
              >
                {showBalances ? formatCurrency(Math.abs(netBalance), user) : '••••••'}
              </p>
            </div>
            <div
              className={`p-4 rounded-xl ${
                netBalance >= 0
                  ? 'bg-emerald-100 dark:bg-emerald-900/40'
                  : 'bg-rose-100 dark:bg-rose-900/40'
              }`}
            >
              {netBalance >= 0 ? (
                <TrendingUp className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <ArrowDownLeft className="w-8 h-8 text-rose-600 dark:text-rose-400" />
              )}
            </div>
          </FlexBetween>
          <p
            className={`text-sm font-medium ${
              netBalance >= 0
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-rose-700 dark:text-rose-400'
            }`}
          >
            {netBalance >= 0 ? '↑ You will get back' : '↓ You owe in total'}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
          <HStack gap={3} className="mb-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-lg">
              <ArrowUpRight className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
              Lent
            </span>
          </HStack>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {showBalances ? formatCurrency(totalLent, user) : '••••'}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
          <HStack gap={3} className="mb-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-lg">
              <ArrowDownLeft className="w-4 h-4 text-red-600 dark:text-red-400" />
            </div>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
              Borrowed
            </span>
          </HStack>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {showBalances ? formatCurrency(totalBorrowed, user) : '••••'}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
          <HStack gap={3} className="mb-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
              {activeTab === 'individual' ? (
                <Activity className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              ) : (
                <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              )}
            </div>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
              {activeTab === 'individual' ? 'Contacts' : 'Groups'}
            </span>
          </HStack>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {activeTab === 'individual' ? '—' : activeGroups}
          </p>
        </div>
      </div>

      {/* Empty State */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full mb-6">
            {activeTab === 'individual' ? (
              <User className="w-10 h-10 text-gray-400 dark:text-gray-500" />
            ) : (
              <Users className="w-10 h-10 text-gray-400 dark:text-gray-500" />
            )}
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            {activeTab === 'individual' ? 'No contact selected' : 'No group selected'}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Select {activeTab === 'individual' ? 'a contact' : 'a group'} from the left sidebar to
            view detailed transaction history, balance information, and payment records.
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-500">
            <HStack gap={1}>
              <div className="w-2 h-2 rounded-full bg-purple-500"></div>
              <span>Click any item to view</span>
            </HStack>
          </div>
        </div>
      </div>
    </div>
  );
};

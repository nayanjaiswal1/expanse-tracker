import React from 'react';
import { Clock, Coins } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { FlexBetween, HStack } from '../../../components/ui/Layout';
import { formatCurrency } from '../../../utils/preferences';

interface Transaction {
  id: number;
  description: string;
  amount: number;
  date: string;
  category_name: string;
  account_name?: string;
}

interface TransactionsData {
  results: Transaction[];
}

interface RecentTransactionsProps {
  transactionsQuery: {
    isLoading: boolean;
    data?: TransactionsData;
  };
  defaultCurrency?: string;
  onViewAllTransactions: () => void;
}

export const RecentTransactions: React.FC<RecentTransactionsProps> = ({
  transactionsQuery,
  defaultCurrency,
  onViewAllTransactions,
}) => {
  const transactions = transactionsQuery.data?.results || [];
  const transactionCount = transactions.length;

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-8">
      <FlexBetween className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          <HStack gap={2}>
            <Clock className="w-6 h-6 text-indigo-600" />
            Recent Expenses
          </HStack>
        </h2>
        <Button
          onClick={onViewAllTransactions}
          variant="ghost"
          size="sm"
          className="text-indigo-600 hover:text-indigo-700"
        >
          View All →
        </Button>
      </FlexBetween>

      {transactionsQuery.isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <FlexBetween
              key={i}
              className="animate-pulse p-4 bg-gray-100 dark:bg-gray-700 rounded-lg"
            >
              <HStack gap={3}>
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-full"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-32"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-24"></div>
                </div>
              </HStack>
              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-20"></div>
            </FlexBetween>
          ))}
        </div>
      ) : transactionCount === 0 ? (
        <div className="text-center py-12">
          <Coins className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No expenses yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Start tracking your expenses by adding transactions to budget categories.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.slice(0, 5).map((transaction) => (
            <FlexBetween
              key={transaction.id}
              className="p-4 bg-gray-50/80 dark:bg-gray-700/50 rounded-lg hover:shadow-sm transition-shadow"
            >
              <HStack gap={3}>
                <HStack className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full justify-center">
                  <Coins className="w-5 h-5 text-red-600 dark:text-red-400" />
                </HStack>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {transaction.description}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {transaction.category_name} • {new Date(transaction.date).toLocaleDateString()}
                  </p>
                </div>
              </HStack>
              <div className="text-right">
                <p className="font-semibold text-red-600 dark:text-red-400">
                  {formatCurrency(Math.abs(transaction.amount), defaultCurrency)}
                </p>
                {transaction.account_name && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {transaction.account_name}
                  </p>
                )}
              </div>
            </FlexBetween>
          ))}
          {transactionCount > 5 && (
            <div className="text-center pt-4">
              <Button
                onClick={onViewAllTransactions}
                variant="ghost"
                size="sm"
                className="text-indigo-600 hover:text-indigo-700"
              >
                Show {transactionCount - 5} more transactions
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

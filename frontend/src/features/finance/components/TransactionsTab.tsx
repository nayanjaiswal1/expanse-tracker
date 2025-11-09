import React from 'react';
import { ArrowUpRight, ArrowDownLeft, Receipt } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { formatCurrency } from '../../../utils/preferences';
import { FlexBetween, HStack } from '../../../components/ui/Layout';

interface Transaction {
  id: number;
  date: string;
  description: string;
  amount: number;
  transaction_type: 'credit' | 'debit';
  category?: {
    id: number;
    name: string;
  };
}

interface TransactionsTabProps {
  transactions: Transaction[];
  isLoading: boolean;
  error: any;
}

export const TransactionsTab: React.FC<TransactionsTabProps> = ({
  transactions,
  isLoading,
  error,
}) => {
  const { state: authState } = useAuth();

  if (isLoading) {
    return (
      <FlexBetween className="py-6">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
          Loading transactions...
        </span>
      </FlexBetween>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-red-600 dark:text-red-400">Failed to load transactions</p>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8">
        <Receipt className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">No transactions yet</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Transactions from statements will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {transactions.map((transaction) => (
        <div
          key={transaction.id}
          className="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-600"
        >
          <FlexBetween className="items-start">
            <div className="flex-1">
              <HStack className="gap-2 mb-1">
                {transaction.transaction_type === 'credit' ? (
                  <ArrowDownLeft className="w-4 h-4 text-green-500" />
                ) : (
                  <ArrowUpRight className="w-4 h-4 text-red-500" />
                )}
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {transaction.description}
                </span>
              </HStack>
              <HStack className="gap-3 text-xs text-gray-500 dark:text-gray-400">
                <span>{new Date(transaction.date).toLocaleDateString()}</span>
                {transaction.category && (
                  <>
                    <span>•</span>
                    <span className="capitalize">{transaction.category.name}</span>
                  </>
                )}
              </HStack>
            </div>
            <div className="text-right">
              <div
                className={`text-sm font-semibold ${
                  transaction.transaction_type === 'credit'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {transaction.transaction_type === 'credit' ? '+' : '-'}
                {formatCurrency(Math.abs(transaction.amount), authState.user)}
              </div>
            </div>
          </FlexBetween>
        </div>
      ))}
    </div>
  );
};

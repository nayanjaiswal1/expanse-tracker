import React, { useEffect, useRef } from 'react';
import { MessageSquare } from 'lucide-react';
import { formatCurrency } from '../../../utils/preferences';
import { FlexBetween, HStack } from '../../../components/ui/Layout';

interface TransactionHistoryProps {
  transactions: any[];
  authState: any;
  isLoading: boolean;
  currentPage: number;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  transactions,
  authState,
  isLoading,
  currentPage,
  onScroll,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when transactions change (new transactions added)
  useEffect(() => {
    if (scrollRef.current && transactions.length > 0) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transactions.length]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 space-y-1.5" onScroll={onScroll}>
      {/* Loading indicator for additional pages */}
      {isLoading && currentPage > 1 && (
        <div className="text-center py-2">
          <HStack className="inline-flex space-x-2 text-sm text-gray-500">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
            <span>Loading more...</span>
          </HStack>
        </div>
      )}

      {transactions.length === 0 && !isLoading ? (
        <div className="text-center py-8">
          <MessageSquare className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 mb-2">No transactions yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Start by adding a transaction below
          </p>
        </div>
      ) : (
        transactions.map((transaction) => (
          <div
            key={transaction.id}
            className={`max-w-[250px] px-3 py-2 rounded-lg border ${
              transaction.type === 'lend'
                ? 'ml-auto border-blue-200 dark:border-blue-800'
                : 'mr-auto border-gray-200 dark:border-gray-700'
            }`}
          >
            <div className="font-medium text-sm mb-1 text-gray-900 dark:text-gray-100">
              {transaction.description}
            </div>
            <FlexBetween className="items-end">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(transaction.created_at).toLocaleDateString()}
                {transaction.due_date && (
                  <div>Due: {new Date(transaction.due_date).toLocaleDateString()}</div>
                )}
              </div>
              <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                {formatCurrency(transaction.amount, authState.user)}
              </div>
            </FlexBetween>
          </div>
        ))
      )}
    </div>
  );
};

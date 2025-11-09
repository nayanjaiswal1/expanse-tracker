import React from 'react';
import { formatCurrency } from '../../../utils/preferences';
import { FlexBetween } from '../../../components/ui/Layout';

interface BalanceSummaryProps {
  relationshipDetails: any;
  authState: any;
  showBalances: boolean;
  totalTransactions: number;
}

export const BalanceSummary: React.FC<BalanceSummaryProps> = ({
  relationshipDetails,
  authState,
  showBalances,
  totalTransactions,
}) => {
  if (!showBalances || !relationshipDetails) return null;

  return (
    <div className="px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
      {/* Breakdown Stats */}
      <FlexBetween className="space-x-6">
        <div className="text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
            Lent
          </div>
          <div className="text-sm font-semibold text-green-600 dark:text-green-400">
            {formatCurrency(
              relationshipDetails.balances?.active?.lent || relationshipDetails.total_lent,
              authState.user
            )}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
            Borrowed
          </div>
          <div className="text-sm font-semibold text-red-600 dark:text-red-400">
            {formatCurrency(
              relationshipDetails.balances?.active?.borrowed || relationshipDetails.total_borrowed,
              authState.user
            )}
          </div>
        </div>

        {/* Status */}
        <div className="text-center">
          <div
            className={`text-xs  mb-1 ${
              relationshipDetails.balances?.active?.net > 0
                ? 'text-green-600 dark:text-green-400'
                : relationshipDetails.balances?.active?.net < 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {relationshipDetails.balances?.active?.net > 0
              ? 'owes you'
              : relationshipDetails.balances?.active?.net < 0
                ? 'you owe'
                : 'settled'}
          </div>
          <div
            className={`text-sm font-bold ${
              relationshipDetails.balances?.active?.net > 0
                ? 'text-green-600 dark:text-green-400'
                : relationshipDetails.balances?.active?.net < 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            {relationshipDetails.balances?.active?.net > 0 ? '+' : ''}
            {formatCurrency(
              relationshipDetails.balances?.active?.net || relationshipDetails.net_balance,
              authState.user
            )}
          </div>
        </div>
      </FlexBetween>
    </div>
  );
};

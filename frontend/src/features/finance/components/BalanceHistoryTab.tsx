import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { BalanceRecord } from '../../../types';
import { useAuth } from '../../../contexts/AuthContext';
import { formatCurrency } from '../../../utils/preferences';
import { FlexBetween, HStack } from '../../../components/ui/Layout';

interface BalanceHistoryTabProps {
  records: BalanceRecord[];
  isLoading: boolean;
  error: any;
}

export const BalanceHistoryTab: React.FC<BalanceHistoryTabProps> = ({
  records,
  isLoading,
  error,
}) => {
  const { state: authState } = useAuth();

  const getChangeIcon = (current: number, previous: number) => {
    if (current > previous) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (current < previous) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getChangeColor = (current: number, previous: number) => {
    if (current > previous) return 'text-green-600 dark:text-green-400';
    if (current < previous) return 'text-red-600 dark:text-red-400';
    return 'text-gray-500 dark:text-gray-400';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-red-600 dark:text-red-400">Failed to load balance history</p>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-gray-500 dark:text-gray-400">No balance records yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {records.map((record, index) => {
        const previousRecord = records[index + 1];
        const change = previousRecord ? record.balance - previousRecord.balance : 0;

        return (
          <div
            key={record.id}
            className="p-2.5 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-600"
          >
            <FlexBetween className="mb-1">
              <HStack gap={1.5}>
                {previousRecord && getChangeIcon(record.balance, previousRecord.balance)}
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatCurrency(record.balance, authState.user)}
                </span>
                {previousRecord && Math.abs(change) > 0.01 && (
                  <span
                    className={`text-xs font-medium ${getChangeColor(record.balance, previousRecord.balance)}`}
                  >
                    {change > 0 ? '+' : ''}
                    {formatCurrency(change, authState.user)}
                  </span>
                )}
              </HStack>
              <div className="text-right">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(record.date).toLocaleDateString()}
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 capitalize">
                  {record.entry_type.replace('_', ' ')}
                </div>
              </div>
            </FlexBetween>
            {record.notes && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{record.notes}</p>
            )}
          </div>
        );
      })}
    </div>
  );
};

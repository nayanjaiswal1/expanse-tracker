import React from 'react';
import { formatCurrency } from '../../utils/preferences';

interface TransactionStats {
  total: number;
  pending: number;
  verified: number;
  edited: number;
  errors: number;
  totalAmount: number;
}

interface TransactionPreviewStatsProps {
  stats: TransactionStats;
  authUser: any;
}

export const TransactionPreviewStats: React.FC<TransactionPreviewStatsProps> = ({
  stats,
  authUser,
}) => {
  const statItems = [
    {
      label: 'Total',
      value: stats.total,
      className: 'bg-gray-50 dark:bg-gray-800',
      textColor: 'text-gray-900 dark:text-white',
    },
    {
      label: 'Pending',
      value: stats.pending,
      className: 'bg-yellow-50 dark:bg-yellow-900/30',
      textColor: 'text-yellow-700 dark:text-yellow-300',
    },
    {
      label: 'Verified',
      value: stats.verified,
      className: 'bg-green-50 dark:bg-green-900/30',
      textColor: 'text-green-700 dark:text-green-300',
    },
    {
      label: 'Edited',
      value: stats.edited,
      className: 'bg-blue-50 dark:bg-blue-900/30',
      textColor: 'text-blue-700 dark:text-blue-300',
    },
    {
      label: 'Errors',
      value: stats.errors,
      className: 'bg-red-50 dark:bg-red-900/30',
      textColor: 'text-red-700 dark:text-red-300',
    },
    {
      label: 'Total Amount',
      value: formatCurrency(stats.totalAmount, authUser),
      className: 'bg-gray-50 dark:bg-gray-800',
      textColor: 'text-gray-900 dark:text-white',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
      {statItems.map((item) => (
        <div key={item.label} className={`${item.className} rounded-lg p-3`}>
          <div className="text-sm text-gray-500 dark:text-gray-400">{item.label}</div>
          <div className={`text-lg font-semibold ${item.textColor}`}>{item.value}</div>
        </div>
      ))}
    </div>
  );
};

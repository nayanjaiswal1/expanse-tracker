import React from 'react';
import { Calendar, User, Users, MoreVertical, CheckCircle, Clock } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { useAuth } from '../../../contexts/AuthContext';
import { formatCurrency } from '../../../utils/preferences';
import { HStack } from '../../../components/ui/Layout';

interface Transaction {
  id: number;
  contact?: { id: number; name: string; email: string };
  group?: { id: number; name: string };
  amount: number;
  description: string;
  date: string;
  type: 'lend' | 'borrow' | 'contribute';
  status: 'pending' | 'settled' | 'confirmed';
  dueDate?: string;
  createdBy?: { id: number; name: string };
}

interface LendingTransactionListProps {
  transactions: Transaction[];
  showBalances: boolean;
  type: 'individual' | 'group';
}

export const LendingTransactionList: React.FC<LendingTransactionListProps> = ({
  transactions,
  showBalances,
  type,
}) => {
  const { state: authState } = useAuth();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'settled':
      case 'confirmed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'settled':
      case 'confirmed':
        return CheckCircle;
      case 'pending':
        return Clock;
      default:
        return Clock;
    }
  };

  const getTypeColor = (transactionType: string) => {
    switch (transactionType) {
      case 'lend':
        return 'text-green-600 dark:text-green-400';
      case 'borrow':
        return 'text-red-600 dark:text-red-400';
      case 'contribute':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getTypeLabel = (transactionType: string) => {
    switch (transactionType) {
      case 'lend':
        return 'Lent';
      case 'borrow':
        return 'Borrowed';
      case 'contribute':
        return 'Contributed';
      default:
        return 'Transaction';
    }
  };

  if (transactions.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center border border-gray-200 dark:border-gray-700">
        {type === 'individual' ? (
          <User className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        ) : (
          <Users className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        )}
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No {type === 'individual' ? 'lending transactions' : 'group activity'} yet
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          {type === 'individual'
            ? 'Start by lending or borrowing money with someone'
            : 'Create a group and start managing shared money'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {type === 'individual' ? 'Your Lending History' : 'Group Activity'}
        </h3>
      </div>

      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {transactions.map((transaction) => {
          const StatusIcon = getStatusIcon(transaction.status);

          return (
            <div
              key={transaction.id}
              className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  {/* Icon */}
                  <div
                    className={`p-2 rounded-lg ${
                      type === 'individual'
                        ? 'bg-blue-100 dark:bg-blue-900/30'
                        : 'bg-purple-100 dark:bg-purple-900/30'
                    }`}
                  >
                    {type === 'individual' ? (
                      <User
                        className={`w-4 h-4 ${
                          type === 'individual'
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-purple-600 dark:text-purple-400'
                        }`}
                      />
                    ) : (
                      <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <HStack gap={2} className="mb-1">
                      <h4 className="font-medium text-gray-900 dark:text-white truncate">
                        {transaction.description}
                      </h4>
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-md ${getTypeColor(transaction.type)}`}
                      >
                        {getTypeLabel(transaction.type)}
                      </span>
                    </HStack>

                    <HStack gap={4} className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      {type === 'individual' && transaction.contact && (
                        <span>
                          {transaction.type === 'lend' ? 'To' : 'From'}: {transaction.contact.name}
                        </span>
                      )}
                      {type === 'group' && transaction.group && (
                        <span>Group: {transaction.group.name}</span>
                      )}
                      <HStack>
                        <Calendar className="w-3 h-3 mr-1" />
                        {new Date(transaction.date).toLocaleDateString()}
                      </HStack>
                      {transaction.dueDate && (
                        <span>Due: {new Date(transaction.dueDate).toLocaleDateString()}</span>
                      )}
                    </HStack>

                    {/* Status */}
                    <HStack gap={2}>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${getStatusColor(transaction.status)}`}
                      >
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {transaction.status === 'settled'
                          ? 'Settled'
                          : transaction.status === 'confirmed'
                            ? 'Confirmed'
                            : 'Pending'}
                      </span>
                      {type === 'group' && transaction.createdBy && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          by {transaction.createdBy.name}
                        </span>
                      )}
                    </HStack>
                  </div>
                </div>

                {/* Amount and Actions */}
                <HStack gap={3}>
                  {showBalances && (
                    <div className="text-right">
                      <div className={`text-lg font-semibold ${getTypeColor(transaction.type)}`}>
                        {formatCurrency(transaction.amount, authState.user)}
                      </div>
                    </div>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </HStack>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

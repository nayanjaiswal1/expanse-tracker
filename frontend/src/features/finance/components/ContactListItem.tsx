import React from 'react';
import { ChevronRight } from 'lucide-react';
import { formatCurrency } from '../../../utils/preferences';
import { FlexBetween, HStack } from '../../../components/ui/Layout';

interface ContactListItemProps {
  contact: {
    id: number;
    name: string;
    username: string;
    email: string;
  };
  totalLent: number;
  totalBorrowed: number;
  transactionCount: number;
  isSelected: boolean;
  showBalances: boolean;
  authState: any;
  onClick: () => void;
}

export const ContactListItem: React.FC<ContactListItemProps> = ({
  contact,
  totalLent,
  totalBorrowed,
  transactionCount,
  isSelected,
  showBalances,
  authState,
  onClick,
}) => {
  const netBalance = totalLent - totalBorrowed;

  if (transactionCount === 0) return null;

  return (
    <div
      className={`bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer ${
        isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500' : ''
      }`}
      onClick={onClick}
    >
      <FlexBetween>
        <HStack gap={3}>
          <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-bold">{contact.name.charAt(0)}</span>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white">{contact.name}</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {transactionCount} transaction{transactionCount !== 1 ? 's' : ''}
            </p>
          </div>
        </HStack>
        <HStack gap={3}>
          {showBalances && (
            <div className="text-right">
              <p
                className={`text-sm font-semibold ${
                  netBalance > 0
                    ? 'text-green-600 dark:text-green-400'
                    : netBalance < 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                {netBalance > 0 ? '+' : ''}
                {formatCurrency(netBalance, authState.user)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {netBalance > 0 ? 'owes you' : netBalance < 0 ? 'you owe' : 'settled'}
              </p>
            </div>
          )}
          <HStack gap={1}>
            <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          </HStack>
        </HStack>
      </FlexBetween>
    </div>
  );
};

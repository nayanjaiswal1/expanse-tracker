import React from 'react';
import { ArrowUpRight, ArrowDownLeft, Calendar, Eye } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { ProgressBar } from '../../../../components/common/ProgressBar';
import { formatCurrency } from '../../../../utils/preferences';
import type { User, LendingTransaction } from '../../../../types';
import type { SocialFinanceContactBalance } from '../../hooks/socialFinance/useSocialFinanceData';
import { FlexBetween, HStack } from '../../../../components/ui/Layout';

interface SocialFinanceContactDetailsProps {
  contact: SocialFinanceContactBalance | null;
  transactions: LendingTransaction[];
  user: User | null;
  onRecordRepayment: (transaction: LendingTransaction) => void;
  getStatusBadge: (status: string) => string;
}

export const SocialFinanceContactDetails: React.FC<SocialFinanceContactDetailsProps> = ({
  contact,
  transactions,
  user,
  onRecordRepayment,
  getStatusBadge,
}) => {
  if (!contact) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-12 text-center">
        <FlexBetween className="bg-pink-100 p-6 rounded-full w-20 h-20 mx-auto mb-6">
          <Eye className="w-10 h-10 text-pink-600" />
        </FlexBetween>
        <h3 className="text-xl font-medium theme-text-primary mb-2">
          Select a contact to view transactions
        </h3>
        <p className="theme-text-secondary text-lg">
          Choose a person from the left to see their lending history and current balance
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-pink-50 to-red-50">
        <FlexBetween>
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
              <div
                className={`w-3 h-3 rounded-full mr-3 ${
                  contact.netBalance > 0
                    ? 'bg-green-500'
                    : contact.netBalance < 0
                      ? 'bg-red-500'
                      : 'bg-gray-500'
                }`}
              ></div>
              {contact.name}
            </h2>
            <p className="theme-text-secondary mt-1">Transaction history and balance</p>
          </div>
          <div className="text-right">
            <div
              className={`text-3xl font-bold ${
                contact.netBalance > 0
                  ? 'text-green-600'
                  : contact.netBalance < 0
                    ? 'text-red-600'
                    : 'theme-text-secondary'
              }`}
            >
              {contact.netBalance > 0 && '+'}
              {formatCurrency(Math.abs(contact.netBalance), user)}
            </div>
            <div className="text-sm theme-text-secondary">
              {contact.netBalance > 0
                ? 'They owe you'
                : contact.netBalance < 0
                  ? 'You owe them'
                  : 'All settled'}
            </div>
          </div>
        </FlexBetween>
      </div>

      <div className="p-6 bg-gray-50 border-b border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(contact.totalLent, user)}
            </div>
            <div className="text-sm theme-text-secondary">You lent</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(contact.totalBorrowed, user)}
            </div>
            <div className="text-sm theme-text-secondary">You borrowed</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-medium theme-text-secondary">
              {contact.transactionCount}
            </div>
            <div className="text-sm theme-text-secondary">Total transactions</div>
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
        {transactions.length === 0 ? (
          <div className="p-8 text-center">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="theme-text-secondary text-lg">No transactions found</p>
          </div>
        ) : (
          transactions.map((transaction) => (
            <div key={transaction.id} className="p-4 hover:bg-gray-50 transition-colors">
              <FlexBetween>
                <HStack className="space-x-4">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      transaction.transaction_type === 'lent'
                        ? 'bg-green-100 text-green-600'
                        : 'bg-red-100 text-red-600'
                    }`}
                  >
                    {transaction.transaction_type === 'lent' ? (
                      <ArrowUpRight className="w-6 h-6" />
                    ) : (
                      <ArrowDownLeft className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg text-gray-800">
                      {transaction.description}
                    </h4>
                    <HStack className="space-x-3 text-sm theme-text-secondary">
                      <span>{new Date(transaction.date).toLocaleDateString()}</span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(
                          transaction.status
                        )}`}
                      >
                        {transaction.status.replace('_', ' ')}
                      </span>
                    </HStack>
                  </div>
                </HStack>
                <div className="text-right">
                  <div
                    className={`text-xl font-bold ${
                      transaction.transaction_type === 'lent' ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {formatCurrency(parseFloat(transaction.amount), user)}
                  </div>
                  <div className="text-sm theme-text-muted mt-1">
                    {transaction.remaining_amount > 0 && transaction.status !== 'written_off' && (
                      <>
                        <span className="text-orange-600 font-medium">
                          {formatCurrency(transaction.remaining_amount, user)} pending
                        </span>
                        {!transaction.is_fully_repaid && (
                          <Button
                            onClick={() => onRecordRepayment(transaction)}
                            variant="link"
                            size="sm"
                          >
                            Record Payment
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </FlexBetween>

              {!transaction.is_fully_repaid && transaction.status !== 'written_off' && (
                <div className="mt-3 pl-16">
                  <FlexBetween className="text-sm theme-text-secondary mb-1">
                    <span>Repayment Progress</span>
                    <span>{transaction.repayment_percentage.toFixed(1)}%</span>
                  </FlexBetween>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <ProgressBar
                      percentage={transaction.repayment_percentage}
                      className="bg-blue-600"
                    />
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

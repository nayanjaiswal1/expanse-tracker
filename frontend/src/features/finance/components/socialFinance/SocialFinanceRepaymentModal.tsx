import React from 'react';
import { Coins } from 'lucide-react';
import { FormModal } from '../../../../components/ui/FormModal';
import { Input } from '../../../../components/ui/Input';
import { formatCurrency } from '../../../../utils/preferences';
import type { LendingTransaction, User } from '../../../../types';
import { Button } from '../../../../components/ui/Button';

export interface RepaymentFormData {
  amount: string;
  date: string;
  notes: string;
}

interface SocialFinanceRepaymentModalProps {
  isOpen: boolean;
  transaction: LendingTransaction | null;
  repaymentData: RepaymentFormData;
  onChange: (updates: Partial<RepaymentFormData>) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  user: User | null;
}

export const SocialFinanceRepaymentModal: React.FC<SocialFinanceRepaymentModalProps> = ({
  isOpen,
  transaction,
  repaymentData,
  onChange,
  onSubmit,
  onClose,
  user,
}) => {
  return (
    <FormModal isOpen={isOpen} onClose={onClose} title="Record Repayment">
      {transaction && (
        <form onSubmit={onSubmit} className="space-y-5 p-6">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-lg theme-text-primary">{transaction.contact_name}</h3>
            <p className="text-sm theme-text-secondary">{transaction.description}</p>
            <p className="text-sm theme-text-muted mt-1">
              Remaining:{' '}
              <span className="font-medium text-blue-600">
                {formatCurrency(transaction.remaining_amount, user)}
              </span>
            </p>
          </div>

          <Input
            label="Repayment Amount"
            type="number"
            step="0.01"
            value={repaymentData.amount}
            onChange={(e) =>
              onChange({
                amount: e.target.value,
              })
            }
            max={transaction.remaining_amount}
            placeholder="0.00"
            required
            icon={Coins}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={repaymentData.date}
              onChange={(e) =>
                onChange({
                  date: e.target.value,
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              value={repaymentData.notes}
              onChange={(e) =>
                onChange({
                  notes: e.target.value,
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
              rows={3}
              placeholder="Payment method, additional notes..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button type="button" onClick={onClose} variant="link-secondary-theme">
              Cancel
            </Button>
            <Button type="submit" variant="success">
              Record Payment
            </Button>
          </div>
        </form>
      )}
    </FormModal>
  );
};

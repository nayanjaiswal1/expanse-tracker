import React from 'react';
import { Coins } from 'lucide-react';
import { FormModal } from '../../../../components/ui/FormModal';
import { Input } from '../../../../components/ui/Input';
import { Select } from '../../../../components/ui/Select';
import { Button } from '../../../../components/ui/Button';
import type { Account } from '../../../../types';

interface SocialFinanceExpenseModalProps {
  isOpen: boolean;
  groupName?: string;
  expense: {
    description: string;
    total_amount: string;
    date: string;
    account: string;
    notes: string;
  };
  accounts: Account[];
  onChange: (updates: Partial<SocialFinanceExpenseModalProps['expense']>) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}

export const SocialFinanceExpenseModal: React.FC<SocialFinanceExpenseModalProps> = ({
  isOpen,
  groupName,
  expense,
  accounts,
  onChange,
  onSubmit,
  onClose,
}) => {
  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Add Expense to ${groupName || 'Group'}`}
      size="lg"
    >
      <form onSubmit={onSubmit} className="space-y-5 p-6">
        <Input
          label="Expense Description"
          type="text"
          value={expense.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="e.g., Dinner at restaurant, Groceries, Gas"
          required
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Input
            label="Amount"
            type="number"
            step="0.01"
            value={expense.total_amount}
            onChange={(e) => onChange({ total_amount: e.target.value })}
            placeholder="0.00"
            required
            icon={Coins}
          />
          <Input
            label="Date"
            type="date"
            value={expense.date}
            onChange={(e) => onChange({ date: e.target.value })}
            required
          />
        </div>

        <Select
          label="Account"
          value={expense.account}
          onChange={(e) => onChange({ account: e.target.value })}
          options={accounts.map((account) => ({
            value: account.id,
            label: account.name,
          }))}
          required
        />

        <Input
          label="Notes"
          value={expense.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          multiline
          rows={3}
          placeholder="Additional details about this expense..."
        />

        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
          <Button type="button" onClick={onClose} variant="ghost">
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Add Expense
          </Button>
        </div>
      </form>
    </FormModal>
  );
};

import React from 'react';
import { ArrowUpRight, ArrowDownLeft, Coins } from 'lucide-react';
import { FormModal } from '../../../../components/ui/FormModal';
import { Input } from '../../../../components/ui/Input';
import { Select } from '../../../../components/ui/Select';
import { Button } from '../../../../components/ui/Button';
import type { Contact, Account } from '../../../../types';

interface SocialFinanceLendingTransactionModalProps {
  isOpen: boolean;
  transaction: {
    contact: string;
    account: string;
    transaction_type: 'lent' | 'borrowed';
    amount: string;
    description: string;
    date: string;
    notes: string;
  };
  contacts: Contact[];
  accounts: Account[];
  onChange: (updates: Partial<SocialFinanceLendingTransactionModalProps['transaction']>) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}

export const SocialFinanceLendingTransactionModal: React.FC<
  SocialFinanceLendingTransactionModalProps
> = ({ isOpen, transaction, contacts, accounts, onChange, onSubmit, onClose }) => {
  const setTransactionType = (type: 'lent' | 'borrowed') => {
    onChange({ transaction_type: type });
  };

  return (
    <FormModal isOpen={isOpen} onClose={onClose} title="Add Lending Transaction" size="lg">
      <form onSubmit={onSubmit} className="space-y-5 p-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Transaction Type <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-4">
            <Button
              type="button"
              onClick={() => setTransactionType('lent')}
              variant={transaction.transaction_type === 'lent' ? 'primary' : 'secondary'}
              className="p-4 border-2 rounded-lg text-left transition-colors duration-200"
            >
              <div className="flex items-center mb-2">
                <ArrowUpRight className="w-6 h-6 mr-3" />
                <span className="font-semibold text-lg text-gray-800">Money Lent</span>
              </div>
              <p className="text-sm theme-text-secondary">You gave money to someone</p>
            </Button>
            <Button
              type="button"
              onClick={() => setTransactionType('borrowed')}
              variant={transaction.transaction_type === 'borrowed' ? 'primary' : 'secondary'}
              className="p-4 border-2 rounded-lg text-left transition-colors duration-200"
            >
              <div className="flex items-center mb-2">
                <ArrowDownLeft className="w-6 h-6 mr-3" />
                <span className="font-semibold text-lg text-gray-800">Money Borrowed</span>
              </div>
              <p className="text-sm theme-text-secondary">You received money from someone</p>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Select
            label="Contact"
            value={transaction.contact}
            onChange={(e) => onChange({ contact: e.target.value })}
            options={contacts.map((contact) => ({
              value: contact.id,
              label: contact.name,
            }))}
            required
          />
          <Select
            label="Account"
            value={transaction.account}
            onChange={(e) => onChange({ account: e.target.value })}
            options={accounts.map((account) => ({
              value: account.id,
              label: account.name,
            }))}
            required
          />
        </div>

        <Input
          label="Description"
          type="text"
          value={transaction.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="e.g., Lunch money, Emergency loan, Trip expenses"
          required
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Input
            label="Amount"
            type="number"
            step="0.01"
            value={transaction.amount}
            onChange={(e) => onChange({ amount: e.target.value })}
            placeholder="0.00"
            required
            icon={Coins}
          />
          <Input
            label="Date"
            type="date"
            value={transaction.date}
            onChange={(e) => onChange({ date: e.target.value })}
            required
          />
        </div>

        <Input
          label="Notes"
          value={transaction.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          multiline
          rows={3}
          placeholder="Additional details about this transaction..."
        />

        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
          <Button type="button" onClick={onClose} variant="ghost">
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Add Transaction
          </Button>
        </div>
      </form>
    </FormModal>
  );
};

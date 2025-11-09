import React from 'react';
import { Plus } from 'lucide-react';
import { ContactListItem } from './ContactListItem';
import { Button } from '../../../components/ui/Button';
import { FlexBetween, HStack } from '../../../components/ui/Layout';

interface ContactListProps {
  contacts: Array<{
    id: number;
    name: string;
    username: string;
    email: string;
  }>;
  transactions: any[];
  selectedContactId: number | null;
  showBalances: boolean;
  authState: any;
  onContactSelect: (contactId: number) => void;
  onAddTransaction: () => void;
}

export const ContactList: React.FC<ContactListProps> = ({
  contacts,
  transactions,
  selectedContactId,
  showBalances,
  authState,
  onContactSelect,
  onAddTransaction,
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
      <FlexBetween className="mb-4">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Your Lending History</h3>
        <Button onClick={onAddTransaction} size="sm">
          <HStack gap={1}>
            <Plus className="w-4 h-4" />
            <span>Add Transaction</span>
          </HStack>
        </Button>
      </FlexBetween>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {contacts.map((contact) => {
          // Calculate totals for this contact
          const contactTransactions = transactions.filter((t) => t.contact.id === contact.id);
          const totalLent = contactTransactions
            .filter((t) => t.type === 'lend')
            .reduce((sum, t) => sum + t.amount, 0);
          const totalBorrowed = contactTransactions
            .filter((t) => t.type === 'borrow')
            .reduce((sum, t) => sum + t.amount, 0);

          return (
            <ContactListItem
              key={contact.id}
              contact={contact}
              totalLent={totalLent}
              totalBorrowed={totalBorrowed}
              transactionCount={contactTransactions.length}
              isSelected={selectedContactId === contact.id}
              showBalances={showBalances}
              authState={authState}
              onClick={() => onContactSelect(contact.id)}
            />
          );
        })}
      </div>
    </div>
  );
};

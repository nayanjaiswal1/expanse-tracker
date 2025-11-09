import React from 'react';
import { HandHeart } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { formatCurrency } from '../../../../utils/preferences';
import type { User } from '../../../../types';
import type { SocialFinanceContactBalance } from '../../hooks/socialFinance/useSocialFinanceData';
import { FlexBetween, HStack } from '../../../../components/ui/Layout';

interface SocialFinanceContactListProps {
  contacts: SocialFinanceContactBalance[];
  selectedContactId: number | null;
  onSelect: (contact: SocialFinanceContactBalance) => void;
  onCreateContact: () => void;
  user: User | null;
}

export const SocialFinanceContactList: React.FC<SocialFinanceContactListProps> = ({
  contacts,
  selectedContactId,
  onSelect,
  onCreateContact,
  user,
}) => {
  if (contacts.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <HStack as="h2" className="text-xl font-bold text-gray-800">
            <div className="w-3 h-3 bg-pink-500 rounded-full mr-3"></div>
            Lending Contacts
          </HStack>
          <p className="theme-text-secondary text-sm mt-1">
            Click on a person to view their transactions
          </p>
        </div>
        <div className="p-12 text-center">
          <div className="bg-gray-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <HandHeart className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-medium theme-text-primary mb-2">No lending contacts yet</h3>
          <p className="theme-text-secondary mb-4">
            Add a contact and create your first lending transaction
          </p>
          <Button onClick={onCreateContact} variant="link">
            Add your first contact
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <HStack as="h2" className="text-xl font-bold text-gray-800">
          <div className="w-3 h-3 bg-pink-500 rounded-full mr-3"></div>
          Lending Contacts
        </HStack>
        <p className="theme-text-secondary text-sm mt-1">
          Click on a person to view their transactions
        </p>
      </div>
      <div className="divide-y divide-gray-200">
        {contacts.map((contact) => {
          const isSelected = selectedContactId === contact.id;
          const balanceClass =
            contact.netBalance > 0
              ? 'bg-green-500'
              : contact.netBalance < 0
                ? 'bg-red-500'
                : 'bg-gray-500';
          const amountClass =
            contact.netBalance > 0
              ? 'text-green-600'
              : contact.netBalance < 0
                ? 'text-red-600'
                : 'theme-text-secondary';

          return (
            <button
              key={contact.id}
              type="button"
              onClick={() => onSelect(contact)}
              className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                isSelected ? 'bg-pink-50 border-r-4 border-pink-500' : ''
              }`}
            >
              <FlexBetween>
                <HStack className="space-x-3">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-medium text-lg ${balanceClass}`}
                  >
                    {contact.name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{contact.name}</h3>
                    <p className="text-sm theme-text-secondary">
                      {contact.transactionCount} transactions
                    </p>
                  </div>
                </HStack>
                <div className="text-right">
                  <div className={`text-xl font-bold ${amountClass}`}>
                    {contact.netBalance > 0 && '+'}
                    {formatCurrency(Math.abs(contact.netBalance), user)}
                  </div>
                  <div className="text-xs theme-text-muted">
                    {contact.netBalance > 0
                      ? 'Owes you'
                      : contact.netBalance < 0
                        ? 'You owe'
                        : 'Settled'}
                  </div>
                </div>
              </FlexBetween>
            </button>
          );
        })}
      </div>
    </div>
  );
};

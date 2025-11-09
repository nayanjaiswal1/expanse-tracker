import React, { useState } from 'react';
import { Users } from 'lucide-react';
import { FlexBetween, HStack } from '../../../components/ui/Layout';

import { useAuth } from '../../../contexts/AuthContext';

import { LendingForm } from './LendingForm';
import { ContactList } from './ContactList';
import { ContactDetailSidebar } from './ContactDetailSidebar';
import { EmptyState } from './EmptyState';
import {
  useIndividualLendingTransactions,
  useIndividualLendingSummary,
  useIndividualLendingContacts,
} from '../hooks/useIndividualLending';

interface IndividualLendingProps {
  showBalances: boolean;
}

export const IndividualLending: React.FC<IndividualLendingProps> = ({ showBalances }) => {
  const { state: authState } = useAuth();
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);
  const [showLendingForm, setShowLendingForm] = useState(false);
  const [lendingType, setLendingType] = useState<'lend' | 'borrow'>('lend');

  // API hooks
  const { data: transactions = [], isLoading } = useIndividualLendingTransactions();
  const { data: summary } = useIndividualLendingSummary();
  const { data: availableContacts = [] } = useIndividualLendingContacts();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 animate-pulse"
            >
              <FlexBetween>
                <div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-2"></div>
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                </div>
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
              </FlexBetween>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-gray-50 dark:bg-gray-900">
      {/* Left Panel - Main Content */}
      <div className={`transition-all duration-300 ${selectedContactId ? 'mr-96' : ''}`}>
        {/* Contact List */}
        {availableContacts.length === 0 ? (
          <EmptyState
            onButtonClick={() => setShowLendingForm(true)}
            title="No contacts yet"
            message="Add your first contact to start tracking your lending and borrowing."
            buttonText="Add Contact"
            icon={<Users className="h-8 w-8 text-secondary-500 dark:text-secondary-400" />}
          />
        ) : (
          <ContactList
            contacts={availableContacts}
            transactions={transactions}
            selectedContactId={selectedContactId}
            showBalances={showBalances}
            authState={authState}
            onContactSelect={setSelectedContactId}
            onAddTransaction={() => setShowLendingForm(true)}
          />
        )}
      </div>

      {/* Right Sidebar - Contact Details */}
      {selectedContactId && (
        <ContactDetailSidebar
          contactId={selectedContactId}
          onClose={() => setSelectedContactId(null)}
          showBalances={showBalances}
        />
      )}

      {/* Lending Form Modal */}
      <LendingForm
        isOpen={showLendingForm}
        onClose={() => setShowLendingForm(false)}
        type={lendingType}
        mode="individual"
        contacts={availableContacts.map((contact: any) => ({ id: contact.id, name: contact.name }))}
      />
    </div>
  );
};

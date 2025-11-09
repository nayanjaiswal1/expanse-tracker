import React from 'react';
import { Modal } from '../../../components/ui/Modal';
import { ObjectForm } from '../../../components/forms/ObjectForm';
import { createAccountManagementFormConfig } from '../forms';
import { AccountManagementFormData } from '../schemas';
import type { Account, AccountType } from '../../../types';

// Define the expected account types
const ACCOUNT_TYPES: AccountType[] = [
  'checking',
  'savings',
  'credit',
  'investment',
  'loan',
  'cash',
  'other',
];

// Helper to get a valid account type
const getValidAccountType = (type?: string): AccountType => {
  return ACCOUNT_TYPES.includes(type as AccountType) ? (type as AccountType) : 'checking';
};

interface AccountModalProps {
  isOpen: boolean;
  editingAccount: Account | null;
  isLoading: boolean;
  currencies: { code: string; name: string; symbol: string }[];
  bankIcons: { identifier: string; name: string; icon_url: string }[];
  onClose: () => void;
  onSubmit: (data: AccountManagementFormData) => Promise<void>;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  editingAccount,
  isLoading,
  currencies,
  bankIcons,
  onClose,
  onSubmit,
}) => {
  const isEditing = Boolean(editingAccount && editingAccount.id);
  const titleKey = isEditing
    ? 'accounts.modals.accountForm.editTitle'
    : 'accounts.modals.accountForm.addTitle';
  const subtitleKey = isEditing
    ? 'accounts.modals.accountForm.editSubtitle'
    : 'accounts.modals.accountForm.addSubtitle';

  // Ensure currencies is always an array and has at least one item
  const defaultCurrency =
    Array.isArray(currencies) && currencies.length > 0 ? currencies[0].code : 'USD';

  const initialValues =
    isEditing && editingAccount
      ? {
          name: editingAccount.name || '',
          account_type: getValidAccountType(editingAccount.account_type),
          balance: editingAccount.balance ? parseFloat(editingAccount.balance.toString()) : 0,
          currency: editingAccount.currency || defaultCurrency,
          institution: editingAccount.institution || '',
          account_number: editingAccount.account_number || '',
          icon: editingAccount.icon || '',
          status: editingAccount.status || 'active',
        }
      : {
          name: '',
          account_type: 'checking' as const,
          balance: 0,
          currency: defaultCurrency,
          institution: '',
          account_number: '',
          icon: '',
          status: 'active' as const,
        };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      titleKey={titleKey}
      subtitleKey={subtitleKey}
      showDefaultSubtitle={false}
      size="lg"
      namespace="finance"
    >
      <ObjectForm
        config={createAccountManagementFormConfig(
          onSubmit,
          isLoading,
          initialValues,
          isEditing,
          currencies,
          bankIcons,
          undefined,
          onClose
        )}
      />
    </Modal>
  );
};

import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../../api/client';
import { useToast } from '../../../components/ui/Toast';
import { AccountModal } from './AccountModal';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import type { Account } from '../../../types';
import { AccountManagementFormData } from '../schemas';

interface AccountManagementModalsProps {
  // Modal states
  showAddModal: boolean;
  showConfirmDelete: boolean;
  editingAccount: Account | null;
  accountToDelete: Account | null;

  // Data
  currencies: Array<{ code: string; name: string; symbol: string }>;
  bankIcons: { identifier: string; name: string; icon_url: string }[];

  // Handlers
  onCloseAddModal: () => void;
  onCloseConfirmDelete: () => void;
  onAccountSubmit: (data: AccountManagementFormData) => Promise<void>;
}

export const AccountManagementModals: React.FC<AccountManagementModalsProps> = ({
  showAddModal,
  showConfirmDelete,
  editingAccount,
  accountToDelete,
  currencies,
  bankIcons,
  onCloseAddModal,
  onCloseConfirmDelete,
  onAccountSubmit,
}) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation('finance');
  const { showError } = useToast();

  const deleteAccountMutation = useMutation<void, Error, number>({
    mutationFn: apiClient.deleteAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      onCloseConfirmDelete();
    },
  });

  const confirmDelete = async () => {
    if (accountToDelete) {
      try {
        await deleteAccountMutation.mutateAsync(accountToDelete.id);
      } catch (error: unknown) {
        const fallbackMessage = t('finance.accounts.notifications.deleteFailed.message');
        const message = error instanceof Error && error.message ? error.message : fallbackMessage;
        showError(t('finance.accounts.notifications.deleteFailed.title'), message);
      }
    }
  };

  return (
    <>
      <AccountModal
        isOpen={showAddModal}
        editingAccount={editingAccount}
        isLoading={false}
        currencies={currencies}
        bankIcons={bankIcons}
        onClose={onCloseAddModal}
        onSubmit={onAccountSubmit}
      />

      <ConfirmDialog
        isOpen={showConfirmDelete}
        onClose={onCloseConfirmDelete}
        onConfirm={confirmDelete}
        titleKey="finance.accounts.modals.delete.title"
        messageKey="finance.accounts.modals.delete.message"
        messageValues={{ name: accountToDelete?.name ?? '' }}
        confirmTextKey="common.actions.delete"
        cancelTextKey="common.actions.cancel"
        confirmLoading={deleteAccountMutation.isPending}
        variant="danger"
      />
    </>
  );
};

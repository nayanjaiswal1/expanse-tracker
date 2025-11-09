import React from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../../components/ui/Modal';
import { ObjectForm } from '../../../components/forms';
import { createLendingFormConfig } from '../lending';
import { useToast } from '../../../components/ui/Toast';
import type { LendingFormData } from '../schemas/forms';
import type { LendingTransaction } from '../hooks/useIndividualLending';

interface LendingFormProps {
  isOpen: boolean;
  onClose: () => void;
  type?: 'lend' | 'borrow';
  mode: 'individual' | 'group';
  groupId?: number;
  editTransaction?: LendingTransaction;
  contacts: Array<{ id: number; name: string }>;
  onSubmit?: (data: LendingFormData) => Promise<void>;
}

export const LendingForm: React.FC<LendingFormProps> = ({
  isOpen,
  onClose,
  type,
  editTransaction,
  contacts,
  onSubmit,
}) => {
  const { t } = useTranslation('finance');
  const { showSuccess, showError } = useToast();

  const isEditing = !!editTransaction;

  // Prepare initial data from editing transaction
  const initialData = editTransaction
    ? {
        contact_user_id: editTransaction.contact.id,
        amount: Number(editTransaction.amount),
        description: editTransaction.description,
        type: editTransaction.type,
        due_date: editTransaction.due_date ? editTransaction.due_date.split('T')[0] : '',
        interest_rate: editTransaction.interest_rate
          ? Number(editTransaction.interest_rate)
          : undefined,
        notes: editTransaction.notes || '',
      }
    : undefined;

  const handleFormSubmit = async (data: LendingFormData) => {
    try {
      if (onSubmit) {
        await onSubmit(data);
      }

      const contactName = contacts.find((c) => c.id === data.contact_user_id)?.name || 'contact';

      showSuccess(
        isEditing
          ? t('lending.notifications.updateSuccess', 'Transaction updated!')
          : t(
              `lending.notifications.createSuccess.${data.type}`,
              `Successfully recorded ${data.type === 'lend' ? 'money lent to' : 'money borrowed from'} ${contactName}`
            )
      );

      onClose();
    } catch (error: any) {
      showError(
        t('lending.notifications.error', 'Failed to save transaction'),
        error.message || t('common.errors.tryAgain', 'Please try again')
      );
    }
  };

  const formConfig = createLendingFormConfig({
    onSubmit: handleFormSubmit,
    isLoading: false,
    initialData,
    isEdit: isEditing,
    type,
    contacts,
    onCancel: onClose,
  });

  const selectedType = type || editTransaction?.type || 'lend';
  const modalTitle = isEditing
    ? t(
        `lending.form.editTitle.${selectedType}`,
        `Edit ${selectedType === 'lend' ? 'Lending' : 'Borrowing'} Transaction`
      )
    : t('lending.form.addTitle', 'Manage Money Transaction');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} size="md">
      <ObjectForm config={formConfig} />
    </Modal>
  );
};

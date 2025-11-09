import React from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../../components/ui/Modal';
import { ObjectForm } from '../../../components/forms';
import { createExpenseFormConfig } from '../expenses';
import { useAuth } from '../../../contexts/AuthContext';
import type { ExpenseFormData } from '../schemas/forms';
import type { SplitwiseGroup } from '../hooks/useSplitwiseGroups';

interface ExpenseFormProps {
  isOpen: boolean;
  onClose: () => void;
  group: SplitwiseGroup;
  onSubmit?: (data: ExpenseFormData) => Promise<void>;
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({ isOpen, onClose, group, onSubmit }) => {
  const { state: authState } = useAuth();
  const { t } = useTranslation('finance');

  const handleFormSubmit = async (data: ExpenseFormData) => {
    if (onSubmit) {
      await onSubmit(data);
    }
    onClose();
  };

  const formConfig = createExpenseFormConfig({
    onSubmit: handleFormSubmit,
    isLoading: false,
    group,
    currentUserId: authState.user?.id,
    onCancel: onClose,
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('expenses.form.addTitle', 'Add Expense')}
      size="md"
      zIndex="z-[60]"
    >
      <ObjectForm config={formConfig} />
    </Modal>
  );
};

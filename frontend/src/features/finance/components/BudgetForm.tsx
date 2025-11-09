import React from 'react';
import { ObjectForm } from '../../../components/forms';
import { createBudgetFormConfig } from '../budgets/forms';
import type { Budget } from '../api/budgets';
import type { BudgetEnhancedFormData } from '../schemas/forms';

interface BudgetFormProps {
  editingBudget: Budget | null;
  isSubmitting: boolean;
  onSubmit: (data: BudgetEnhancedFormData) => Promise<void>;
  onCancel: () => void;
}

export const BudgetForm: React.FC<BudgetFormProps> = ({
  editingBudget,
  isSubmitting,
  onSubmit,
  onCancel,
}) => {
  // Prepare initial data from editing budget
  const initialData = editingBudget
    ? {
        name: editingBudget.name,
        description: editingBudget.description || '',
        period_type: editingBudget.period_type as 'monthly' | 'quarterly' | 'yearly' | 'custom',
        start_date: editingBudget.start_date,
        end_date: editingBudget.end_date,
        total_amount: Number(editingBudget.total_amount),
        is_active: editingBudget.is_active,
        auto_rollover: editingBudget.auto_rollover,
      }
    : undefined;

  const formConfig = createBudgetFormConfig({
    onSubmit,
    isLoading: isSubmitting,
    initialData,
    isEdit: !!editingBudget,
    onCancel,
  });

  return <ObjectForm config={formConfig} />;
};

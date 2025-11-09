import React from 'react';
import { ObjectForm } from '../../../components/forms';
import { createGoalFormConfig } from '../goals/forms';
import type { Goal } from '../../../types';
import type { GoalEnhancedFormData } from '../schemas/forms';

export interface GoalFormData {
  name: string;
  description: string;
  goal_type:
    | 'savings'
    | 'spending'
    | 'debt_payoff'
    | 'investment'
    | 'expense_reduction'
    | 'income_increase'
    | 'emergency_fund'
    | 'retirement'
    | 'education'
    | 'travel'
    | 'home'
    | 'car'
    | 'other';
  target_amount: string;
  current_amount: string;
  currency: string;
  start_date: string;
  target_date: string;
  category?: number;
  account?: number;
  auto_track: boolean;
  images?: any[];
}

interface GoalFormProps {
  formData: GoalFormData;
  onFormDataChange: (data: GoalFormData) => void;
  editingGoal: Goal | null;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  onDelete?: () => void;
  isSubmitting: boolean;
  accounts?: Array<{ value: number; label: string }>;
  categories?: Array<{ value: string; label: string }>;
}

export const GoalForm: React.FC<GoalFormProps> = ({
  editingGoal,
  onSubmit,
  onCancel,
  onDelete,
  isSubmitting,
  accounts = [],
  categories = [],
}) => {
  // Prepare initial data from editing goal
  const initialData = editingGoal
    ? {
        name: editingGoal.name,
        description: editingGoal.description || '',
        goal_type: editingGoal.goal_type as GoalEnhancedFormData['goal_type'],
        target_amount: Number(editingGoal.target_amount),
        current_amount: Number(editingGoal.current_amount || 0),
        target_date: editingGoal.target_date,
        priority: 'medium' as const,
        is_active: true,
        auto_contribute: false,
      }
    : undefined;

  const handleFormSubmit = async () => {
    // Convert to the format expected by parent
    const formEvent = {
      preventDefault: () => {},
    } as React.FormEvent;

    await onSubmit(formEvent);
  };

  const formConfig = createGoalFormConfig({
    onSubmit: handleFormSubmit,
    isLoading: isSubmitting,
    initialData,
    isEdit: !!editingGoal,
    accounts,
    categories,
    onCancel,
    onDelete,
  });

  return <ObjectForm config={formConfig} />;
};

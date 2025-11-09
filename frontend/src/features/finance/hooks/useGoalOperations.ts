import { useState } from 'react';
import { useToast } from '../../../components/ui/Toast';
import {
  useCreateGoal,
  useUpdateGoal,
  useDeleteGoal,
  useUpdateGoalProgress,
  useToggleGoalStatus,
} from './queries/useGoals';
import type { Goal } from '../../../types';

export function useGoalOperations() {
  const { showError, showSuccess } = useToast();
  const createGoalMutation = useCreateGoal();
  const updateGoalMutation = useUpdateGoal();
  const deleteGoalMutation = useDeleteGoal();
  const updateProgressMutation = useUpdateGoalProgress();
  const toggleStatusMutation = useToggleGoalStatus();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (
    data: Omit<
      Goal,
      | 'id'
      | 'progress_percentage'
      | 'remaining_amount'
      | 'is_completed'
      | 'created_at'
      | 'updated_at'
    >
  ) => {
    setIsSubmitting(true);
    try {
      await createGoalMutation.mutateAsync(data);
      showSuccess('Goal created successfully!');
      return true;
    } catch (error) {
      console.error('Failed to create goal:', error);
      showError('Failed to create goal', 'Please try again.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (id: number, data: Partial<Goal>) => {
    setIsSubmitting(true);
    try {
      await updateGoalMutation.mutateAsync({ id, data });
      showSuccess('Goal updated successfully!');
      return true;
    } catch (error) {
      console.error('Failed to update goal:', error);
      showError('Failed to update goal', 'Please try again.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteGoalMutation.mutateAsync(id);
      showSuccess('Goal deleted successfully!');
      return true;
    } catch (error) {
      console.error('Failed to delete goal:', error);
      showError('Failed to delete goal', 'Please try again.');
      return false;
    }
  };

  const handleUpdateProgress = async (id: number, amount: number) => {
    try {
      await updateProgressMutation.mutateAsync({ id, amount });
      showSuccess('Goal updated successfully!');
      return true;
    } catch (error) {
      console.error('Failed to update goal progress:', error);
      showError('Failed to update goal progress', 'Please try again.');
      return false;
    }
  };

  const handleToggleStatus = async (id: number, status: 'active' | 'paused' | 'cancelled') => {
    try {
      await toggleStatusMutation.mutateAsync({ id, status });
      showSuccess('Goal status updated successfully!');
      return true;
    } catch (error) {
      console.error('Failed to toggle goal status:', error);
      showError('Failed to update goal status', 'Please try again.');
      return false;
    }
  };

  return {
    handleCreate,
    handleUpdate,
    handleDelete,
    handleUpdateProgress,
    handleToggleStatus,
    isSubmitting,
  };
}

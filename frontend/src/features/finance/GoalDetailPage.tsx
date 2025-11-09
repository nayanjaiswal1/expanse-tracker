import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGoals, useDeleteGoal, useToggleGoalStatus } from '../../hooks/finance';
import { GoalDetail } from './GoalDetail';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Flex } from '../../components/ui/Layout';
import { extractErrorMessage } from '@/utils/errorHandling';

export const GoalDetailPage: React.FC = () => {
  const { goalId } = useParams<{ goalId: string }>();
  const navigate = useNavigate();
  const goalsQuery = useGoals();
  const deleteGoalMutation = useDeleteGoal();
  const toggleStatusMutation = useToggleGoalStatus();
  const { state: authState } = useAuth();
  const { showError } = useToast();
  const runWithErrorToast = useCallback(
    async <T,>(action: () => Promise<T>, title: string, fallback?: string) => {
      try {
        const data = await action();
        return { ok: true as const, data };
      } catch (error) {
        showError(title, extractErrorMessage(error, fallback || title));
        return { ok: false as const };
      }
    },
    [showError]
  );
  const [showAmounts, setShowAmounts] = useState(true);

  // Find the goal by ID
  const goal = goalsQuery.data?.find((g) => g.id === parseInt(goalId || '0'));

  if (goalsQuery.isLoading) {
    return (
      <Flex justify="center" className="py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </Flex>
    );
  }

  if (!goal) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          Goal not found
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          The goal you're looking for doesn't exist or has been deleted.
        </p>
        <button
          onClick={() => navigate('/goals')}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
        >
          Back to Goals
        </button>
      </div>
    );
  }

  const handleBack = () => {
    navigate('/goals');
  };

  const handleEdit = () => {
    // Navigate back to goals page with edit mode
    navigate('/goals', { state: { editGoal: goal } });
  };

  const handleDelete = async () => {
    const result = await runWithErrorToast(
      () => deleteGoalMutation.mutateAsync(goal.id),
      'Failed to delete goal',
      'Please try again.'
    );
    if (!result.ok) return;
    navigate('/goals');
  };

  const handleUpdateProgress = () => {
    // Navigate back to goals page with progress update mode
    navigate('/goals', { state: { updateProgressGoal: goal } });
  };

  const handleToggleStatus = async (status: 'active' | 'paused') => {
    await runWithErrorToast(
      () => toggleStatusMutation.mutateAsync({ id: goal.id, status }),
      'Failed to update goal status',
      'Please try again.'
    );
  };

  return (
    <GoalDetail
      goal={goal}
      onBack={handleBack}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onUpdateProgress={handleUpdateProgress}
      onToggleStatus={handleToggleStatus}
      showAmounts={showAmounts}
      onToggleAmounts={() => setShowAmounts(!showAmounts)}
    />
  );
};

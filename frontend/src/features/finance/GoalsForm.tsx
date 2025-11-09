import React, { useState, useCallback } from 'react';
import { Plus, Edit2, Trash2, Target, CheckCircle, Pause, Play, Eye, EyeOff } from 'lucide-react';
import {
  useGoals,
  useCreateGoal,
  useUpdateGoal,
  useDeleteGoal,
  useUpdateGoalProgress,
  useToggleGoalStatus,
} from '../../hooks/finance';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../utils/preferences';
import { ObjectForm } from '../../components/forms';
import { createGoalFormConfig } from '../../shared/forms';
import { GoalAdvancedFormData as GoalFormData } from '../../shared/schemas';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ProgressBar } from '../../components/common/ProgressBar';
import { useToast } from '../../components/ui/Toast';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import type { Goal } from '../types';
import { getGoalTypeIcon, goalTypeColorMap, goalStatusColorMap } from './constants/goalConstants';
import { extractErrorMessage } from '@/utils/errorHandling';

export const GoalsForm = () => {
  const goalsQuery = useGoals();
  const createGoalMutation = useCreateGoal();
  const updateGoalMutation = useUpdateGoal();
  const deleteGoalMutation = useDeleteGoal();
  const updateProgressMutation = useUpdateGoalProgress();
  const toggleStatusMutation = useToggleGoalStatus();
  const { state: authState } = useAuth();
  const { showSuccess, showError } = useToast();
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

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [showAmounts, setShowAmounts] = useState(true);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progressGoal, setProgressGoal] = useState<Goal | null>(null);
  const [progressAmount, setProgressAmount] = useState('');
  const [goalToDelete, setGoalToDelete] = useState<number | null>(null);

  const goals = Array.isArray(goalsQuery.data) ? goalsQuery.data : goalsQuery.data?.results || [];
  const isLoading =
    goalsQuery.isLoading || createGoalMutation.isPending || updateGoalMutation.isPending;

  const handleCreateGoal = async (data: GoalFormData) => {
    const result = await runWithErrorToast(
      () =>
        createGoalMutation.mutateAsync({
          ...data,
          target_amount: data.target_amount,
          current_amount: data.current_amount || '0',
        }),
      'Failed to create goal'
    );
    if (!result.ok) return;
    setShowAddModal(false);
    showSuccess('Goal created successfully!');
  };

  const handleUpdateGoal = async (data: GoalFormData) => {
    if (!editingGoal) return;

    const result = await runWithErrorToast(
      () =>
        updateGoalMutation.mutateAsync({
          id: editingGoal.id,
          ...data,
          target_amount: data.target_amount,
          current_amount: data.current_amount || '0',
        }),
      'Failed to update goal'
    );
    if (!result.ok) return;
    setEditingGoal(null);
    showSuccess('Goal updated successfully!');
  };

  const handleDeleteGoal = async () => {
    if (!goalToDelete) return;

    const result = await runWithErrorToast(
      () => deleteGoalMutation.mutateAsync(goalToDelete),
      'Failed to delete goal',
      'Please try again.'
    );
    if (result.ok) {
      showSuccess('Goal deleted successfully!');
    }
    setGoalToDelete(null);
  };

  const handleUpdateProgress = async () => {
    if (!progressGoal || !progressAmount) return;

    const result = await runWithErrorToast(
      () =>
        updateProgressMutation.mutateAsync({
          goalId: progressGoal.id,
          amount: parseFloat(progressAmount),
        }),
      'Failed to update progress'
    );
    if (!result.ok) return;
    setShowProgressModal(false);
    setProgressGoal(null);
    setProgressAmount('');
    showSuccess('Goal progress updated!');
  };

  const handleToggleStatus = async (goalId: number) => {
    const result = await runWithErrorToast(
      () => toggleStatusMutation.mutateAsync(goalId),
      'Failed to update goal status'
    );
    if (!result.ok) return;
    showSuccess('Goal status updated!');
  };

  const createFormConfig = createGoalFormConfig(handleCreateGoal, isLoading);
  const editFormConfig = editingGoal
    ? createGoalFormConfig(
        handleUpdateGoal,
        isLoading,
        {
          name: editingGoal.name,
          description: editingGoal.description,
          goal_type: editingGoal.goal_type,
          target_amount: editingGoal.target_amount.toString(),
          current_amount: editingGoal.current_amount.toString(),
          currency: editingGoal.currency,
          start_date: editingGoal.start_date,
          target_date: editingGoal.target_date,
          priority: editingGoal.priority,
          auto_track: editingGoal.auto_track,
          color: editingGoal.color,
        },
        true
      )
    : null;

  const getProgressPercentage = (goal: Goal) => {
    if (goal.target_amount === 0) return 0;
    return Math.min((goal.current_amount / goal.target_amount) * 100, 100);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Financial Goals</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track and achieve your financial objectives
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            onClick={() => setShowAmounts(!showAmounts)}
            className="text-gray-500 hover:text-gray-700"
          >
            {showAmounts ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Goal
          </Button>
        </div>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {goals.map((goal: Goal) => {
          const IconComponent = getGoalTypeIcon(goal.goal_type);
          const progressPercentage = getProgressPercentage(goal);

          return (
            <div
              key={goal.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div
                    className={`p-2 rounded-lg ${
                      goalTypeColorMap[goal.goal_type as keyof typeof goalTypeColorMap] ||
                      goalTypeColorMap.other
                    }`}
                  >
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{goal.name}</h3>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        goalStatusColorMap[goal.status as keyof typeof goalStatusColorMap] ||
                        goalStatusColorMap.active
                      }`}
                    >
                      {goal.status}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <Button variant="ghost" size="sm" onClick={() => handleToggleStatus(goal.id)}>
                    {goal.status === 'active' ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditingGoal(goal)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setGoalToDelete(goal.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {goal.description && (
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{goal.description}</p>
              )}

              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Progress</span>
                  <span className="font-medium">
                    {showAmounts
                      ? `${formatCurrency(goal.current_amount, goal.currency)} / ${formatCurrency(goal.target_amount, goal.currency)}`
                      : `${progressPercentage.toFixed(1)}%`}
                  </span>
                </div>

                <ProgressBar value={progressPercentage} className="h-2" color={goal.color} />

                <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                  <span>Started: {new Date(goal.start_date).toLocaleDateString()}</span>
                  <span>Target: {new Date(goal.target_date).toLocaleDateString()}</span>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setProgressGoal(goal);
                  setShowProgressModal(true);
                }}
                className="w-full mt-4"
              >
                <Target className="h-4 w-4 mr-2" />
                Update Progress
              </Button>
            </div>
          );
        })}
      </div>

      {/* Add Goal Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Create New Goal"
        size="lg"
      >
        <ObjectForm config={createFormConfig} />
      </Modal>

      {/* Edit Goal Modal */}
      <Modal
        isOpen={!!editingGoal}
        onClose={() => setEditingGoal(null)}
        title="Edit Goal"
        size="lg"
      >
        {editFormConfig && <ObjectForm config={editFormConfig} />}
      </Modal>

      {/* Progress Update Modal */}
      <Modal
        isOpen={showProgressModal}
        onClose={() => {
          setShowProgressModal(false);
          setProgressGoal(null);
          setProgressAmount('');
        }}
        title="Update Goal Progress"
      >
        {progressGoal && (
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">{progressGoal.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Current: {formatCurrency(progressGoal.current_amount, progressGoal.currency)} /
                Target: {formatCurrency(progressGoal.target_amount, progressGoal.currency)}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Add Amount
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder="Enter amount to add"
                value={progressAmount}
                onChange={(e) => setProgressAmount(e.target.value)}
              />
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowProgressModal(false);
                  setProgressGoal(null);
                  setProgressAmount('');
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdateProgress}>Update Progress</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!goalToDelete}
        onClose={() => setGoalToDelete(null)}
        onConfirm={handleDeleteGoal}
        title="Delete Goal"
        message="Are you sure you want to delete this goal?"
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};

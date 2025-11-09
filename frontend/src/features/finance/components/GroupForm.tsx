import React, { useState, useEffect, useRef } from 'react';
import { Users, Coins, MessageSquare, TrendingUp, AlertTriangle, Info } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useToast } from '../../../components/ui/Toast';
import { FormField } from '../../../components/ui/FormLayout';
import {
  useCreateSplitwiseGroup,
  useUpdateSplitwiseGroup,
  type SplitwiseGroup,
} from '../hooks/useSplitwiseGroups';
import { HStack } from '../../../components/ui/Layout';

interface GroupFormProps {
  isOpen: boolean;
  onClose: () => void;
  editGroup?: SplitwiseGroup; // For editing existing groups
}

export const GroupForm: React.FC<GroupFormProps> = ({ isOpen, onClose, editGroup }) => {
  const { showSuccess, showError } = useToast();

  // API hooks
  const createGroup = useCreateSplitwiseGroup();
  const updateGroup = useUpdateSplitwiseGroup();

  const [formData, setFormData] = useState({
    name: editGroup?.name || '',
    description: editGroup?.description || '',
    budgetLimit: editGroup?.budget_limit?.toString() || '',
    budgetWarningThreshold: editGroup?.budget_warning_threshold?.toString() || '80',
    budgetPerPersonLimit: editGroup?.budget_per_person_limit?.toString() || '',
  });

  const [showAdvancedBudget, setShowAdvancedBudget] = useState(
    !!editGroup?.budget_per_person_limit
  );
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const isEditing = !!editGroup;
  const isSubmitting = createGroup.isPending || updateGroup.isPending;

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setShowInfoTooltip(false);
      }
    };

    if (showInfoTooltip) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showInfoTooltip]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showError('Missing information', 'Please enter a group name.');
      return;
    }

    try {
      const groupData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        budget_limit: formData.budgetLimit ? parseFloat(formData.budgetLimit) : undefined,
        budget_warning_threshold: formData.budgetWarningThreshold
          ? parseFloat(formData.budgetWarningThreshold)
          : undefined,
        budget_per_person_limit: formData.budgetPerPersonLimit
          ? parseFloat(formData.budgetPerPersonLimit)
          : undefined,
      };

      if (isEditing && editGroup) {
        // Update existing group
        await updateGroup.mutateAsync({
          groupId: editGroup.id,
          data: groupData,
        });

        showSuccess(
          'Group updated successfully!',
          `Your group "${formData.name}" has been updated.`
        );
      } else {
        // Create new group
        await createGroup.mutateAsync(groupData);

        showSuccess(
          'Group created successfully!',
          `Your group "${formData.name}" is ready to use.`
        );
      }

      onClose();

      // Reset form only if creating new group
      if (!isEditing) {
        setFormData({
          name: '',
          description: '',
          budgetLimit: '',
          budgetWarningThreshold: '80',
          budgetPerPersonLimit: '',
        });
      }
    } catch (error: any) {
      console.error(`Failed to ${isEditing ? 'update' : 'create'} group:`, error);
      showError(
        `Failed to ${isEditing ? 'update' : 'create'} group`,
        error.response?.data?.error ||
          'Please try again or contact support if the problem persists.'
      );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <HStack gap={2}>
          <span>{isEditing ? 'Edit Expense Group' : 'Create Expense Group'}</span>
          <div className="relative" ref={tooltipRef}>
            <button
              type="button"
              onClick={() => setShowInfoTooltip(!showInfoTooltip)}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              title="How it works"
            >
              <Info className="w-4 h-4" />
            </button>

            {/* Info Tooltip */}
            {showInfoTooltip && (
              <div className="absolute top-8 left-0 z-[70] w-72 bg-blue-50 dark:bg-blue-900/90 border border-blue-200 dark:border-blue-700 rounded-lg shadow-lg p-3">
                <div className="flex items-start space-x-2">
                  <Users className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-xs font-semibold text-blue-900 dark:text-blue-200 mb-1">
                      How Expense Groups Work
                    </h4>
                    <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-0.5">
                      <li>• Create the group and invite people to join</li>
                      <li>• Track shared expenses and split costs fairly</li>
                      <li>• Set budgets to control group spending</li>
                      <li>• Perfect for: trips, events, shared living</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </HStack>
      }
      size="md"
      zIndex="z-[60]"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Group Name */}
          <div className="md:col-span-2">
            <FormField
              label="Group Name"
              required
              helpText="Choose a descriptive name for your expense group"
            >
              <div className="relative">
                <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="e.g., Trip to Bali, Roommate Expenses, etc."
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className="pl-10"
                  required
                  maxLength={100}
                />
              </div>
            </FormField>
          </div>

          {/* Purpose/Description */}
          <div className="md:col-span-2">
            <FormField label="Description" helpText="What is this group for?">
              <div className="relative">
                <MessageSquare className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Describe the purpose of this group..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  className="pl-10"
                  maxLength={250}
                />
              </div>
            </FormField>
          </div>

          {/* Budget Limit (Optional) */}
          <div className="md:col-span-1">
            <FormField
              label="Group Budget"
              helpText="Set a maximum spending limit for this group (e.g., trip budget)"
            >
              <div className="relative">
                <Coins className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g., 5000"
                  value={formData.budgetLimit}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, budgetLimit: e.target.value }))
                  }
                  className="pl-10"
                />
              </div>
            </FormField>
          </div>

          {/* Budget Warning Threshold - only show if budget limit is set */}
          {formData.budgetLimit && (
            <div className="md:col-span-1">
              <FormField
                label="Budget Warning Threshold (%)"
                helpText="Get warnings when spending reaches this percentage (default: 80%)"
              >
                <div className="relative">
                  <AlertTriangle className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    placeholder="80"
                    value={formData.budgetWarningThreshold}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, budgetWarningThreshold: e.target.value }))
                    }
                    className="pl-10"
                  />
                </div>
              </FormField>
            </div>
          )}

          {/* Advanced Budget Options */}
          {formData.budgetLimit && (
            <div className="md:col-span-2">
              <button
                type="button"
                onClick={() => setShowAdvancedBudget(!showAdvancedBudget)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-3 block"
              >
                {showAdvancedBudget ? '− Hide' : '+ Show'} Per-Person Limit
              </button>

              {showAdvancedBudget && (
                <FormField
                  label="Per-Person Spending Limit"
                  helpText="Maximum amount each person can spend (for fairness)"
                >
                  <div className="relative">
                    <TrendingUp className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="e.g., 500 per person"
                      value={formData.budgetPerPersonLimit}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, budgetPerPersonLimit: e.target.value }))
                      }
                      className="pl-10"
                    />
                  </div>
                </FormField>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !formData.name.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSubmitting
              ? isEditing
                ? 'Updating...'
                : 'Creating...'
              : isEditing
                ? 'Update Group'
                : 'Create Group'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

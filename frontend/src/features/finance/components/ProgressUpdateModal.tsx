import React from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { formatCurrency } from '../../../utils/preferences';
import type { Goal } from '../../../types';
import { Button } from '../../../components/ui/Button';

interface ProgressUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: Goal | null;
  progressAmount: string;
  onProgressAmountChange: (amount: string) => void;
  onUpdateProgress: () => void;
  user: any;
}

export const ProgressUpdateModal: React.FC<ProgressUpdateModalProps> = ({
  isOpen,
  onClose,
  goal,
  progressAmount,
  onProgressAmountChange,
  onUpdateProgress,
  user,
}) => {
  if (!goal) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Update Progress - ${goal.name}`}>
      <div className="space-y-6 p-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-blue-900 mb-3">Current Progress</h4>
          <div className="text-base text-blue-700 space-y-1">
            <div>Current: {formatCurrency(parseFloat(goal.current_amount || '0'), user)}</div>
            <div>Target: {formatCurrency(parseFloat(goal.target_amount || '0'), user)}</div>
            <div>
              Progress: <span className="font-bold">{goal.progress_percentage.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        <Input
          type="number"
          label="New Amount"
          value={progressAmount}
          onChange={(e) => onProgressAmountChange(e.target.value)}
          placeholder="Enter new amount"
          step="0.01"
          autoFocus
        />

        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
          <Button onClick={onClose} variant="secondary-tonal">
            Cancel
          </Button>
          <Button
            onClick={onUpdateProgress}
            disabled={!progressAmount || isNaN(parseFloat(progressAmount))}
            variant="primary-elevated-lg"
          >
            Update Progress
          </Button>
        </div>
      </div>
    </Modal>
  );
};

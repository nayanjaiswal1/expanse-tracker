import { useState } from 'react';
import type { TransactionSplit } from '../../types';
import { useCategories } from './hooks/queries';
import { Plus, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';

interface SplitEditorProps {
  splits: TransactionSplit[];
  totalAmount: number;
  onSplitsChange: (splits: TransactionSplit[]) => void;
}

export const SplitEditor = ({ splits, totalAmount, onSplitsChange }: SplitEditorProps) => {
  const categoriesQuery = useCategories();
  const categories = categoriesQuery.data || [];

  const [localSplits, setLocalSplits] = useState<TransactionSplit[]>(
    splits.length > 0
      ? splits
      : [
          {
            category_id: '',
            amount: totalAmount.toString(),
            description: '',
          },
        ]
  );

  const addSplit = () => {
    const newSplit: TransactionSplit = {
      category_id: '',
      amount: '0',
      description: '',
    };

    const newSplits = [...localSplits, newSplit];
    setLocalSplits(newSplits);
    onSplitsChange(newSplits);
  };

  const removeSplit = (index: number) => {
    const newSplits = localSplits.filter((_, i) => i !== index);
    if (newSplits.length === 0) {
      const defaultSplit: TransactionSplit = {
        category_id: '',
        amount: totalAmount.toString(),
        description: '',
      };
      setLocalSplits([defaultSplit]);
      onSplitsChange([defaultSplit]);
    } else {
      redistributeAmounts(newSplits);
    }
  };

  const redistributeAmounts = (splits: TransactionSplit[]) => {
    const activeSplits = splits.filter((s) => s.category_id);
    if (activeSplits.length === 0) return;

    const equalAmount = totalAmount / activeSplits.length;
    const updatedSplits = splits.map((split) => {
      if (split.category_id) {
        return { ...split, amount: equalAmount.toString() };
      }
      return split;
    });

    setLocalSplits(updatedSplits);
    onSplitsChange(updatedSplits);
  };

  const updateSplit = (index: number, field: keyof TransactionSplit, value: string | number) => {
    const updatedSplits = localSplits.map((split, i) => {
      if (i === index) {
        return { ...split, [field]: value };
      }
      return split;
    });

    setLocalSplits(updatedSplits);
    onSplitsChange(updatedSplits);
  };

  const totalSplitAmount = localSplits.reduce(
    (sum, split) => sum + parseFloat(split.amount || '0'),
    0
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-medium theme-text-primary">Category Splits</h4>
        <Button onClick={addSplit} size="sm" variant="ghost">
          <Plus className="w-4 h-4 mr-1" />
          Add Split
        </Button>
      </div>

      <div className="space-y-3">
        {localSplits.map((split, index) => (
          <div
            key={index}
            className="flex items-center space-x-2 p-3 bg-secondary-50 dark:bg-secondary-800 rounded"
          >
            <div className="flex-1">
              <Select
                value={split.category_id}
                onChange={(value) => updateSplit(index, 'category_id', value)}
                options={[
                  { value: '', label: 'Select category' },
                  ...categories.map((category) => ({
                    value: category.id.toString(),
                    label: category.name,
                  })),
                ]}
                className="w-full px-2 py-1 text-sm"
              />
            </div>

            <div className="w-24">
              <Input
                type="number"
                placeholder="Amount"
                value={split.amount}
                onChange={(e) => updateSplit(index, 'amount', e.target.value)}
                step="0.01"
                className="w-full px-2 py-1 text-sm"
              />
            </div>

            <div className="flex-1">
              <Input
                type="text"
                placeholder="Description (optional)"
                value={split.description || ''}
                onChange={(e) => updateSplit(index, 'description', e.target.value)}
                className="w-full px-2 py-1 text-sm"
              />
            </div>

            {localSplits.length > 1 && (
              <Button onClick={() => removeSplit(index)} variant="ghost" size="sm">
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-between text-sm">
        <div
          className={`font-medium ${Math.abs(totalSplitAmount - totalAmount) > 0.01 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}
        >
          Amount: ${totalSplitAmount.toFixed(2)} / ${totalAmount.toFixed(2)}
        </div>
      </div>
    </div>
  );
};

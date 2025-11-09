import React from 'react';

interface QuickEditInputProps {
  amount: string;
  onAmountChange: (amount: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export const QuickEditInput: React.FC<QuickEditInputProps> = ({
  amount,
  onAmountChange,
  onSave,
  onCancel,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const handleStopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div className="mt-2 flex gap-1" onClick={handleStopPropagation}>
      <input
        type="number"
        value={amount}
        onChange={(e) => onAmountChange(e.target.value)}
        placeholder="Amount"
        className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        autoFocus
        onKeyDown={handleKeyDown}
      />
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSave();
        }}
        className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm transition-colors"
      >
        ✓
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onCancel();
        }}
        className="px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
      >
        ✕
      </button>
    </div>
  );
};

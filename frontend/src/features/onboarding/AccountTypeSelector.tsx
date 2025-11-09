import React from 'react';

interface AccountTypeSelectorProps {
  selectedType: string;
  onSelectType: (type: string) => void;
}

const accountTypes = ['checking', 'savings', 'credit', 'cash'] as const;

const accountTypeIcons: Record<string, string> = {
  checking: '🏦',
  savings: '💰',
  credit: '💳',
  cash: '💵',
};

export const AccountTypeSelector: React.FC<AccountTypeSelectorProps> = ({
  selectedType,
  onSelectType,
}) => {
  return (
    <div className="flex flex-wrap gap-2">
      {accountTypes.map((type) => (
        <button
          key={type}
          type="button"
          onClick={() => onSelectType(type)}
          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm capitalize transition ${
            selectedType === type
              ? 'border-blue-500 bg-blue-50 text-blue-600 dark:border-blue-400 dark:bg-blue-900/40 dark:text-blue-100'
              : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-600'
          }`}
        >
          <span>{accountTypeIcons[type]}</span>
          {type}
        </button>
      ))}
    </div>
  );
};

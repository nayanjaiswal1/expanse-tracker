import React from 'react';
import { UseFormSetValue } from 'react-hook-form';

interface UseCaseOption {
  value: string;
  icon: string;
  label: string;
}

interface UseCaseSelectionProps {
  options: readonly UseCaseOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
}

export const UseCaseSelection: React.FC<UseCaseSelectionProps> = ({
  options,
  selectedValue,
  onSelect,
}) => {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          What do you want to focus on?
        </h3>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
          Choose one. You can update this anytime.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelect(option.value)}
            className={`flex items-center gap-3 rounded-lg border px-3.5 py-2.5 text-left transition ${
              selectedValue === option.value
                ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/30'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <span className="text-xl">{option.icon}</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">{option.label}</span>
            {selectedValue === option.value && (
              <svg
                className="ml-auto w-5 h-5 text-blue-600 dark:text-blue-300"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
        ))}
      </div>
    </section>
  );
};

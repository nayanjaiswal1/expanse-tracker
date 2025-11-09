import React from 'react';

interface SettingsDividerProps {
  spacing?: 'sm' | 'md' | 'lg';
  withLabel?: string;
}

export const SettingsDivider: React.FC<SettingsDividerProps> = ({ spacing = 'md', withLabel }) => {
  const spacingClasses = {
    sm: 'my-4',
    md: 'my-6',
    lg: 'my-8',
  };

  if (withLabel) {
    return (
      <div className={`relative ${spacingClasses[spacing]}`}>
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-gray-200 dark:border-gray-700" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white dark:bg-gray-800 px-3 text-sm font-medium text-gray-500 dark:text-gray-400">
            {withLabel}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`border-t border-gray-200 dark:border-gray-700 ${spacingClasses[spacing]}`} />
  );
};

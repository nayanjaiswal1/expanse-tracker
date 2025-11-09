import React from 'react';
import { LucideIcon } from 'lucide-react';

interface SettingsSectionHeaderProps {
  icon: LucideIcon;
  iconColor?:
    | 'blue'
    | 'green'
    | 'purple'
    | 'red'
    | 'orange'
    | 'emerald'
    | 'indigo'
    | 'pink'
    | 'yellow';
  title: string;
  description?: string;
  action?: React.ReactNode;
}

const colorClasses = {
  blue: 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400',
  green: 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400',
  purple: 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400',
  red: 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400',
  orange: 'bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400',
  emerald: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400',
  indigo: 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400',
  pink: 'bg-pink-100 dark:bg-pink-900 text-pink-600 dark:text-pink-400',
  yellow: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400',
};

export const SettingsSectionHeader: React.FC<SettingsSectionHeaderProps> = ({
  icon: Icon,
  iconColor = 'blue',
  title,
  description,
  action,
}) => {
  return (
    <div className="flex items-start justify-between mb-6">
      <div className="flex items-center space-x-3">
        <div className={`rounded-lg p-2 ${colorClasses[iconColor]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          {description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{description}</p>
          )}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};

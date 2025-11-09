import React from 'react';
import { LucideIcon } from 'lucide-react';
import { SmallHeading, BodyText } from './Typography';

interface SettingsCardProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  children?: React.ReactNode;
  onClick?: () => void;
  action?: React.ReactNode;
  variant?: 'default' | 'outlined' | 'elevated';
}

const variantClasses = {
  default: 'border border-gray-200 dark:border-gray-700',
  outlined: 'border-2 border-gray-300 dark:border-gray-600',
  elevated: 'border border-gray-200 dark:border-gray-700 shadow-md',
};

export const SettingsCard: React.FC<SettingsCardProps> = ({
  icon: Icon,
  title,
  description,
  children,
  onClick,
  action,
  variant = 'default',
}) => {
  const isClickable = !!onClick;

  return (
    <div
      className={`
        rounded-lg p-4 bg-white dark:bg-gray-800
        ${variantClasses[variant]}
        ${isClickable ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors' : ''}
      `}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1 min-w-0">
          {Icon && (
            <Icon className="h-5 w-5 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <SmallHeading>{title}</SmallHeading>
            {description && <BodyText className="mt-1">{description}</BodyText>}
            {children && <div className="mt-4">{children}</div>}
          </div>
        </div>
        {action && <div className="ml-4 flex-shrink-0">{action}</div>}
      </div>
    </div>
  );
};

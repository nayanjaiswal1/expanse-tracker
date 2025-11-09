import React from 'react';
import { LucideIcon } from 'lucide-react';
import { SubsectionTitle, HelperText } from './Typography';

interface SettingsSubsectionProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  children: React.ReactNode;
  spacing?: 'sm' | 'md' | 'lg';
}

const spacingClasses = {
  sm: 'space-y-2',
  md: 'space-y-4',
  lg: 'space-y-6',
};

export const SettingsSubsection: React.FC<SettingsSubsectionProps> = ({
  icon: Icon,
  title,
  description,
  children,
  spacing = 'md',
}) => {
  return (
    <div>
      <div className="flex items-center space-x-2 mb-4">
        {Icon && <Icon className="h-4 w-4 text-gray-500 dark:text-gray-400" />}
        <SubsectionTitle>{title}</SubsectionTitle>
      </div>
      {description && <HelperText className="mb-4">{description}</HelperText>}
      <div className={spacingClasses[spacing]}>{children}</div>
    </div>
  );
};

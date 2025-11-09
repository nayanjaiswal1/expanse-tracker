import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Switch } from '../../../components/ui/Switch';
import { SmallHeading, BodyText } from './Typography';
import { FlexBetween, HStack } from '../../../components/ui/Layout';

interface SettingsToggleProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  badge?: React.ReactNode;
}

export const SettingsToggle: React.FC<SettingsToggleProps> = ({
  icon: Icon,
  title,
  description,
  checked,
  onCheckedChange,
  disabled = false,
  badge,
}) => {
  return (
    <FlexBetween className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
      <HStack gap={3} className="flex-1 min-w-0">
        {Icon && <Icon className="h-5 w-5 text-gray-400 flex-shrink-0" />}
        <div className="flex-1 min-w-0">
          <HStack gap={2}>
            <SmallHeading>{title}</SmallHeading>
            {badge}
          </HStack>
          {description && <BodyText>{description}</BodyText>}
        </div>
      </HStack>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="ml-4"
      />
    </FlexBetween>
  );
};

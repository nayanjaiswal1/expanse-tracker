import React, { useState, useEffect, useCallback } from 'react';
import { LucideIcon, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from './Button';
import { FlexBetween, HStack } from './Layout';
import { SummaryCards } from './SummaryCards';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../api/client';

interface SummaryCardData {
  id: string;
  label: string;
  value: string | number;
  icon: LucideIcon;
  iconColor: string;
  condition?: boolean;
}

interface HeaderButton {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'ghost-white';
  className?: string;
}

interface FinancePageHeaderProps {
  title: string;
  subtitle: string;
  subtitleColor?: string;
  darkSubtitleColor?: string;
  summaryCards: SummaryCardData[];
  buttons: HeaderButton[];
  pageId?: string;
  containerClassName?: string;
  titleClassName?: string;
  collapsedTitleClassName?: string;
  summaryCardClassName?: string;
  summaryValueClassName?: string;
  summaryLabelClassName?: string;
  summaryGridClassName?: string;
}

export const FinancePageHeader: React.FC<FinancePageHeaderProps> = ({
  title,
  subtitle,
  subtitleColor,
  darkSubtitleColor,
  summaryCards,
  buttons,
  pageId,
  containerClassName,
  titleClassName,
  collapsedTitleClassName,
  summaryCardClassName,
  summaryValueClassName,
  summaryLabelClassName,
  summaryGridClassName,
}) => {
  const { state: authState } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const wrapperClassName = [
    'relative rounded-lg border border-secondary-100 dark:border-secondary-700 shadow-soft transition-all duration-300',
    isCollapsed ? 'p-3' : 'p-6',
    'bg-white dark:bg-secondary-900 text-secondary-900 dark:text-secondary-100',
    containerClassName,
  ]
    .filter(Boolean)
    .join(' ');

  const subtitleClassName = [
    'text-sm mb-4',
    subtitleColor ?? 'text-secondary-600',
    darkSubtitleColor ?? 'dark:text-secondary-400',
  ]
    .filter(Boolean)
    .join(' ');

  const titleClasses = [
    'text-2xl font-bold mb-2',
    titleClassName ?? 'text-secondary-900 dark:text-secondary-100',
  ]
    .filter(Boolean)
    .join(' ');

  const collapsedTitleClasses = [
    'text-lg font-semibold',
    collapsedTitleClassName ?? 'text-secondary-900 dark:text-secondary-100',
  ]
    .filter(Boolean)
    .join(' ');

  useEffect(() => {
    if (!pageId) {
      return;
    }

    const headerCollapsed = authState.user?.ui_preferences?.header_collapsed;
    if (headerCollapsed && pageId in headerCollapsed) {
      setIsCollapsed(headerCollapsed[pageId]);
    }
  }, [authState.user?.ui_preferences, pageId]);

  const saveCollapsePreference = useCallback(
    async (collapsed: boolean) => {
      if (!pageId) {
        return;
      }

      try {
        const currentPreferences = authState.user?.ui_preferences || {};
        const newPreferences = {
          ...currentPreferences,
          header_collapsed: {
            ...currentPreferences.header_collapsed,
            [pageId]: collapsed,
          },
        };

        await apiClient.updateUserPreferences({
          ui_preferences: newPreferences,
        });
      } catch (error) {
        console.error('Failed to save header collapse preference:', error);
      }
    },
    [authState.user?.ui_preferences, pageId]
  );

  const handleToggleCollapse = useCallback(() => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    saveCollapsePreference(newCollapsed);
  }, [isCollapsed, saveCollapsePreference]);

  return (
    <div className={wrapperClassName}>
      {isCollapsed ? (
        <FlexBetween>
          <h1 className={collapsedTitleClasses}>{title}</h1>
          <HStack gap={2}>
            {buttons.slice(0, 2).map((button, index) => (
              <Button
                key={index}
                onClick={button.onClick}
                variant={button.variant || 'primary'}
                size="sm"
                className={[button.className, '!px-2 !py-1'].filter(Boolean).join(' ')}
              >
                <button.icon className="w-4 h-4" />
              </Button>
            ))}
            <Button
              onClick={handleToggleCollapse}
              variant="icon-muted"
              className="ml-2 hover:bg-secondary-100 dark:hover:bg-secondary-800"
              title="Expand header"
            >
              <ChevronDown className="h-4 w-4 text-secondary-500 dark:text-secondary-300" />
            </Button>
          </HStack>
        </FlexBetween>
      ) : (
        <>
          <Button
            onClick={handleToggleCollapse}
            variant="icon-muted"
            className="absolute top-3 right-3 hover:bg-secondary-100 dark:hover:bg-secondary-800"
            title="Collapse header"
          >
            <ChevronUp className="h-4 w-4 text-secondary-500 dark:text-secondary-300" />
          </Button>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="mb-4 lg:mb-0">
              <h1 className={titleClasses}>{title}</h1>
              <p className={subtitleClassName}>{subtitle}</p>

              <SummaryCards
                cards={summaryCards}
                cardClassName={summaryCardClassName}
                textColor={summaryValueClassName}
                labelColor={summaryLabelClassName}
                gridClassName={summaryGridClassName}
              />
            </div>

            <div className="flex flex-col space-y-3">
              {buttons.map((button, index) => (
                <Button
                  key={index}
                  onClick={button.onClick}
                  variant={button.variant || 'primary'}
                  size="sm"
                  className={button.className}
                >
                  <button.icon className="mr-2 h-4 w-4" />
                  {button.label}
                </Button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

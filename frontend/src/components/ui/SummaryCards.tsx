import React from 'react';
import { LucideIcon } from 'lucide-react';
import { FlexBetween } from './Layout';

interface SummaryCardData {
  id: string;
  label: string;
  value: string | number;
  icon: LucideIcon;
  iconColor: string;
  condition?: boolean;
}

interface SummaryCardsProps {
  cards: SummaryCardData[];
  textColor?: string;
  labelColor?: string;
  cardClassName?: string;
  gridClassName?: string;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  cards,
  textColor = 'text-secondary-900 dark:text-secondary-100',
  labelColor = 'text-secondary-500 dark:text-secondary-400',
  cardClassName = 'rounded-xl bg-gradient-to-br from-white via-white to-secondary-50 dark:from-secondary-900 dark:via-secondary-900/95 dark:to-secondary-900 border border-secondary-100/80 dark:border-secondary-700/60 p-4 shadow-soft backdrop-blur-sm',
  gridClassName,
}) => {
  const resolvedGridClassName = gridClassName ?? 'grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-4';

  return (
    <div className={resolvedGridClassName}>
      {cards.map((card) => {
        const Icon = card.icon;

        if (card.condition === false) {
          return null;
        }

        return (
          <div key={card.id} className={cardClassName}>
            <FlexBetween gap={3}>
              <div className="space-y-1">
                <div className={`text-lg font-semibold ${textColor}`}>{card.value}</div>
                <div className={`text-xs font-medium uppercase tracking-wide ${labelColor}`}>
                  {card.label}
                </div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/70 dark:bg-secondary-800/70 shadow-inner">
                <Icon className={`h-5 w-5 ${card.iconColor}`} />
              </div>
            </FlexBetween>
          </div>
        );
      })}
    </div>
  );
};

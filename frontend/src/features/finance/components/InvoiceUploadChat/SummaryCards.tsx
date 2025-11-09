import React from 'react';

interface SummaryCardProps {
  title: string;
  subtitle: string;
}

interface SummaryCardsProps {
  cards: SummaryCardProps[];
}

const SummaryCards: React.FC<SummaryCardsProps> = ({ cards }) => {
  if (cards.length === 0) {
    return null;
  }

  return (
    <div className="border-t border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
      <div className="grid gap-2">
        {cards.map((card, index) => (
          <div
            key={index}
            className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-300"
          >
            <p className="font-medium text-gray-900 dark:text-gray-100">{card.title}</p>
            <p className="text-[11px]">{card.subtitle}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SummaryCards;

import React from 'react';

interface ThemeCardProps {
  value: string;
  label: string;
  icon: string;
  description: string;
  active: boolean;
  onClick: (value: string) => void;
}

export const ThemeCard: React.FC<ThemeCardProps> = ({
  value,
  label,
  icon,
  description,
  active,
  onClick,
}) => {
  return (
    <div
      onClick={() => onClick(value)}
      className={`theme-card p-4 cursor-pointer hover:shadow-lg transition-all duration-200 ${
        active ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''
      }`}
    >
      <div className="text-center">
        <div className="text-2xl mb-2">{icon}</div>
        <h4 className="font-medium theme-text-primary">{label}</h4>
        <p className="text-sm theme-text-muted mt-1">{description}</p>
        {active && (
          <div className="mt-2">
            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full">
              ✓ Active
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

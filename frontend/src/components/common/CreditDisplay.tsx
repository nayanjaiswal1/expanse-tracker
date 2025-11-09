import React from 'react';
import { Zap } from 'lucide-react';

interface CreditDisplayProps {
  credits: number;
  className?: string;
  showLabel?: boolean;
}

export const CreditDisplay: React.FC<CreditDisplayProps> = ({
  credits,
  className = '',
  showLabel = true,
}) => {
  const getCreditColor = (creditCount: number) => {
    if (creditCount >= 50) return 'text-green-600 dark:text-green-400';
    if (creditCount >= 20) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getCreditBgColor = (creditCount: number) => {
    if (creditCount >= 50) return 'bg-green-100 dark:bg-green-900/20';
    if (creditCount >= 20) return 'bg-yellow-100 dark:bg-yellow-900/20';
    return 'bg-red-100 dark:bg-red-900/20';
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className={`p-2 rounded-lg ${getCreditBgColor(credits)}`}>
        <Zap className={`h-4 w-4 ${getCreditColor(credits)}`} />
      </div>
      <div className="flex flex-col">
        {showLabel && (
          <span className="text-xs text-secondary-500 dark:text-secondary-400">AI Credits</span>
        )}
        <span className={`text-sm font-semibold ${getCreditColor(credits)}`}>{credits}</span>
      </div>
    </div>
  );
};

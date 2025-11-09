import React from 'react';

interface ProgressBarProps {
  percentage: number;
  className?: string;
  style?: React.CSSProperties;
  showPercentage?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  percentage,
  className = '',
  style,
  showPercentage = false,
}) => {
  const width = Math.min(Math.max(percentage, 0), 100);

  return (
    <div className={`relative ${className}`}>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300"
          style={{ width: `${width}%`, ...style }}
        />
      </div>
      {showPercentage && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-medium text-white mix-blend-difference">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
    </div>
  );
};

import React from 'react';

interface StatusTextProps {
  value: number | string;
  type?: 'financial' | 'percentage' | 'default';
  showSign?: boolean;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export const StatusText: React.FC<StatusTextProps> = ({
  value,
  type = 'default',
  showSign = false,
  className = '',
  prefix = '',
  suffix = '',
}) => {
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;

  const getColorClass = () => {
    if (type === 'financial' || type === 'percentage') {
      if (numericValue > 0) return 'text-green-600 dark:text-green-400';
      if (numericValue < 0) return 'text-red-600 dark:text-red-400';
      return 'text-gray-600 dark:text-gray-400';
    }
    return 'text-gray-900 dark:text-gray-100';
  };

  const formatValue = () => {
    let formattedValue = value.toString();

    if (showSign && numericValue > 0) {
      formattedValue = `+${formattedValue}`;
    }

    return `${prefix}${formattedValue}${suffix}`;
  };

  const combinedClassName = `${getColorClass()} ${className}`.trim();

  return <span className={combinedClassName}>{formatValue()}</span>;
};

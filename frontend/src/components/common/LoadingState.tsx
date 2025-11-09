import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
  variant?: 'spinner' | 'dots' | 'pulse';
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  size = 'md',
  text,
  className = '',
  variant = 'spinner',
}) => {
  const sizeStyles = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const textSizeStyles = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  const renderSpinner = () => (
    <Loader2 className={`animate-spin ${sizeStyles[size]} text-blue-600 dark:text-blue-400`} />
  );

  const renderDots = () => (
    <div className="flex space-x-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`bg-blue-600 dark:bg-blue-400 rounded-full animate-bounce ${
            size === 'sm' ? 'w-1.5 h-1.5' : size === 'lg' ? 'w-3 h-3' : 'w-2 h-2'
          }`}
          style={{ animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </div>
  );

  const renderPulse = () => (
    <div
      className={`bg-blue-600 dark:bg-blue-400 rounded-full animate-pulse ${sizeStyles[size]}`}
    />
  );

  const renderLoader = () => {
    switch (variant) {
      case 'dots':
        return renderDots();
      case 'pulse':
        return renderPulse();
      default:
        return renderSpinner();
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center space-y-2 ${className}`}>
      {renderLoader()}
      {text && <p className={`text-gray-600 dark:text-gray-400 ${textSizeStyles[size]}`}>{text}</p>}
    </div>
  );
};

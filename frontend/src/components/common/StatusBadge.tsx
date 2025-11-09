import React from 'react';

interface StatusBadgeProps {
  status: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children?: React.ReactNode;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  variant = 'default',
  size = 'md',
  className = '',
  children,
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-2.5 py-1 text-xs';
      case 'lg':
        return 'px-4 py-2 text-base';
      default:
        return 'px-3 py-1.5 text-sm';
    }
  };

  const getStatusVariant = (status: string) => {
    const statusLower = status.toLowerCase();
    if (
      ['completed', 'success', 'verified', 'settled', 'active', 'enabled'].includes(statusLower)
    ) {
      return 'success';
    }
    if (['pending', 'processing', 'uploading', 'paused'].includes(statusLower)) {
      return 'warning';
    }
    if (['failed', 'error', 'cancelled', 'written_off'].includes(statusLower)) {
      return 'error';
    }
    return 'default';
  };

  const actualVariant = variant === 'default' ? getStatusVariant(status) : variant;

  const getColors = () => {
    switch (actualVariant) {
      case 'success':
        return 'theme-status-success';
      case 'warning':
        return 'theme-status-warning';
      case 'error':
        return 'theme-status-error';
      case 'info':
        return 'theme-status-info';
      default:
        return 'theme-bg-secondary theme-text-primary border theme-border rounded-full px-3 py-1 text-sm font-medium';
    }
  };

  return (
    <span
      className={`
      inline-flex items-center font-medium
      ${getColors()} ${actualVariant === 'default' ? '' : getSizeClasses()} ${className}
    `.trim()}
    >
      {children ||
        status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
    </span>
  );
};

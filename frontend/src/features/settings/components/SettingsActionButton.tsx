import React from 'react';
import { Button } from '../../../components/ui/Button';
import { LucideIcon } from 'lucide-react';

interface SettingsActionButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  icon?: LucideIcon;
  fullWidth?: boolean;
  className?: string;
}

export const SettingsActionButton: React.FC<SettingsActionButtonProps> = ({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  loading = false,
  disabled = false,
  icon: Icon,
  fullWidth = false,
  className = '',
}) => {
  const variantMap = {
    primary: 'primary',
    secondary: 'ghost',
    danger: 'danger',
    ghost: 'ghost',
  } as const;

  return (
    <Button
      type={type}
      onClick={onClick}
      variant={variantMap[variant]}
      size="sm"
      disabled={disabled || loading}
      loading={loading}
      className={`h-10 min-w-[120px] ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {Icon && <Icon className="h-4 w-4 mr-2" />}
      {children}
    </Button>
  );
};

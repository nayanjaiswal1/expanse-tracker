import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconPosition?: 'start' | 'end';
  labelKey?: string;
  loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-primary-600 text-white hover:bg-primary-700 focus-visible:ring-2 focus-visible:ring-primary-500 focus:outline-none',
  secondary:
    'bg-surface-subtle text-text-primary hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-border-strong focus:outline-none',
  danger:
    'bg-danger-600 text-white hover:bg-danger-700 focus-visible:ring-2 focus-visible:ring-danger-500 focus:outline-none',
  ghost:
    'bg-transparent text-text-secondary hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-primary-500 focus:outline-none',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-10 px-4 text-base',
  lg: 'h-11 px-5 text-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      icon,
      iconPosition = 'start',
      labelKey,
      loading = false,
      children,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const { t } = useTranslation('common');
    const label = labelKey ? t(labelKey) : undefined;
    const content = label ?? children;
    const showStartIcon = icon && iconPosition === 'start';
    const showEndIcon = icon && iconPosition === 'end';

    return (
      <button
        ref={ref}
        className={clsx(
          'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-60',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <span className="spinner h-4 w-4 border-2 border-t-transparent" />}
        {showStartIcon ? icon : null}
        {content}
        {showEndIcon ? icon : null}
      </button>
    );
  }
);

Button.displayName = 'Button';

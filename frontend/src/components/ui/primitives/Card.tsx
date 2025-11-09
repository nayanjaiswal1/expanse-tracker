import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

type CardElevation = 'flat' | 'soft' | 'raised';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevation?: CardElevation;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  headerKey?: string;
  header?: ReactNode;
  footer?: ReactNode;
}

const elevationClass: Record<CardElevation, string> = {
  flat: 'shadow-none border border-border-subtle',
  soft: 'shadow-md border border-border-subtle',
  raised: 'shadow-lg border border-border-strong',
};

const paddingClass = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
} as const;

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      elevation = 'soft',
      padding = 'md',
      headerKey,
      header,
      footer,
      children,
      className,
      ...props
    },
    ref
  ) => {
    const { t } = useTranslation('common');

    return (
      <section
        ref={ref}
        className={clsx(
          'flex flex-col gap-4 rounded-lg bg-surface-default text-text-primary transition-shadow dark:bg-surface-dark-default',
          elevationClass[elevation],
          className
        )}
        {...props}
      >
        {(headerKey || header) && (
          <header className="px-6 pt-6 text-text-primary">
            <h2 className="font-semibold">{headerKey ? t(headerKey) : header}</h2>
          </header>
        )}

        <div className={clsx('flex-1', paddingClass[padding])}>{children}</div>

        {footer && <footer className="px-6 pb-6 pt-4">{footer}</footer>}
      </section>
    );
  }
);

Card.displayName = 'Card';

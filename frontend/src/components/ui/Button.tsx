import type { ForwardedRef, ReactNode } from 'react';
import { forwardRef } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import clsx from 'clsx';
import { cva, type VariantProps } from '../../utils/cva';

const buttonVariants = cva(
  'inline-flex items-center justify-center font-medium rounded-md transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary: 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500 shadow-md',
        secondary:
          'bg-gray-200 text-gray-800 hover:bg-gray-300 focus-visible:ring-gray-500 shadow-sm',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 shadow-md',
        success:
          'bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-500 shadow-md',
        info: 'bg-purple-600 text-white hover:bg-purple-700 focus-visible:ring-purple-500 shadow-md',
        ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus-visible:ring-gray-500',
        'primary-teal':
          'bg-teal-600 text-white hover:bg-teal-700 focus-visible:ring-teal-500 shadow-md',
        'ghost-white':
          'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 focus-visible:ring-white/40',
        circle:
          'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-full p-2 shadow-md',
        'primary-circle':
          'h-8 w-8 rounded-full bg-primary-600 text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-40',
        outline:
          'bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-100 focus-visible:ring-gray-500 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800',
        menu: 'justify-start w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 dark:text-gray-100 dark:hover:bg-blue-900/20 shadow-none rounded-md',
        'menu-danger':
          'justify-start w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 shadow-none rounded-md',
        'text-danger':
          'bg-transparent text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 focus-visible:ring-red-500 shadow-none px-0 py-0',
        'text-success':
          'bg-transparent text-green-600 hover:text-green-800 dark:text-green-300 dark:hover:text-green-200 focus-visible:ring-green-500 shadow-none px-0 py-0',
        'text-muted':
          'bg-transparent text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100 focus-visible:ring-gray-400 shadow-none px-0 py-0',
        'icon-muted':
          'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-100 rounded-md p-1 shadow-none transition-colors',
        'chip-gradient':
          'rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1 text-[10px] font-semibold text-white transition hover:from-amber-600 hover:to-orange-600 shadow-none',
        'ghost-subtle':
          'bg-transparent text-gray-400 hover:text-gray-200 dark:text-gray-400 dark:hover:text-gray-200 transition-colors shadow-none px-0 py-0',
        'ghost-neutral':
          'bg-transparent text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300 transition-colors shadow-none px-0 py-0',
        'icon-soft':
          'bg-transparent p-2 rounded-md text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-none',
        'icon-circle-muted':
          'rounded-full p-2 text-gray-500 transition hover:bg-gray-200 hover:text-primary-600 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-primary-300 shadow-none',
        'icon-toolbar':
          'p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shadow-none',
        'icon-ghost':
          'bg-transparent p-1 rounded-full text-gray-400 hover:bg-black/5 dark:hover:bg-white/5 transition-colors shadow-none',
        'icon-primary': 'p-1 rounded text-blue-600 hover:bg-blue-50 transition-colors shadow-none',
        'icon-success':
          'p-1 rounded text-green-600 hover:bg-green-50 transition-colors shadow-none',
        'icon-danger': 'p-1 rounded text-red-600 hover:bg-red-50 transition-colors shadow-none',
        'ghost-inline':
          'bg-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 px-0 py-0 gap-2',
        overlay:
          'bg-black/50 text-white hover:bg-black/70 focus-visible:ring-white/40 rounded-full p-2 shadow-none',
        'overlay-light':
          'bg-white/70 text-gray-900 hover:bg-white focus-visible:ring-white/60 rounded-full p-2 shadow',
        'secondary-muted':
          'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-md font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shadow-none',
        'ghost-cool':
          'bg-transparent text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-300 transition-colors shadow-none px-0 py-0',
        'outline-soft':
          'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 px-4 py-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors shadow-none',
        'outline-white':
          'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors shadow-none',
        'link-info':
          'bg-transparent text-blue-500 hover:text-blue-600 transition-colors shadow-none px-0 py-0',
        'pill-muted':
          'bg-transparent px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600 hover:text-gray-900 dark:hover:text-gray-200 transition-colors shadow-none',
        fab: 'bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full shadow-lg transition-all duration-300 hover:scale-110',
        'assistant-action':
          'flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary-600 to-primary-700 text-white transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100',
        'dashed-upload':
          'aspect-square rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 flex items-center justify-center transition-colors bg-transparent',
        'link-primary-muted':
          'bg-transparent text-gray-600 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400 transition-colors shadow-none px-0 py-0',
        'link-danger-muted':
          'bg-transparent text-gray-400 hover:text-red-500 transition-colors shadow-none px-0 py-0',
        'filter-default':
          'border border-gray-200 dark:border-gray-700 bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-md',
        'filter-active':
          'border border-primary-200 dark:border-primary-700 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300 transition-colors rounded-md',
        'toolbar-primary':
          'border border-blue-700 bg-blue-600 text-white hover:bg-blue-700 transition-colors rounded-md',
        'input-clear':
          'bg-transparent hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-none',
        'link-muted-uppercase':
          'bg-transparent ml-auto text-xs font-semibold uppercase tracking-wide text-gray-400 hover:text-gray-200 transition-colors shadow-none px-0 py-0',
        'link-secondary':
          'bg-transparent px-6 py-3 text-secondary-600 dark:text-secondary-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors font-medium rounded-lg shadow-none',
        thumbnail:
          'bg-transparent border-2 border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden p-0 hover:border-gray-300 dark:hover:border-gray-500',
        'thumbnail-active':
          'bg-transparent border-2 border-blue-500 rounded-lg overflow-hidden p-0',
        'icon-soft-sm':
          'p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md transition-colors',
        'primary-compact':
          'flex-1 px-3 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center',
        'link-indigo':
          'bg-transparent text-indigo-300 hover:text-indigo-100 transition-colors shadow-none px-0 py-0',
        'link-purple':
          'bg-transparent text-purple-300 hover:text-purple-100 transition-colors shadow-none px-0 py-0',
        'link-uppercase-accent':
          'bg-transparent ml-auto text-xs font-semibold uppercase tracking-wide text-purple-300 underline-offset-2 hover:underline transition-colors shadow-none px-0 py-0',
        'link-emerald':
          'bg-transparent text-emerald-300 hover:text-emerald-100 transition-colors shadow-none px-0 py-0',
        'neutral-soft':
          'px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors shadow-none',
        'primary-compact-lg':
          'px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center',
        'ghost-secondary':
          'bg-transparent px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors shadow-none',
        'outline-slate':
          'inline-flex items-center px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-md text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700',
        'icon-soft-xs':
          'p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors',
        'link-primary':
          'bg-transparent text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200 transition-colors shadow-none px-0 py-0',
        'icon-floating':
          'rounded-full p-2.5 text-gray-500 transition hover:bg-gray-100 hover:text-primary-600 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-primary-400 shadow-none',
        'link-blue':
          'bg-transparent text-blue-400 hover:text-blue-600 dark:text-blue-200 dark:hover:text-blue-100 transition-colors shadow-none px-0 py-0',
        'link-uppercase-secondary':
          'bg-transparent ml-auto text-xs font-semibold uppercase tracking-wide text-blue-500 dark:text-blue-200 underline-offset-2 hover:underline transition-colors shadow-none px-0 py-0',
        'link-danger':
          'bg-transparent text-[11px] font-medium text-rose-500 hover:underline transition-colors shadow-none px-0 py-0',
        'danger-elevated':
          'px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 font-medium shadow-md flex items-center space-x-2',
        'secondary-tonal':
          'px-6 py-3 text-secondary-600 dark:text-secondary-400 hover:text-gray-800 transition-colors font-medium rounded-lg shadow-none',
        'primary-elevated':
          'px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md',
        'outline-neutral-lg':
          'px-6 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shadow-none',
        'primary-with-icon':
          'px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2',
        'menu-accent':
          'w-full flex items-center space-x-3 px-3 py-2 text-left text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors shadow-none',
        'primary-elevated-lg':
          'px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md',
        'primary-basic':
          'px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-none',
        'filter-chip':
          'flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-md transition-colors',
        'link-secondary-theme':
          'px-6 py-3 theme-text-secondary hover:text-gray-800 transition-colors font-medium rounded-lg shadow-none',
        'primary-card':
          'px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-none',
      },
      size: {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-base',
        lg: 'px-6 py-3 text-lg',
        none: '',
      },
      loading: {
        true: 'pointer-events-none opacity-60',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      loading: 'false',
    },
    compoundVariants: [
      {
        variant: 'menu',
        size: 'none',
        class: 'font-normal',
      },
      {
        variant: 'menu-danger',
        size: 'none',
        class: 'font-normal',
      },
      {
        variant: [
          'text-danger',
          'text-success',
          'text-muted',
          'ghost-subtle',
          'ghost-neutral',
          'ghost-cool',
          'ghost-inline',
          'link-info',
          'link-indigo',
          'link-purple',
          'link-uppercase-accent',
          'link-emerald',
          'link-primary-muted',
          'link-danger-muted',
          'link-primary',
          'link-blue',
          'link-uppercase-secondary',
          'link-danger',
          'link-muted-uppercase',
          'pill-muted',
          'link-secondary',
          'link-secondary-theme',
        ],
        size: 'none',
        class: '',
      },
      {
        variant: [
          'icon-muted',
          'icon-soft',
          'icon-soft-sm',
          'icon-soft-xs',
          'icon-circle-muted',
          'icon-toolbar',
          'icon-floating',
          'input-clear',
          'primary-circle',
          'circle',
          'fab',
          'assistant-action',
          'overlay',
          'overlay-light',
          'thumbnail',
          'thumbnail-active',
        ],
        size: 'none',
        class: '',
      },
      {
        variant: ['filter-default', 'filter-active', 'toolbar-primary'],
        size: 'none',
        class: '',
      },
      {
        variant: [
          'primary-compact',
          'neutral-soft',
          'primary-compact-lg',
          'ghost-secondary',
          'outline-slate',
          'danger-elevated',
          'secondary-tonal',
          'primary-elevated',
          'outline-neutral-lg',
          'primary-with-icon',
          'menu-accent',
          'primary-elevated-lg',
          'primary-basic',
          'filter-chip',
          'primary-card',
        ],
        size: 'none',
        class: '',
      },
    ],
  }
);

const variantsWithIntrinsicSizing = new Set([
  'menu',
  'menu-danger',
  'text-danger',
  'text-success',
  'text-muted',
  'ghost-subtle',
  'ghost-neutral',
  'ghost-cool',
  'ghost-inline',
  'link-info',
  'link-indigo',
  'link-purple',
  'link-uppercase-accent',
  'link-emerald',
  'link-primary-muted',
  'link-danger-muted',
  'link-primary',
  'link-blue',
  'link-uppercase-secondary',
  'link-danger',
  'link-muted-uppercase',
  'pill-muted',
  'link-secondary',
  'link-secondary-theme',
  'icon-muted',
  'icon-soft',
  'icon-soft-sm',
  'icon-soft-xs',
  'icon-circle-muted',
  'icon-toolbar',
  'icon-ghost',
  'icon-primary',
  'icon-success',
  'icon-danger',
  'icon-floating',
  'input-clear',
  'primary-circle',
  'circle',
  'fab',
  'assistant-action',
  'overlay',
  'overlay-light',
  'thumbnail',
  'thumbnail-active',
  'dashed-upload',
  'filter-default',
  'filter-active',
  'toolbar-primary',
  'primary-compact',
  'neutral-soft',
  'primary-compact-lg',
  'ghost-secondary',
  'outline-slate',
  'danger-elevated',
  'secondary-tonal',
  'primary-elevated',
  'outline-neutral-lg',
  'primary-with-icon',
  'menu-accent',
  'primary-elevated-lg',
  'primary-basic',
  'filter-chip',
  'primary-card',
  'secondary-muted',
  'ghost-cool',
  'outline-soft',
  'outline-white',
]);

export interface ButtonProps
  extends Omit<HTMLMotionProps<'button'>, 'ref'>,
    Omit<VariantProps<typeof buttonVariants>, 'loading'> {
  children: ReactNode;
  className?: string;
  loading?: boolean;
}

const MotionButton = motion.button;

const ButtonComponent = (
  {
    variant,
    size = 'md',
    loading = false,
    className,
    disabled,
    children,
    type = 'button',
    ...props
  }: ButtonProps,
  ref: ForwardedRef<HTMLButtonElement>
) => {
  const normalizedVariant = variant ?? 'primary';
  const resolvedSize =
    size ??
    (normalizedVariant && variantsWithIntrinsicSizing.has(normalizedVariant) ? 'none' : undefined);

  const composedClassName = buttonVariants({
    variant: normalizedVariant,
    size: resolvedSize,
    loading: loading ? 'true' : 'false',
  });

  return (
    <MotionButton
      ref={ref}
      type={type}
      className={clsx(composedClassName, className)}
      aria-busy={loading || undefined}
      aria-live={loading ? 'polite' : undefined}
      disabled={disabled || loading}
      {...props}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {children}
    </MotionButton>
  );
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(ButtonComponent);
Button.displayName = 'Button';

export { buttonVariants };

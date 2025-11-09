/**
 * Card Component - Enhanced with variants
 *
 * Replaces 146+ duplicate card/container patterns
 *
 * Usage:
 * <Card variant="default">...</Card>
 * <Card variant="bordered" shadow="md">...</Card>
 * <Card variant="dashed" padding="lg">...</Card>
 * <Card variant="popover">Dropdown menu</Card>
 */

import type { ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cva, type VariantProps } from '../../utils/cva';

const cardVariants = cva('rounded-lg transition-all duration-200', {
  variants: {
    variant: {
      // Default solid cards
      default: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
      bordered: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
      elevated: 'bg-white dark:bg-gray-800',

      // Special purpose cards
      dashed:
        'border-2 border-dashed border-gray-300 dark:border-gray-600 bg-transparent hover:border-gray-400 dark:hover:border-gray-500',
      popover: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg',

      // Colored cards
      primary: 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800',
      success: 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800',
      warning: 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800',
      danger: 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800',

      // Gradient backgrounds
      gradient:
        'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border border-blue-200 dark:border-blue-800',
      'gradient-success':
        'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 border border-green-200 dark:border-green-800',

      // Transparent/glass
      glass:
        'bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50',
      ghost: 'bg-transparent border-none',
    },
    padding: {
      none: 'p-0',
      sm: 'p-2',
      md: 'p-3',
      lg: 'p-4',
      xl: 'p-5',
    },
    shadow: {
      none: 'shadow-none',
      sm: 'shadow-sm',
      md: 'shadow-md',
      lg: 'shadow-lg',
      xl: 'shadow-xl',
    },
    rounded: {
      none: 'rounded-none',
      sm: 'rounded-sm',
      md: 'rounded-md',
      lg: 'rounded-lg',
      xl: 'rounded-xl',
      '2xl': 'rounded-2xl',
      full: 'rounded-full',
    },
    hover: {
      true: 'hover:shadow-lg hover:-translate-y-0.5',
      false: '',
    },
    interactive: {
      true: 'cursor-pointer hover:border-gray-300 dark:hover:border-gray-600',
      false: '',
    },
  },
  defaultVariants: {
    variant: 'default',
    padding: 'md',
    shadow: 'sm',
    rounded: 'lg',
    hover: false,
    interactive: false,
  },
});

export interface CardProps
  extends Omit<HTMLMotionProps<'div'>, 'ref'>,
    VariantProps<typeof cardVariants> {
  children: ReactNode;
  className?: string;
  /** Disable motion animations */
  noMotion?: boolean;
}

export const Card = ({
  children,
  className,
  variant,
  padding,
  shadow,
  rounded,
  hover,
  interactive,
  noMotion = false,
  ...props
}: CardProps) => {
  const composedClassName = [
    cardVariants({ variant, padding, shadow, rounded, hover, interactive }),
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (noMotion) {
    return (
      <div className={composedClassName} {...(props as React.HTMLAttributes<HTMLDivElement>)}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={composedClassName}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      whileHover={hover ? { translateY: -5 } : undefined}
      {...props}
    >
      {children}
    </motion.div>
  );
};

/**
 * Convenience components for common card types
 */

export function CardDefault(props: Omit<CardProps, 'variant'>) {
  return <Card {...props} variant="default" />;
}

export function CardBordered(props: Omit<CardProps, 'variant'>) {
  return <Card {...props} variant="bordered" />;
}

export function CardDashed(props: Omit<CardProps, 'variant'>) {
  return <Card {...props} variant="dashed" />;
}

export function CardPopover(props: Omit<CardProps, 'variant'>) {
  return <Card {...props} variant="popover" />;
}

export { cardVariants };

/**
 * Layout Utility Components
 *
 * Replaces 146+ duplicate flex/grid patterns with reusable components
 *
 * Usage:
 * <FlexBetween>...</FlexBetween>   // Instead of: <div className="flex items-center justify-between">
 * <FlexStart gap={3}>...</FlexStart>  // Instead of: <div className="flex items-start gap-3">
 * <Grid cols={2} gap={4}>...</Grid>    // Instead of: <div className="grid grid-cols-2 gap-4">
 */

import type { ReactNode } from 'react';
import { cva, type VariantProps } from '../../utils/cva';

// ============================================================================
// FLEX LAYOUTS
// ============================================================================

const flexVariants = cva('flex', {
  variants: {
    align: {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch',
      baseline: 'items-baseline',
    },
    justify: {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
      around: 'justify-around',
      evenly: 'justify-evenly',
    },
    direction: {
      row: 'flex-row',
      col: 'flex-col',
      'row-reverse': 'flex-row-reverse',
      'col-reverse': 'flex-col-reverse',
    },
    wrap: {
      true: 'flex-wrap',
      false: 'flex-nowrap',
    },
    gap: {
      0: 'gap-0',
      1: 'gap-1',
      2: 'gap-2',
      3: 'gap-3',
      4: 'gap-4',
      5: 'gap-5',
      6: 'gap-6',
      8: 'gap-8',
    },
  },
  defaultVariants: {
    align: 'center',
    justify: 'start',
    direction: 'row',
    wrap: false,
    gap: 0,
  },
});

export interface FlexProps extends VariantProps<typeof flexVariants> {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article' | 'header' | 'footer' | 'nav';
}

export function Flex({
  children,
  className,
  as: Component = 'div',
  align,
  justify,
  direction,
  wrap,
  gap,
}: FlexProps) {
  return (
    <Component
      className={[flexVariants({ align, justify, direction, wrap, gap }), className]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </Component>
  );
}

/**
 * FlexBetween - Most common pattern (146 instances)
 * Replaces: <div className="flex items-center justify-between">
 */
export function FlexBetween({
  children,
  className,
  gap,
}: {
  children: ReactNode;
  className?: string;
  gap?: FlexProps['gap'];
}) {
  return (
    <Flex align="center" justify="between" gap={gap} className={className}>
      {children}
    </Flex>
  );
}

/**
 * FlexStart - For vertically stacked lists (40+ instances)
 * Replaces: <div className="flex items-start gap-3">
 */
export function FlexStart({
  children,
  className,
  gap = 3,
}: {
  children: ReactNode;
  className?: string;
  gap?: FlexProps['gap'];
}) {
  return (
    <Flex align="start" gap={gap} className={className}>
      {children}
    </Flex>
  );
}

/**
 * FlexCenter - For centered content
 * Replaces: <div className="flex items-center justify-center">
 */
export function FlexCenter({
  children,
  className,
  gap,
}: {
  children: ReactNode;
  className?: string;
  gap?: FlexProps['gap'];
}) {
  return (
    <Flex align="center" justify="center" gap={gap} className={className}>
      {children}
    </Flex>
  );
}

/**
 * InlineFlex - For inline-flex elements (62+ instances in badges)
 * Replaces: <div className="inline-flex items-center">
 */
export function InlineFlex({
  children,
  className,
  gap,
}: {
  children: ReactNode;
  className?: string;
  gap?: FlexProps['gap'];
}) {
  return (
    <div
      className={['inline-flex items-center', gap && `gap-${gap}`, className]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}

// ============================================================================
// GRID LAYOUTS
// ============================================================================

const gridVariants = cva('grid', {
  variants: {
    cols: {
      1: 'grid-cols-1',
      2: 'grid-cols-2',
      3: 'grid-cols-3',
      4: 'grid-cols-4',
      5: 'grid-cols-5',
      6: 'grid-cols-6',
      12: 'grid-cols-12',
    },
    gap: {
      0: 'gap-0',
      1: 'gap-1',
      2: 'gap-2',
      3: 'gap-3',
      4: 'gap-4',
      5: 'gap-5',
      6: 'gap-6',
      8: 'gap-8',
    },
    responsive: {
      true: '',
      false: '',
    },
  },
  defaultVariants: {
    cols: 1,
    gap: 4,
    responsive: false,
  },
  compoundVariants: [
    {
      responsive: true,
      cols: 2,
      class: 'grid-cols-1 md:grid-cols-2',
    },
    {
      responsive: true,
      cols: 3,
      class: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    },
    {
      responsive: true,
      cols: 4,
      class: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    },
  ],
});

export interface GridProps extends VariantProps<typeof gridVariants> {
  children: ReactNode;
  className?: string;
}

/**
 * Grid - Responsive grid layout (25+ instances)
 * Replaces: <div className="grid grid-cols-2 gap-3">
 */
export function Grid({ children, className, cols, gap, responsive }: GridProps) {
  return (
    <div className={[gridVariants({ cols, gap, responsive }), className].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}

// ============================================================================
// STACK LAYOUTS
// ============================================================================

/**
 * Stack - Vertical stack with consistent spacing
 * Replaces repeated flex-col patterns
 */
export function Stack({
  children,
  className,
  gap = 4,
}: {
  children: ReactNode;
  className?: string;
  gap?: FlexProps['gap'];
}) {
  return (
    <Flex direction="col" gap={gap} className={className}>
      {children}
    </Flex>
  );
}

/**
 * HStack - Horizontal stack (alias for Flex with row direction)
 */
export function HStack({
  children,
  className,
  gap = 2,
  align = 'center' as const,
}: {
  children: ReactNode;
  className?: string;
  gap?: FlexProps['gap'];
  align?: FlexProps['align'];
}) {
  return (
    <Flex direction="row" align={align} gap={gap} className={className}>
      {children}
    </Flex>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export { flexVariants, gridVariants };

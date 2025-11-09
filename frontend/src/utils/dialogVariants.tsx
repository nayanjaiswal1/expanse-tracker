/**
 * Dialog Variant Configurations - 2025 Design System
 * Centralized styling for consistent dialog/modal appearance
 *
 * Benefits:
 * - Single source of truth for dialog variants
 * - Easy to maintain and extend
 * - Consistent design tokens
 * - Type-safe variant selection
 */

import { AlertTriangle, Trash2, Info, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Dialog variant type
 */
export type DialogVariant = 'danger' | 'warning' | 'info' | 'success' | 'default';

/**
 * Dialog variant style configuration
 */
export interface DialogVariantStyle {
  iconBg: string;
  iconColor: string;
  iconRing: string;
  confirmButton: string;
  icon: LucideIcon;
}

/**
 * Modern 2025 design tokens with semantic colors
 * Using Tailwind 3.x color palette with dark mode support
 */
export const dialogVariantStyles: Record<DialogVariant, DialogVariantStyle> = {
  danger: {
    iconBg: 'bg-red-50 dark:bg-red-950/50',
    iconColor: 'text-red-600 dark:text-red-400',
    iconRing: 'ring-2 ring-red-100 dark:ring-red-900/50',
    confirmButton:
      'bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white focus-visible:ring-2 focus-visible:ring-red-500 focus:outline-none',
    icon: Trash2,
  },
  warning: {
    iconBg: 'bg-amber-50 dark:bg-amber-950/50',
    iconColor: 'text-amber-600 dark:text-amber-400',
    iconRing: 'ring-2 ring-amber-100 dark:ring-amber-900/50',
    confirmButton:
      'bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-700 text-white focus-visible:ring-2 focus-visible:ring-amber-500 focus:outline-none',
    icon: AlertTriangle,
  },
  info: {
    iconBg: 'bg-blue-50 dark:bg-blue-950/50',
    iconColor: 'text-blue-600 dark:text-blue-400',
    iconRing: 'ring-2 ring-blue-100 dark:ring-blue-900/50',
    confirmButton:
      'bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white focus-visible:ring-2 focus-visible:ring-blue-500 focus:outline-none',
    icon: Info,
  },
  success: {
    iconBg: 'bg-emerald-50 dark:bg-emerald-950/50',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    iconRing: 'ring-2 ring-emerald-100 dark:ring-emerald-900/50',
    confirmButton:
      'bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white focus-visible:ring-2 focus-visible:ring-emerald-500 focus:outline-none',
    icon: CheckCircle2,
  },
  default: {
    iconBg: 'bg-gray-50 dark:bg-gray-950/50',
    iconColor: 'text-gray-600 dark:text-gray-400',
    iconRing: 'ring-2 ring-gray-100 dark:ring-gray-900/50',
    confirmButton:
      'bg-gray-600 hover:bg-gray-700 dark:bg-gray-600 dark:hover:bg-gray-700 text-white focus-visible:ring-2 focus-visible:ring-gray-500 focus:outline-none',
    icon: AlertCircle,
  },
};

/**
 * Get variant styles by type
 */
export const getDialogVariantStyle = (variant: DialogVariant = 'default') => {
  return dialogVariantStyles[variant];
};

/**
 * Get default icon for variant
 */
export const getDialogVariantIcon = (variant: DialogVariant = 'default') => {
  const Icon = dialogVariantStyles[variant].icon;
  return <Icon className="h-5 w-5" />;
};

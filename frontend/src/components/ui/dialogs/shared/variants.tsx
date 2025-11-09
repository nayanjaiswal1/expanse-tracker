/**
 * Dialog Variant System - 2025
 *
 * Type-safe variant configurations for dialog components
 * Moved from utils/dialogVariants.tsx to keep dialog-related code together
 */

import React from 'react';
import { Trash2, AlertTriangle, Info, CheckCircle, AlertCircle } from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

export type DialogVariant = 'danger' | 'warning' | 'info' | 'success' | 'default';

export interface DialogVariantStyle {
  iconBg: string;
  iconColor: string;
  iconRing: string;
  confirmButton: string;
  icon: React.ReactNode;
}

// ============================================================
// VARIANT CONFIGURATIONS
// ============================================================

export const dialogVariantStyles: Record<DialogVariant, DialogVariantStyle> = {
  danger: {
    iconBg: 'bg-red-50 dark:bg-red-950/50',
    iconColor: 'text-red-600 dark:text-red-400',
    iconRing: 'ring-2 ring-red-100 dark:ring-red-900/50',
    confirmButton:
      'bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white focus-visible:ring-2 focus-visible:ring-red-500 focus:outline-none',
    icon: <Trash2 className="h-5 w-5" />,
  },
  warning: {
    iconBg: 'bg-amber-50 dark:bg-amber-950/50',
    iconColor: 'text-amber-600 dark:text-amber-400',
    iconRing: 'ring-2 ring-amber-100 dark:ring-amber-900/50',
    confirmButton:
      'bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-700 text-white focus-visible:ring-2 focus-visible:ring-amber-500 focus:outline-none',
    icon: <AlertTriangle className="h-5 w-5" />,
  },
  info: {
    iconBg: 'bg-blue-50 dark:bg-blue-950/50',
    iconColor: 'text-blue-600 dark:text-blue-400',
    iconRing: 'ring-2 ring-blue-100 dark:ring-blue-900/50',
    confirmButton:
      'bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white focus-visible:ring-2 focus-visible:ring-blue-500 focus:outline-none',
    icon: <Info className="h-5 w-5" />,
  },
  success: {
    iconBg: 'bg-emerald-50 dark:bg-emerald-950/50',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    iconRing: 'ring-2 ring-emerald-100 dark:ring-emerald-900/50',
    confirmButton:
      'bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white focus-visible:ring-2 focus-visible:ring-emerald-500 focus:outline-none',
    icon: <CheckCircle className="h-5 w-5" />,
  },
  default: {
    iconBg: 'bg-slate-50 dark:bg-slate-950/50',
    iconColor: 'text-slate-600 dark:text-slate-400',
    iconRing: 'ring-2 ring-slate-100 dark:ring-slate-900/50',
    confirmButton:
      'bg-slate-600 hover:bg-slate-700 dark:bg-slate-600 dark:hover:bg-slate-700 text-white focus-visible:ring-2 focus-visible:ring-slate-500 focus:outline-none',
    icon: <AlertCircle className="h-5 w-5" />,
  },
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Get variant style configuration
 */
export function getDialogVariantStyle(variant: DialogVariant): DialogVariantStyle {
  return dialogVariantStyles[variant];
}

/**
 * Get default icon for variant
 */
export function getDialogVariantIcon(variant: DialogVariant): React.ReactNode {
  return dialogVariantStyles[variant].icon;
}

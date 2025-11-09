/**
 * ConfirmDialog - 2025 Modernized & Reorganized
 *
 * Now uses:
 * - BaseDialog (shared structure)
 * - Centralized animations (./shared/animations)
 * - Centralized variants (./shared/variants)
 * - Centralized translations (./shared/translations)
 *
 * All dialog-related code is now in one folder!
 */

import React from 'react';
import { DialogTitle, Description } from '@headlessui/react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { BaseDialog } from './shared/BaseDialog';
import { Button } from '../Button';
import { popVariants, springTransition } from './shared/animations';
import { getDialogVariantStyle, getDialogVariantIcon, type DialogVariant } from './shared/variants';
import { useDialogTranslations } from './shared/translations';

// ============================================================
// TYPES
// ============================================================

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  titleKey?: string;
  message?: string;
  messageKey?: string;
  messageValues?: Record<string, any>;
  confirmText?: string;
  confirmTextKey?: string;
  cancelText?: string;
  cancelTextKey?: string;
  variant?: DialogVariant;
  icon?: React.ReactNode;
  confirmLoading?: boolean;
}

// ============================================================
// COMPONENT
// ============================================================

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  titleKey,
  message,
  messageKey,
  messageValues,
  confirmText,
  confirmTextKey,
  cancelText,
  cancelTextKey,
  variant = 'danger',
  icon,
  confirmLoading = false,
}) => {
  // Get translated texts using shared hook
  const { getDialogTexts } = useDialogTranslations();
  const texts = getDialogTexts({
    title,
    titleKey,
    message,
    messageKey,
    messageValues,
    confirmText,
    confirmTextKey,
    cancelText,
    cancelTextKey,
  });

  // Get variant styles from shared config
  const variantStyle = getDialogVariantStyle(variant);
  const defaultIcon = getDialogVariantIcon(variant);

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <BaseDialog isOpen={isOpen} onClose={onClose} size="sm">
      {/* Header with icon */}
      <div className="flex items-start gap-4 px-6 pt-5 pb-4">
        {/* Animated icon - shared animation */}
        <motion.div
          variants={popVariants}
          initial="initial"
          animate="animate"
          transition={springTransition}
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${variantStyle.iconBg} ${variantStyle.iconRing}`}
        >
          <div className={variantStyle.iconColor}>{icon || defaultIcon}</div>
        </motion.div>

        {/* Title and close button */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <DialogTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {texts.title}
            </DialogTitle>
            <button
              onClick={onClose}
              className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Message */}
      <div className="px-6 pb-5">
        <Description className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          {texts.message}
        </Description>
      </div>

      {/* Actions */}
      <div className="flex gap-3 bg-slate-50 dark:bg-slate-900/50 px-6 py-4 border-t border-slate-200 dark:border-slate-800">
        <Button onClick={onClose} variant="outline" className="flex-1">
          {texts.cancelText}
        </Button>
        <Button
          onClick={handleConfirm}
          variant="danger"
          className={`flex-1 ${variantStyle.confirmButton}`}
          loading={confirmLoading}
        >
          {texts.confirmText}
        </Button>
      </div>
    </BaseDialog>
  );
};

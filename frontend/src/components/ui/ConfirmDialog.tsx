/**
 * ConfirmDialog Component - 2025 Modernized
 *
 * Improvements:
 * - Centralized animations from utils/animations
 * - Reusable dialog variants from utils/dialogVariants
 * - Optimized i18n with useDialogTranslations hook
 * - Reduced code duplication
 * - Type-safe and maintainable
 */

import React from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle, Description } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from './Button';
import { useDialogTranslations } from '../../hooks/useSmartTranslation';
import {
  backdropVariants,
  dialogVariants,
  popVariants,
  springTransition,
} from '../../utils/animations';
import {
  getDialogVariantStyle,
  getDialogVariantIcon,
  type DialogVariant,
} from '../../utils/dialogVariants';

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
  const { getDialogTexts } = useDialogTranslations();

  // Get translated texts using centralized hook
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

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  // Get variant styles from centralized config
  const variantStyle = getDialogVariantStyle(variant);
  const defaultIcon = getDialogVariantIcon(variant);

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog static open={isOpen} onClose={onClose} className="relative z-[70]">
          {/* Backdrop with centralized animation */}
          <DialogBackdrop
            as={motion.div}
            variants={backdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
          />

          {/* Dialog container */}
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <DialogPanel
              as={motion.div}
              variants={dialogVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="relative w-full max-w-md overflow-hidden rounded-xl bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-black/5 dark:ring-white/10"
            >
              {/* Header with icon */}
              <div className="flex items-start gap-4 px-6 pt-5 pb-4">
                {/* Animated icon - using centralized pop animation */}
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

              {/* Actions - optimized spacing */}
              <div className="flex gap-3 bg-slate-50 dark:bg-slate-900/50 px-6 py-4 border-t border-slate-200 dark:border-slate-800">
                <Button onClick={onClose} variant="outline" size="none" className="flex-1">
                  {texts.cancelText}
                </Button>
                <Button
                  onClick={handleConfirm}
                  variant={variant === 'danger' ? 'danger' : 'primary'}
                  className="flex-1"
                  loading={confirmLoading}
                >
                  {texts.confirmText}
                </Button>
              </div>
            </DialogPanel>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  );
};

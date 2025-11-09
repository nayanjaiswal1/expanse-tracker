/**
 * BaseDialog - Shared Foundation for All Dialog Components
 *
 * Provides common structure used by Modal, ConfirmDialog, etc.
 * Eliminates code duplication between dialog components
 */

import React, { type ReactNode } from 'react';
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { cva } from '../../../../utils/cva';
import { backdropVariants, dialogVariants } from './animations';

// ============================================================
// VARIANTS - CVA Pattern for Type-Safe Sizing
// ============================================================

export const dialogSizeVariants = cva(
  'relative w-full rounded-xl bg-white dark:bg-gray-900 shadow-2xl overflow-hidden ring-1 ring-black/5 dark:ring-white/10',
  {
    variants: {
      size: {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
        full: 'max-w-5xl',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

// ============================================================
// TYPES
// ============================================================

type DialogSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface BaseDialogProps {
  /** Whether dialog is open */
  isOpen: boolean;

  /** Callback when dialog closes */
  onClose: () => void;

  /** Dialog content */
  children: ReactNode;

  /** Dialog size */
  size?: DialogSize;

  /** Allow closing on backdrop click */
  closeOnBackdrop?: boolean;

  /** Custom className for panel */
  className?: string;

  /** Z-index class override */
  zIndex?: string;
}

// ============================================================
// COMPONENT
// ============================================================

/**
 * Base dialog component used by all dialog variants
 *
 * Features:
 * - Centralized HeadlessUI Dialog setup
 * - Framer Motion animations
 * - Type-safe sizing with CVA
 * - Consistent backdrop/overlay
 *
 * @example
 * <BaseDialog isOpen={true} onClose={handleClose} size="md">
 *   <YourContent />
 * </BaseDialog>
 */
export const BaseDialog: React.FC<BaseDialogProps> = ({
  isOpen,
  onClose,
  children,
  size,
  closeOnBackdrop = true,
  className,
  zIndex = 'z-[70]',
}) => {
  const handleBackdropClick = () => {
    if (closeOnBackdrop) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog static open={isOpen} onClose={handleBackdropClick} className={`relative ${zIndex}`}>
          {/* Backdrop with blur */}
          <DialogBackdrop
            as={motion.div}
            variants={backdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
          />

          {/* Centered dialog container */}
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <DialogPanel
              as={motion.div}
              variants={dialogVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className={`${dialogSizeVariants({ size })} ${className || ''}`}
            >
              {children}
            </DialogPanel>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  );
};

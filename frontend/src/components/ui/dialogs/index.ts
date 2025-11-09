/**
 * Dialog Components - Centralized Export
 *
 * All dialog-related components and utilities in one place
 */

// Main Components
export { BaseDialog } from './shared/BaseDialog';
export { ConfirmDialog } from './ConfirmDialog';

// Shared Utilities
export { useDialogTranslations } from './shared/translations';
export {
  getDialogVariantStyle,
  getDialogVariantIcon,
  dialogVariantStyles,
} from './shared/variants';
export type { DialogVariant, DialogVariantStyle } from './shared/variants';

// Shared Animations (if needed externally)
export {
  backdropVariants,
  dialogVariants,
  popVariants,
  slideUpVariants,
  fadeVariants,
  dialogAnimationPreset,
  smoothTransition,
  springTransition,
  quickTransition,
} from './shared/animations';

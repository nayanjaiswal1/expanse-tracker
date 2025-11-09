/**
 * Dialog-specific Animation Presets - 2025
 *
 * Centralized animations used ONLY by dialog components
 * Moved from utils/animations.ts to keep dialog-related code together
 */

import type { Variants, Transition } from 'framer-motion';

// ============================================================
// CORE TRANSITION PRESETS
// ============================================================

export const smoothTransition: Transition = {
  duration: 0.2,
  ease: 'easeOut',
};

export const springTransition: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 25,
};

export const quickTransition: Transition = {
  duration: 0.15,
  ease: 'easeInOut',
};

// ============================================================
// DIALOG-SPECIFIC VARIANTS
// ============================================================

/**
 * Backdrop fade animation for dialog overlays
 */
export const backdropVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

/**
 * Main dialog panel animation - subtle scale + fade
 */
export const dialogVariants: Variants = {
  initial: { opacity: 0, scale: 0.95, y: 10 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 10 },
};

/**
 * Pop/bounce effect for icons or emphasis
 */
export const popVariants: Variants = {
  initial: { scale: 0 },
  animate: { scale: 1 },
  exit: { scale: 0 },
};

/**
 * Slide from bottom (mobile-friendly)
 */
export const slideUpVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
};

/**
 * Fade variants for simple transitions
 */
export const fadeVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

// ============================================================
// COMPOUND PRESETS FOR COMPLETE DIALOGS
// ============================================================

/**
 * Complete preset for modal dialogs
 * Use: <DialogPanel {...dialogAnimationPreset.panel} />
 */
export const dialogAnimationPreset = {
  backdrop: {
    as: 'div' as const,
    variants: backdropVariants,
    initial: 'initial' as const,
    animate: 'animate' as const,
    exit: 'exit' as const,
  },
  panel: {
    variants: dialogVariants,
    initial: 'initial' as const,
    animate: 'animate' as const,
    exit: 'exit' as const,
  },
  icon: {
    variants: popVariants,
    initial: 'initial' as const,
    animate: 'animate' as const,
    transition: springTransition,
  },
};

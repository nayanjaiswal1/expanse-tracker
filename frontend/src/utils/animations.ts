/**
 * Centralized Animation Presets - 2025 Modern Approach
 * Using Framer Motion with standardized, reusable animation variants
 *
 * Benefits:
 * - Single source of truth for animations
 * - Consistent motion design across the app
 * - Reduced code duplication
 * - Easy to maintain and update
 * - Type-safe animation variants
 */

import type { Variants, Transition } from 'framer-motion';

// === Core Animation Presets ===

/**
 * Fade animations - Simple opacity transitions
 */
export const fadeVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

/**
 * Scale animations - Zoom in/out effects
 */
export const scaleVariants: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

/**
 * Slide from bottom - Common for modals/dialogs
 */
export const slideUpVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
};

/**
 * Slide from top
 */
export const slideDownVariants: Variants = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

/**
 * Slide from right
 */
export const slideLeftVariants: Variants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
};

/**
 * Slide from left
 */
export const slideRightVariants: Variants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

/**
 * Dialog/Modal animations - Scale + slight slide up
 */
export const dialogVariants: Variants = {
  initial: { opacity: 0, scale: 0.95, y: 10 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 10 },
};

/**
 * Backdrop/Overlay animations
 */
export const backdropVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

/**
 * Pop/Spring animations - Bouncy scale effect
 */
export const popVariants: Variants = {
  initial: { scale: 0 },
  animate: { scale: 1 },
  exit: { scale: 0 },
};

/**
 * Card hover lift effect
 */
export const cardHoverVariants: Variants = {
  rest: { y: 0, scale: 1 },
  hover: { y: -4, scale: 1.02 },
};

/**
 * Stagger children animation
 */
export const staggerContainerVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
  exit: { opacity: 0 },
};

/**
 * Stagger child item
 */
export const staggerItemVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 10 },
};

/**
 * Collapse/Expand height animation
 */
export const collapseVariants: Variants = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: 'auto' },
  exit: { opacity: 0, height: 0 },
};

/**
 * Rotate animation (for icons, chevrons)
 */
export const rotateVariants = (degrees: number): Variants => ({
  initial: { rotate: 0 },
  animate: { rotate: degrees },
  exit: { rotate: 0 },
});

// === Transition Presets ===

/**
 * Default smooth transition
 */
export const smoothTransition: Transition = {
  duration: 0.2,
  ease: 'easeInOut',
};

/**
 * Spring transition - Bouncy feel
 */
export const springTransition: Transition = {
  type: 'spring',
  stiffness: 200,
  damping: 15,
};

/**
 * Quick transition for interactions
 */
export const quickTransition: Transition = {
  duration: 0.15,
  ease: 'easeOut',
};

/**
 * Slow transition for emphasis
 */
export const slowTransition: Transition = {
  duration: 0.3,
  ease: 'easeInOut',
};

/**
 * Stagger delay helper
 */
export const staggerDelay = (index: number, baseDelay = 0.05) => ({
  delay: index * baseDelay,
});

// === Compound Animation Presets (2025 Modern) ===

/**
 * Modal/Dialog animation preset - Complete
 */
export const modalAnimationPreset = {
  backdrop: backdropVariants,
  panel: dialogVariants,
  transition: smoothTransition,
};

/**
 * Dropdown menu animation preset
 */
export const dropdownAnimationPreset = {
  container: slideUpVariants,
  item: staggerItemVariants,
  transition: quickTransition,
};

/**
 * Toast notification animation
 */
export const toastAnimationPreset = {
  variants: slideLeftVariants,
  transition: springTransition,
};

/**
 * List item animation with stagger
 */
export const listAnimationPreset = {
  container: staggerContainerVariants,
  item: staggerItemVariants,
  transition: smoothTransition,
};

// === Utility Functions ===

/**
 * Combine multiple variants
 */
export const combineVariants = (...variants: Variants[]): Variants => {
  return variants.reduce((acc, curr) => ({ ...acc, ...curr }), {});
};

/**
 * Create custom slide variant
 */
export const createSlideVariant = (x = 0, y = 0, scale = 1, opacity = 0): Variants => ({
  initial: { opacity, x, y, scale },
  animate: { opacity: 1, x: 0, y: 0, scale: 1 },
  exit: { opacity, x, y, scale },
});

/**
 * Delay animation by ms
 */
export const withDelay = (variants: Variants, delay: number): Variants => {
  return {
    ...variants,
    animate: {
      ...variants.animate,
      transition: { delay },
    },
  };
};

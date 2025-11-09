import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface TeachingTooltipProps {
  message: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  icon?: string;
  dismissible?: boolean;
  variant?: 'info' | 'success' | 'warning' | 'tip';
  className?: string;
}

export const TeachingTooltip: React.FC<TeachingTooltipProps> = ({
  message,
  position = 'top',
  icon,
  dismissible = true,
  variant = 'info',
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const variantStyles = {
    info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-200',
    success:
      'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-700 dark:text-green-200',
    warning:
      'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-700 dark:text-yellow-200',
    tip: 'bg-purple-50 border-purple-200 text-purple-800 dark:bg-purple-900/20 dark:border-purple-700 dark:text-purple-200',
  };

  const defaultIcons = {
    info: '💡',
    success: '✅',
    warning: '⚠️',
    tip: '💡',
  };

  const positionStyles = {
    top: 'bottom-full mb-2',
    bottom: 'top-full mt-2',
    left: 'right-full mr-2',
    right: 'left-full ml-2',
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{
          opacity: 0,
          y: position === 'top' ? 10 : position === 'bottom' ? -10 : 0,
          x: position === 'left' ? 10 : position === 'right' ? -10 : 0,
        }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className={`
          relative inline-flex items-start gap-2 px-3 py-2 rounded-lg border text-sm
          ${variantStyles[variant]}
          ${positionStyles[position]}
          ${className}
        `}
      >
        {(icon || defaultIcons[variant]) && (
          <span className="text-base flex-shrink-0">{icon || defaultIcons[variant]}</span>
        )}
        <p className="flex-1 m-0">{message}</p>
        {dismissible && (
          <button
            onClick={() => setIsVisible(false)}
            className="flex-shrink-0 ml-2 text-current opacity-50 hover:opacity-100 transition-opacity"
            aria-label="Dismiss"
          >
            ×
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default TeachingTooltip;

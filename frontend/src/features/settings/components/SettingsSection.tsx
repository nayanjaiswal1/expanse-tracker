import React from 'react';
import { motion } from 'framer-motion';

interface SettingsSectionProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  compact?: boolean;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  children,
  className = '',
  delay = 0,
  compact = false,
}) => {
  const paddingClass = compact ? 'p-4' : 'p-6';

  return (
    <motion.div
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 ${paddingClass} ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
};

import React from 'react';
import { motion } from 'framer-motion';

interface SettingsLayoutProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl';
}

export const SettingsLayout: React.FC<SettingsLayoutProps> = ({
  title,
  description,
  children,
  maxWidth = '4xl',
}) => {
  const maxWidthClass = `max-w-${maxWidth}`;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className={`${maxWidthClass} mx-auto px-4 sm:px-6 lg:px-8 py-8`}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{title}</h1>
          {description && <p className="text-gray-600 dark:text-gray-400 mt-2">{description}</p>}
        </motion.div>

        <div className="mt-8 space-y-8">{children}</div>
      </div>
    </div>
  );
};

import React from 'react';
import { motion } from 'framer-motion';

export interface FeatureShowcaseProps {
  icon: string;
  title: string;
  description: string;
  benefit?: string;
  demoGif?: string;
  selected: boolean;
  onToggle: () => void;
  disabled?: boolean;
  badge?: string;
}

export const FeatureShowcase: React.FC<FeatureShowcaseProps> = ({
  icon,
  title,
  description,
  benefit,
  demoGif,
  selected,
  onToggle,
  disabled = false,
  badge,
}) => {
  return (
    <motion.div
      whileHover={!disabled ? { scale: 1.02, y: -2 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      onClick={!disabled ? onToggle : undefined}
      className={`
        relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
        ${
          selected
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      {badge && (
        <div className="absolute -top-2 -right-2 px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full shadow-lg">
          {badge}
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={`
          flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg text-2xl
          ${selected ? 'bg-blue-100 dark:bg-blue-800' : 'bg-gray-100 dark:bg-gray-800'}
        `}
        >
          {icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
            {selected && (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-blue-500">
                ✓
              </motion.span>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{description}</p>
          {benefit && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-2 font-medium">
              ⚡ {benefit}
            </p>
          )}
        </div>
      </div>

      {/* Optional demo preview */}
      {demoGif && selected && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-3 rounded-lg overflow-hidden"
        >
          <img
            src={demoGif}
            alt={`${title} demo`}
            className="w-full h-32 object-cover rounded-lg"
          />
        </motion.div>
      )}
    </motion.div>
  );
};

export default FeatureShowcase;

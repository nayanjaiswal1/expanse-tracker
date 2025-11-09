import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { motion } from 'framer-motion';

interface ThemeSelectorProps {
  value: 'light' | 'dark' | 'system';
  onChange: (value: 'light' | 'dark' | 'system') => void;
  disabled?: boolean;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const themes = [
    {
      value: 'light' as const,
      icon: Sun,
      label: 'Light',
      title: 'Light Mode',
    },
    {
      value: 'dark' as const,
      icon: Moon,
      label: 'Dark',
      title: 'Dark Mode',
    },
    {
      value: 'system' as const,
      icon: Monitor,
      label: 'System',
      title: 'System Default',
    },
  ];

  return (
    <div className="flex gap-3 max-w-md">
      {themes.map((theme) => {
        const Icon = theme.icon;
        const isSelected = value === theme.value;

        return (
          <motion.button
            key={theme.value}
            type="button"
            onClick={() => !disabled && onChange(theme.value)}
            disabled={disabled}
            className={`
              relative flex flex-1 flex-col items-center justify-center gap-1.5 rounded-lg p-3
              transition-all duration-200 outline-none
              ${
                isSelected
                  ? 'border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }
              ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
            `}
            whileHover={!disabled ? { scale: 1.02 } : {}}
            whileTap={!disabled ? { scale: 0.98 } : {}}
            title={theme.title}
          >
            <Icon
              className={`h-5 w-5 ${
                isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
              }`}
            />
            <span
              className={`text-xs font-medium ${
                isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              {theme.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
};

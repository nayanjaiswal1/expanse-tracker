import React from 'react';
import clsx from 'clsx';
import { Check } from 'lucide-react';

/**
 * Standardized checkbox input className for consistent styling across the app
 * Use this for bare checkbox inputs that don't use the Checkbox component
 */
export const checkboxClassName = clsx(
  'h-4 w-4 rounded border-gray-300 text-blue-600',
  'transition-colors duration-150',
  'focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
  'dark:border-gray-600 dark:bg-gray-800 dark:ring-offset-gray-900',
  'dark:checked:bg-blue-600 dark:checked:border-blue-600',
  'disabled:cursor-not-allowed disabled:opacity-50',
  'cursor-pointer'
);

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  description?: string;
  containerClassName?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  description,
  containerClassName,
  checked,
  ...props
}) => {
  return (
    <label
      className={clsx(
        'flex items-center gap-2 cursor-pointer group',
        props.disabled && 'opacity-60 cursor-not-allowed',
        containerClassName
      )}
    >
      <div className="relative flex items-center justify-center">
        <input type="checkbox" checked={checked} className="sr-only peer" {...props} />
        <div
          className={clsx(
            'h-4 w-4 rounded border transition-all duration-200 flex items-center justify-center',
            'peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:ring-offset-2 dark:peer-focus:ring-offset-gray-900',
            'peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
            checked
              ? 'bg-blue-600 border-blue-600 dark:bg-blue-600 dark:border-blue-600'
              : 'bg-white border-gray-300 dark:bg-gray-800 dark:border-gray-600 group-hover:border-blue-500 dark:group-hover:border-blue-400'
          )}
        >
          {checked && <Check className="h-2.5 w-2.5 text-white stroke-[3]" />}
        </div>
      </div>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">{label}</span>
        {description && (
          <span className="mt-0.5 block text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            {description}
          </span>
        )}
      </span>
    </label>
  );
};

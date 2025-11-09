import React from 'react';

interface SettingsFormFieldProps {
  label: string;
  description?: string;
  children: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
  error?: string;
}

export const SettingsFormField: React.FC<SettingsFormFieldProps> = ({
  label,
  description,
  children,
  htmlFor,
  required = false,
  error,
}) => {
  return (
    <div className="space-y-2">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-900 dark:text-white">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {description && <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>}
      {children}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
};

import React from 'react';

interface FormLayoutProps {
  children: React.ReactNode;
}

/**
 * Standardized form layout without decorative elements
 * Provides consistent spacing across all forms
 */
export const FormLayout: React.FC<FormLayoutProps> = ({ children }) => {
  return <div className="space-y-3">{children}</div>;
};

interface FormSectionProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

/**
 * Form section with optional title and description
 */
export const FormSection: React.FC<FormSectionProps> = ({ children, title, description }) => {
  return (
    <div className="space-y-3">
      {(title || description) && (
        <div className="mb-3">
          {title && (
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{title}</h3>
          )}
          {description && <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>}
        </div>
      )}
      <div className="space-y-3">{children}</div>
    </div>
  );
};

interface FormFieldProps {
  label: string;
  required?: boolean;
  helpText?: string;
  error?: string;
  children: React.ReactNode;
}

/**
 * Standardized form field with label, help text, and error handling
 */
export const FormField: React.FC<FormFieldProps> = ({
  label,
  required,
  helpText,
  error,
  children,
}) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {helpText && !error && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{helpText}</p>
      )}
      {error && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>}
    </div>
  );
};

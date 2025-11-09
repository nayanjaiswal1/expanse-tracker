import React from 'react';
import { Input, InputProps } from './Input';

interface FormFieldProps extends InputProps {
  label: string;
  error?: string;
}

export const FormField: React.FC<FormFieldProps> = ({ label, error, ...props }) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-200">{label}</label>
      <Input {...props} />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
};

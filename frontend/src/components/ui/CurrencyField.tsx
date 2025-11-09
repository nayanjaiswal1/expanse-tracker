import React from 'react';
import { Input } from './Input';

interface CurrencyFieldProps {
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
}

export const CurrencyField: React.FC<CurrencyFieldProps> = ({
  value,
  onChange,
  placeholder = '0.00',
  required = false,
  className = '',
  disabled = false,
}) => {
  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <span className="text-gray-500 dark:text-gray-400 text-sm">$</span>
      </div>
      <Input
        type="number"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`pl-8 ${className}`}
        step="0.01"
        min="0"
      />
    </div>
  );
};

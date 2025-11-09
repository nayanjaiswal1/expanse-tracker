import React from 'react';
import { SelectWithSearch } from './RadixSelect';

/**
 * Modern Select Component
 * Built with Radix UI for accessibility, performance, and maintainability
 *
 * Why Radix UI?
 * - WAI-ARIA compliant (accessible out of the box)
 * - Keyboard navigation built-in
 * - Focus management handled automatically
 * - Virtual scrolling for large lists
 * - No manual state management needed
 * - Tree-shakeable and optimized
 */

interface Option {
  value: string | number;
  label: string;
  description?: string;
}

interface SelectProps {
  options: Option[];
  value?: string | number;
  onChange?: (value: string | number) => void;
  label?: string;
  wrapperClassName?: string;
  className?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  allowClear?: boolean;
  searchPlaceholder?: string;
  maxHeight?: string;
  autoWidth?: boolean;
  minWidth?: string;
}

export const Select: React.FC<SelectProps> = ({
  options,
  value,
  onChange,
  label,
  className = '',
  wrapperClassName = '',
  placeholder = 'Select an option',
  required = false,
  disabled = false,
}) => {
  return (
    <SelectWithSearch
      options={options}
      value={value}
      onChange={onChange || (() => {})}
      label={label}
      wrapperClassName={wrapperClassName}
      className={className}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      searchable={options.length > 5} // Auto-enable search for 5+ options
    />
  );
};

import React, { useRef, useCallback, useEffect } from 'react';
import { Input, type InputProps } from './Input';

interface DebouncedInputProps extends Omit<InputProps, 'onChange'> {
  onChange: (value: string) => void;
  debounceMs?: number;
}

/**
 * Uncontrolled debounced input - simpler and more performant
 * Uses defaultValue from props, updates are debounced
 */
export const DebouncedInput: React.FC<DebouncedInputProps> = ({
  value,
  onChange,
  debounceMs = 300,
  ...inputProps
}) => {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external changes (e.g., clear all filters)
  useEffect(() => {
    if (inputRef.current && inputRef.current.value !== value) {
      inputRef.current.value = String(value || '');
    }
  }, [value]);

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = event.target.value;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        onChange(newValue);
      }, debounceMs);
    },
    [onChange, debounceMs]
  );

  return <Input {...inputProps} ref={inputRef} defaultValue={value} onChange={handleChange} />;
};

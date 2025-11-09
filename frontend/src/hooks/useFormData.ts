/**
 * useFormData - Reusable hook for form state management
 *
 * Replaces the repeated pattern of:
 * - useState for formData
 * - handleInputChange function
 * - Form reset logic
 *
 * Usage:
 * ```typescript
 * const { formData, handleChange, resetForm, setFormData } = useFormData<MyFormType>({
 *   initialData: { name: '', email: '' }
 * });
 * ```
 */

import { useState, useCallback } from 'react';

export interface UseFormDataOptions<T> {
  /** Initial form data */
  initialData: T;
  /** Optional callback on any field change */
  onChange?: (formData: T) => void;
  /** Optional transform function for specific fields */
  transform?: Partial<Record<keyof T, (value: any) => any>>;
}

export interface UseFormDataReturn<T> {
  /** Current form data */
  formData: T;
  /** Update a single field */
  handleChange: <K extends keyof T>(field: K, value: T[K]) => void;
  /** Update multiple fields at once */
  updateFields: (updates: Partial<T>) => void;
  /** Reset form to initial data */
  resetForm: () => void;
  /** Set entire form data (useful for edit mode) */
  setFormData: React.Dispatch<React.SetStateAction<T>>;
  /** Check if form has been modified */
  isDirty: boolean;
}

export function useFormData<T extends Record<string, any>>(
  options: UseFormDataOptions<T>
): UseFormDataReturn<T> {
  const { initialData, onChange, transform } = options;

  const [formData, setFormData] = useState<T>(initialData);
  const [initialSnapshot] = useState<T>(initialData);

  /**
   * Update a single field with optional transformation
   */
  const handleChange = useCallback(
    <K extends keyof T>(field: K, value: T[K]) => {
      setFormData((prev) => {
        // Apply transformation if defined for this field
        const transformedValue = transform?.[field] ? transform[field](value) : value;

        const newData = {
          ...prev,
          [field]: transformedValue,
        };

        // Call onChange callback if provided
        onChange?.(newData);

        return newData;
      });
    },
    [onChange, transform]
  );

  /**
   * Update multiple fields at once
   */
  const updateFields = useCallback(
    (updates: Partial<T>) => {
      setFormData((prev) => {
        const newData = { ...prev };

        // Apply updates with transformations
        Object.entries(updates).forEach(([key, value]) => {
          const field = key as keyof T;
          newData[field] = transform?.[field] ? transform[field](value) : (value as T[keyof T]);
        });

        // Call onChange callback if provided
        onChange?.(newData);

        return newData;
      });
    },
    [onChange, transform]
  );

  /**
   * Reset form to initial data
   */
  const resetForm = useCallback(() => {
    setFormData(initialData);
    onChange?.(initialData);
  }, [initialData, onChange]);

  /**
   * Check if form has been modified from initial state
   */
  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialSnapshot);

  return {
    formData,
    handleChange,
    updateFields,
    resetForm,
    setFormData,
    isDirty,
  };
}

/**
 * Common field transformations that can be reused
 */
export const fieldTransformers = {
  /** Trim whitespace from string */
  trimString: (value: string) => value.trim(),

  /** Parse to number, return 0 if invalid */
  toNumber: (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? 0 : num;
  },

  /** Parse to positive number */
  toPositiveNumber: (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) || num < 0 ? 0 : num;
  },

  /** Convert to boolean */
  toBoolean: (value: any) => Boolean(value),

  /** Lowercase string */
  toLowerCase: (value: string) => value.toLowerCase(),

  /** Uppercase string */
  toUpperCase: (value: string) => value.toUpperCase(),

  /** Remove special characters */
  alphanumeric: (value: string) => value.replace(/[^a-zA-Z0-9]/g, ''),

  /** Format as currency (remove non-numeric except decimal) */
  toCurrency: (value: string) => value.replace(/[^\d.]/g, ''),
};

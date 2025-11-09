import { createContext, useContext, type ReactNode } from 'react';
import type { FieldValues } from 'react-hook-form';
import type { FormConfig, FormContextValue } from '../../types/forms';
import { useObjectForm } from '../../hooks/useObjectForm';

const FormContext = createContext<FormContextValue | null>(null);

export function useFormContext<T extends FieldValues = FieldValues>(): FormContextValue<T> {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('useFormContext must be used within a FormProvider');
  }
  return context as FormContextValue<T>;
}

interface FormProviderProps<T extends FieldValues> {
  config: FormConfig<T>;
  children: ReactNode;
}

export function FormProvider<T extends FieldValues>({ config, children }: FormProviderProps<T>) {
  const { form, isLoading } = useObjectForm(config);

  const {
    formState: { errors, isDirty, isValid },
    watch,
  } = form;

  const formData = watch();

  const contextValue: FormContextValue<T> = {
    config,
    isSubmitting: isLoading,
    errors,
    isDirty,
    isValid,
    formData,
  };

  return <FormContext.Provider value={contextValue}>{children}</FormContext.Provider>;
}

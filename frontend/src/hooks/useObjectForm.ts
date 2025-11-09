import { useCallback, useMemo } from 'react';
import { useForm, type FieldPath, type FieldValues, type DefaultValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { FormConfig, ConditionalLogic, FormFieldConfig, FormHookReturn } from '../types/forms';

export function useObjectForm<T extends FieldValues>(config: FormConfig<T>): FormHookReturn<T> {
  const defaultValues = config.defaultValues as DefaultValues<T> | undefined;

  const form = useForm<T, any, T>({
    resolver: zodResolver(config.schema),
    defaultValues,
    mode: config.validation?.mode ?? 'onChange',
    reValidateMode: config.validation?.reValidateMode ?? 'onChange',
    shouldFocusError: config.validation?.shouldFocusError ?? true,
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
    reset,
    watch,
  } = form;

  const formData = watch();

  const submit = useCallback(async () => {
    try {
      await handleSubmit(async (data) => {
        await config.submission.onSubmit(data);
      })();
    } catch (error) {
      if (config.submission.onError) {
        config.submission.onError(error);
      } else {
        console.error('Form submission error:', error);
      }
    }
  }, [handleSubmit, config.submission]);

  const getFieldError = useCallback(
    (name: FieldPath<T>): string | undefined => {
      return form.getFieldState(name).error?.message as string | undefined;
    },
    [form]
  );

  const isFieldVisible = useCallback(
    (field: FormFieldConfig): boolean => {
      if (!field.conditional) return true;

      const { field: conditionField, operator, value } = field.conditional;
      const currentValue = formData[conditionField as keyof T];

      switch (operator) {
        case 'equals':
          return currentValue === value;
        case 'not_equals':
          return currentValue !== value;
        case 'contains':
          return Array.isArray(currentValue) && currentValue.includes(value);
        case 'greater_than':
          return Number(currentValue) > Number(value);
        case 'less_than':
          return Number(currentValue) < Number(value);
        default:
          return true;
      }
    },
    [formData]
  );

  const resetForm = useCallback(
    (data?: Partial<T>) => {
      reset((data ?? config.defaultValues ?? {}) as DefaultValues<T>);
    },
    [reset, config.defaultValues]
  );

  return {
    form,
    isLoading: isSubmitting || config.submission.loading || false,
    submit,
    reset: resetForm,
    getFieldError,
    isFieldVisible,
  };
}

export function useConditionalField<T extends FieldValues>(
  condition: ConditionalLogic,
  formData: T
): boolean {
  return useMemo(() => {
    const { field, operator, value } = condition;
    const currentValue = formData[field as keyof T];

    switch (operator) {
      case 'equals':
        return currentValue === value;
      case 'not_equals':
        return currentValue !== value;
      case 'contains':
        return Array.isArray(currentValue) && currentValue.includes(value);
      case 'greater_than':
        return Number(currentValue) > Number(value);
      case 'less_than':
        return Number(currentValue) < Number(value);
      default:
        return true;
    }
  }, [condition, formData]);
}

export function useFormValidation<T extends FieldValues>(schema: any, data: Partial<T>) {
  return useMemo(() => {
    try {
      schema.parse(data);
      return { isValid: true, errors: {} };
    } catch (error: any) {
      const errors: Record<string, string> = {};
      if (error.errors) {
        error.errors.forEach((err: any) => {
          const path = err.path.join('.');
          errors[path] = err.message;
        });
      }
      return { isValid: false, errors };
    }
  }, [schema, data]);
}

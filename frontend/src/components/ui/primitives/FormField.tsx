import { cloneElement, isValidElement, useId } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import type { ReactNode, ReactElement } from 'react';

export interface FormFieldProps {
  id?: string;
  labelKey: string;
  helperKey?: string;
  errorKey?: string;
  errorMessage?: string;
  required?: boolean;
  ariaDescription?: string;
  children: ReactNode;
  className?: string;
}

export const FormField = ({
  id,
  labelKey,
  helperKey,
  errorKey,
  errorMessage,
  required,
  ariaDescription,
  children,
  className,
}: FormFieldProps) => {
  const { t } = useTranslation('common');
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const helperId = helperKey ? `${fieldId}-helper` : undefined;
  const errorId = errorKey || errorMessage ? `${fieldId}-error` : undefined;
  const descriptionIds =
    [ariaDescription, helperId, errorId].filter(Boolean).join(' ') || undefined;

  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<{ id?: string; 'aria-describedby'?: string }>, {
        id: (children.props as { id?: string }).id ?? fieldId,
        'aria-describedby':
          clsx(
            (children.props as { 'aria-describedby'?: string })['aria-describedby'],
            descriptionIds
          ).trim() || undefined,
      })
    : children;

  return (
    <div className={clsx('flex flex-col gap-2', className)}>
      <label
        htmlFor={fieldId}
        className="text-sm font-medium text-text-primary dark:text-surface-default"
      >
        {t(labelKey)}
        {required ? (
          <span className="ml-1 text-danger-500" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>

      {control}

      {helperKey ? (
        <p id={helperId} className="text-xs text-text-muted">
          {t(helperKey)}
        </p>
      ) : null}

      {errorKey || errorMessage ? (
        <p id={errorId} className="text-xs text-danger-600">
          {errorKey ? t(errorKey) : errorMessage}
        </p>
      ) : null}
    </div>
  );
};

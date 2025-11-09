import { Controller, FieldValues, ControllerRenderProps, FieldPath } from 'react-hook-form';
import { FormFieldProps } from '../../types/forms';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { CurrencyField } from '../ui/CurrencyField';
import { TagInput } from '../ui/TagInput';
import { Calendar } from 'lucide-react';
import clsx from 'clsx';
import { Checkbox as UiCheckbox } from '../ui/Checkbox';
import { AccountIconSelector } from '../../features/finance/components/AccountIconSelector';
import { AccountTypeWithIcons } from '../../features/finance/components/AccountTypeWithIcons';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

export function FormField<T extends FieldValues>({
  name,
  control,
  error,
  config,
  disabled,
}: FormFieldProps<T>) {
  const { t } = useTranslation();

  // Helper to translate with proper namespace handling
  const translateKey = (key?: string, fallback?: string) => {
    if (!key) return fallback || '';

    // Check if key contains a namespace (e.g., "finance.budgets...")
    // Known namespaces: common, finance, settings, auth, shared
    const knownNamespaces = ['common', 'finance', 'settings', 'auth', 'shared'];
    const firstPart = key.split('.')[0];

    if (knownNamespaces.includes(firstPart)) {
      // Split namespace from key path
      const parts = key.split('.');
      const namespace = parts[0];
      const keyPath = parts.slice(1).join('.');
      return t(`${namespace}:${keyPath}`, { defaultValue: fallback || key });
    }

    return t(key, { defaultValue: fallback || key });
  };

  const renderField = useCallback(
    (field: ControllerRenderProps<T, FieldPath<T>>) => {
      const placeholder = translateKey(config.placeholderKey, config.placeholder);

      const commonProps = {
        disabled: disabled || config.disabled,
        placeholder,
        className: config.className,
      };

      switch (config.type) {
        case 'input':
        case 'email':
        case 'password':
          return (
            <Input
              {...commonProps}
              type={config.type === 'input' ? 'text' : config.type}
              {...field}
            />
          );

        case 'number':
          return (
            <Input
              {...commonProps}
              type="number"
              step={config.step}
              min={config.min}
              max={config.max}
              {...field}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                field.onChange(Number(e.target.value))
              }
              className={clsx(
                commonProps.className,
                // Hide default number input arrows with Tailwind utilities
                '[&::-webkit-outer-spin-button]:appearance-none',
                '[&::-webkit-inner-spin-button]:appearance-none',
                '[&::-webkit-inner-spin-button]:m-0',
                '[appearance:textfield]' // For Firefox
              )}
            />
          );

        case 'textarea':
          return (
            <textarea
              {...commonProps}
              rows={config.rows || 3}
              className={clsx(
                'min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
                'placeholder:text-muted-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                'disabled:cursor-not-allowed disabled:opacity-50',
                'transition-colors duration-200',
                'border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white',
                'hover:border-gray-400 dark:hover:border-gray-500',
                'focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500/20',
                config.className
              )}
              {...field}
            />
          );

        case 'select':
          // Translate option labels and descriptions
          const translatedOptions = (config.options || []).map((option) => ({
            ...option,
            label: translateKey(option.labelKey, option.label),
            description: translateKey(option.descriptionKey, option.description),
          }));

          return (
            <Select
              {...commonProps}
              options={translatedOptions}
              value={field.value}
              onChange={(value: string | number) => field.onChange(value)}
            />
          );

        case 'checkbox':
          const checkboxLabel = translateKey(config.labelKey, config.label);
          const checkboxDescription = translateKey(config.descriptionKey, config.description);
          return (
            <UiCheckbox
              label={checkboxLabel || ''}
              description={checkboxDescription}
              checked={!!field.value}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                field.onChange(event.target.checked)
              }
              disabled={disabled || config.disabled}
            />
          );

        case 'radio':
          return (
            <div>
              {config.options?.map((option, index) => {
                const optionLabel = translateKey(option.labelKey, option.label);
                const optionDescription = translateKey(option.descriptionKey, option.description);

                return (
                  <label
                    key={option.value}
                    className={`flex items-start space-x-4 cursor-pointer group p-4 rounded-lg border-2 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 ${index > 0 ? 'mt-4' : ''}`}
                  >
                    <div className="relative flex items-center justify-center mt-0.5">
                      <input
                        type="radio"
                        value={option.value}
                        className="h-5 w-5 border-2 border-gray-300 bg-white text-blue-600 focus:ring-blue-500 focus:ring-offset-0 focus:ring-2 transition-all duration-200 dark:border-gray-500 dark:bg-gray-700 checked:border-blue-600 checked:bg-blue-600 hover:border-blue-400 dark:hover:border-blue-400"
                        disabled={disabled || config.disabled || option.disabled}
                        checked={field.value === option.value}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          if (e.target.checked) {
                            field.onChange(option.value);
                          }
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                          {optionLabel}
                        </span>
                      </div>
                      {optionDescription && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {optionDescription}
                        </p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          );

        case 'currency':
          return <CurrencyField {...commonProps} {...field} />;

        case 'file':
          return (
            <input
              type="file"
              accept={config.accept}
              multiple={config.multiple}
              disabled={disabled || config.disabled}
              className={clsx(
                'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
                'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
                'placeholder:text-muted-foreground cursor-pointer',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                'disabled:cursor-not-allowed disabled:opacity-50',
                'border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white',
                'hover:border-gray-400 dark:hover:border-gray-500',
                config.className
              )}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const files = Array.from(e.target.files || []);
                field.onChange(config.multiple ? files : files[0]);
              }}
            />
          );

        case 'date':
          return (
            <div className="relative">
              <>
                <style jsx>{`
                  .hide-calendar-icon::-webkit-calendar-picker-indicator {
                    opacity: 0;
                    position: absolute;
                    right: 0;
                    width: 100%;
                    height: 100%;
                    cursor: pointer;
                  }
                `}</style>
                <Input
                  {...commonProps}
                  type="date"
                  {...field}
                  className={clsx(
                    commonProps.className,
                    'pr-10', // Add padding for calendar icon
                    'hide-calendar-icon',
                    // Hide default date picker icon in WebKit browsers
                    '[-webkit-appearance:none]',
                    // Hide default date picker icon in Firefox
                    '[-moz-appearance:textfield]'
                  )}
                />
              </>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              </div>
            </div>
          );

        case 'custom':
          if (config.renderer === 'account-icon-selector') {
            return (
              <AccountIconSelector
                value={field.value}
                onChange={(val: string) => field.onChange(val)}
                defaultOptions={(config.props as any)?.defaultOptions || []}
                bankSuggestions={(config.props as any)?.bankSuggestions || []}
                onSelectBankIcon={(config.props as any)?.onSelectBankIcon}
              />
            );
          }
          if (config.renderer === 'account-type-with-icons') {
            return (
              <AccountTypeWithIcons
                value={field.value}
                onChange={(val: string) => field.onChange(val)}
                accountTypeOptions={(config.props as any)?.accountTypeOptions || []}
                defaultIconOptions={(config.props as any)?.defaultIconOptions || []}
                bankSuggestions={(config.props as any)?.bankSuggestions || []}
                onSelectBankIcon={(config.props as any)?.onSelectBankIcon}
              />
            );
          }
          return null;

        case 'tags':
          return (
            <TagInput
              tags={field.value || []}
              onTagsChange={field.onChange}
              disabled={disabled || config.disabled}
              placeholder={config.placeholder}
            />
          );

        default:
          return <Input {...commonProps} {...field} />;
      }
    },
    [config, disabled, t]
  );

  const label = translateKey(config.labelKey, config.label);
  const description = translateKey(config.descriptionKey, config.description);

  // Check if horizontal layout is requested
  const isHorizontalLayout = config.layout === 'horizontal';

  return (
    <div
      className={clsx(
        isHorizontalLayout ? 'flex items-center gap-4' : 'space-y-1.5',
        config.className
      )}
    >
      {config.type !== 'checkbox' && config.type !== 'radio' && (
        <div className={isHorizontalLayout ? 'min-w-[140px]' : ''}>
          <label
            className={clsx(
              'block text-sm font-medium text-gray-900 dark:text-gray-100',
              !isHorizontalLayout && 'mb-1'
            )}
          >
            {label}
            {config.validation?.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {description && !isHorizontalLayout && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1.5">{description}</p>
          )}
        </div>
      )}

      {config.type === 'radio' && (
        <div className="mb-2">
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
            {label}
            {config.validation?.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {description && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1.5">{description}</p>
          )}
        </div>
      )}

      <div className={isHorizontalLayout ? 'flex-1' : ''}>
        <Controller
          name={name}
          control={control}
          rules={config.validation as any}
          render={({ field }) => renderField(field) as React.ReactElement}
        />

        {error && (
          <p className="text-xs text-red-600 dark:text-red-400 font-medium mt-1">
            {error?.message || 'Invalid input'}
          </p>
        )}
        {description && isHorizontalLayout && (
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{description}</p>
        )}
      </div>
    </div>
  );
}

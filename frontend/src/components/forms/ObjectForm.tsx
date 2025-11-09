import { useState, useEffect, type FormEvent } from 'react';
import type { FieldPath, FieldValues } from 'react-hook-form';
import type { FormConfig } from '../../types/forms';
import { useObjectForm } from '../../hooks/useObjectForm';
import { FormField } from './FormField';
import { Button } from '../ui/Button';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useFormContext } from '../../contexts/FormContext';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

interface ObjectFormProps<T extends FieldValues> {
  config: FormConfig<T>;
  className?: string;
}

export function ObjectForm<T extends FieldValues>({ config, className }: ObjectFormProps<T>) {
  const { form, isLoading, submit, isFieldVisible } = useObjectForm(config);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { setFormDirty } = useFormContext();
  const { t } = useTranslation();

  const {
    control,
    formState: { isDirty },
    getFieldState,
  } = form;

  // Helper to translate with proper namespace handling
  const translateKey = (key?: string, fallback?: string) => {
    if (!key) return fallback || '';

    // Check if key contains a namespace (e.g., "finance.budgets...")
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

  // Get translated text or fallback to default
  const title = translateKey(config.titleKey, config.title);
  const description = translateKey(config.descriptionKey, config.description);
  const submitText = translateKey(
    config.submission.submitTextKey,
    config.submission.submitText || 'Submit'
  );
  const cancelText = translateKey(
    config.submission.cancelTextKey,
    config.submission.cancelText || 'Cancel'
  );

  useEffect(() => {
    setFormDirty(isDirty);
  }, [isDirty, setFormDirty]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await submit();
      setFormDirty(false);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  // Compact spacing tokens
  const layoutClasses = {
    vertical: 'space-y-4',
    horizontal: 'space-y-3 sm:space-y-0 sm:space-x-4 sm:flex sm:items-end',
    grid: 'grid grid-cols-1 md:grid-cols-2 gap-4',
    inline: 'flex flex-wrap gap-3 items-end',
    profile: 'grid grid-cols-1 md:grid-cols-2 gap-4',
  } as const;

  const isProfileLayout = config.layout === 'profile';

  const renderField = (fieldConfig: (typeof config.fields)[number]) => (
    <FormField
      key={fieldConfig.name}
      name={fieldConfig.name as FieldPath<T>}
      control={control}
      error={getFieldState(fieldConfig.name as FieldPath<T>).error}
      config={fieldConfig}
      disabled={isLoading || config.submission.disabled}
    />
  );

  if (isProfileLayout) {
    return (
      <form onSubmit={handleSubmit} className={clsx('w-full', className, config.className)}>
        {config.showHeader !== false && title && (
          <div className="mb-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
            {description && (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{description}</p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {config.fields.filter(isFieldVisible).map((fieldConfig) => {
            const isFullWidth =
              fieldConfig.type === 'textarea' ||
              fieldConfig.type === 'email' ||
              fieldConfig.name === 'full_name' ||
              fieldConfig.name === 'website' ||
              fieldConfig.name === 'bio' ||
              fieldConfig.className?.includes('col-span-full');

            return (
              <div
                key={fieldConfig.name}
                className={isFullWidth ? 'md:col-span-2' : 'md:col-span-1'}
              >
                <FormField
                  name={fieldConfig.name as FieldPath<T>}
                  control={control}
                  error={getFieldState(fieldConfig.name as FieldPath<T>).error}
                  config={fieldConfig}
                  disabled={isLoading || config.submission.disabled}
                />
              </div>
            );
          })}
        </div>

        {config.advancedFields && config.advancedFields.length > 0 && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowAdvanced((prev) => !prev)}
              className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              {showAdvanced ? (
                <ChevronDown className="w-4 h-4 mr-1.5" />
              ) : (
                <ChevronRight className="w-4 h-4 mr-1.5" />
              )}
              {t('moreOptions', 'More Options')}
            </button>

            {showAdvanced && (
              <div className="mt-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {config.advancedFields.filter(isFieldVisible).map((fieldConfig) => {
                    const isFullWidth =
                      fieldConfig.type === 'textarea' ||
                      fieldConfig.className?.includes('col-span-full');

                    return (
                      <div
                        key={fieldConfig.name}
                        className={isFullWidth ? 'md:col-span-2' : 'md:col-span-1'}
                      >
                        <FormField
                          name={fieldConfig.name as FieldPath<T>}
                          control={control}
                          error={getFieldState(fieldConfig.name as FieldPath<T>).error}
                          config={fieldConfig}
                          disabled={isLoading || config.submission.disabled}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
          {config.submission.onCancel && (
            <Button
              type="button"
              variant="ghost"
              onClick={config.submission.onCancel}
              disabled={isLoading}
            >
              {cancelText}
            </Button>
          )}
          <Button
            type="submit"
            variant="primary"
            loading={isLoading}
            disabled={config.submission.disabled}
            className={config.submission.className}
          >
            {submitText}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={clsx('w-full', className, config.className)}>
      {config.showHeader !== false && title && (
        <div className="mb-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{description}</p>
          )}
        </div>
      )}

      <div className={clsx(config.layout ? layoutClasses[config.layout] : layoutClasses.vertical)}>
        {config.fields.filter(isFieldVisible).map((fieldConfig) => renderField(fieldConfig))}
      </div>

      {config.advancedFields && config.advancedFields.length > 0 && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowAdvanced((prev) => !prev)}
            className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            {showAdvanced ? (
              <ChevronDown className="w-4 h-4 mr-1.5" />
            ) : (
              <ChevronRight className="w-4 h-4 mr-1.5" />
            )}
            {t('moreOptions', 'More Options')}
          </button>

          {showAdvanced && (
            <div className="mt-3 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
              {config.advancedFields
                .filter(isFieldVisible)
                .map((fieldConfig) => renderField(fieldConfig))}
            </div>
          )}
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
        {config.submission.onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={config.submission.onCancel}
            size="md"
            disabled={isLoading}
          >
            {cancelText}
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          loading={isLoading}
          size="md"
          disabled={config.submission.disabled}
          className={config.submission.className}
        >
          {submitText}
        </Button>
      </div>
    </form>
  );
}

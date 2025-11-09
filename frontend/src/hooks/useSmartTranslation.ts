/**
 * Custom i18n Hooks - 2025 Modern Approach
 * Reusable translation utilities with fallback support
 *
 * Benefits:
 * - Centralized translation logic
 * - Type-safe translations
 * - Automatic fallback handling
 * - Namespace management
 * - Reduced code duplication
 */

import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';

/**
 * Translation config for components
 */
export interface TranslationConfig {
  key?: string;
  fallback?: string;
  values?: Record<string, any>;
  namespace?: string;
}

/**
 * Multi-field translation config
 */
export interface MultiTranslationConfig {
  title?: TranslationConfig;
  message?: TranslationConfig;
  confirmText?: TranslationConfig;
  cancelText?: TranslationConfig;
  [key: string]: TranslationConfig | undefined;
}

/**
 * Enhanced useTranslation hook with smart fallbacks
 */
export const useSmartTranslation = (defaultNamespace = 'common') => {
  const { t, i18n } = useTranslation(defaultNamespace);

  /**
   * Translate with automatic fallback
   */
  const translate = (config: TranslationConfig): string => {
    if (!config.key && !config.fallback) return '';

    if (!config.key) return config.fallback || '';

    return t(config.key, {
      defaultValue: config.fallback || config.key,
      ...config.values,
    });
  };

  /**
   * Translate multiple fields at once
   */
  const translateMultiple = <T extends MultiTranslationConfig>(
    configs: T
  ): Record<keyof T, string> => {
    const result: any = {};

    for (const [key, config] of Object.entries(configs)) {
      if (config) {
        result[key] = translate(config);
      }
    }

    return result;
  };

  /**
   * Get translation with namespace
   */
  const translateNS = (namespace: string, key: string, fallback?: string) => {
    return t(`${namespace}:${key}`, { defaultValue: fallback || key });
  };

  return {
    t,
    translate,
    translateMultiple,
    translateNS,
    language: i18n.language,
    changeLanguage: i18n.changeLanguage,
  };
};

/**
 * Hook specifically for dialog/modal translations
 * Provides standard dialog text with sensible defaults
 */
export const useDialogTranslations = (namespace = 'common') => {
  const { translate } = useSmartTranslation(namespace);

  const getDialogTexts = (config: {
    title?: string;
    titleKey?: string;
    message?: string;
    messageKey?: string;
    confirmText?: string;
    confirmTextKey?: string;
    cancelText?: string;
    cancelTextKey?: string;
    messageValues?: Record<string, any>;
  }) => ({
    title: translate({
      key: config.titleKey,
      fallback: config.title || '',
    }),
    message: translate({
      key: config.messageKey,
      fallback: config.message || '',
      values: config.messageValues,
    }),
    confirmText: translate({
      key: config.confirmTextKey,
      fallback: config.confirmText || 'Confirm',
    }),
    cancelText: translate({
      key: config.cancelTextKey,
      fallback: config.cancelText || 'Cancel',
    }),
  });

  return { getDialogTexts };
};

/**
 * Hook for form field translations
 */
export const useFormTranslations = (namespace = 'common') => {
  const { translate } = useSmartTranslation(namespace);

  const getFieldTexts = ({
    label,
    labelKey,
    placeholder,
    placeholderKey,
    description,
    descriptionKey,
    error,
    errorKey,
  }: {
    label?: string;
    labelKey?: string;
    placeholder?: string;
    placeholderKey?: string;
    description?: string;
    descriptionKey?: string;
    error?: string;
    errorKey?: string;
  }) => ({
    label: translate({ key: labelKey, fallback: label }),
    placeholder: translate({ key: placeholderKey, fallback: placeholder }),
    description: translate({ key: descriptionKey, fallback: description }),
    error: translate({ key: errorKey, fallback: error }),
  });

  return { getFieldTexts };
};

/**
 * Hook for button/action translations
 */
export const useActionTranslations = (namespace = 'common') => {
  const { translate } = useSmartTranslation(namespace);

  const commonActions = useMemo(
    () => ({
      save: translate({ key: 'actions.save', fallback: 'Save' }),
      cancel: translate({ key: 'actions.cancel', fallback: 'Cancel' }),
      delete: translate({ key: 'actions.delete', fallback: 'Delete' }),
      edit: translate({ key: 'actions.edit', fallback: 'Edit' }),
      create: translate({ key: 'actions.create', fallback: 'Create' }),
      update: translate({ key: 'actions.update', fallback: 'Update' }),
      confirm: translate({ key: 'actions.confirm', fallback: 'Confirm' }),
      close: translate({ key: 'actions.close', fallback: 'Close' }),
      submit: translate({ key: 'actions.submit', fallback: 'Submit' }),
      reset: translate({ key: 'actions.reset', fallback: 'Reset' }),
    }),
    [translate]
  );

  return { commonActions, translate };
};

/**
 * Utility to resolve translation key with namespace
 */
export const resolveTranslationKey = (key: string, namespace?: string): string => {
  if (!namespace) return key;

  // Check if key already has namespace
  const knownNamespaces = ['common', 'finance', 'settings', 'auth', 'shared'];
  const firstPart = key.split('.')[0];

  if (knownNamespaces.includes(firstPart)) {
    return key; // Already has namespace
  }

  return `${namespace}:${key}`;
};

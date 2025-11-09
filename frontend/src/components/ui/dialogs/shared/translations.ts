/**
 * Dialog Translation Helpers - 2025
 *
 * Centralized i18n logic for dialog components
 * Extracted from hooks/useSmartTranslation.ts to keep dialog-related code together
 */

import { useTranslation } from 'react-i18next';

// ============================================================
// TYPES
// ============================================================

interface DialogTextsInput {
  title?: string;
  titleKey?: string;
  message?: string;
  messageKey?: string;
  messageValues?: Record<string, any>;
  confirmText?: string;
  confirmTextKey?: string;
  cancelText?: string;
  cancelTextKey?: string;
}

interface DialogTexts {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
}

// ============================================================
// HOOK
// ============================================================

/**
 * Hook for dialog-specific translations with automatic fallbacks
 *
 * @example
 * const { getDialogTexts } = useDialogTranslations();
 * const texts = getDialogTexts({
 *   titleKey: 'modals.deleteConfirmation.title',
 *   messageKey: 'modals.deleteConfirmation.message',
 *   messageValues: { name: item.name }
 * });
 */
export function useDialogTranslations() {
  const { t } = useTranslation('common');

  function getDialogTexts(input: DialogTextsInput): DialogTexts {
    const {
      title,
      titleKey,
      message,
      messageKey,
      messageValues,
      confirmText,
      confirmTextKey,
      cancelText,
      cancelTextKey,
    } = input;

    return {
      title: titleKey ? t(titleKey, { defaultValue: title || '' }) : title || '',
      message: messageKey
        ? t(messageKey, { ...messageValues, defaultValue: message || '' })
        : message || '',
      confirmText: confirmTextKey
        ? t(confirmTextKey, { defaultValue: confirmText || 'Confirm' })
        : confirmText || t('actions.confirm', { defaultValue: 'Confirm' }),
      cancelText: cancelTextKey
        ? t(cancelTextKey, { defaultValue: cancelText || 'Cancel' })
        : cancelText || t('actions.cancel', { defaultValue: 'Cancel' }),
    };
  }

  return { getDialogTexts };
}

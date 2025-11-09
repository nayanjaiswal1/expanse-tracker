import type { ReactNode } from 'react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle, Description } from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { FormProvider, useFormContext } from '../../contexts/FormContext';
import { ConfirmDialog } from './ConfirmDialog';
import { Button } from './Button';
import { FlexBetween } from './Layout';
import { cva } from '../../utils/cva';

const modalVariants = cva(
  'relative w-full rounded-xl bg-white dark:bg-gray-900 shadow-2xl overflow-hidden border-0',
  {
    variants: {
      size: {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
        large: 'max-w-5xl',
      },
    },
    defaultVariants: { size: 'lg' },
  }
);

const headerVariants = cva('border-b border-gray-100 dark:border-gray-800', {
  variants: {
    density: {
      default: 'px-5 py-3',
      compact: 'px-4 py-2',
      none: 'px-4 py-2',
    },
  },
  defaultVariants: { density: 'compact' },
});

const contentVariants = cva('overflow-y-auto', {
  variants: {
    density: {
      default: 'px-5 py-4 max-h-[calc(95vh-160px)]',
      compact: 'px-4 py-3 max-h-[calc(95vh-140px)]',
      none: 'px-4 py-2 max-h-[calc(95vh-140px)]',
    },
  },
  defaultVariants: { density: 'compact' },
});

const UNSAVED_DEFAULT_KEYS = {
  title: 'modals.unsavedChanges.title',
  message: 'modals.unsavedChanges.message',
  confirm: 'modals.unsavedChanges.confirm',
  cancel: 'modals.unsavedChanges.cancel',
} as const;

type ModalDensity = 'default' | 'compact' | 'none';
type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'large';
type ModalVariant = 'modal' | 'fullscreen' | 'drawer-right' | 'drawer-left' | 'drawer-bottom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  titleKey?: string;
  children: ReactNode;
  size?: ModalSize;
  density?: ModalDensity;
  variant?: ModalVariant;
  closeOnBackdrop?: boolean;
  preventCloseOnUnsavedChanges?: boolean;
  subtitle?: ReactNode;
  subtitleKey?: string;
  showDefaultSubtitle?: boolean;
  unsavedTranslationKeys?: Partial<typeof UNSAVED_DEFAULT_KEYS>;
  namespace?: string;
  footer?: ReactNode;
  headerActions?: ReactNode; // Optional actions (buttons/icons) rendered on the right side of header
}

const ModalContent = ({
  isOpen,
  onClose,
  title,
  titleKey,
  children,
  size = 'lg',
  density = 'default',
  closeOnBackdrop = true,
  variant = 'modal',
  preventCloseOnUnsavedChanges = true,
  subtitle,
  subtitleKey,
  showDefaultSubtitle = true,
  unsavedTranslationKeys = {},
  namespace = 'common',
  footer,
  headerActions,
}: ModalProps) => {
  const { isDirty, resetFormState } = useFormContext();
  const { t } = useTranslation(namespace);
  const { t: tCommon } = useTranslation('common');
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);

  const hasUnsavedChanges = preventCloseOnUnsavedChanges && isDirty;

  const resolvedUnsavedKeys = useMemo(
    () => ({ ...UNSAVED_DEFAULT_KEYS, ...unsavedTranslationKeys }),
    [unsavedTranslationKeys]
  );

  const resolvedTitle = useMemo(
    () => (titleKey ? t(titleKey) : (title ?? '')),
    [titleKey, title, t]
  );

  const resolvedSubtitle = useMemo(
    () =>
      subtitleKey
        ? t(subtitleKey)
        : (subtitle ?? (showDefaultSubtitle ? tCommon('modals.defaultSubtitle') : null)),
    [subtitleKey, subtitle, showDefaultSubtitle, t, tCommon]
  );

  useEffect(() => {
    if (!isOpen) resetFormState();
  }, [isOpen, resetFormState]);

  const handleClose = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowUnsavedConfirm(true);
    } else {
      onClose();
    }
  }, [hasUnsavedChanges, onClose]);

  const handleConfirmClose = useCallback(() => {
    setShowUnsavedConfirm(false);
    onClose();
  }, [onClose]);

  const handleCancelClose = useCallback(() => {
    setShowUnsavedConfirm(false);
  }, []);

  return (
    <>
      <Dialog
        open={isOpen}
        onClose={closeOnBackdrop ? handleClose : () => {}}
        className="relative z-50"
      >
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-black/50 duration-300 ease-out data-[closed]:opacity-0"
        />

        <div
          className={
            variant === 'modal'
              ? 'fixed inset-0 flex items-center justify-center p-4 overflow-y-auto'
              : variant === 'fullscreen'
                ? 'fixed inset-0 flex items-stretch justify-center'
                : variant === 'drawer-right'
                  ? 'fixed inset-0 flex items-stretch justify-end'
                  : variant === 'drawer-left'
                    ? 'fixed inset-0 flex items-stretch justify-start'
                    : /* drawer-bottom */ 'fixed inset-0 flex items-end justify-center p-0'
          }
        >
          <DialogPanel
            transition
            className={(() => {
              const base = 'relative bg-white dark:bg-gray-900 shadow-2xl overflow-hidden border-0';
              if (variant === 'modal') {
                return `${modalVariants({ size })} duration-300 ease-out data-[closed]:scale-95 data-[closed]:opacity-0`;
              }
              if (variant === 'fullscreen') {
                return `${base} w-screen h-screen rounded-none duration-300 ease-out data-[closed]:opacity-0`;
              }
              if (variant === 'drawer-right' || variant === 'drawer-left') {
                const drawerWidth = {
                  sm: 'sm:max-w-sm',
                  md: 'sm:max-w-md',
                  lg: 'sm:max-w-lg',
                  xl: 'sm:max-w-xl',
                  large: 'sm:max-w-2xl',
                }[size];
                const rounded = variant === 'drawer-right' ? 'sm:rounded-l-xl' : 'sm:rounded-r-xl';
                return `${base} h-screen w-full ${drawerWidth} rounded-none ${rounded} duration-300 ease-out data-[closed]:translate-x-${variant === 'drawer-right' ? '4' : '-4'} data-[closed]:opacity-0`;
              }
              // drawer-bottom
              const bottomWidth = {
                sm: 'sm:max-w-md',
                md: 'sm:max-w-lg',
                lg: 'sm:max-w-2xl',
                xl: 'sm:max-w-4xl',
                large: 'sm:max-w-5xl',
              }[size];
              return `${base} w-full max-h-[85vh] ${bottomWidth} rounded-t-xl duration-300 ease-out data-[closed]:translate-y-4 data-[closed]:opacity-0`;
            })()}
          >
            <FlexBetween className={headerVariants({ density })}>
              <div>
                <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                  {resolvedTitle}
                </DialogTitle>
                {resolvedSubtitle && (
                  <Description className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {resolvedSubtitle}
                  </Description>
                )}
              </div>
              <div className="flex items-center gap-1">
                {headerActions}
                <Button
                  onClick={handleClose}
                  variant="icon-soft"
                  size="none"
                  className="rounded-lg p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                  aria-label={tCommon('modals.closeAria')}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </FlexBetween>

            <div className={contentVariants({ density })}>{children}</div>

            {footer && (
              <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
                {footer}
              </div>
            )}
          </DialogPanel>
        </div>
      </Dialog>

      <ConfirmDialog
        isOpen={showUnsavedConfirm}
        onClose={handleCancelClose}
        onConfirm={handleConfirmClose}
        titleKey={resolvedUnsavedKeys.title}
        messageKey={resolvedUnsavedKeys.message}
        confirmTextKey={resolvedUnsavedKeys.confirm}
        cancelTextKey={resolvedUnsavedKeys.cancel}
        variant="warning"
      />
    </>
  );
};

export const Modal = (props: ModalProps) => {
  return (
    <FormProvider>
      <ModalContent {...props} />
    </FormProvider>
  );
};

export default Modal;

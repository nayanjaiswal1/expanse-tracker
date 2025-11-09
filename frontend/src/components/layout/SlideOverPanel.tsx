import React, { useEffect } from 'react';
import clsx from 'clsx';
import { Button } from '../ui/Button';
import { Flex } from '../ui/Layout';

interface SlideOverPanelProps {
  title?: string;
  description?: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  widthClassName?: string;
  closeOnBackdrop?: boolean;
}

export const SlideOverPanel: React.FC<SlideOverPanelProps> = ({
  title,
  description,
  isOpen,
  onClose,
  children,
  widthClassName = 'max-w-md',
  closeOnBackdrop = true,
}) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  return (
    <>
      <div
        className={clsx(
          'fixed inset-0 z-[80] bg-gray-800/40 backdrop-blur-sm transition-opacity duration-300',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => closeOnBackdrop && onClose()}
      />

      <aside
        className={clsx(
          'fixed inset-y-0 right-0 z-[90] w-full',
          widthClassName,
          'transform transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        aria-hidden={!isOpen}
      >
        <div className="flex h-full flex-col bg-white shadow-xl ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
          <Flex
            align="start"
            justify="between"
            className="border-b border-gray-200 px-5 py-4 dark:border-gray-800"
          >
            <div className="min-w-0 flex-1">
              {title && (
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
              )}
            </div>
            <Button
              type="button"
              onClick={onClose}
              variant="icon-ghost"
              size="none"
              className="ml-4 flex h-8 w-8 items-center justify-center rounded-full"
              aria-label="Close panel"
            >
              ×
            </Button>
          </Flex>

          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        </div>
      </aside>
    </>
  );
};

export default SlideOverPanel;

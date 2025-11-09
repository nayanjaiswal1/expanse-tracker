import React, { useEffect, useState, createContext, useContext, useCallback } from 'react';
import { CheckCircle, AlertCircle, XCircle, Info, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { toastBus } from '../../utils/toastBus';

export interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  stackedCount?: number;
  isStacked?: boolean;
  stackIndex?: number;
  onClose: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({
  id,
  type,
  title,
  message,
  duration = 5000,
  stackedCount = 1,
  isStacked = false,
  stackIndex = 0,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [timerId, setTimerId] = useState<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Animate in only on first render
    if (!isVisible) {
      setTimeout(() => setIsVisible(true), 50);
    }
  }, []); // Only run once

  useEffect(() => {
    // Clear existing timer
    if (timerId) {
      clearTimeout(timerId);
    }

    // Set new timer
    const newTimer = setTimeout(() => {
      onClose(id);
    }, duration);

    setTimerId(newTimer);

    return () => {
      if (newTimer) {
        clearTimeout(newTimer);
      }
    };
  }, [duration, id, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'error':
        return <XCircle className="h-6 w-6 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-6 w-6 text-yellow-500" />;
      case 'info':
        return <Info className="h-6 w-6 text-blue-500" />;
      default:
        return <Info className="h-6 w-6 text-gray-500" />;
    }
  };

  const getColorClasses = () => {
    switch (type) {
      case 'success':
        return 'theme-notification-success';
      case 'error':
        return 'theme-notification-error';
      case 'warning':
        return 'theme-notification-warning';
      case 'info':
        return 'theme-notification-info';
      default:
        return 'theme-notification';
    }
  };

  return (
    <div className="relative">
      {/* Stack effect - background shadows */}
      {isStacked && stackedCount > 1 && stackIndex === 0 && (
        <>
          {stackedCount > 2 && (
            <div
              className={`absolute inset-0 max-w-sm w-full transform translate-x-1 -translate-y-1 opacity-60 theme-notification ${getColorClasses()} rounded-lg`}
              style={{ zIndex: -2 }}
            />
          )}
          <div
            className={`absolute inset-0 max-w-sm w-full transform translate-x-0.5 -translate-y-0.5 opacity-80 theme-notification ${getColorClasses()} rounded-lg`}
            style={{ zIndex: -1 }}
          />
        </>
      )}

      {/* Main toast */}
      <div
        className={`
          relative max-w-sm w-full transition-all duration-300 ease-out transform overflow-hidden
          theme-notification ${getColorClasses()}
          ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        `}
        role="alert"
        style={{
          zIndex: 10 - (stackIndex || 0),
          transform: isVisible
            ? `translateX(${(stackIndex || 0) * 4}px) translateY(${(stackIndex || 0) * -2}px)`
            : `translateX(100%) translateY(${(stackIndex || 0) * -2}px)`,
        }}
      >
        <div className="flex items-start p-4">
          <div className="flex-shrink-0">{getIcon()}</div>
          <div className="ml-4 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
              {isStacked && stackedCount > 1 && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  ({stackedCount} similar)
                </span>
              )}
            </div>
            {message && <p className="mt-1 text-xs text-gray-700 dark:text-gray-300">{message}</p>}
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <Button
              onClick={() => onClose(id)}
              variant="ghost"
              size="sm"
              aria-label="Close notification"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Toast Context and Hook
interface ToastContextType {
  addToast: (toast: Omit<ToastProps, 'id' | 'onClose'>) => void;
  removeToast: (id: string) => void;
  toasts: ToastProps[];
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
  ToastContainer: React.FC;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const addToast = useCallback((toast: Omit<ToastProps, 'id' | 'onClose'>) => {
    setToasts((prev) => {
      // Check for similar toasts (same type, title, and message)
      const similarToasts = prev.filter(
        (existingToast) =>
          existingToast.type === toast.type &&
          existingToast.title === toast.title &&
          existingToast.message === toast.message
      );

      const id = Math.random().toString(36).substr(2, 9);
      const stackIndex = similarToasts.length;
      const stackedCount = similarToasts.length + 1;

      // Update existing similar toasts to show stacking
      const updatedToasts = prev.map((existingToast) => {
        if (
          existingToast.type === toast.type &&
          existingToast.title === toast.title &&
          existingToast.message === toast.message
        ) {
          return {
            ...existingToast,
            stackedCount,
            isStacked: true,
          };
        }
        return existingToast;
      });

      // Add new toast
      const newToast: ToastProps = {
        ...toast,
        id,
        stackedCount,
        isStacked: stackedCount > 1,
        stackIndex,
        onClose: removeToast,
      };

      return [...updatedToasts, newToast];
    });
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => {
      const toastToRemove = prev.find((t) => t.id === id);
      if (!toastToRemove) return prev;

      const remainingToasts = prev.filter((toast) => toast.id !== id);

      // Update stack indices and counts for similar toasts
      const updatedToasts = remainingToasts.map((toast) => {
        if (
          toast.type === toastToRemove.type &&
          toast.title === toastToRemove.title &&
          toast.message === toastToRemove.message
        ) {
          const similarToasts = remainingToasts.filter(
            (t) => t.type === toast.type && t.title === toast.title && t.message === toast.message
          );

          const newStackIndex = similarToasts.indexOf(toast);
          const newStackedCount = similarToasts.length;

          return {
            ...toast,
            stackedCount: newStackedCount,
            isStacked: newStackedCount > 1,
            stackIndex: newStackIndex,
          };
        }
        return toast;
      });

      return updatedToasts;
    });
  }, []);

  const showSuccess = useCallback(
    (title: string, message?: string) => {
      addToast({ type: 'success', title, message });
    },
    [addToast]
  );

  const showError = useCallback(
    (title: string, message?: string) => {
      addToast({ type: 'error', title, message });
    },
    [addToast]
  );

  const showWarning = useCallback(
    (title: string, message?: string) => {
      addToast({ type: 'warning', title, message });
    },
    [addToast]
  );

  const showInfo = useCallback(
    (title: string, message?: string) => {
      addToast({ type: 'info', title, message });
    },
    [addToast]
  );

  useEffect(() => {
    const unsubscribe = toastBus.subscribe(({ type, title, message, duration }) => {
      addToast({ type, title, message, duration });
    });
    return unsubscribe;
  }, [addToast]);

  // Toast Container Component
  const ToastContainer: React.FC = useCallback(() => {
    return (
      <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm">
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} />
        ))}
      </div>
    );
  }, [toasts]);

  return (
    <ToastContext.Provider
      value={{
        addToast,
        removeToast,
        toasts,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        ToastContainer,
      }}
    >
      {children}
      {/* Built-in Toast Container */}
      <ToastContainer />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

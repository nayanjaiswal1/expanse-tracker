/**
 * useFormSubmission - Standardized form submission handling
 *
 * Replaces the repeated pattern of:
 * - isSubmitting state
 * - try-catch-finally blocks
 * - Error handling with toast
 * - Success callbacks
 *
 * Usage:
 * ```typescript
 * const { isSubmitting, handleSubmit } = useFormSubmission({
 *   onSubmit: async (data) => {
 *     await createMutation.mutateAsync(data);
 *   },
 *   onSuccess: () => {
 *     toast.success('Created successfully');
 *     onClose();
 *   },
 *   successMessage: 'Created successfully',
 *   errorMessage: 'Failed to create'
 * });
 * ```
 */

import { useState, useCallback } from 'react';
import { extractErrorMessage, logError } from '../utils/errorHandling';

export interface UseFormSubmissionOptions<TData = any> {
  /** Async function to execute on submit */
  onSubmit: (data: TData) => Promise<void> | void;
  /** Optional success callback */
  onSuccess?: () => void;
  /** Optional error callback */
  onError?: (error: unknown) => void;
  /** Optional finally callback (runs regardless of success/error) */
  onFinally?: () => void;
  /** Success message for toast (if using toast) */
  successMessage?: string;
  /** Error message prefix for toast */
  errorMessage?: string;
  /** Custom validation function */
  validate?: (data: TData) => string | null; // Returns error message or null
  /** Whether to show toast messages */
  showToast?: boolean;
  /** Custom toast function */
  toast?: {
    success: (message: string) => void;
    error: (title: string, message: string) => void;
  };
  /** Log context for debugging */
  logContext?: string;
}

export interface UseFormSubmissionReturn<TData = any> {
  /** Whether form is currently submitting */
  isSubmitting: boolean;
  /** Handle form submission */
  handleSubmit: (data: TData, event?: React.FormEvent) => Promise<void>;
  /** Submission error if any */
  error: string | null;
  /** Clear error */
  clearError: () => void;
}

export function useFormSubmission<TData = any>(
  options: UseFormSubmissionOptions<TData>
): UseFormSubmissionReturn<TData> {
  const {
    onSubmit,
    onSuccess,
    onError,
    onFinally,
    successMessage,
    errorMessage = 'Operation failed',
    validate,
    showToast = false,
    toast,
    logContext,
  } = options;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleSubmit = useCallback(
    async (data: TData, event?: React.FormEvent) => {
      // Prevent default form submission if event provided
      event?.preventDefault();

      // Clear previous error
      setError(null);

      // Run validation if provided
      if (validate) {
        const validationError = validate(data);
        if (validationError) {
          setError(validationError);
          if (showToast && toast) {
            toast.error('Validation Error', validationError);
          }
          return;
        }
      }

      // Start submitting
      setIsSubmitting(true);

      try {
        // Execute submission
        await onSubmit(data);

        // Call success callback
        onSuccess?.();

        // Show success toast if configured
        if (showToast && toast && successMessage) {
          toast.success(successMessage);
        }
      } catch (err) {
        // Extract error message
        const message = extractErrorMessage(err, errorMessage);
        setError(message);

        // Log error
        if (logContext) {
          logError(err, logContext);
        } else {
          console.error('Form submission error:', err);
        }

        // Call error callback
        onError?.(err);

        // Show error toast if configured
        if (showToast && toast) {
          toast.error(errorMessage, message);
        }
      } finally {
        // Always set submitting to false
        setIsSubmitting(false);

        // Call finally callback
        onFinally?.();
      }
    },
    [
      validate,
      onSubmit,
      onSuccess,
      onError,
      onFinally,
      successMessage,
      errorMessage,
      showToast,
      toast,
      logContext,
    ]
  );

  return {
    isSubmitting,
    handleSubmit,
    error,
    clearError,
  };
}

/**
 * useFormSubmissionWithToast - Convenience wrapper with toast built-in
 *
 * Usage:
 * ```typescript
 * const { isSubmitting, handleSubmit } = useFormSubmissionWithToast({
 *   onSubmit: async (data) => { ... },
 *   successMessage: 'Success!',
 *   errorMessage: 'Failed'
 * });
 * ```
 */
export function useFormSubmissionWithToast<TData = any>(
  options: Omit<UseFormSubmissionOptions<TData>, 'showToast' | 'toast'> & {
    toast: {
      success: (message: string) => void;
      error: (title: string, message: string) => void;
    };
  }
): UseFormSubmissionReturn<TData> {
  return useFormSubmission({
    ...options,
    showToast: true,
  });
}

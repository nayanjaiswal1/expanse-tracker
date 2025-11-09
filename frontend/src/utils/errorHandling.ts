/**
 * Utilities for handling API error responses and extracting user-friendly messages
 */

const DEFAULT_ERROR_MESSAGE = 'An unexpected error occurred. Please try again.';

interface APIError {
  error: {
    code: string;
    message: string;
    details?: {
      field_errors?: Record<string, string[]>;
    };
  };
}

// Type guard functions
function isAPIError(data: unknown): data is APIError {
  return typeof data === 'object' && data !== null && 'error' in data;
}

function hasProperty<T extends object, K extends string>(
  obj: T,
  prop: K
): obj is T & Record<K, unknown> {
  return prop in obj;
}

/**
 * Extract a user-friendly error message from API error responses
 * @param error - The error object from API calls
 * @returns A human-readable error message
 */
export function extractErrorMessage(error: unknown, fallback = DEFAULT_ERROR_MESSAGE): string {
  // Handle null/undefined errors
  if (!error || typeof error !== 'object') {
    return fallback;
  }

  const err = error as Record<string, unknown>;

  // Check if it's our standardized error format
  if (
    hasProperty(err, 'response') &&
    typeof err.response === 'object' &&
    err.response !== null &&
    hasProperty(err.response, 'data') &&
    isAPIError(err.response.data)
  ) {
    return err.response.data.error.message;
  }

  // Check for direct error message in response data
  if (
    hasProperty(err, 'response') &&
    typeof err.response === 'object' &&
    err.response !== null &&
    hasProperty(err.response, 'data') &&
    typeof err.response.data === 'object' &&
    err.response.data !== null &&
    hasProperty(err.response.data, 'message') &&
    typeof err.response.data.message === 'string'
  ) {
    return err.response.data.message;
  }

  // Check for error details in response data
  if (
    hasProperty(err, 'response') &&
    typeof err.response === 'object' &&
    err.response !== null &&
    hasProperty(err.response, 'data') &&
    typeof err.response.data === 'object' &&
    err.response.data !== null &&
    hasProperty(err.response.data, 'detail') &&
    typeof err.response.data.detail === 'string'
  ) {
    return err.response.data.detail;
  }

  // Handle legacy validation errors (before standardization)
  if (
    hasProperty(err, 'response') &&
    typeof err.response === 'object' &&
    err.response !== null &&
    hasProperty(err.response, 'data') &&
    typeof err.response.data === 'object' &&
    err.response.data !== null
  ) {
    const data = err.response.data;

    // Check for non_field_errors (common in DRF)
    if (
      hasProperty(data, 'non_field_errors') &&
      Array.isArray(data.non_field_errors) &&
      data.non_field_errors.length > 0
    ) {
      return String(data.non_field_errors[0]);
    }

    // Check for field-specific errors
    for (const [_field, fieldErrors] of Object.entries(data)) {
      if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
        // Return the first error for the first field
        return String(fieldErrors[0]);
      }
      if (typeof fieldErrors === 'string') {
        return fieldErrors;
      }
    }

    // If data is a string, return it
    if (typeof data === 'string') {
      return data;
    }
  }

  // Handle network errors or when response is not available
  if (hasProperty(err, 'message') && typeof err.message === 'string') {
    // Don't show technical network errors to users
    if (err.message.includes('Network Error') || err.message.includes('timeout')) {
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    }
    return err.message;
  }

  // Handle axios error codes
  if (hasProperty(err, 'code') && typeof err.code === 'string') {
    switch (err.code) {
      case 'ECONNABORTED':
        return 'Request timed out. Please try again.';
      case 'NETWORK_ERROR':
        return 'Network error. Please check your connection.';
      default:
        return 'An error occurred while processing your request.';
    }
  }

  // Handle HTTP status codes when no specific message is available
  if (
    hasProperty(err, 'response') &&
    typeof err.response === 'object' &&
    err.response !== null &&
    hasProperty(err.response, 'status') &&
    typeof err.response.status === 'number'
  ) {
    switch (err.response.status) {
      case 400:
        return 'Bad request. Please check your input and try again.';
      case 401:
        return 'Authentication required. Please log in.';
      case 403:
        return "Access denied. You don't have permission to perform this action.";
      case 404:
        return 'The requested resource was not found.';
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      case 500:
        return 'Server error. Please try again later.';
      case 502:
      case 503:
      case 504:
        return 'Service temporarily unavailable. Please try again later.';
      default:
        return `Request failed with status ${err.response.status}`;
    }
  }

  // Fallback for unknown error formats
  return fallback;
}

/**
 * Extract field-specific error messages from API error responses
 * @param error - The error object from API calls
 * @returns An object with field names as keys and error messages as values
 */
export function extractFieldErrors(error: unknown): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  if (!error || typeof error !== 'object') {
    return fieldErrors;
  }

  const err = error as Record<string, unknown>;

  // Check standardized error format
  if (
    hasProperty(err, 'response') &&
    typeof err.response === 'object' &&
    err.response !== null &&
    hasProperty(err.response, 'data') &&
    isAPIError(err.response.data) &&
    err.response.data.error.details?.field_errors
  ) {
    const errors = err.response.data.error.details.field_errors;
    for (const [field, fieldErrorList] of Object.entries(errors)) {
      if (Array.isArray(fieldErrorList) && fieldErrorList.length > 0) {
        fieldErrors[field] = String(fieldErrorList[0]);
      } else if (typeof fieldErrorList === 'string') {
        fieldErrors[field] = fieldErrorList;
      }
    }
    return fieldErrors;
  }

  // Handle legacy format
  if (
    hasProperty(err, 'response') &&
    typeof err.response === 'object' &&
    err.response !== null &&
    hasProperty(err.response, 'data') &&
    typeof err.response.data === 'object' &&
    err.response.data !== null
  ) {
    const data = err.response.data;
    for (const [field, fieldErrorList] of Object.entries(data)) {
      if (field !== 'detail' && field !== 'message' && field !== 'error') {
        if (Array.isArray(fieldErrorList) && fieldErrorList.length > 0) {
          fieldErrors[field] = String(fieldErrorList[0]);
        } else if (typeof fieldErrorList === 'string') {
          fieldErrors[field] = fieldErrorList;
        }
      }
    }
  }

  return fieldErrors;
}

/**
 * Check if an error is an authentication error
 * @param error - The error object from API calls
 * @returns True if the error is authentication-related
 */
export function isAuthenticationError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const err = error as Record<string, unknown>;

  if (
    hasProperty(err, 'response') &&
    typeof err.response === 'object' &&
    err.response !== null &&
    hasProperty(err.response, 'status') &&
    err.response.status === 401
  ) {
    return true;
  }

  if (
    hasProperty(err, 'response') &&
    typeof err.response === 'object' &&
    err.response !== null &&
    hasProperty(err.response, 'data') &&
    isAPIError(err.response.data) &&
    (err.response.data.error.code === 'AUTHENTICATION_ERROR' ||
      err.response.data.error.code === 'UNAUTHORIZED')
  ) {
    return true;
  }

  return false;
}

/**
 * Check if an error is a validation error
 * @param error - The error object from API calls
 * @returns True if the error is validation-related
 */
export function isValidationError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const err = error as Record<string, unknown>;

  if (
    hasProperty(err, 'response') &&
    typeof err.response === 'object' &&
    err.response !== null &&
    hasProperty(err.response, 'status') &&
    err.response.status === 400
  ) {
    return true;
  }

  if (
    hasProperty(err, 'response') &&
    typeof err.response === 'object' &&
    err.response !== null &&
    hasProperty(err.response, 'data') &&
    isAPIError(err.response.data) &&
    err.response.data.error.code === 'VALIDATION_ERROR'
  ) {
    return true;
  }

  return false;
}

/**
 * Get error code from API error response
 * @param error - The error object from API calls
 * @returns The error code string
 */
export function getErrorCode(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return 'UNKNOWN_ERROR';
  }

  const err = error as Record<string, unknown>;

  if (
    hasProperty(err, 'response') &&
    typeof err.response === 'object' &&
    err.response !== null &&
    hasProperty(err.response, 'data') &&
    isAPIError(err.response.data)
  ) {
    return err.response.data.error.code;
  }

  return 'UNKNOWN_ERROR';
}

/**
 * Check if error is a network error (no internet, timeout, etc.)
 * @param error - The error object from API calls
 * @returns True if the error is network-related
 */
export function isNetworkError(error: unknown): boolean {
  const err = error as any;
  return (
    err?.code === 'ECONNABORTED' ||
    err?.code === 'ERR_NETWORK' ||
    err?.message?.includes('Network Error') ||
    err?.message?.includes('timeout') ||
    !navigator.onLine
  );
}

/**
 * Check if error is a server error (500+)
 * @param error - The error object from API calls
 * @returns True if the error is a server error
 */
export function isServerError(error: unknown): boolean {
  const err = error as any;
  const status = err?.response?.status;
  return status >= 500;
}

/**
 * Get user-friendly error title based on error type
 * @param error - The error object from API calls
 * @returns Error title string
 */
export function getErrorTitle(error: unknown): string {
  if (isNetworkError(error)) {
    return 'Connection Error';
  }
  if (isAuthenticationError(error)) {
    return 'Authentication Error';
  }
  if (isValidationError(error)) {
    return 'Validation Error';
  }
  if (isServerError(error)) {
    return 'Server Error';
  }
  return 'Error';
}

/**
 * Get suggested action for user based on error type
 * @param error - The error object from API calls
 * @returns Suggested action string or undefined
 */
export function getErrorAction(error: unknown): string | undefined {
  if (isNetworkError(error)) {
    return 'Please check your internet connection and try again.';
  }
  if (isAuthenticationError(error)) {
    return 'Please log in again to continue.';
  }
  if (isValidationError(error)) {
    return 'Please check your input and try again.';
  }
  if (isServerError(error)) {
    return 'Please try again later. If the problem persists, contact support.';
  }
  return undefined;
}

/**
 * Log error with context (for debugging)
 * @param error - Error to log
 * @param context - Additional context (component name, action, etc.)
 */
export function logError(error: unknown, context?: string): void {
  const message = extractErrorMessage(error);
  const code = getErrorCode(error);

  console.error(`[Error${context ? ` - ${context}` : ''}]:`, {
    message,
    code,
    error,
  });
}

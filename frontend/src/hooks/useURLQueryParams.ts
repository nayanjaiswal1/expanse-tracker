import { useSearchParams } from 'react-router-dom';
import { useCallback, useMemo } from 'react';

/**
 * Generic hook for managing URL-based query parameters
 * Handles parsing, validation, and updates of URL search params
 *
 * @example
 * const { params, setParam, setParams, getParam, clearParams } = useURLQueryParams({
 *   defaults: { page: '1', page_size: '25' }
 * });
 */

export interface URLQueryConfig {
  defaults?: Record<string, string | number | boolean>;
  validate?: (key: string, value: string) => boolean;
}

export function useURLQueryParams(config: URLQueryConfig = {}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { defaults = {}, validate } = config;

  // Parse and return current parameters
  const params = useMemo(() => {
    const result: Record<string, string> = {};

    // Get all params from URL
    searchParams.forEach((value, key) => {
      result[key] = value;
    });

    // Apply defaults for missing params
    Object.entries(defaults).forEach(([key, value]) => {
      if (!result[key]) {
        result[key] = String(value);
      }
    });

    return result;
  }, [searchParams, defaults]);

  // Set a single parameter
  const setParam = useCallback(
    (key: string, value: string | number | boolean | null) => {
      const newParams = new URLSearchParams(searchParams);

      if (value === null || value === '') {
        newParams.delete(key);
      } else {
        const strValue = String(value);
        if (!validate || validate(key, strValue)) {
          newParams.set(key, strValue);
        }
      }

      setSearchParams(newParams);
    },
    [searchParams, setSearchParams, validate]
  );

  // Set multiple parameters at once
  const setParams = useCallback(
    (updates: Record<string, string | number | boolean | null>) => {
      const newParams = new URLSearchParams(searchParams);

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === '') {
          newParams.delete(key);
        } else {
          const strValue = String(value);
          if (!validate || validate(key, strValue)) {
            newParams.set(key, strValue);
          }
        }
      });

      setSearchParams(newParams);
    },
    [searchParams, setSearchParams, validate]
  );

  // Get a single parameter
  const getParam = useCallback(
    (key: string, fallback?: string) => {
      const value = searchParams.get(key);
      if (value) return value;
      if (defaults[key]) return String(defaults[key]);
      return fallback || null;
    },
    [searchParams, defaults]
  );

  // Clear all parameters (except defaults)
  const clearParams = useCallback(() => {
    const newParams = new URLSearchParams();
    Object.entries(defaults).forEach(([key, value]) => {
      newParams.set(key, String(value));
    });
    setSearchParams(newParams);
  }, [setSearchParams, defaults]);

  // Check if parameter exists
  const hasParam = useCallback((key: string) => searchParams.has(key), [searchParams]);

  // Remove a parameter
  const removeParam = useCallback(
    (key: string) => {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete(key);
      setSearchParams(newParams);
    },
    [searchParams, setSearchParams]
  );

  return {
    params,
    setParam,
    setParams,
    getParam,
    clearParams,
    hasParam,
    removeParam,
    searchParams,
  };
}

export default useURLQueryParams;

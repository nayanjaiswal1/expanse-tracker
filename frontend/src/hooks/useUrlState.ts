import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export type UrlStateValue = string | number | boolean | string[] | number[] | undefined | null;

export type UrlStateOptions = {
  defaultValue?: UrlStateValue;
  serialize?: (value: UrlStateValue) => string;
  deserialize?: (value: string) => UrlStateValue;
  debounceMs?: number;
};

/**
 * Hook for managing state that is synchronized with URL search parameters
 */
export function useUrlState<T extends UrlStateValue>(
  key: string,
  options: UrlStateOptions = {}
): [T, (value: T | ((prev: T) => T)) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const { defaultValue, serialize, deserialize } = options;

  const value = useMemo(() => {
    const param = searchParams.get(key);

    if (param === null) {
      return defaultValue as T;
    }

    if (deserialize) {
      return deserialize(param) as T;
    }

    // Default deserialization logic
    try {
      return JSON.parse(param) as T;
    } catch {
      return param as T;
    }
  }, [searchParams, key, defaultValue, deserialize]);

  const setValue = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      const actualValue =
        typeof newValue === 'function' ? (newValue as (prev: T) => T)(value) : newValue;

      setSearchParams(
        (prev: any) => {
          const newParams = new URLSearchParams(
            prev instanceof URLSearchParams ? prev : new URLSearchParams(prev)
          );

          if (actualValue === undefined || actualValue === null || actualValue === defaultValue) {
            newParams.delete(key);
          } else {
            const serializedValue = serialize
              ? serialize(actualValue)
              : typeof actualValue === 'string'
                ? actualValue
                : JSON.stringify(actualValue);

            newParams.set(key, serializedValue);
          }

          return newParams;
        },
        { replace: true }
      );
    },
    [key, value, defaultValue, serialize, setSearchParams]
  );

  return [value, setValue];
}

/**
 * Utility functions for common serialization/deserialization patterns
 */
export const urlStateSerializers = {
  array: {
    serialize: (value: UrlStateValue) => (Array.isArray(value) ? value.join(',') : ''),
    deserialize: (value: string) => (value ? value.split(',').filter(Boolean) : []),
  },

  numberArray: {
    serialize: (value: UrlStateValue) => (Array.isArray(value) ? value.map(String).join(',') : ''),
    deserialize: (value: string) =>
      value
        ? value
            .split(',')
            .map(Number)
            .filter((n) => !isNaN(n))
        : [],
  },

  boolean: {
    serialize: (value: UrlStateValue) => (value ? 'true' : 'false'),
    deserialize: (value: string) => value === 'true',
  },

  number: {
    serialize: (value: UrlStateValue) => String(value),
    deserialize: (value: string) => {
      const num = Number(value);
      return isNaN(num) ? undefined : num;
    },
  },

  date: {
    serialize: (value: UrlStateValue) =>
      value instanceof Date ? value.toISOString().split('T')[0] : String(value),
    deserialize: (value: string) => value || undefined,
  },
};

/**
 * Hook for managing multiple URL state values at once
 */
export function useUrlStateObject<T extends Record<string, UrlStateValue>>(
  stateConfig: Record<keyof T, UrlStateOptions>
): [T, (updates: Partial<T>) => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  const state = useMemo(() => {
    const result = {} as T;

    for (const [key, options] of Object.entries(stateConfig)) {
      const param = searchParams.get(key);
      const { defaultValue, deserialize } = options;

      if (param === null) {
        result[key as keyof T] = defaultValue as T[keyof T];
      } else if (deserialize) {
        result[key as keyof T] = deserialize(param) as T[keyof T];
      } else {
        try {
          result[key as keyof T] = JSON.parse(param) as T[keyof T];
        } catch {
          result[key as keyof T] = param as T[keyof T];
        }
      }
    }

    return result;
  }, [searchParams, stateConfig]);

  const setState = useCallback(
    (updates: Partial<T>) => {
      setSearchParams(
        (prev: any) => {
          const newParams = new URLSearchParams(
            prev instanceof URLSearchParams ? prev : new URLSearchParams(prev)
          );

          for (const [key, value] of Object.entries(updates)) {
            const options = stateConfig[key];
            const { defaultValue, serialize } = options;

            if (value === undefined || value === null || value === defaultValue) {
              newParams.delete(key);
            } else {
              const serializedValue = serialize
                ? serialize(value)
                : typeof value === 'string'
                  ? value
                  : JSON.stringify(value);

              newParams.set(key, serializedValue);
            }
          }

          return newParams;
        },
        { replace: true }
      );
    },
    [stateConfig, setSearchParams]
  );

  return [state, setState];
}

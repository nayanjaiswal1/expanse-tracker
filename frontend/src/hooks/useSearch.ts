import { useCallback, useEffect, useRef } from 'react';
import { useUrlState } from './useUrlState';

export interface SearchConfig {
  debounceMs?: number;
  minLength?: number;
  placeholder?: string;
  resetPageOnSearch?: boolean;
  immediate?: boolean; // Whether to trigger search immediately without debounce
}

export interface UseSearchResult {
  search: string;
  setSearch: (value: string) => void;
  debouncedSearch: string;
  clearSearch: () => void;
  isSearching: boolean;
  hasSearch: boolean;
}

/**
 * Hook for managing search state with URL synchronization and debouncing
 */
export function useSearch(config: SearchConfig = {}): UseSearchResult {
  const { debounceMs = 500, minLength = 0, resetPageOnSearch = true, immediate = false } = config;

  const [search, setSearchState] = useUrlState<string>('search', {
    defaultValue: '',
  });

  const [debouncedSearch, setDebouncedSearch] = useUrlState<string>('q', {
    defaultValue: '',
  });

  const [, setPage] = useUrlState<number>('page', {
    defaultValue: 1,
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef(search);

  // Update search ref when search changes
  useEffect(() => {
    searchRef.current = search || '';
  }, [search]);

  // Debounce search updates
  useEffect(() => {
    if (immediate) {
      // Immediate mode - no debouncing
      const trimmedSearch = (search || '').trim();
      if (trimmedSearch !== debouncedSearch) {
        setDebouncedSearch(trimmedSearch);
        if (resetPageOnSearch && trimmedSearch !== '') {
          setPage(1);
        }
      }
      return;
    }

    // Clear previous timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Set up new timeout
    debounceRef.current = setTimeout(() => {
      const currentSearch = searchRef.current.trim();

      // Only update if search meets minimum length or is being cleared
      if (currentSearch.length >= minLength || currentSearch === '') {
        if (currentSearch !== debouncedSearch) {
          setDebouncedSearch(currentSearch);

          // Reset page when search changes
          if (resetPageOnSearch && currentSearch !== '') {
            setPage(1);
          }
        }
      }
    }, debounceMs);

    // Cleanup
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [
    search,
    debouncedSearch,
    debounceMs,
    minLength,
    resetPageOnSearch,
    setDebouncedSearch,
    setPage,
    immediate,
  ]);

  const setSearch = useCallback(
    (value: string) => {
      setSearchState(value);
    },
    [setSearchState]
  );

  const clearSearch = useCallback(() => {
    setSearchState('');
    setDebouncedSearch('');
  }, [setSearchState, setDebouncedSearch]);

  const isSearching = Boolean(
    search && search.trim() !== debouncedSearch && search.trim().length >= minLength
  );

  const hasSearch = Boolean(debouncedSearch && debouncedSearch.trim().length > 0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    search: search || '',
    setSearch,
    debouncedSearch: debouncedSearch || '',
    clearSearch,
    isSearching,
    hasSearch,
  };
}

/**
 * Hook that combines search with additional search-related functionality
 */
export function useAdvancedSearch(config: SearchConfig = {}) {
  const searchResult = useSearch(config);

  const [searchHistory, setSearchHistory] = useUrlState<string[]>('search_history', {
    defaultValue: [],
    serialize: (value) => (Array.isArray(value) ? value.join('|') : ''),
    deserialize: (value) => (value ? value.split('|').filter(Boolean) : []),
  });

  const addToHistory = useCallback(
    (term: string) => {
      if (!term.trim()) return;

      const newHistory = [term, ...(searchHistory || []).filter((h) => h !== term)].slice(0, 10);
      setSearchHistory(newHistory);
    },
    [searchHistory, setSearchHistory]
  );

  const clearHistory = useCallback(() => {
    setSearchHistory([]);
  }, [setSearchHistory]);

  const selectFromHistory = useCallback(
    (term: string) => {
      searchResult.setSearch(term);
    },
    [searchResult]
  );

  return {
    ...searchResult,
    searchHistory: searchHistory || [],
    addToHistory,
    clearHistory,
    selectFromHistory,
  };
}

import { useMemo } from 'react';
import { useUrlState, urlStateSerializers } from './useUrlState';

export interface PaginationConfig {
  defaultPageSize?: number;
  pageSizeOptions?: number[];
  maxPageSize?: number;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  offset: number;
}

export interface PaginationActions {
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  goToFirstPage: () => void;
  goToLastPage: (totalCount: number) => void;
  resetPagination: () => void;
}

export interface PaginationResult extends PaginationState, PaginationActions {
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  isFirstPage: boolean;
  isLastPage: boolean;
}

export interface UsePaginationProps {
  totalCount?: number;
  config?: PaginationConfig;
}

/**
 * Hook for managing pagination state with URL synchronization
 */
export function usePagination({
  totalCount = 0,
  config = {},
}: UsePaginationProps = {}): PaginationResult {
  const { defaultPageSize = 20, maxPageSize = 100 } = config;

  const [page, setPage] = useUrlState<number>('page', {
    defaultValue: 1,
    ...urlStateSerializers.number,
  });

  const [pageSize, setPageSize] = useUrlState<number>('page_size', {
    defaultValue: defaultPageSize,
    ...urlStateSerializers.number,
  });

  // Ensure page size is within allowed options and limits
  const validatedPageSize = useMemo(() => {
    if (pageSize && pageSize > 0 && pageSize <= maxPageSize) {
      return pageSize;
    }
    return defaultPageSize;
  }, [pageSize, defaultPageSize, maxPageSize]);

  // Ensure page is within valid range
  const totalPages = Math.ceil(totalCount / validatedPageSize) || 1;
  const validatedPage = useMemo(() => {
    if (page && page > 0 && page <= totalPages) {
      return page;
    }
    return 1;
  }, [page, totalPages]);

  const offset = (validatedPage - 1) * validatedPageSize;

  // Sync validated values back to URL if they differ
  if (validatedPage !== page) {
    setPage(validatedPage);
  }
  if (validatedPageSize !== pageSize) {
    setPageSize(validatedPageSize);
  }

  const hasNextPage = validatedPage < totalPages;
  const hasPreviousPage = validatedPage > 1;
  const isFirstPage = validatedPage === 1;
  const isLastPage = validatedPage === totalPages;

  const actions: PaginationActions = {
    setPage: (newPage: number) => {
      const clampedPage = Math.max(1, Math.min(newPage, totalPages));
      setPage(clampedPage);
    },

    setPageSize: (newPageSize: number) => {
      // When changing page size, try to maintain current position
      const currentOffset = offset;
      const newPage = Math.floor(currentOffset / newPageSize) + 1;

      setPageSize(newPageSize);
      setPage(Math.max(1, newPage));
    },

    nextPage: () => {
      if (hasNextPage) {
        setPage(validatedPage + 1);
      }
    },

    previousPage: () => {
      if (hasPreviousPage) {
        setPage(validatedPage - 1);
      }
    },

    goToFirstPage: () => {
      setPage(1);
    },

    goToLastPage: (totalCount: number) => {
      const lastPage = Math.ceil(totalCount / validatedPageSize) || 1;
      setPage(lastPage);
    },

    resetPagination: () => {
      setPage(1);
      setPageSize(defaultPageSize);
    },
  };

  return {
    page: validatedPage,
    pageSize: validatedPageSize,
    offset,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    isFirstPage,
    isLastPage,
    ...actions,
  };
}

/**
 * Utility hook for creating pagination info for display
 */
export function usePaginationInfo(pagination: PaginationResult, totalCount: number) {
  return useMemo(() => {
    const start = pagination.offset + 1;
    const end = Math.min(pagination.offset + pagination.pageSize, totalCount);

    return {
      start,
      end,
      total: totalCount,
      showing: end - start + 1,
      text:
        totalCount > 0 ? `Showing ${start}-${end} of ${totalCount} results` : 'No results found',
    };
  }, [pagination.offset, pagination.pageSize, totalCount]);
}

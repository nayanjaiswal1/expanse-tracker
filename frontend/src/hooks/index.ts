// Global hooks exports
export { default as useAppData } from './useAppData';
export * from './useObjectForm';

// URL State Management
export { useUrlState, useUrlStateObject, urlStateSerializers } from './useUrlState';

// Pagination
export {
  usePagination,
  usePaginationInfo,
  type PaginationConfig,
  type PaginationState,
  type PaginationActions,
  type PaginationResult,
  type UsePaginationProps,
} from './usePagination';

// Search
export { useSearch, useAdvancedSearch, type SearchConfig, type UseSearchResult } from './useSearch';

// Filters
export {
  useFilters,
  useTransactionFilters,
  commonFilters,
  type FilterConfig,
  type FilterDefinition,
  type UseFiltersResult,
} from './useFilters';

// Unified Query State
export {
  useQueryState,
  useTransactionQueryState,
  usePaginatedQuery,
  useSearchQuery,
  type QueryStateConfig,
  type QueryState,
} from './useQueryState';

// Form Management
export { useFormData, fieldTransformers } from './useFormData';
export type { UseFormDataOptions, UseFormDataReturn } from './useFormData';

export { useFormSubmission, useFormSubmissionWithToast } from './useFormSubmission';
export type { UseFormSubmissionOptions, UseFormSubmissionReturn } from './useFormSubmission';

// Modal Management
export { useModalState, useMultiModalState } from './useModalState';
export type { UseModalStateOptions, UseModalStateReturn } from './useModalState';

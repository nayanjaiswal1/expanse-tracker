/**
 * Analytics TanStack Query Hooks
 *
 * Custom hooks for comprehensive expense analytics using TanStack Query.
 * Provides optimized caching, automatic refetching, and loading states.
 */

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type {
  AnalyticsSummary,
  CategoryBreakdownItem,
  TimeSeriesData,
  MerchantItem,
  ItemAnalytics,
  SpendingPatterns,
  PeriodComparison,
  AnalyticsFilters,
} from '@/api/modules/analytics';

// Query key factory for cache management
export const analyticsKeys = {
  all: ['analytics'] as const,
  summaries: () => [...analyticsKeys.all, 'summary'] as const,
  summary: (filters?: AnalyticsFilters) => [...analyticsKeys.summaries(), filters] as const,
  categories: () => [...analyticsKeys.all, 'categories'] as const,
  categoryBreakdown: (filters?: AnalyticsFilters) =>
    [...analyticsKeys.categories(), filters] as const,
  timeSeries: () => [...analyticsKeys.all, 'timeSeries'] as const,
  timeSeriesData: (filters: AnalyticsFilters) => [...analyticsKeys.timeSeries(), filters] as const,
  merchants: () => [...analyticsKeys.all, 'merchants'] as const,
  topMerchants: (filters?: AnalyticsFilters) => [...analyticsKeys.merchants(), filters] as const,
  items: () => [...analyticsKeys.all, 'items'] as const,
  itemAnalytics: (filters?: AnalyticsFilters) => [...analyticsKeys.items(), filters] as const,
  patterns: () => [...analyticsKeys.all, 'patterns'] as const,
  spendingPatterns: (filters?: AnalyticsFilters) => [...analyticsKeys.patterns(), filters] as const,
  comparisons: () => [...analyticsKeys.all, 'comparisons'] as const,
  periodComparison: (filters: AnalyticsFilters) =>
    [...analyticsKeys.comparisons(), filters] as const,
};

/**
 * Hook for analytics summary
 *
 * @param filters - Date range, categories, accounts, etc.
 * @param options - Query options (enabled, refetchInterval, etc.)
 * @returns Query result with summary data
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useAnalyticsSummary({
 *   start_date: '2024-01-01',
 *   end_date: '2024-01-31',
 *   categories: '1,2,3',
 * });
 * ```
 */
export function useAnalyticsSummary(
  filters?: AnalyticsFilters,
  options?: {
    enabled?: boolean;
    refetchInterval?: number | false;
  }
): UseQueryResult<AnalyticsSummary> {
  return useQuery({
    queryKey: analyticsKeys.summary(filters),
    queryFn: () => apiClient.getAnalyticsSummary(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
    ...options,
  });
}

/**
 * Hook for category breakdown
 *
 * @param filters - Date range and transaction type
 * @returns Query result with category breakdown
 *
 * @example
 * ```tsx
 * const { data: categories } = useCategoryBreakdown({
 *   type: 'expense',
 *   start_date: '2024-01-01',
 * });
 * ```
 */
export function useCategoryBreakdown(
  filters?: AnalyticsFilters,
  options?: { enabled?: boolean }
): UseQueryResult<CategoryBreakdownItem[]> {
  return useQuery({
    queryKey: analyticsKeys.categoryBreakdown(filters),
    queryFn: () => apiClient.getCategoryBreakdown(filters),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Hook for time series trend data
 *
 * @param filters - Date range, granularity, type, categories (start_date and end_date required)
 * @returns Query result with time series data and trends
 *
 * @example
 * ```tsx
 * const { data: trends } = useTimeSeriesData({
 *   start_date: '2023-01-01',
 *   end_date: '2024-01-01',
 *   granularity: 'monthly',
 *   type: 'expense',
 * });
 * ```
 */
export function useTimeSeriesData(
  filters: AnalyticsFilters & {
    start_date: string;
    end_date: string;
  },
  options?: { enabled?: boolean }
): UseQueryResult<TimeSeriesData> {
  return useQuery({
    queryKey: analyticsKeys.timeSeriesData(filters),
    queryFn: () => apiClient.getTimeSeriesData(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes (trends change slowly)
    gcTime: 10 * 60 * 1000,
    ...options,
  });
}

/**
 * Hook for top merchants
 *
 * @param filters - Date range and limit
 * @returns Query result with top merchants
 *
 * @example
 * ```tsx
 * const { data: merchants } = useTopMerchants({
 *   limit: 10,
 *   start_date: '2024-01-01',
 * });
 * ```
 */
export function useTopMerchants(
  filters?: AnalyticsFilters,
  options?: { enabled?: boolean }
): UseQueryResult<MerchantItem[]> {
  return useQuery({
    queryKey: analyticsKeys.topMerchants(filters),
    queryFn: () => apiClient.getTopMerchants(filters),
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    ...options,
  });
}

/**
 * Hook for item-level analytics
 *
 * @param filters - Date range and optional category filter
 * @returns Query result with item-level insights
 *
 * @example
 * ```tsx
 * const { data: itemStats } = useItemAnalytics({
 *   start_date: '2024-01-01',
 *   category_id: 1,
 * });
 * ```
 */
export function useItemAnalytics(
  filters?: AnalyticsFilters,
  options?: { enabled?: boolean }
): UseQueryResult<ItemAnalytics> {
  return useQuery({
    queryKey: analyticsKeys.itemAnalytics(filters),
    queryFn: () => apiClient.getItemAnalytics(filters),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    ...options,
  });
}

/**
 * Hook for spending patterns
 *
 * @param filters - Date range
 * @returns Query result with spending patterns
 *
 * @example
 * ```tsx
 * const { data: patterns } = useSpendingPatterns({
 *   start_date: '2024-01-01',
 *   end_date: '2024-01-31',
 * });
 * ```
 */
export function useSpendingPatterns(
  filters?: AnalyticsFilters,
  options?: { enabled?: boolean }
): UseQueryResult<SpendingPatterns> {
  return useQuery({
    queryKey: analyticsKeys.spendingPatterns(filters),
    queryFn: () => apiClient.getSpendingPatterns(filters),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    ...options,
  });
}

/**
 * Hook for period comparison
 *
 * @param filters - Period shortcut or manual dates
 * @returns Query result with period comparison
 *
 * @example
 * ```tsx
 * // Using shortcut
 * const { data: comparison } = usePeriodComparison({
 *   period: 'this_month',
 * });
 *
 * // Using manual dates
 * const { data: comparison } = usePeriodComparison({
 *   current_start: '2024-02-01',
 *   current_end: '2024-02-29',
 *   previous_start: '2024-01-01',
 *   previous_end: '2024-01-31',
 * });
 * ```
 */
export function usePeriodComparison(
  filters: AnalyticsFilters,
  options?: { enabled?: boolean }
): UseQueryResult<PeriodComparison> {
  return useQuery({
    queryKey: analyticsKeys.periodComparison(filters),
    queryFn: () => apiClient.comparePeriods(filters),
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    ...options,
  });
}

/**
 * Helper hook for current month analytics
 *
 * @returns Summary for current month
 *
 * @example
 * ```tsx
 * const { data: currentMonth } = useCurrentMonthAnalytics();
 * ```
 */
export function useCurrentMonthAnalytics(): UseQueryResult<AnalyticsSummary> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const start_date = startOfMonth.toISOString().split('T')[0];
  const end_date = now.toISOString().split('T')[0];

  return useAnalyticsSummary({ start_date, end_date });
}

/**
 * Helper hook for last 30 days analytics
 *
 * @returns Summary for last 30 days
 *
 * @example
 * ```tsx
 * const { data: last30Days } = useLast30DaysAnalytics();
 * ```
 */
export function useLast30DaysAnalytics(): UseQueryResult<AnalyticsSummary> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);

  const start_date = thirtyDaysAgo.toISOString().split('T')[0];
  const end_date = now.toISOString().split('T')[0];

  return useAnalyticsSummary({ start_date, end_date });
}

/**
 * Helper hook for year-to-date analytics
 *
 * @returns Summary for year-to-date
 *
 * @example
 * ```tsx
 * const { data: ytd } = useYearToDateAnalytics();
 * ```
 */
export function useYearToDateAnalytics(): UseQueryResult<AnalyticsSummary> {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const start_date = startOfYear.toISOString().split('T')[0];
  const end_date = now.toISOString().split('T')[0];

  return useAnalyticsSummary({ start_date, end_date });
}

/**
 * Helper hook for analytics with auto-refresh
 *
 * @param filters - Analytics filters
 * @param refreshInterval - Refresh interval in milliseconds (default: 5 minutes)
 * @returns Summary with auto-refresh
 *
 * @example
 * ```tsx
 * const { data } = useAnalyticsWithRefresh(
 *   { start_date: '2024-01-01' },
 *   60000 // Refresh every minute
 * );
 * ```
 */
export function useAnalyticsWithRefresh(
  filters?: AnalyticsFilters,
  refreshInterval: number = 5 * 60 * 1000
): UseQueryResult<AnalyticsSummary> {
  return useAnalyticsSummary(filters, {
    refetchInterval: refreshInterval,
  });
}

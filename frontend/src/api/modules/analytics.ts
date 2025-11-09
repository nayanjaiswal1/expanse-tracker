/**
 * Analytics API Module
 *
 * Comprehensive expense analytics endpoints for:
 * - Summary statistics
 * - Category breakdowns
 * - Time series trends
 * - Top merchants
 * - Item-level analytics
 * - Spending patterns
 * - Period comparisons
 * - ML data export
 */

import { HttpClient } from './http';

export interface AnalyticsSummary {
  period: {
    start_date: string | null;
    end_date: string | null;
  };
  totals: {
    income: number;
    expenses: number;
    net_savings: number;
    savings_rate: number;
  };
  counts: {
    income_transactions: number;
    expense_transactions: number;
    total_transactions: number;
  };
  averages: {
    avg_income: number;
    avg_expense: number;
  };
  top_expense_categories: CategoryBreakdownItem[];
  top_merchants: MerchantItem[];
}

export interface CategoryBreakdownItem {
  category_id: number | null;
  category_name: string;
  category_color: string;
  category_icon: string;
  amount: number;
  transaction_count: number;
  percentage: number;
}

export interface TimeSeriesDataPoint {
  period: string;
  amount: number;
  count: number;
  average: number;
}

export interface TimeSeriesData {
  granularity: 'daily' | 'weekly' | 'monthly' | 'yearly';
  data_points: TimeSeriesDataPoint[];
  trend: {
    direction: 'increasing' | 'decreasing' | 'stable';
    percentage: number;
  };
  summary: {
    total_amount: number;
    avg_per_period: number;
    total_transactions: number;
  };
}

export interface MerchantItem {
  merchant_id: number;
  merchant_name: string;
  total_amount: number;
  transaction_count: number;
}

export interface ItemAnalytics {
  top_items_by_spending: Array<{
    name: string;
    total_spent: number;
    total_quantity: number;
    purchase_count: number;
    avg_price: number;
  }>;
  top_items_by_quantity: Array<{
    name: string;
    total_quantity: number;
    total_spent: number;
  }>;
  top_items_by_frequency: Array<{
    name: string;
    purchase_count: number;
    total_spent: number;
  }>;
  category_breakdown: Array<{
    category_id: number;
    category_name: string;
    total_amount: number;
    item_count: number;
  }>;
}

export interface SpendingPatterns {
  by_weekday: Array<{
    day: string;
    amount: number;
    count: number;
  }>;
  overall: {
    avg_transaction_amount: number;
    total_transactions: number;
  };
  by_account: Array<{
    account_id: number;
    account_name: string;
    account_type: string;
    amount: number;
    count: number;
  }>;
}

export interface PeriodComparison {
  current_period: {
    start: string;
    end: string;
    summary: AnalyticsSummary;
  };
  previous_period: {
    start: string;
    end: string;
    summary: AnalyticsSummary;
  };
  changes: {
    income: {
      absolute: number;
      percentage: number;
    };
    expenses: {
      absolute: number;
      percentage: number;
    };
  };
}

export interface AnalyticsFilters {
  start_date?: string;
  end_date?: string;
  categories?: string; // Comma-separated IDs
  accounts?: string; // Comma-separated IDs
  include_pending?: boolean;
  type?: 'expense' | 'income' | 'all';
  granularity?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  limit?: number;
  category_id?: number;
  period?: 'this_month' | 'last_month' | 'this_year';
  format?: 'json' | 'csv';
}

export function createAnalyticsApi(http: HttpClient) {
  const buildParams = (filters?: AnalyticsFilters): URLSearchParams => {
    const params = new URLSearchParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }

    return params;
  };

  return {
    /**
     * Get high-level expense summary
     *
     * @param filters - Date range, categories, accounts, etc.
     * @returns Summary statistics with totals, averages, and top items
     */
    async getAnalyticsSummary(filters?: AnalyticsFilters): Promise<AnalyticsSummary> {
      const params = buildParams(filters);
      const response = await http.client.get(`/analytics/summary/?${params.toString()}`);
      return response.data;
    },

    /**
     * Get category breakdown with percentages
     *
     * @param filters - Date range and transaction type
     * @returns Category breakdown with amounts and percentages
     */
    async getCategoryBreakdown(filters?: AnalyticsFilters): Promise<CategoryBreakdownItem[]> {
      const params = buildParams(filters);
      const response = await http.client.get(`/analytics/category-breakdown/?${params.toString()}`);
      return response.data;
    },

    /**
     * Get time series data for trends
     *
     * @param filters - Date range, granularity, type, categories
     * @returns Time series data with trend analysis
     */
    async getTimeSeriesData(filters: AnalyticsFilters): Promise<TimeSeriesData> {
      const params = buildParams(filters);
      const response = await http.client.get(`/analytics/time-series/?${params.toString()}`);
      return response.data;
    },

    /**
     * Get top merchants by transaction volume
     *
     * @param filters - Date range and limit
     * @returns Top merchants with amounts and counts
     */
    async getTopMerchants(filters?: AnalyticsFilters): Promise<MerchantItem[]> {
      const params = buildParams(filters);
      const response = await http.client.get(`/analytics/merchants/?${params.toString()}`);
      return response.data;
    },

    /**
     * Get item-level analytics from TransactionDetails
     *
     * @param filters - Date range and optional category filter
     * @returns Item-level insights with top items by different dimensions
     */
    async getItemAnalytics(filters?: AnalyticsFilters): Promise<ItemAnalytics> {
      const params = buildParams(filters);
      const response = await http.client.get(`/analytics/items-detailed/?${params.toString()}`);
      return response.data;
    },

    /**
     * Get spending patterns and habits
     *
     * @param filters - Date range
     * @returns Spending patterns by weekday, account, etc.
     */
    async getSpendingPatterns(filters?: AnalyticsFilters): Promise<SpendingPatterns> {
      const params = buildParams(filters);
      const response = await http.client.get(`/analytics/patterns/?${params.toString()}`);
      return response.data;
    },

    /**
     * Compare two time periods
     *
     * @param filters - Period shortcut or manual dates
     * @returns Comparison with changes and percentages
     */
    async comparePeriods(filters: AnalyticsFilters): Promise<PeriodComparison> {
      const params = buildParams(filters);
      const response = await http.client.get(`/analytics/compare/?${params.toString()}`);
      return response.data;
    },

    /**
     * Export comprehensive analytics data
     *
     * @param filters - Date range and format
     * @returns Complete analytics data package
     */
    async exportAnalyticsData(filters?: AnalyticsFilters): Promise<any> {
      const params = buildParams(filters);
      const response = await http.client.get(`/analytics/export/?${params.toString()}`);
      return response.data;
    },

    /**
     * Legacy item-level analytics endpoint (from existing analytics_views.py)
     *
     * @param filters - Various filters
     * @returns Legacy item analytics format
     */
    async getItemLevelAnalytics(filters?: {
      start_date?: string;
      end_date?: string;
      category?: string;
      group_by?: 'day' | 'week' | 'month';
      min_amount?: number;
      max_amount?: number;
    }): Promise<{
      summary: {
        total_items: number;
        total_amount: number;
        avg_amount: number;
      };
      category_breakdown: any[];
      time_breakdown: any[];
      top_items: any[];
      filters_applied: any;
    }> {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        });
      }
      const response = await http.client.get(`/item-level-analytics/?${params.toString()}`);
      return response.data;
    },
  };
}

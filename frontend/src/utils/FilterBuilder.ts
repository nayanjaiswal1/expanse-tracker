/**
 * Generic FilterBuilder utility for constructing complex API query strings
 * Supports all common filter types: search, ranges, dates, enums, arrays
 *
 * @example
 * const query = new FilterBuilder()
 *   .search('coffee')
 *   .range('amount', 10, 100)
 *   .date('start_date', '2024-01-01')
 *   .enum('status', ['active', 'pending'])
 *   .ordering('-date')
 *   .pagination(2, 50)
 *   .build();
 */

export type FilterValue = string | number | boolean | null | undefined;

export interface FilterConfig {
  key: string;
  value: FilterValue;
  type?: 'text' | 'number' | 'boolean' | 'date' | 'enum' | 'array';
}

export interface RangeConfig {
  minKey: string;
  maxKey: string;
  min?: number;
  max?: number;
}

export interface DateRangeConfig {
  startKey: string;
  endKey: string;
  start?: string;
  end?: string;
}

export class FilterBuilder {
  private filters: Map<string, string> = new Map();

  /**
   * Add a text search filter
   */
  search(value: string, key: string = 'search'): this {
    if (value && value.trim()) {
      this.filters.set(key, encodeURIComponent(value.trim()));
    }
    return this;
  }

  /**
   * Add a numeric range filter
   */
  range(config: RangeConfig): this {
    const { minKey, maxKey, min, max } = config;

    if (min !== null && min !== undefined) {
      this.filters.set(minKey, String(min));
    }
    if (max !== null && max !== undefined) {
      this.filters.set(maxKey, String(max));
    }

    return this;
  }

  /**
   * Add a date range filter
   */
  dateRange(config: DateRangeConfig): this {
    const { startKey, endKey, start, end } = config;

    if (start && this.isValidDate(start)) {
      this.filters.set(startKey, start);
    }
    if (end && this.isValidDate(end)) {
      this.filters.set(endKey, end);
    }

    return this;
  }

  /**
   * Add a single date filter
   */
  date(key: string, value: string): this {
    if (value && this.isValidDate(value)) {
      this.filters.set(key, value);
    }
    return this;
  }

  /**
   * Add an enum/choice filter
   */
  enum(key: string, value: string | string[], defaultValue?: string): this {
    let val: string | null = null;

    if (Array.isArray(value)) {
      val = value.filter(Boolean).join(',');
    } else if (value) {
      val = value;
    } else if (defaultValue) {
      val = defaultValue;
    }

    if (val) {
      this.filters.set(key, val);
    }

    return this;
  }

  /**
   * Add an array/comma-separated filter (for IDs, etc.)
   */
  array(key: string, values: (string | number)[]): this {
    const filtered = values.filter((v) => v !== null && v !== undefined);
    if (filtered.length > 0) {
      this.filters.set(key, filtered.join(','));
    }
    return this;
  }

  /**
   * Add a boolean filter
   */
  boolean(key: string, value: boolean | null): this {
    if (value !== null && value !== undefined) {
      this.filters.set(key, value ? 'true' : 'false');
    }
    return this;
  }

  /**
   * Add a custom filter
   */
  add(key: string, value: FilterValue, encode: boolean = false): this {
    if (value !== null && value !== undefined && value !== '') {
      const strValue = String(value);
      this.filters.set(key, encode ? encodeURIComponent(strValue) : strValue);
    }
    return this;
  }

  /**
   * Add multiple filters at once
   */
  addMultiple(filters: Record<string, FilterValue>, encode: boolean = false): this {
    Object.entries(filters).forEach(([key, value]) => {
      this.add(key, value, encode);
    });
    return this;
  }

  /**
   * Add sorting/ordering filter
   */
  ordering(field: string, descending: boolean = false): this {
    const orderValue = descending ? `-${field}` : field;
    this.filters.set('ordering', orderValue);
    return this;
  }

  /**
   * Add pagination filters
   */
  pagination(page: number = 1, pageSize: number = 50): this {
    if (page > 0) {
      this.filters.set('page', String(page));
    }
    if (pageSize > 0 && pageSize <= 1000) {
      this.filters.set('page_size', String(pageSize));
    }
    return this;
  }

  /**
   * Remove a specific filter
   */
  remove(key: string): this {
    this.filters.delete(key);
    return this;
  }

  /**
   * Clear all filters
   */
  clear(): this {
    this.filters.clear();
    return this;
  }

  /**
   * Get a specific filter value
   */
  get(key: string): string | undefined {
    return this.filters.get(key);
  }

  /**
   * Check if filter exists
   */
  has(key: string): boolean {
    return this.filters.has(key);
  }

  /**
   * Get all filters as object
   */
  toObject(): Record<string, string> {
    const result: Record<string, string> = {};
    this.filters.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  /**
   * Build query string
   */
  build(): string {
    const params = new URLSearchParams();
    this.filters.forEach((value, key) => {
      params.append(key, value);
    });
    return params.toString();
  }

  /**
   * Build full URL
   */
  buildUrl(baseUrl: string): string {
    const query = this.build();
    return query ? `${baseUrl}?${query}` : baseUrl;
  }

  /**
   * Clone the builder
   */
  clone(): FilterBuilder {
    const newBuilder = new FilterBuilder();
    this.filters.forEach((value, key) => {
      newBuilder.filters.set(key, value);
    });
    return newBuilder;
  }

  /**
   * Create from existing query string or object
   */
  static fromString(queryString: string): FilterBuilder {
    const builder = new FilterBuilder();
    const params = new URLSearchParams(queryString);
    params.forEach((value, key) => {
      builder.filters.set(key, value);
    });
    return builder;
  }

  static fromObject(obj: Record<string, FilterValue>): FilterBuilder {
    const builder = new FilterBuilder();
    Object.entries(obj).forEach(([key, value]) => {
      builder.add(key, value);
    });
    return builder;
  }

  /**
   * Validate date format (YYYY-MM-DD)
   */
  private isValidDate(dateString: string): boolean {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;

    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }
}

export default FilterBuilder;

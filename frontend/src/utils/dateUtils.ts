/**
 * Date Utilities - Standardized date operations
 *
 * Replaces 15+ duplicate date formatting patterns like:
 * - new Date().toISOString().split('T')[0]
 * - Inconsistent date parsing
 * - Date range calculations
 */

/**
 * Get today's date in YYYY-MM-DD format (for input[type="date"])
 *
 * Replaces: new Date().toISOString().split('T')[0]
 */
export function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Format a Date object to YYYY-MM-DD string
 *
 * @param date - Date to format
 * @returns YYYY-MM-DD string
 */
export function toDateString(date: Date | string | null | undefined): string {
  if (!date) {
    return getTodayString();
  }

  if (typeof date === 'string') {
    date = new Date(date);
  }

  return date.toISOString().split('T')[0];
}

/**
 * Parse date string to Date object
 *
 * @param dateString - YYYY-MM-DD string
 * @returns Date object or null if invalid
 */
export function parseDate(dateString: string | null | undefined): Date | null {
  if (!dateString) {
    return null;
  }

  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Check if a date string is valid
 */
export function isValidDate(dateString: string | null | undefined): boolean {
  return parseDate(dateString) !== null;
}

/**
 * Get date N days ago
 *
 * @param days - Number of days in the past
 * @returns YYYY-MM-DD string
 */
export function getDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return toDateString(date);
}

/**
 * Get date N days from now
 *
 * @param days - Number of days in the future
 * @returns YYYY-MM-DD string
 */
export function getDaysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toDateString(date);
}

/**
 * Get start of current month (YYYY-MM-01)
 */
export function getMonthStart(): string {
  const date = new Date();
  date.setDate(1);
  return toDateString(date);
}

/**
 * Get end of current month (YYYY-MM-DD)
 */
export function getMonthEnd(): string {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  date.setDate(0);
  return toDateString(date);
}

/**
 * Get start of current year (YYYY-01-01)
 */
export function getYearStart(): string {
  const date = new Date();
  date.setMonth(0);
  date.setDate(1);
  return toDateString(date);
}

/**
 * Get end of current year (YYYY-12-31)
 */
export function getYearEnd(): string {
  const date = new Date();
  date.setMonth(11);
  date.setDate(31);
  return toDateString(date);
}

/**
 * Get date range for common periods
 */
export function getDateRange(period: 'today' | 'week' | 'month' | 'year' | 'last30' | 'last90'): {
  start: string;
  end: string;
} {
  const end = getTodayString();
  let start: string;

  switch (period) {
    case 'today':
      start = getTodayString();
      break;
    case 'week':
      start = getDaysAgo(7);
      break;
    case 'month':
      start = getMonthStart();
      break;
    case 'year':
      start = getYearStart();
      break;
    case 'last30':
      start = getDaysAgo(30);
      break;
    case 'last90':
      start = getDaysAgo(90);
      break;
    default:
      start = getMonthStart();
  }

  return { start, end };
}

/**
 * Calculate days between two dates
 */
export function daysBetween(start: string | Date, end: string | Date): number {
  const startDate = typeof start === 'string' ? parseDate(start) : start;
  const endDate = typeof end === 'string' ? parseDate(end) : end;

  if (!startDate || !endDate) {
    return 0;
  }

  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Check if a date is in the past
 */
export function isInPast(dateString: string): boolean {
  const date = parseDate(dateString);
  if (!date) return false;

  return date < new Date();
}

/**
 * Check if a date is in the future
 */
export function isInFuture(dateString: string): boolean {
  const date = parseDate(dateString);
  if (!date) return false;

  return date > new Date();
}

/**
 * Check if a date is today
 */
export function isToday(dateString: string): boolean {
  return dateString === getTodayString();
}

/**
 * Format date for display (locale-aware)
 *
 * @param dateString - YYYY-MM-DD string
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export function formatDateDisplay(
  dateString: string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }
): string {
  const date = parseDate(dateString);
  if (!date) {
    return 'Invalid date';
  }

  return new Intl.DateTimeFormat('en-US', options).format(date);
}

/**
 * Format date relative to now (e.g., "2 days ago", "in 3 days")
 */
export function formatRelativeDate(dateString: string): string {
  const date = parseDate(dateString);
  if (!date) {
    return 'Invalid date';
  }

  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Tomorrow';
  } else if (diffDays === -1) {
    return 'Yesterday';
  } else if (diffDays > 0) {
    return `in ${diffDays} days`;
  } else {
    return `${Math.abs(diffDays)} days ago`;
  }
}

/**
 * Get month name from date
 */
export function getMonthName(dateString: string, format: 'long' | 'short' = 'long'): string {
  const date = parseDate(dateString);
  if (!date) {
    return 'Invalid date';
  }

  return new Intl.DateTimeFormat('en-US', { month: format }).format(date);
}

/**
 * Get year from date string
 */
export function getYear(dateString: string): number | null {
  const date = parseDate(dateString);
  return date ? date.getFullYear() : null;
}

/**
 * Common date presets for filters
 */
export const DATE_PRESETS = {
  TODAY: 'today',
  THIS_WEEK: 'week',
  THIS_MONTH: 'month',
  THIS_YEAR: 'year',
  LAST_30_DAYS: 'last30',
  LAST_90_DAYS: 'last90',
} as const;

export type DatePreset = (typeof DATE_PRESETS)[keyof typeof DATE_PRESETS];

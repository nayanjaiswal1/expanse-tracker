export type DateFilterMode =
  | 'this-month'
  | 'last-month'
  | 'last-90-days'
  | 'this-year'
  | 'custom'
  | 'all-time';

export const formatDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const computeDateRange = (
  mode: DateFilterMode,
  customRange: { start: string; end: string }
): { startDate: string | null; endDate: string | null } => {
  const today = new Date();

  switch (mode) {
    case 'this-month': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return {
        startDate: formatDateString(start),
        endDate: formatDateString(end),
      };
    }
    case 'last-month': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return {
        startDate: formatDateString(start),
        endDate: formatDateString(end),
      };
    }
    case 'last-90-days': {
      const start = new Date(today);
      start.setDate(start.getDate() - 89);
      return {
        startDate: formatDateString(start),
        endDate: formatDateString(today),
      };
    }
    case 'this-year': {
      const start = new Date(today.getFullYear(), 0, 1);
      const end = new Date(today.getFullYear(), 11, 31);
      return {
        startDate: formatDateString(start),
        endDate: formatDateString(end),
      };
    }
    case 'custom': {
      const { start, end } = customRange;
      if (start && end && start > end) {
        return { startDate: end, endDate: start };
      }
      return {
        startDate: start || null,
        endDate: end || null,
      };
    }
    case 'all-time':
    default:
      return { startDate: null, endDate: null };
  }
};

export const getDateFilterDisplay = (
  mode: DateFilterMode,
  dateRange: { startDate: string | null; endDate: string | null }
): string => {
  switch (mode) {
    case 'this-month':
      return 'This Month';
    case 'last-month':
      return 'Last Month';
    case 'last-90-days':
      return 'Last 90 Days';
    case 'this-year':
      return 'This Year';
    case 'custom': {
      const { startDate, endDate } = dateRange;
      if (startDate && endDate) {
        return `${startDate} – ${endDate}`;
      }
      if (startDate) {
        return `From ${startDate}`;
      }
      if (endDate) {
        return `Through ${endDate}`;
      }
      return 'Custom Range';
    }
    case 'all-time':
      return 'All Time';
    default:
      return 'This Month';
  }
};

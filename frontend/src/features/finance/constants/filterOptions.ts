export type FilterOption = { value: string; label: string };

export const dateFilterOptions: FilterOption[] = [
  { value: 'this-month', label: 'This Month' },
  { value: 'last-month', label: 'Last Month' },
  { value: 'last-90-days', label: 'Last 90 Days' },
  { value: 'this-year', label: 'This Year' },
  { value: 'all-time', label: 'All Time' },
  { value: 'custom', label: 'Custom Range' },
];

export const transactionStatusOptions: FilterOption[] = [
  { value: '', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'failed', label: 'Failed' },
];

export const transactionVerificationOptions: FilterOption[] = [
  { value: 'verified', label: 'Verified' },
  { value: 'unverified', label: 'Unverified' },
];

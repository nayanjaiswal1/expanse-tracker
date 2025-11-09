import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTransactionFiltersWithURL } from './useTransactionFiltersWithURL';
import {
  useTransactions,
  useAccounts,
  useCategories,
  useUpdateTransaction,
  useDeleteTransaction,
  useCreateTransaction,
  useBulkUpdateTransactions,
  useBulkDeleteTransactions,
} from '../../../hooks/finance';
import type { Transaction, Account, Category } from '../../../types';

type PaginatedResponse<T> = {
  results: T[];
  count?: number;
};

const isPaginatedResponse = <T>(value: unknown): value is PaginatedResponse<T> => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  return Array.isArray((value as { results?: unknown }).results);
};

export const useTransactionData = (loadedCount?: number) => {
  const [searchParams] = useSearchParams();

  // Get filters from URL
  const { apiParams } = useTransactionFiltersWithURL();

  // Get pagination from URL (page and page_size)
  const page = searchParams.get('page') || '1';
  const pageSize = searchParams.get('page_size') || '50';

  // Build filters for API
  const filtersWithPagination = useMemo(
    () => ({
      ...apiParams,
      page: parseInt(page, 10),
      page_size: parseInt(pageSize, 10),
    }),
    [apiParams, page, pageSize]
  );

  // Fetch with backend filters and pagination (ignore loadedCount)
  const transactionsQuery = useTransactions(filtersWithPagination);
  const accountsQuery = useAccounts();
  const categoriesQuery = useCategories();
  const updateTransactionMutation = useUpdateTransaction();
  const deleteTransactionMutation = useDeleteTransaction();
  const createTransactionMutation = useCreateTransaction();
  const bulkUpdateTransactionsMutation = useBulkUpdateTransactions();
  const bulkDeleteTransactionsMutation = useBulkDeleteTransactions();

  const transactions = useMemo(() => {
    const data = transactionsQuery.data;
    if (isPaginatedResponse<Transaction>(data)) {
      return data.results;
    }
    if (Array.isArray(data)) {
      return data as Transaction[];
    }
    return [];
  }, [transactionsQuery.data]);

  // Extract pagination info from response
  const paginationInfo = useMemo(() => {
    const currentPage = parseInt(page, 10);
    const currentPageSize = parseInt(pageSize, 10);
    const data = transactionsQuery.data;

    if (isPaginatedResponse<Transaction>(data)) {
      const totalCount = data.count ?? data.results.length;
      const totalPages = Math.max(1, Math.ceil(totalCount / currentPageSize));
      return {
        count: totalCount,
        page: currentPage,
        pageSize: currentPageSize,
        totalPages,
        hasNext: currentPage < totalPages,
        hasPrevious: currentPage > 1,
      };
    }

    const fallbackCount = Array.isArray(data) ? data.length : transactions.length;
    const totalPages = Math.max(1, Math.ceil(fallbackCount / currentPageSize));
    return {
      count: fallbackCount,
      page: currentPage,
      pageSize: currentPageSize,
      totalPages,
      hasNext: currentPage < totalPages,
      hasPrevious: currentPage > 1,
    };
  }, [transactionsQuery.data, page, pageSize, transactions]);

  const accounts = useMemo(() => {
    const data = accountsQuery.data as unknown;
    if (!data) return [] as Account[];
    if (Array.isArray(data)) return data as Account[];
    if (isPaginatedResponse<Account>(data)) return data.results;
    return [] as Account[];
  }, [accountsQuery.data]);

  const categories = useMemo(() => {
    const data = categoriesQuery.data as unknown;
    if (!data) return [] as Category[];
    if (Array.isArray(data)) return data as Category[];
    if (isPaginatedResponse<Category>(data)) return data.results;
    return [] as Category[];
  }, [categoriesQuery.data]);

  const accountSelectOptions = useMemo(
    () => [
      { value: '', label: 'All Accounts' },
      ...accounts.map((account: { id: number; name: string }) => ({
        value: String(account.id),
        label: account.name,
      })),
    ],
    [accounts]
  );

  const categorySelectOptions = useMemo(
    () => [
      { value: '', label: 'All Categories' },
      ...categories.map((category: { id: string; name: string }) => ({
        value: category.id,
        label: category.name,
      })),
    ],
    [categories]
  );

  return {
    transactions,
    accounts,
    categories,
    accountSelectOptions,
    categorySelectOptions,
    transactionsQuery,
    updateTransactionMutation,
    deleteTransactionMutation,
    createTransactionMutation,
    bulkUpdateTransactionsMutation,
    bulkDeleteTransactionsMutation,
    paginationInfo,
  };
};

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useTags } from './finance';

export function useAppData() {
  const accountsQuery = useQuery({
    queryKey: ['app', 'accounts'],
    queryFn: () => apiClient.getAccounts(),
    staleTime: 5 * 60 * 1000,
  });

  const categoriesQuery = useQuery({
    queryKey: ['app', 'categories'],
    queryFn: () => apiClient.getCategories(),
    staleTime: 5 * 60 * 1000,
  });

  const tags = useTags();

  return {
    accounts: accountsQuery.data || [],
    categories: categoriesQuery.data || [],
    tags, // contains allTags, isLoading, error, and tag actions
    isLoading: accountsQuery.isLoading || categoriesQuery.isLoading || tags.isLoading,
    error:
      (accountsQuery.error as any)?.message ||
      (categoriesQuery.error as any)?.message ||
      tags.error,
    refetch: async () => {
      await Promise.all([accountsQuery.refetch(), categoriesQuery.refetch(), tags.refreshTags()]);
    },
  };
}

export default useAppData;

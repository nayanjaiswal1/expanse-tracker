import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../../../api';

export interface TagWithCount {
  name: string;
  usage_count: number;
}

export interface UseTagsReturn {
  allTags: TagWithCount[];
  isLoading: boolean;
  error: string | null;
  refreshTags: () => Promise<void>;
  addTagToEntity: (entityId: string, tag: string) => Promise<void>;
  removeTagFromEntity: (entityId: string, tag: string) => Promise<void>;
  setEntityTags: (entityId: string, tags: string[]) => Promise<void>;
  getEntitiesByTag: (tag: string) => Promise<Record<string, unknown>[]>;
}

export const useTags = (): UseTagsReturn => {
  const [allTags, setAllTags] = useState<TagWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshTags = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = (await apiClient.get('/entities/all-tags/')) as any;
      setAllTags((response as any).data as TagWithCount[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tags');
      console.error('Error fetching tags:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addTagToEntity = useCallback(
    async (entityId: string, tag: string) => {
      try {
        await apiClient.post(`/entities/${entityId}/add-tag/`, { tag });
        await refreshTags(); // Refresh to update counts
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add tag');
        throw err;
      }
    },
    [refreshTags]
  );

  const removeTagFromEntity = useCallback(
    async (entityId: string, tag: string) => {
      try {
        await apiClient.post(`/entities/${entityId}/remove-tag/`, { tag });
        await refreshTags(); // Refresh to update counts
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to remove tag');
        throw err;
      }
    },
    [refreshTags]
  );

  const setEntityTags = useCallback(
    async (entityId: string, tags: string[]) => {
      try {
        await apiClient.post(`/entities/${entityId}/set-tags/`, { tags });
        await refreshTags(); // Refresh to update counts
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to set tags');
        throw err;
      }
    },
    [refreshTags]
  );

  const getEntitiesByTag = useCallback(async (tag: string) => {
    try {
      const response = (await apiClient.get(
        `/entities/by-tag/?tag=${encodeURIComponent(tag)}`
      )) as any;
      return (response as any).data as Record<string, unknown>[];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch entities by tag');
      throw err;
    }
  }, []);

  // Load tags on mount
  useEffect(() => {
    refreshTags();
  }, [refreshTags]);

  return {
    allTags,
    isLoading,
    error,
    refreshTags,
    addTagToEntity,
    removeTagFromEntity,
    setEntityTags,
    getEntitiesByTag,
  };
};

export default useTags;

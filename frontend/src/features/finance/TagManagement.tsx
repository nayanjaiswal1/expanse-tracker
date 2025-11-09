import React, { useState } from 'react';
import { Tag, Search, TrendingUp, Hash, AlertCircle } from 'lucide-react';
import { useTags } from './hooks/queries/useTags';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { DebouncedInput } from '../../components/ui/DebouncedInput';
import { Select } from '../../components/ui/Select';
import { FlexBetween, HStack } from '../../components/ui/Layout';

export const TagManagement: React.FC = () => {
  const { allTags, isLoading, error, getEntitiesByTag } = useTags();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'usage'>('usage');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showTagDetails, setShowTagDetails] = useState(false);
  const [tagEntities, setTagEntities] = useState<any[]>([]);
  const [loadingEntities, setLoadingEntities] = useState(false);

  const filteredTags = allTags
    .filter((tag) => tag.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      return b.usage_count - a.usage_count;
    });

  const handleViewTagDetails = async (tagName: string) => {
    setSelectedTag(tagName);
    setLoadingEntities(true);
    setShowTagDetails(true);

    try {
      const entities = await getEntitiesByTag(tagName);
      setTagEntities(entities);
    } catch (error) {
      console.error('Error fetching entities for tag:', error);
      setTagEntities([]);
    } finally {
      setLoadingEntities(false);
    }
  };

  const getTotalUsage = () => {
    return allTags.reduce((sum, tag) => sum + tag.usage_count, 0);
  };

  const getMostUsedTag = () => {
    return allTags.reduce(
      (max, tag) => (tag.usage_count > max.usage_count ? tag : max),
      allTags[0] || { name: '', usage_count: 0 }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Tags</h3>
        <p className="text-gray-600">{error?.message || 'Failed to load tags'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 via-teal-600 to-blue-600 rounded-2xl p-6 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold mb-2">Tag Management</h1>
            <p className="text-green-100 text-lg">Organize and manage your entity tags</p>
            <HStack gap={6} className="mt-4 text-sm">
              <div className="flex items-center">
                <Hash className="w-5 h-5 mr-2" />
                <span>{allTags.length} unique tags</span>
              </div>
              <div className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                <span>{getTotalUsage()} total usages</span>
              </div>
              {allTags.length > 0 && (
                <div className="flex items-center">
                  <Tag className="w-5 h-5 mr-2" />
                  <span>
                    Most used: {getMostUsedTag().name} ({getMostUsedTag().usage_count})
                  </span>
                </div>
              )}
            </HStack>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="theme-card">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <DebouncedInput
                type="text"
                placeholder="Search tags..."
                value={searchTerm}
                onChange={setSearchTerm}
                icon={Search}
                debounceMs={300}
              />
            </div>

            {/* Sort */}
            <HStack gap={2}>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'usage')}
                options={[
                  { value: 'usage', label: 'Sort by Usage' },
                  { value: 'name', label: 'Sort by Name' },
                ]}
                label="Sort by"
              />
            </HStack>
          </div>
        </div>
      </div>

      {/* Tags List */}
      <div className="theme-card">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold theme-text-primary">All Tags</h2>
          <p className="theme-text-secondary text-sm mt-1">
            {filteredTags.length} {filteredTags.length === 1 ? 'tag' : 'tags'}
            {searchTerm && ` matching "${searchTerm}"`}
          </p>
        </div>

        {filteredTags.length === 0 ? (
          <div className="p-12 text-center">
            <Tag className="w-20 h-20 text-gray-300 mx-auto mb-6" />
            <h3 className="text-xl font-medium text-gray-900 mb-3">
              {searchTerm ? 'No matching tags found' : 'No tags yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm
                ? 'Try adjusting your search terms'
                : 'Tags will appear here once you start tagging your entities'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredTags.map((tag) => (
              <div
                key={tag.name}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <FlexBetween>
                  <HStack gap={4}>
                    <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                      <Tag className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold theme-text-primary">{tag.name}</h3>
                      <p className="text-sm theme-text-secondary">
                        Used {tag.usage_count} {tag.usage_count === 1 ? 'time' : 'times'}
                      </p>
                    </div>
                  </HStack>

                  <HStack gap={2}>
                    <Button
                      onClick={() => handleViewTagDetails(tag.name)}
                      size="sm"
                      variant="secondary"
                    >
                      View Entities ({tag.usage_count})
                    </Button>
                  </HStack>
                </FlexBetween>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tag Details Modal */}
      <Modal
        isOpen={showTagDetails}
        onClose={() => {
          setShowTagDetails(false);
          setSelectedTag(null);
          setTagEntities([]);
        }}
        title={`Entities tagged with "${selectedTag}"`}
        size="lg"
      >
        <div className="p-6">
          {loadingEntities ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : tagEntities.length === 0 ? (
            <div className="text-center py-8">
              <Tag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No entities found</h3>
              <p className="text-gray-600">This tag is not currently used by any entities.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tagEntities.map((entity) => (
                <div key={entity.id} className="p-3 border border-gray-200 rounded-lg">
                  <FlexBetween>
                    <div>
                      <h4 className="font-medium text-gray-900">{entity.name}</h4>
                      <p className="text-sm text-gray-600 capitalize">
                        {entity.entity_type?.replace('_', ' ')}
                      </p>
                    </div>
                    <div className="text-sm text-gray-500">
                      {entity.entity_type === 'account' && entity.data?.balance && (
                        <span>Balance: ${parseFloat(entity.data.balance).toFixed(2)}</span>
                      )}
                    </div>
                  </FlexBetween>
                  {entity.tags && entity.tags.length > 1 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {entity.tags
                        .filter((tag: string) => tag !== selectedTag)
                        .map((tag: string, index: number) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-gray-600 text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default TagManagement;

import React, { useCallback } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

interface EmptyStateProps {
  hasActiveFilters?: boolean;
  onButtonClick: () => void;
  onClearFilters?: () => void;
  title: string;
  message: string;
  buttonText: string;
  icon: React.ReactNode;
  illustration?: React.ReactNode; // New prop for illustration
  isSearchEmpty?: boolean; // New prop to distinguish search empty state
}

interface EmptyStateProps {
  hasActiveFilters?: boolean;
  onButtonClick: () => void;
  onClearFilters?: () => void;
  title: string;
  message: string;
  buttonText: string;
  icon: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  hasActiveFilters,
  onButtonClick,
  onClearFilters,
  title,
  message,
  buttonText,
  icon,
  illustration,
  isSearchEmpty,
}) => {
  // Defensive handler to ensure click triggers modal open
  const handleCreateClick = useCallback(() => {
    try {
      if (typeof onButtonClick === 'function') {
        onButtonClick();
      } else {
        // Fallback could navigate to a dedicated creation route if added in future
        console.warn('EmptyState: onButtonClick is not a function');
      }
    } catch (err) {
      console.error('Failed to trigger create goal action:', err);
    }
  }, [onButtonClick]);
  // Search empty state
  if (hasActiveFilters || isSearchEmpty) {
    return (
      <div
        className="text-center py-8 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center"
        tabIndex={0}
        aria-live="polite"
      >
        <div className="mb-4">
          {illustration ? (
            illustration
          ) : (
            <Search className="h-16 w-16 text-gray-400 dark:text-gray-500" />
          )}
        </div>
        <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 mb-2">
          {isSearchEmpty ? 'No results found' : title}
        </h3>
        <p className="text-base text-secondary-600 dark:text-secondary-400 mb-4">
          {isSearchEmpty ? 'Try adjusting your search or filters.' : message}
        </p>
        {hasActiveFilters && (
          <Button onClick={onClearFilters} variant="outline" className="px-4 py-2 text-base">
            Clear Filters
          </Button>
        )}
      </div>
    );
  }

  // Default empty state (no goals yet)
  return (
    <div
      className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center"
      tabIndex={0}
      aria-live="polite"
    >
      <div className="mb-4">
        {illustration ? (
          illustration
        ) : (
          <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-full w-20 h-20 flex items-center justify-center">
            {icon}
          </div>
        )}
      </div>
      <h3 className="text-base font-semibold text-secondary-900 dark:text-secondary-100 mb-2">
        {title}
      </h3>
      <p className="text-sm text-secondary-600 dark:text-secondary-400 mb-6">{message}</p>
      <Button
        onClick={handleCreateClick}
        variant="primary"
        className="px-3 py-1.5 text-sm flex items-center justify-center gap-2 rounded-sm"
        aria-label={buttonText}
        data-testid="create-goal-button"
      >
        <Plus className="w-4 h-4" />
        {buttonText}
      </Button>
    </div>
  );
};

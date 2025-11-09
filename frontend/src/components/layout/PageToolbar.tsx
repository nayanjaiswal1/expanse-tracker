import React from 'react';
import { Filter, LayoutDashboard, Search, Plus } from 'lucide-react';
import { DebouncedInput } from '../ui/DebouncedInput';
import { Button } from '../ui/Button';
import { Flex, HStack } from '../ui/Layout';

interface PageToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  onFilterClick?: () => void;
  onOverviewClick?: () => void;
  onAddClick?: () => void;
  addButtonLabel?: string;
  hideAddButton?: boolean;
  actions?: React.ReactNode;
}

export const PageToolbar: React.FC<PageToolbarProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search…',
  onFilterClick,
  onOverviewClick,
  onAddClick,
  addButtonLabel = 'Add',
  hideAddButton = false,
  actions,
}) => {
  return (
    <Flex align="center" justify="end" gap={3}>
      {/* Search bar with filter icon inside - aligned to the right */}
      <div className="relative w-full max-w-md">
        <DebouncedInput
          value={searchValue}
          onChange={onSearchChange}
          placeholder={searchPlaceholder}
          icon={Search}
          className={`w-full h-10 ${onFilterClick ? 'pr-10' : ''}`}
          debounceMs={300}
        />
        {/* Filter icon button inside search bar on the right */}
        {onFilterClick && (
          <Button
            type="button"
            onClick={onFilterClick}
            variant="ghost-inline"
            size="none"
            className="absolute inset-y-0 right-0 flex items-center pr-3"
            title="Filters"
          >
            <Filter className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Overview button */}
      {onOverviewClick && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onOverviewClick}
          className="inline-flex items-center justify-center h-10 px-3"
          title="Overview"
        >
          <LayoutDashboard className="h-4 w-4" />
        </Button>
      )}

      {/* Add button */}
      {onAddClick && !hideAddButton && (
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={onAddClick}
          className="inline-flex items-center gap-2 h-10 px-4"
        >
          <Plus className="h-4 w-4" />
          {addButtonLabel}
        </Button>
      )}

      {actions && <HStack gap={2}>{actions}</HStack>}
    </Flex>
  );
};

export default PageToolbar;

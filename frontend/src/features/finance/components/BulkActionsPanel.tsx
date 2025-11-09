import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { FlexBetween } from '../../../components/ui/Layout';

interface BulkActionsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  bulkAccount: string;
  onBulkAccountChange: (value: string) => void;
  bulkCategory: string;
  onBulkCategoryChange: (value: string) => void;
  bulkVerified: boolean | null;
  onBulkVerifiedChange: (value: boolean | null) => void;
  accountOptions: Array<{ value: string; label: string }>;
  categoryOptions: Array<{ value: string; label: string }>;
  onApplyChanges: () => void;
  onDelete: () => void;
  isApplyDisabled: boolean;
}

export const BulkActionsPanel: React.FC<BulkActionsPanelProps> = ({
  isOpen,
  onClose,
  selectedCount,
  bulkAccount,
  onBulkAccountChange,
  bulkCategory,
  onBulkCategoryChange,
  bulkVerified,
  onBulkVerifiedChange,
  accountOptions,
  categoryOptions,
  onApplyChanges,
  onDelete,
  isApplyDisabled,
}) => {
  if (!isOpen || selectedCount === 0) return null;

  return (
    <div className="fixed top-20 right-6 z-50 w-[400px] bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-800 rounded-lg shadow-xl p-4">
      <div className="flex flex-col gap-3">
        <FlexBetween className="pb-2 border-b border-gray-200 dark:border-gray-700">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            Bulk Actions ({selectedCount} selected)
          </span>
          <Button onClick={onClose} variant="ghost-neutral">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </Button>
        </FlexBetween>

        <div className="flex flex-col gap-2">
          <Select
            value={bulkAccount}
            onChange={(value) => onBulkAccountChange(value ? String(value) : '')}
            options={[{ value: '', label: 'Change Account...' }, ...accountOptions.slice(1)]}
            className="h-9 text-sm"
          />
          <Select
            value={bulkCategory}
            onChange={(value) => onBulkCategoryChange(value ? String(value) : '')}
            options={[{ value: '', label: 'Change Category...' }, ...categoryOptions.slice(1)]}
            className="h-9 text-sm"
          />
          <Select
            value={bulkVerified === null ? '' : bulkVerified ? 'true' : 'false'}
            onChange={(value) =>
              onBulkVerifiedChange(value === 'true' ? true : value === 'false' ? false : null)
            }
            options={[
              { value: '', label: 'Change Verified...' },
              { value: 'true', label: 'Mark as Verified' },
              { value: 'false', label: 'Mark as Unverified' },
            ]}
            className="h-9 text-sm"
          />
        </div>

        <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <Button
            onClick={onApplyChanges}
            variant="primary"
            size="sm"
            className="flex-1 h-9 text-sm"
            disabled={isApplyDisabled}
          >
            Apply Changes
          </Button>
          <Button onClick={onDelete} variant="destructive" size="sm" className="h-9 px-4 text-sm">
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
};

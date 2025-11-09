import { HStack } from '../../Layout';

interface SelectionBannerProps {
  selectedCount: number;
  totalCount: number;
}

export function SelectionBanner({ selectedCount, totalCount }: SelectionBannerProps) {
  if (selectedCount === 0 || selectedCount === 1 || selectedCount === totalCount) {
    return null;
  }

  return (
    <HStack
      gap={4}
      className="sticky top-[57px] z-20 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800"
    >
      <span className="text-sm text-blue-700 dark:text-blue-300">
        {selectedCount} row(s) selected
      </span>
    </HStack>
  );
}

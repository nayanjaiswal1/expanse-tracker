import { type ChangeEvent, type FC } from 'react';
import { Button } from './Button';
import { HStack, FlexBetween } from './Layout';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

/**
 * Generic pagination component
 * Supports page number input and navigation controls
 *
 * @example
 * <Pagination
 *   currentPage={1}
 *   totalPages={10}
 *   pageSize={50}
 *   totalCount={500}
 *   onPageChange={(page) => console.log(page)}
 *   onPageSizeChange={(size) => console.log(size)}
 * />
 */

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  showPageSize?: boolean;
  showInfo?: boolean;
  disabled?: boolean;
  className?: string;
}

export const Pagination: FC<PaginationProps> = ({
  currentPage,
  totalPages,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  showPageSize = true,
  showInfo = true,
  disabled = false,
  className = '',
}) => {
  const handleFirst = () => {
    if (currentPage > 1) onPageChange(1);
  };

  const handlePrev = () => {
    if (currentPage > 1) onPageChange(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) onPageChange(currentPage + 1);
  };

  const handleLast = () => {
    if (currentPage < totalPages) onPageChange(totalPages);
  };

  const handlePageSizeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    if (onPageSizeChange) {
      onPageSizeChange(parseInt(e.target.value, 10));
    }
  };

  const handlePageInput = (e: ChangeEvent<HTMLInputElement>) => {
    const page = parseInt(e.target.value, 10);
    if (page > 0 && page <= totalPages) {
      onPageChange(page);
    }
  };

  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalCount);

  if (totalPages <= 1) {
    return null; // No pagination needed
  }

  return (
    <FlexBetween className={`gap-4 py-4 ${className}`}>
      {showInfo && (
        <div className="text-sm text-gray-600">
          Showing {startIndex} to {endIndex} of {totalCount} results
        </div>
      )}

      <HStack gap={2}>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleFirst}
          disabled={disabled || currentPage === 1}
          title="First page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handlePrev}
          disabled={disabled || currentPage === 1}
          title="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <HStack gap={1}>
          <span className="text-sm text-gray-600">Page</span>
          <input
            type="number"
            min="1"
            max={totalPages}
            value={currentPage}
            onChange={handlePageInput}
            disabled={disabled}
            className="w-12 px-2 py-1 text-center border border-gray-300 rounded text-sm"
          />
          <span className="text-sm text-gray-600">of {totalPages}</span>
        </HStack>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleNext}
          disabled={disabled || currentPage === totalPages}
          title="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleLast}
          disabled={disabled || currentPage === totalPages}
          title="Last page"
        >
          <ChevronsRight className="w-4 h-4" />
        </Button>
      </HStack>

      {showPageSize && (
        <select
          value={pageSize}
          onChange={handlePageSizeChange}
          disabled={disabled}
          className="px-2 py-1 text-sm border border-gray-300 rounded"
        >
          <option value={10}>10 per page</option>
          <option value={25}>25 per page</option>
          <option value={50}>50 per page</option>
          <option value={100}>100 per page</option>
        </select>
      )}
    </FlexBetween>
  );
};

export default Pagination;

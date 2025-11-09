import { FlexCenter } from '../ui/Layout';

export function LoadingSpinner() {
  return (
    <FlexCenter className="modal-overlay z-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500 dark:border-blue-400 mx-auto"></div>
        <p className="mt-3 text-sm font-medium theme-text-primary">Loading...</p>
      </div>
    </FlexCenter>
  );
}

import React, { useState } from 'react';
import { Download } from 'lucide-react';
import ExportModal from './ExportModal';

interface ExportButtonProps {
  dataType?: string;
  filters?: Record<string, any>;
  className?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const ExportButton: React.FC<ExportButtonProps> = ({
  dataType,
  filters = {},
  className = '',
  variant = 'ghost',
  size = 'md',
  showLabel = true,
}) => {
  const [showExportModal, setShowExportModal] = useState(false);

  const variantClasses = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
    secondary:
      'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600',
    ghost: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <>
      <button
        onClick={() => setShowExportModal(true)}
        className={`
          inline-flex items-center space-x-2 rounded-lg font-medium
          transition-colors
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${className}
        `}
      >
        <Download className={iconSizes[size]} />
        {showLabel && <span>Export</span>}
      </button>

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        defaultDataType={dataType}
        defaultFilters={filters}
      />
    </>
  );
};

export default ExportButton;

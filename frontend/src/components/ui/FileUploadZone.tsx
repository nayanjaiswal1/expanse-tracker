import React from 'react';
import { Upload as UploadIcon, Lock, RefreshCw, CheckCircle } from 'lucide-react';
import { Button } from './Button';

interface FileUploadZoneProps {
  isDragging: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onBrowseClick: () => void;
  acceptedTypes?: string;
  maxSize?: string;
  features?: string[];
}

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
  onBrowseClick,
  acceptedTypes = 'PDF, CSV, JSON, XLS, XLSX',
  maxSize = '50MB',
  features = ['Password PDFs', 'Auto-categorization', 'Duplicate detection'],
}) => {
  const featureIcons = {
    'Password PDFs': Lock,
    'Auto-categorization': RefreshCw,
    'Duplicate detection': CheckCircle,
  };

  return (
    <div
      className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
        isDragging
          ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 scale-105'
          : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800'
      }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <UploadIcon
        className={`mx-auto h-12 w-12 transition-colors ${
          isDragging ? 'text-blue-500' : 'text-gray-400'
        }`}
      />
      <div className="mt-4">
        <p className="text-lg text-gray-900 dark:text-white">
          Drop files here or{' '}
          <Button
            onClick={onBrowseClick}
            variant="link-primary"
            size="none"
            className="font-semibold underline"
          >
            browse
          </Button>
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          Supports {acceptedTypes} files up to {maxSize}
        </p>
        <div className="mt-3 flex justify-center">
          <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
            {features.map((feature) => {
              const Icon = featureIcons[feature as keyof typeof featureIcons] || CheckCircle;
              return (
                <span key={feature} className="flex items-center">
                  <Icon className="w-3 h-3 mr-1" />
                  {feature}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

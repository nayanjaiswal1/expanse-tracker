import React from 'react';
import { FileText, Eye, RefreshCw, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from './Button';
import { Card, FlexBetween, HStack } from './';

export interface ProcessingFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'uploading' | 'parsing' | 'ready' | 'error' | 'completed';
  progress?: number;
  error?: string;
  data?: {
    transactions: any[];
    detectedAccount?: any;
    warnings: string[];
    errors: string[];
  };
}

interface FileProcessingCardProps {
  file: ProcessingFile;
  onPreview?: (file: ProcessingFile) => void;
  onRetry?: (fileId: string) => void;
  onRemove?: (fileId: string) => void;
}

export const FileProcessingCard: React.FC<FileProcessingCardProps> = ({
  file,
  onPreview,
  onRetry,
  onRemove,
}) => {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = () => {
    switch (file.status) {
      case 'uploading':
      case 'parsing':
        return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>;
      case 'ready':
        return <Eye className="h-4 w-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  return (
    <Card>
      <FlexBetween>
        <HStack gap={3} className="flex-1 min-w-0">
          <FileText className="h-5 w-5 text-gray-600 dark:text-gray-400 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {file.name}
            </p>
            <div className="flex items-center space-x-2 mt-1">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatFileSize(file.size)}
              </p>
              {file.progress !== undefined &&
                file.status !== 'completed' &&
                file.status !== 'error' && (
                  <>
                    <span className="text-xs text-gray-400">•</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {file.progress}% complete
                    </p>
                  </>
                )}
            </div>

            {/* Progress bar */}
            {file.progress !== undefined &&
              file.status !== 'completed' &&
              file.status !== 'error' && (
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-2">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${file.progress}%` }}
                  ></div>
                </div>
              )}

            {/* Status messages */}
            <FileStatusMessage file={file} />
          </div>
        </HStack>

        {/* Actions */}
        <HStack gap={2}>
          {getStatusIcon()}

          {file.status === 'ready' && file.data && onPreview && (
            <Button size="sm" variant="outline" onClick={() => onPreview(file)}>
              <Eye className="w-4 h-4 mr-1" />
              Preview
            </Button>
          )}

          {file.status === 'error' && onRetry && (
            <Button size="sm" variant="outline" onClick={() => onRetry(file.id)}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Retry
            </Button>
          )}

          {onRemove && (
            <button
              onClick={() => onRemove(file.id)}
              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </HStack>
      </FlexBetween>
    </Card>
  );
};

// Status message component - single responsibility for displaying file status
const FileStatusMessage: React.FC<{ file: ProcessingFile }> = ({ file }) => {
  switch (file.status) {
    case 'ready':
      if (!file.data) return null;
      return (
        <div className="mt-2 space-y-1">
          <p className="text-xs text-green-600 dark:text-green-400">
            ✓ Found {file.data.transactions.length} transactions
          </p>
          {file.data.detectedAccount && (
            <p className="text-xs text-blue-600 dark:text-blue-400">
              📋 Detected account: {file.data.detectedAccount.name}
            </p>
          )}
          {file.data.warnings.length > 0 && (
            <p className="text-xs text-yellow-600 dark:text-yellow-400">
              ⚠️ {file.data.warnings.length} warning(s)
            </p>
          )}
        </div>
      );

    case 'error':
      return file.error ? (
        <p className="text-xs text-red-600 dark:text-red-400 mt-1">❌ {file.error}</p>
      ) : null;

    case 'completed':
      return (
        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
          ✅ Import completed successfully
        </p>
      );

    default:
      return null;
  }
};

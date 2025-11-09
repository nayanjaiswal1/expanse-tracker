import React from 'react';
import { Upload } from 'lucide-react';
import { FlexBetween, HStack } from '../../../components/ui/Layout';

interface UploadButtonProps {
  isUploading: boolean;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const UploadButton: React.FC<UploadButtonProps> = ({ isUploading, onFileChange }) => {
  return (
    <HStack
      as="label"
      className="gap-1 px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors cursor-pointer"
      title="Upload Statement"
    >
      <Upload className="h-3 w-3" />
      {isUploading ? 'Uploading...' : 'Upload'}
      <input
        type="file"
        accept=".pdf,.csv,.xlsx,.xls"
        onChange={onFileChange}
        className="hidden"
        disabled={isUploading}
      />
    </HStack>
  );
};

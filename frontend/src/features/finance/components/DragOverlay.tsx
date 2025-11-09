import React from 'react';
import { Upload as UploadIcon } from 'lucide-react';

interface DragOverlayProps {
  isVisible: boolean;
}

export const DragOverlay: React.FC<DragOverlayProps> = ({ isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-blue-500 bg-opacity-10 border-4 border-dashed border-blue-400 z-40 flex items-center justify-center">
      <div className="bg-white dark:bg-slate-800 rounded-lg p-8 shadow-lg">
        <div className="text-center">
          <UploadIcon className="w-16 h-16 text-blue-500 mx-auto mb-4" />
          <h3 className="h3">Drop files to upload</h3>
          <p className="p">Release to select an account for your files</p>
        </div>
      </div>
    </div>
  );
};

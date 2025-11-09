import React from 'react';
import { PackageX } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  message: string;
  actions?: React.ReactNode[];
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, message, actions }) => {
  return (
    <div className="text-center py-12 px-4 sm:px-6 lg:px-8">
      <PackageX className="mx-auto h-12 w-12 text-slate-400" />
      <h3 className="mt-2 text-lg font-medium text-slate-900 dark:text-white">{title}</h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{message}</p>
      {actions && actions.length > 0 && (
        <div className="mt-6 flex justify-center space-x-3">
          {actions.map((action, index) => (
            <React.Fragment key={index}>{action}</React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};

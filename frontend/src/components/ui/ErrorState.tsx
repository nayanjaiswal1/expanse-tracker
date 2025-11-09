import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ErrorStateProps {
  title: string;
  message: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ title, message }) => {
  return (
    <div className="text-center py-12 px-4 sm:px-6 lg:px-8 bg-red-50 dark:bg-red-900/20 rounded-lg">
      <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
      <h3 className="mt-2 text-lg font-medium text-red-900 dark:text-red-300">{title}</h3>
      <p className="mt-1 text-sm text-red-700 dark:text-red-400">{message}</p>
    </div>
  );
};

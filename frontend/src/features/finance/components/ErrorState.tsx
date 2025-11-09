import React from 'react';
import { Alert } from '../../../components/ui/Alert';

interface ErrorStateProps {
  error: Error;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ error }) => {
  return (
    <div className="p-6">
      <Alert variant="error" title="Error loading accounts">
        {error.message || 'Failed to load accounts'}
      </Alert>
    </div>
  );
};

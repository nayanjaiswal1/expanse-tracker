/**
 * Statement Upload Page - Wrapper for StatementUploadFlow
 *
 * Usage in your routes:
 *
 * import { StatementUploadPage } from './features/finance/StatementUploadPage';
 *
 * <Route path="/finance/statement-upload" element={<StatementUploadPage />} />
 */

import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { StatementUploadFlow } from './components/statement-upload/StatementUploadFlow';

export const StatementUploadPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Get account ID from URL query params if provided
  const accountId = searchParams.get('account_id')
    ? Number(searchParams.get('account_id'))
    : undefined;

  const handleComplete = (sessionId: number) => {
    console.log('Statement import completed:', sessionId);
    // You can add additional logic here, like showing a success modal
  };

  return <StatementUploadFlow accountId={accountId} onComplete={handleComplete} />;
};

export default StatementUploadPage;

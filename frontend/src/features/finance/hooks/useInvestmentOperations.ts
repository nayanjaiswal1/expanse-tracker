import { useState } from 'react';
import { useToast } from '../../../components/ui/Toast';
import {
  useCreateInvestmentMutation,
  useParseInvestmentEmailsMutation,
  useApproveInvestmentTransactionMutation,
  useRejectInvestmentTransactionMutation,
} from '../../../hooks/finance';

export function useInvestmentOperations() {
  const { showError, showSuccess } = useToast();
  const createInvestmentMutation = useCreateInvestmentMutation();
  const parseEmailsMutation = useParseInvestmentEmailsMutation();
  const approveTxMutation = useApproveInvestmentTransactionMutation();
  const rejectTxMutation = useRejectInvestmentTransactionMutation();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingEmail, setIsProcessingEmail] = useState(false);

  const handleCreateInvestment = async (data: {
    symbol: string;
    name: string;
    type: string;
    current_price: number;
    sector: string;
    broker: string;
  }) => {
    setIsSubmitting(true);
    try {
      await createInvestmentMutation.mutateAsync(data);
      showSuccess(`Investment ${data.symbol} created successfully`);
      return true;
    } catch (error) {
      console.error('Failed to create investment:', error);
      showError('Error creating investment', 'Please try again.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleParseEmails = async (gmailAccountId: string, daysBack: number = 30) => {
    setIsProcessingEmail(true);
    try {
      const data = await parseEmailsMutation.mutateAsync({
        gmail_account_id: gmailAccountId,
        days_back: daysBack,
      });

      if (data.success) {
        showSuccess('Transactions parsed', `Found ${data.extracted} from ${data.processed} emails`);
        return true;
      } else {
        showError('Failed to parse emails', data.error);
        return false;
      }
    } catch (error) {
      console.error('Error parsing investment emails:', error);
      showError('Error parsing investment emails', 'Please try again.');
      return false;
    } finally {
      setIsProcessingEmail(false);
    }
  };

  const handleApproveTransaction = async (transactionId: string, overrides: any = {}) => {
    try {
      await approveTxMutation.mutateAsync({ transaction_id: transactionId, overrides });
      showSuccess('Transaction approved and processed');
      return true;
    } catch (error) {
      console.error('Error approving transaction:', error);
      showError('Error approving transaction', 'Please try again.');
      return false;
    }
  };

  const handleRejectTransaction = async (transactionId: string) => {
    try {
      await rejectTxMutation.mutateAsync({ transaction_id: transactionId });
      showSuccess('Transaction rejected');
      return true;
    } catch (error) {
      console.error('Error rejecting transaction:', error);
      showError('Error rejecting transaction', 'Please try again.');
      return false;
    }
  };

  return {
    handleCreateInvestment,
    handleParseEmails,
    handleApproveTransaction,
    handleRejectTransaction,
    isSubmitting,
    isProcessingEmail,
  };
}

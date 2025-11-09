import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useRelationshipDetails } from '../hooks/useIndividualLending';
import { useQueryClient } from '@tanstack/react-query';
import { ContactHeader } from './ContactHeader';
import { BalanceSummary } from './BalanceSummary';
import { TransactionHistory } from './TransactionHistory';
import { QuickTransactionInput } from './QuickTransactionInput';

interface ContactDetailSidebarProps {
  contactId: number;
  onClose: () => void;
  showBalances: boolean;
}

export const ContactDetailSidebar: React.FC<ContactDetailSidebarProps> = ({
  contactId,
  onClose,
  showBalances,
}) => {
  const { state: authState } = useAuth();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const {
    data: relationshipDetails,
    isLoading,
    isFetching,
    refetch,
  } = useRelationshipDetails(contactId, currentPage);

  // Load more transactions when scrolling to top
  const loadMoreTransactions = useCallback(() => {
    if (relationshipDetails?.pagination?.has_next && !isLoading) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [relationshipDetails?.pagination?.has_next, isLoading]);

  // Handle scroll to top for reverse pagination
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop } = e.currentTarget;
      if (scrollTop === 0 && relationshipDetails?.pagination?.has_next) {
        loadMoreTransactions();
      }
    },
    [loadMoreTransactions, relationshipDetails?.pagination?.has_next]
  );

  // Combine all loaded transactions
  useEffect(() => {
    if (relationshipDetails?.transactions) {
      if (currentPage === 1) {
        // First page - replace all transactions (newest first)
        setAllTransactions(relationshipDetails.transactions);
      } else {
        // Additional pages - append older transactions to the end
        setAllTransactions((prev) => [...prev, ...relationshipDetails.transactions]);
      }
    }
  }, [relationshipDetails?.transactions, currentPage, contactId]);

  // Reset when contact changes
  useEffect(() => {
    setCurrentPage(1);
    setAllTransactions([]);
  }, [contactId]);

  const handleTransactionAdded = () => {
    // Reset to first page and reload with fresh data
    setCurrentPage(1);
    setAllTransactions([]);

    // Invalidate to get the latest data
    queryClient.invalidateQueries({
      queryKey: ['individual-lending', 'relationship', contactId],
    });
  };

  return (
    <div className="fixed right-0 top-0 w-96 h-screen bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-xl z-40 flex flex-col">
      <ContactHeader
        contact={relationshipDetails?.contact || null}
        totalTransactions={relationshipDetails?.stats?.total_transactions || 0}
        onClose={onClose}
      />

      {/* Show loading state only when we're loading the first page and have no data */}
      {(isLoading || isFetching) && !relationshipDetails && currentPage === 1 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400">Loading relationship details...</p>
          </div>
        </div>
      )}

      {/* Show content when data is available or we have cached data */}
      {(relationshipDetails || allTransactions.length > 0) && (
        <>
          <BalanceSummary
            relationshipDetails={relationshipDetails}
            authState={authState}
            showBalances={showBalances}
            totalTransactions={relationshipDetails?.stats?.total_transactions || 0}
          />

          <TransactionHistory
            transactions={
              allTransactions.length > 0 ? allTransactions : relationshipDetails?.transactions || []
            }
            authState={authState}
            isLoading={isLoading || isFetching}
            currentPage={currentPage}
            onScroll={handleScroll}
          />

          <QuickTransactionInput
            contactId={contactId}
            onTransactionAdded={handleTransactionAdded}
          />
        </>
      )}
    </div>
  );
};

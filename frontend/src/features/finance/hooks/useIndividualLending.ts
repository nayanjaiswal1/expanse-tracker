import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../api';

// Types
export interface LendingTransaction {
  id: number;
  amount: number;
  description: string;
  date: string;
  due_date?: string;
  status: 'pending' | 'settled' | 'active';
  type: 'lend' | 'borrow';
  contact: {
    id: number;
    name: string;
    username: string;
    email: string;
  };
  notes?: string;
  interest_rate?: number;
  created_at: string;
}

export interface LendingSummary {
  total_lent: number;
  total_borrowed: number;
  net_balance: number;
  active_relationships: number;
}

export interface Contact {
  id: number;
  name: string;
  username: string;
  email: string;
}

export interface CreateLendingTransactionData {
  contact_user_id: number;
  amount: number;
  description: string;
  type: 'lend' | 'borrow';
  due_date?: string;
  interest_rate?: number;
  notes?: string;
}

// API Functions
const individualLendingApi = {
  // Get all lending transactions
  getTransactions: (): Promise<LendingTransaction[]> =>
    apiClient.get('/individual-lending/').then((res) => res.data),

  // Get lending summary
  getSummary: (): Promise<LendingSummary> =>
    apiClient.get('/individual-lending/summary/').then((res) => res.data),

  // Get specific transaction
  getTransaction: (transactionId: number): Promise<LendingTransaction> =>
    apiClient.get(`/individual-lending/${transactionId}/`).then((res) => res.data),

  // Create new lending transaction
  createTransaction: (data: CreateLendingTransactionData): Promise<LendingTransaction> =>
    apiClient.post('/individual-lending/', data).then((res) => res.data),

  // Update lending transaction
  updateTransaction: (
    transactionId: number,
    data: Partial<CreateLendingTransactionData>
  ): Promise<LendingTransaction> =>
    apiClient.patch(`/individual-lending/${transactionId}/`, data).then((res) => res.data),

  // Delete lending transaction
  deleteTransaction: (transactionId: number): Promise<{ message: string }> =>
    apiClient.delete(`/individual-lending/${transactionId}/`).then((res) => res.data),

  // Settle a transaction
  settleTransaction: (
    transactionId: number
  ): Promise<{ message: string; transaction_id: number; status: string }> =>
    apiClient.post(`/individual-lending/${transactionId}/settle/`).then((res) => res.data),

  // Get available contacts
  getContacts: (): Promise<Contact[]> =>
    apiClient.get('/individual-lending/contacts/').then((res) => res.data),

  // Get relationship details with specific contact
  getRelationshipDetails: (
    contactId: number,
    page: number = 1,
    pageSize: number = 20
  ): Promise<{
    contact: Contact;
    transactions: LendingTransaction[];
    pagination: {
      current_page: number;
      total_pages: number;
      has_next: boolean;
      has_previous: boolean;
      total_count: number;
    };
    balances: {
      active: {
        lent: number;
        borrowed: number;
        net: number;
        status: 'owed_to_you' | 'you_owe' | 'settled';
      };
      total_lifetime: {
        lent: number;
        borrowed: number;
        net: number;
      };
      settled: {
        lent: number;
        borrowed: number;
        net: number;
      };
    };
    stats: {
      total_transactions: number;
      pending_count: number;
      active_count: number;
      settled_count: number;
    };
    // Legacy fields for backward compatibility
    total_lent?: number;
    total_borrowed?: number;
    net_balance?: number;
    balance_status?: 'owed_to_you' | 'you_owe' | 'settled';
  }> =>
    apiClient
      .get(`/individual-lending/relationship/${contactId}/`, {
        params: { page, page_size: pageSize },
      })
      .then((res) => res.data),

  // Get pending confirmations
  getPendingConfirmations: (): Promise<
    Array<{
      id: number;
      amount: number;
      description: string;
      date: string;
      due_date?: string;
      status: string;
      lender: Contact;
      notes?: string;
      interest_rate?: number;
      created_at: string;
    }>
  > => apiClient.get('/individual-lending/pending_confirmations/').then((res) => res.data),

  // Get sync notifications
  getSyncNotifications: (): Promise<{
    notifications: Array<{
      type: 'lending_request' | 'lending_confirmed';
      transaction_id: number;
      from_user: {
        id: number;
        name: string;
      };
      amount: number;
      description: string;
      created_at: string;
      message: string;
    }>;
    count: number;
  }> => apiClient.get('/individual-lending/sync_notifications/').then((res) => res.data),

  // Confirm transaction
  confirmTransaction: (
    transactionId: number
  ): Promise<{ message: string; transaction_id: number; status: string }> =>
    apiClient.post(`/individual-lending/${transactionId}/confirm/`).then((res) => res.data),

  // Reject transaction
  rejectTransaction: ({
    transactionId,
    reason,
  }: {
    transactionId: number;
    reason?: string;
  }): Promise<{ message: string; transaction_id: number; status: string }> =>
    apiClient
      .post(`/individual-lending/${transactionId}/reject/`, { reason })
      .then((res) => res.data),
};

// React Query Hooks

// Get all lending transactions
export const useIndividualLendingTransactions = () => {
  return useQuery({
    queryKey: ['individual-lending', 'transactions'],
    queryFn: individualLendingApi.getTransactions,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Get lending summary
export const useIndividualLendingSummary = () => {
  return useQuery({
    queryKey: ['individual-lending', 'summary'],
    queryFn: individualLendingApi.getSummary,
    staleTime: 5 * 60 * 1000,
  });
};

// Get available contacts
export const useIndividualLendingContacts = () => {
  return useQuery({
    queryKey: ['individual-lending', 'contacts'],
    queryFn: individualLendingApi.getContacts,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Get relationship details
export const useRelationshipDetails = (contactId: number, page: number = 1) => {
  return useQuery({
    queryKey: ['individual-lending', 'relationship', contactId, page],
    queryFn: () => individualLendingApi.getRelationshipDetails(contactId, page, 20),
    enabled: !!contactId,
    staleTime: 2 * 60 * 1000, // 2 minutes - reasonable balance
    refetchOnMount: false, // Don't always refetch to prevent excessive calls
    refetchOnWindowFocus: false, // Prevent refetch on window focus
  });
};

// Get specific transaction
export const useIndividualLendingTransaction = (transactionId: number) => {
  return useQuery({
    queryKey: ['individual-lending', 'transaction', transactionId],
    queryFn: () => individualLendingApi.getTransaction(transactionId),
    enabled: !!transactionId,
    staleTime: 5 * 60 * 1000,
  });
};

// Create lending transaction
export const useCreateLendingTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: individualLendingApi.createTransaction,
    onSuccess: () => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: ['individual-lending'] });
    },
    onError: (error) => {
      console.error('Failed to create lending transaction:', error);
    },
  });
};

// Update lending transaction
export const useUpdateLendingTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      transactionId,
      data,
    }: {
      transactionId: number;
      data: Partial<CreateLendingTransactionData>;
    }) => individualLendingApi.updateTransaction(transactionId, data),
    onSuccess: (data, variables) => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: ['individual-lending'] });
      queryClient.invalidateQueries({
        queryKey: ['individual-lending', 'transaction', variables.transactionId],
      });
    },
    onError: (error) => {
      console.error('Failed to update lending transaction:', error);
    },
  });
};

// Delete lending transaction
export const useDeleteLendingTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: individualLendingApi.deleteTransaction,
    onSuccess: () => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: ['individual-lending'] });
    },
    onError: (error) => {
      console.error('Failed to delete lending transaction:', error);
    },
  });
};

// Settle transaction
export const useSettleLendingTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: individualLendingApi.settleTransaction,
    onSuccess: () => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: ['individual-lending'] });
    },
    onError: (error) => {
      console.error('Failed to settle transaction:', error);
    },
  });
};

// Get pending confirmations
export const usePendingConfirmations = () => {
  return useQuery({
    queryKey: ['individual-lending', 'pending-confirmations'],
    queryFn: individualLendingApi.getPendingConfirmations,
    staleTime: 1 * 60 * 1000, // 1 minute - keep fresh for sync
  });
};

// Get sync notifications
export const useSyncNotifications = () => {
  return useQuery({
    queryKey: ['individual-lending', 'sync-notifications'],
    queryFn: individualLendingApi.getSyncNotifications,
    staleTime: 30 * 1000, // 30 seconds - very fresh for real-time feel
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
  });
};

// Confirm lending transaction
export const useConfirmLendingTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: individualLendingApi.confirmTransaction,
    onSuccess: () => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: ['individual-lending'] });
    },
    onError: (error) => {
      console.error('Failed to confirm transaction:', error);
    },
  });
};

// Reject lending transaction
export const useRejectLendingTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: individualLendingApi.rejectTransaction,
    onSuccess: () => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: ['individual-lending'] });
    },
    onError: (error) => {
      console.error('Failed to reject transaction:', error);
    },
  });
};

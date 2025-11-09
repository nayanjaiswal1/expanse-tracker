import { useState, useCallback, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';
import type { Account } from '../../../types';
import { AccountManagementFormData } from '../schemas';

export const useAccountManagement = () => {
  const queryClient = useQueryClient();

  // Account management state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [showBalances, setShowBalances] = useState(true);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [selectedAccountForHistory, setSelectedAccountForHistory] = useState<Account | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);

  // Mutations
  const createAccountMutation = useMutation<
    Account,
    Error,
    Omit<Account, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  >({
    mutationFn: (accountData) => apiClient.createAccount(accountData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setShowAddModal(false);
    },
  });

  const updateAccountMutation = useMutation<
    Account,
    Error,
    { id: number; account: Partial<Account> }
  >({
    mutationFn: (variables) => apiClient.updateAccount(variables.id, variables.account),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setShowAddModal(false);
    },
  });

  // Handlers
  const handleAccountSubmit = useCallback(
    async (data: AccountManagementFormData) => {
      const accountData = {
        name: data.name,
        account_type: data.account_type,
        balance: String(data.balance || '0'),
        currency: data.currency || 'USD',
        institution: data.institution || '',
        account_number: data.account_number || '',
        icon: data.icon || '',
        is_active: data.is_active !== false,
        status: 'active' as const,
        priority: 'medium' as const,
        balance_limit: '',
        available_balance: '',
        minimum_balance: '',
        maximum_balance: '',
        credit_limit: '',
        interest_rate: '',
        routing_number: '',
        notes: '',
        tags: [],
        is_primary: false,
        include_in_budget: true,
        track_balance: true,
        metadata: {},
      };

      if (editingAccount) {
        await updateAccountMutation.mutateAsync({
          id: parseInt(editingAccount.id, 10),
          account: accountData,
        });
      } else {
        await createAccountMutation.mutateAsync(accountData);
      }

      setShowAddModal(false);
      setEditingAccount(null);
    },
    [createAccountMutation, editingAccount, updateAccountMutation]
  );

  const handleDelete = useCallback((account: Account) => {
    setAccountToDelete(account);
    setShowConfirmDelete(true);
  }, []);

  const handleAccountEdit = useCallback((account: Account) => {
    setEditingAccount(account);
    setShowAddModal(true);
  }, []);

  const handleAccountSelect = useCallback((account: Account) => {
    // Toggle selection: if clicking the same account, deselect it
    setSelectedAccountForHistory((prev) => (prev?.id === account.id ? null : account));
  }, []);

  const handleCloseAddModal = useCallback(() => {
    setShowAddModal(false);
    setEditingAccount(null);
  }, []);

  const handleCloseConfirmDelete = useCallback(() => {
    setShowConfirmDelete(false);
    setAccountToDelete(null);
  }, []);

  const handleCloseAccountDetails = useCallback(() => {
    setSelectedAccountForHistory(null);
  }, []);

  const isLoading = useMemo(
    () => createAccountMutation.isPending || updateAccountMutation.isPending,
    [createAccountMutation.isPending, updateAccountMutation.isPending]
  );

  return {
    // State
    showAddModal,
    editingAccount,
    showBalances,
    showConfirmDelete,
    selectedAccountForHistory,
    accountToDelete,
    isLoading,

    // Setters
    setShowAddModal,
    setShowBalances,
    setSelectedAccountForHistory,

    // Handlers
    handleAccountSubmit,
    handleDelete,
    handleAccountEdit,
    handleAccountSelect,
    handleCloseAddModal,
    handleCloseConfirmDelete,
    handleCloseAccountDetails,
  };
};

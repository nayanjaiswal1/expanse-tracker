import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../../api/client';

// Types
export interface ExpenseGroup {
  id: number;
  name: string;
  description?: string;
  group_type: 'one-to-one' | 'multi-person';
  owner: number;
  created_at: string;
  updated_at: string;
}

export interface ExpenseGroupMembership {
  id: number;
  user: {
    id: number;
    username: string;
    email: string;
  };
  role: 'member' | 'admin';
  created_at: string;
}

export interface GroupExpense {
  id: number;
  title: string;
  description?: string;
  total_amount: string;
  currency: string;
  split_method: 'equal' | 'amount' | 'percentage' | 'shares';
  date: string;
  status: 'active' | 'settled' | 'cancelled';
  created_by: {
    id: number;
    username: string;
    email: string;
  };
  group: ExpenseGroup;
  shares: GroupExpenseShare[];
  created_at: string;
  updated_at: string;
}

export interface GroupExpenseShare {
  id: number;
  user: {
    id: number;
    username: string;
  };
  share_amount: string;
  paid_amount: string;
  payment_date?: string;
  notes?: string;
  is_settled: boolean;
  remaining_amount: string;
  created_at: string;
  updated_at: string;
}

export interface GroupBalance {
  participant_id: number;
  participant_name: string;
  total_share: string;
  total_settled: string;
  balance: string;
}

// Query Keys
const QUERY_KEYS = {
  expenseGroups: ['expense-groups'] as const,
  expenseGroup: (id: number) => ['expense-groups', id] as const,
  expenseGroupMembers: (id: number) => ['expense-groups', id, 'members'] as const,
  expenseGroupBalances: (id: number) => ['expense-groups', id, 'balances'] as const,
  groupExpenses: (groupId: number) => ['expense-groups', groupId, 'expenses'] as const,
  groupExpense: (groupId: number, expenseId: number) =>
    ['expense-groups', groupId, 'expenses', expenseId] as const,
  expensesSummary: (groupId: number) => ['expense-groups', groupId, 'expenses', 'summary'] as const,
  settlementStatus: (groupId: number, expenseId: number) =>
    ['expense-groups', groupId, 'expenses', expenseId, 'settlement'] as const,
};

// Hook: Get all expense groups
export const useExpenseGroups = () => {
  return useQuery({
    queryKey: QUERY_KEYS.expenseGroups,
    queryFn: () => apiClient.getExpenseGroups(),
  });
};

// Hook: Get single expense group
export const useExpenseGroup = (id: number) => {
  return useQuery({
    queryKey: QUERY_KEYS.expenseGroup(id),
    queryFn: () => apiClient.getExpenseGroups().then((groups) => groups.find((g) => g.id === id)),
    enabled: !!id,
  });
};

// Hook: Get expense group members
export const useExpenseGroupMembers = (groupId: number) => {
  return useQuery({
    queryKey: QUERY_KEYS.expenseGroupMembers(groupId),
    queryFn: () => apiClient.getExpenseGroupMembers(groupId),
    enabled: !!groupId,
  });
};

// Hook: Get expense group balances
export const useExpenseGroupBalances = (groupId: number) => {
  return useQuery({
    queryKey: QUERY_KEYS.expenseGroupBalances(groupId),
    queryFn: () => apiClient.getExpenseGroupBalances(groupId),
    enabled: !!groupId,
  });
};

// Hook: Get group expenses
export const useGroupExpenses = (groupId: number) => {
  return useQuery({
    queryKey: QUERY_KEYS.groupExpenses(groupId),
    queryFn: () => apiClient.getGroupExpensesForGroup(groupId),
    enabled: !!groupId,
  });
};

// Hook: Get group expenses summary
export const useGroupExpensesSummary = (groupId: number) => {
  return useQuery({
    queryKey: QUERY_KEYS.expensesSummary(groupId),
    queryFn: () => apiClient.getGroupExpensesSummary(groupId),
    enabled: !!groupId,
  });
};

// Hook: Get settlement status for expense
export const useSettlementStatus = (groupId: number, expenseId: number) => {
  return useQuery({
    queryKey: QUERY_KEYS.settlementStatus(groupId, expenseId),
    queryFn: () => apiClient.getGroupExpenseSettlementStatus(groupId, expenseId),
    enabled: !!(groupId && expenseId),
  });
};

// Mutation: Create expense group
export const useCreateExpenseGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; description?: string; group_type?: string }) =>
      apiClient.createExpenseGroup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.expenseGroups });
    },
  });
};

// Mutation: Update expense group
export const useUpdateExpenseGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: Partial<{ name: string; description: string; group_type: string }>;
    }) => apiClient.updateExpenseGroup(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.expenseGroups });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.expenseGroup(id) });
    },
  });
};

// Mutation: Delete expense group
export const useDeleteExpenseGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiClient.deleteExpenseGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.expenseGroups });
    },
  });
};

// Hook: Search users
export const useSearchUsers = (query: string) => {
  return useQuery({
    queryKey: ['users', 'search', query],
    queryFn: () => apiClient.searchUsers(query),
    enabled: !!query && query.length > 2, // Only search when query is at least 3 characters
    staleTime: 60000, // Cache for 1 minute
  });
};

// Mutation: Add member to group
export const useAddExpenseGroupMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      groupId,
      userIdOrEmail,
      role,
    }: {
      groupId: number;
      userIdOrEmail: number | string;
      role?: string;
    }) => apiClient.addExpenseGroupMember(groupId, userIdOrEmail, role),
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.expenseGroupMembers(groupId) });
    },
  });
};

// Mutation: Remove member from group
export const useRemoveExpenseGroupMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, userId }: { groupId: number; userId: number }) =>
      apiClient.removeExpenseGroupMember(groupId, userId),
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.expenseGroupMembers(groupId) });
    },
  });
};

// Mutation: Create group expense
export const useCreateGroupExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      groupId,
      data,
    }: {
      groupId: number;
      data: {
        title: string;
        description?: string;
        total_amount: string;
        date: string;
        split_method?: string;
        shares_data?: any[];
      };
    }) => apiClient.createGroupExpenseInGroup(groupId, data),
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.groupExpenses(groupId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.expenseGroupBalances(groupId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.expensesSummary(groupId) });
    },
  });
};

// Mutation: Update group expense
export const useUpdateGroupExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, expenseId, data }: { groupId: number; expenseId: number; data: any }) =>
      apiClient.updateGroupExpenseInGroup(groupId, expenseId, data),
    onSuccess: (_, { groupId, expenseId }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.groupExpenses(groupId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.groupExpense(groupId, expenseId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.expenseGroupBalances(groupId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.expensesSummary(groupId) });
    },
  });
};

// Mutation: Delete group expense
export const useDeleteGroupExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, expenseId }: { groupId: number; expenseId: number }) =>
      apiClient.deleteGroupExpenseInGroup(groupId, expenseId),
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.groupExpenses(groupId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.expenseGroupBalances(groupId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.expensesSummary(groupId) });
    },
  });
};

// Mutation: Settle group expense
export const useSettleGroupExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, expenseId }: { groupId: number; expenseId: number }) =>
      apiClient.settleGroupExpense(groupId, expenseId),
    onSuccess: (_, { groupId, expenseId }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.groupExpenses(groupId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.groupExpense(groupId, expenseId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.expenseGroupBalances(groupId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.settlementStatus(groupId, expenseId) });
    },
  });
};

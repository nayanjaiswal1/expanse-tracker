import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../api';
import { AxiosResponse } from 'axios';

// Types
export interface BudgetStatus {
  has_budget: boolean;
  total_spent: number;
  budget_limit: number | null;
  remaining: number | null;
  percentage_used: number | null;
  is_over_budget: boolean;
  is_warning: boolean;
}

export interface SplitwiseGroup {
  id: number;
  name: string;
  description: string;
  budget_limit?: number;
  budget_warning_threshold: number;
  budget_per_person_limit?: number;
  budget_status: BudgetStatus;
  member_count: number;
  total_contributed: number;
  your_contribution: number;
  is_owner: boolean;
  created_at: string;
  members: GroupMember[];
}

export interface GroupMember {
  id: number;
  name: string;
  username: string;
  role: 'member' | 'admin';
  joined_at: string;
}

export interface GroupBalance {
  user: {
    id: number;
    name: string;
    username: string;
  };
  paid: number;
  owes: number;
  balance: number;
  status: 'owes' | 'owed' | 'settled';
}

export interface GroupExpense {
  id: number;
  title: string;
  amount: number;
  date: string;
  split_method: 'equal' | 'exact' | 'percentage' | 'shares';
  paid_by: {
    id: number;
    name: string;
    username: string;
  };
  splits: Array<{
    user_id: number;
    username: string;
    amount: number;
  }>;
  created_by: {
    id: number;
    username: string;
    name: string;
  };
  status: string;
  created_at: string;
}

export interface CreateGroupData {
  name: string;
  description?: string;
  budget_limit?: number;
  budget_warning_threshold?: number;
  budget_per_person_limit?: number;
}

export interface CreateExpenseData {
  title: string;
  total_amount: number;
  split_method: 'equal' | 'exact' | 'percentage' | 'shares';
  paid_by_user_id: number;
  date?: string;
  description?: string;
  shares_data?: Array<{
    user_id: number;
    amount?: number;
    percentage?: number;
    shares?: number;
  }>;
}

export interface User {
  id: number;
  name: string;
  username: string;
  email: string;
}

// API Functions
const splitwiseGroupsApi = {
  // Get all groups
  getGroups: (filters?: Record<string, any>): Promise<SplitwiseGroup[]> =>
    apiClient
      .get('/splitwise-groups/', { params: filters })
      .then((res: AxiosResponse<SplitwiseGroup[]>) => res.data),

  // Get specific group
  getGroup: (groupId: number): Promise<SplitwiseGroup> =>
    apiClient
      .get(`/splitwise-groups/${groupId}/`)
      .then((res: AxiosResponse<SplitwiseGroup>) => res.data),

  // Create new group
  createGroup: (data: CreateGroupData): Promise<SplitwiseGroup> =>
    apiClient
      .post('/splitwise-groups/', data)
      .then((res: AxiosResponse<SplitwiseGroup>) => res.data),

  // Update group
  updateGroup: (groupId: number, data: Partial<CreateGroupData>): Promise<SplitwiseGroup> =>
    apiClient
      .patch(`/splitwise-groups/${groupId}/`, data)
      .then((res: AxiosResponse<SplitwiseGroup>) => res.data),

  // Delete group
  deleteGroup: (groupId: number): Promise<{ message: string }> =>
    apiClient
      .delete(`/splitwise-groups/${groupId}/`)
      .then((res: AxiosResponse<{ message: string }>) => res.data),

  // Add member to group
  addMember: (groupId: number, userId: number): Promise<{ message: string; member: GroupMember }> =>
    apiClient
      .post(`/splitwise-groups/${groupId}/add_member/`, { user_id: userId })
      .then((res: AxiosResponse<{ message: string; member: GroupMember }>) => res.data),

  // Add expense to group
  addExpense: (groupId: number, data: CreateExpenseData): Promise<GroupExpense> =>
    apiClient
      .post(`/splitwise-groups/${groupId}/add_expense/`, data)
      .then((res: AxiosResponse<GroupExpense>) => res.data),

  // Get group balances
  getGroupBalances: (groupId: number): Promise<GroupBalance[]> =>
    apiClient
      .get(`/splitwise-groups/${groupId}/balances/`)
      .then((res: AxiosResponse<GroupBalance[]>) => res.data),

  // Get group expenses
  getGroupExpenses: (groupId: number): Promise<GroupExpense[]> =>
    apiClient
      .get(`/splitwise-groups/${groupId}/expenses/`)
      .then((res: AxiosResponse<GroupExpense[]>) => res.data),

  // Settle balance
  settleBalance: (
    groupId: number,
    toUserId: number,
    amount: number
  ): Promise<{
    message: string;
    settlement: {
      id: number;
      amount: number;
      from_user: string;
      to_user: string;
      date: string;
    };
  }> =>
    apiClient
      .post(`/splitwise-groups/${groupId}/settle_balance/`, {
        to_user_id: toUserId,
        amount: amount,
      })
      .then(
        (
          res: AxiosResponse<{
            message: string;
            settlement: {
              id: number;
              amount: number;
              from_user: string;
              to_user: string;
              date: string;
            };
          }>
        ) => res.data
      ),

  // Remove member from group
  removeMember: (groupId: number, userId: number): Promise<{ message: string }> =>
    apiClient
      .post(`/splitwise-groups/${groupId}/remove_member/`, { user_id: userId })
      .then((res: AxiosResponse<{ message: string }>) => res.data),

  // Search users
  searchUsers: (query: string): Promise<User[]> =>
    apiClient
      .get(`/splitwise-groups/search_users/?q=${encodeURIComponent(query)}`)
      .then((res: AxiosResponse<User[]>) => res.data),
};

// React Query Hooks

// Get all groups
export const useSplitwiseGroups = (filters?: Record<string, any>) => {
  return useQuery({
    queryKey: ['splitwise-groups', filters],
    queryFn: () => splitwiseGroupsApi.getGroups(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Get specific group
export const useSplitwiseGroup = (groupId: number) => {
  return useQuery({
    queryKey: ['splitwise-groups', groupId],
    queryFn: () => splitwiseGroupsApi.getGroup(groupId),
    enabled: !!groupId,
    staleTime: 5 * 60 * 1000,
  });
};

// Get group balances
export const useGroupBalances = (groupId: number) => {
  return useQuery({
    queryKey: ['splitwise-groups', groupId, 'balances'],
    queryFn: () => splitwiseGroupsApi.getGroupBalances(groupId),
    enabled: !!groupId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Get group expenses
export const useGroupExpenses = (groupId: number) => {
  return useQuery({
    queryKey: ['splitwise-groups', groupId, 'expenses'],
    queryFn: () => splitwiseGroupsApi.getGroupExpenses(groupId),
    enabled: !!groupId,
    staleTime: 5 * 60 * 1000,
  });
};

// Search users
export const useSearchUsers = (query: string) => {
  return useQuery({
    queryKey: ['splitwise-groups', 'search-users', query],
    queryFn: () => splitwiseGroupsApi.searchUsers(query),
    enabled: query.length >= 2,
    staleTime: 5 * 60 * 1000,
  });
};

// Create group
export const useCreateSplitwiseGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: splitwiseGroupsApi.createGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['splitwise-groups'] });
    },
    onError: (error) => {
      console.error('Failed to create group:', error);
    },
  });
};

// Update group
export const useUpdateSplitwiseGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, data }: { groupId: number; data: Partial<CreateGroupData> }) =>
      splitwiseGroupsApi.updateGroup(groupId, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['splitwise-groups'] });
      queryClient.invalidateQueries({ queryKey: ['splitwise-groups', variables.groupId] });
    },
    onError: (error) => {
      console.error('Failed to update group:', error);
    },
  });
};

// Delete group
export const useDeleteSplitwiseGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: splitwiseGroupsApi.deleteGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['splitwise-groups'] });
    },
    onError: (error) => {
      console.error('Failed to delete group:', error);
    },
  });
};

// Add member to group
export const useAddGroupMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, userId }: { groupId: number; userId: number }) =>
      splitwiseGroupsApi.addMember(groupId, userId),
    onSuccess: (data, variables) => {
      // Invalidate group-specific queries
      queryClient.invalidateQueries({ queryKey: ['splitwise-groups'] });
      queryClient.invalidateQueries({ queryKey: ['splitwise-groups', variables.groupId] });
    },
    onError: (error) => {
      console.error('Failed to add member:', error);
    },
  });
};

// Add expense to group
export const useAddGroupExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, data }: { groupId: number; data: CreateExpenseData }) =>
      splitwiseGroupsApi.addExpense(groupId, data),
    onSuccess: (data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['splitwise-groups'] });
      queryClient.invalidateQueries({ queryKey: ['splitwise-groups', variables.groupId] });
    },
    onError: (error) => {
      console.error('Failed to add expense:', error);
    },
  });
};

// Settle balance
export const useSettleGroupBalance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      groupId,
      toUserId,
      amount,
    }: {
      groupId: number;
      toUserId: number;
      amount: number;
    }) => splitwiseGroupsApi.settleBalance(groupId, toUserId, amount),
    onSuccess: (data, variables) => {
      // Invalidate balance and group queries
      queryClient.invalidateQueries({ queryKey: ['splitwise-groups'] });
      queryClient.invalidateQueries({ queryKey: ['splitwise-groups', variables.groupId] });
    },
    onError: (error) => {
      console.error('Failed to settle balance:', error);
    },
  });
};

// Remove member from group
export const useRemoveGroupMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, userId }: { groupId: number; userId: number }) =>
      splitwiseGroupsApi.removeMember(groupId, userId),
    onSuccess: (data, variables) => {
      // Invalidate group queries
      queryClient.invalidateQueries({ queryKey: ['splitwise-groups'] });
      queryClient.invalidateQueries({ queryKey: ['splitwise-groups', variables.groupId] });
    },
    onError: (error) => {
      console.error('Failed to remove member:', error);
    },
  });
};

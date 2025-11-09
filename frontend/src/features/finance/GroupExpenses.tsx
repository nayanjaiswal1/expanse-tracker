import React, { useState } from 'react';
import {
  Plus,
  Users,
  Settings,
  MoreVertical,
  Coins,
  Calendar,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Clock,
  User,
  ChevronRight,
  Receipt,
  PieChart,
  UserPlus,
  UserMinus,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../utils/preferences';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { FormModal } from '../../components/ui/FormModal';
import { useToast } from '../../components/ui/Toast';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import {
  useExpenseGroups,
  useExpenseGroupMembers,
  useExpenseGroupBalances,
  useGroupExpenses,
  useGroupExpensesSummary,
  useCreateExpenseGroup,
  useAddExpenseGroupMember,
  useRemoveExpenseGroupMember,
  useCreateGroupExpense,
  useDeleteExpenseGroup,
  useUpdateExpenseGroup,
  useSearchUsers,
  type ExpenseGroup,
  type GroupExpense,
} from './hooks/queries/useExpenseGroups';
import { FlexBetween, HStack } from '../../components/ui/Layout';

interface User {
  id: number;
  username: string;
  email: string;
}

export const GroupExpenses: React.FC = () => {
  const { state: authState } = useAuth();
  const { showSuccess, showError } = useToast();

  // State
  const [selectedGroup, setSelectedGroup] = useState<ExpenseGroup | null>(null);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showManageMembersModal, setShowManageMembersModal] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'expenses' | 'balances' | 'members'>('expenses');

  // Form states
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    group_type: 'multi-person' as 'one-to-one' | 'multi-person',
  });

  const [newExpense, setNewExpense] = useState({
    title: '',
    description: '',
    total_amount: '',
    date: new Date().toISOString().split('T')[0],
    split_method: 'equal' as 'equal' | 'amount' | 'percentage' | 'shares',
    shares_data: [] as any[],
  });

  const [newMemberQuery, setNewMemberQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<number | null>(null);

  // Queries
  const { data: expenseGroups = [], isLoading } = useExpenseGroups();
  const { data: groupMembers = [] } = useExpenseGroupMembers(selectedGroup?.id || 0);
  const { data: groupBalances = [] } = useExpenseGroupBalances(selectedGroup?.id || 0);
  const { data: groupExpenses = [] } = useGroupExpenses(selectedGroup?.id || 0);
  const { data: expensesSummary } = useGroupExpensesSummary(selectedGroup?.id || 0);
  const { data: searchResults = [] } = useSearchUsers(newMemberQuery);

  // Mutations
  const createGroupMutation = useCreateExpenseGroup();
  const addMemberMutation = useAddExpenseGroupMember();
  const removeMemberMutation = useRemoveExpenseGroupMember();
  const createExpenseMutation = useCreateGroupExpense();
  const deleteGroupMutation = useDeleteExpenseGroup();
  const updateGroupMutation = useUpdateExpenseGroup();

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroup.name.trim()) {
      showError('Group Name Required', 'Please enter a group name');
      return;
    }

    try {
      await createGroupMutation.mutateAsync(newGroup);
      setNewGroup({ name: '', description: '', group_type: 'multi-person' });
      setShowCreateGroupModal(false);
    } catch (error) {
      console.error('Failed to create group:', error);
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !newExpense.title.trim() || !newExpense.total_amount) {
      showError('Missing Information', 'Please fill in all required fields');
      return;
    }

    try {
      await createExpenseMutation.mutateAsync({
        groupId: selectedGroup.id,
        data: newExpense,
      });
      setNewExpense({
        title: '',
        description: '',
        total_amount: '',
        date: new Date().toISOString().split('T')[0],
        split_method: 'equal',
        shares_data: [],
      });
      setShowAddExpenseModal(false);
    } catch (error) {
      console.error('Failed to create expense:', error);
    }
  };

  const handleAddMember = async (user: User) => {
    if (!selectedGroup) {
      showError('Missing Information', 'Please select a group');
      return;
    }

    try {
      await addMemberMutation.mutateAsync({
        groupId: selectedGroup.id,
        userIdOrEmail: user.id,
        role: 'member',
      });
      setNewMemberQuery('');
      setSelectedUser(null);
      setShowUserSearch(false);
    } catch (error) {
      console.error('Failed to add member:', error);
    }
  };

  const handleAddMemberByEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !newMemberQuery.trim()) {
      showError('Missing Information', 'Please enter user email or username');
      return;
    }

    try {
      await addMemberMutation.mutateAsync({
        groupId: selectedGroup.id,
        userIdOrEmail: newMemberQuery.trim(),
        role: 'member',
      });
      setNewMemberQuery('');
      setSelectedUser(null);
      setShowUserSearch(false);
    } catch (error) {
      console.error('Failed to add member:', error);
    }
  };

  const handleRemoveMember = async (userId: number) => {
    if (!selectedGroup) return;

    try {
      await removeMemberMutation.mutateAsync({
        groupId: selectedGroup.id,
        userId,
      });
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  };

  const handleDeleteGroup = async () => {
    if (!groupToDelete) return;

    try {
      await deleteGroupMutation.mutateAsync(groupToDelete);
      if (selectedGroup?.id === groupToDelete) {
        setSelectedGroup(null);
      }
      setGroupToDelete(null);
    } catch (error) {
      console.error('Failed to delete group:', error);
      setGroupToDelete(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'settled':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'active':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return 'text-green-600';
    if (balance < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 rounded-lg p-4 text-white shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">💸 Group Expenses</h1>
            <p className="text-blue-100 text-sm">
              Split bills and track shared expenses with friends ddd
            </p>
          </div>
          <div className="mt-4 lg:mt-0">
            <Button onClick={() => setShowCreateGroupModal(true)} variant="primary" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Create Group
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Groups List */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100 flex items-center">
                <Users className="w-4 h-4 mr-2 text-blue-600" />
                Your Groups
              </h2>
            </div>
            <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
              {expenseGroups.length === 0 ? (
                <div className="p-8 text-center">
                  <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium theme-text-primary mb-2">No groups yet</h3>
                  <p className="theme-text-secondary mb-4">
                    Create your first group to start splitting expenses
                  </p>
                  <Button onClick={() => setShowCreateGroupModal(true)} variant="primary">
                    Create Group
                  </Button>
                </div>
              ) : (
                expenseGroups.map((group) => (
                  <div
                    key={group.id}
                    onClick={() => setSelectedGroup(group)}
                    className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${
                      selectedGroup?.id === group.id ? 'bg-blue-50 border-r-4 border-blue-500' : ''
                    }`}
                  >
                    <FlexBetween>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-1">
                          {group.name}
                        </h3>
                        <p className="text-sm theme-text-secondary line-clamp-2">
                          {group.description || 'No description'}
                        </p>
                        <div className="flex items-center mt-2 text-xs theme-text-muted">
                          <span className="bg-gray-100 dark:bg-gray-700 dark:text-gray-200 px-2 py-1 rounded-full">
                            {group.group_type === 'one-to-one' ? '1-on-1' : 'Multi-person'}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </FlexBetween>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Group Details */}
        <div className="lg:col-span-2">
          {selectedGroup ? (
            <div className="space-y-4">
              {/* Group Header with Tabs */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                {/* Sticky Header with Tabs */}
                <div className="sticky top-0 z-30 bg-white dark:bg-gray-800 p-3 flex-shrink-0 rounded-t-lg">
                  <FlexBetween className="mb-3">
                    <div className="flex-1">
                      <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                        {selectedGroup.name}
                      </h2>
                      <p className="theme-text-secondary text-xs">
                        {selectedGroup.description || 'No description'}
                      </p>
                    </div>
                    <HStack gap={2}>
                      <Button
                        onClick={() => setShowAddExpenseModal(true)}
                        variant="primary"
                        size="sm"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Expense
                      </Button>
                      <div className="relative">
                        <Button
                          onClick={() =>
                            setActiveDropdown(
                              activeDropdown === selectedGroup.id ? null : selectedGroup.id
                            )
                          }
                          variant="ghost"
                          size="icon"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </Button>
                        {activeDropdown === selectedGroup.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-10 py-1">
                            <button
                              onClick={() => {
                                setActiveDropdown(null);
                                setShowManageMembersModal(true);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center"
                            >
                              <UserPlus className="w-4 h-4 mr-2" />
                              Manage Members
                            </button>
                            <button
                              onClick={() => {
                                setActiveDropdown(null);
                                setGroupToDelete(selectedGroup.id);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                            >
                              <UserMinus className="w-4 h-4 mr-2" />
                              Delete Group
                            </button>
                          </div>
                        )}
                      </div>
                    </HStack>
                  </FlexBetween>

                  {/* Tabs */}
                  <FlexBetween className="mt-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => setActiveTab('expenses')}
                        className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors outline-none focus:outline-none ${
                          activeTab === 'expenses'
                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                      >
                        <Receipt className="inline w-3 h-3 mr-1" />
                        Expenses
                      </button>
                      <button
                        onClick={() => setActiveTab('balances')}
                        className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors outline-none focus:outline-none ${
                          activeTab === 'balances'
                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                      >
                        <PieChart className="inline w-3 h-3 mr-1" />
                        Balances
                      </button>
                      <button
                        onClick={() => setActiveTab('members')}
                        className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors outline-none focus:outline-none ${
                          activeTab === 'members'
                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                      >
                        <Users className="inline w-3 h-3 mr-1" />
                        Members
                      </button>
                    </div>
                  </FlexBetween>

                  {/* Horizontal line below tabs */}
                  <div className="border-t border-gray-200 dark:border-slate-700 -mx-3 mt-2"></div>
                </div>

                {/* Summary Stats */}
                {expensesSummary && activeTab === 'expenses' && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-700/50">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                          {expensesSummary.total_expenses}
                        </div>
                        <div className="text-sm theme-text-secondary">Total Expenses</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {expensesSummary.settled_expenses}
                        </div>
                        <div className="text-sm theme-text-secondary">Settled</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">
                          {expensesSummary.active_expenses}
                        </div>
                        <div className="text-sm theme-text-secondary">Active</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {formatCurrency(expensesSummary.total_amount, authState.user)}
                        </div>
                        <div className="text-sm theme-text-secondary">Total Amount</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Group Expenses */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
                    <Receipt className="w-6 h-6 mr-3 text-green-600" />
                    Recent Expenses
                  </h3>
                </div>
                <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                  {groupExpenses.length === 0 ? (
                    <div className="p-8 text-center">
                      <Receipt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium theme-text-primary mb-2">
                        No expenses yet
                      </h3>
                      <p className="theme-text-secondary mb-4">
                        Add your first expense to get started
                      </p>
                      <Button onClick={() => setShowAddExpenseModal(true)} variant="primary">
                        Add Expense
                      </Button>
                    </div>
                  ) : (
                    groupExpenses.map((expense: GroupExpense) => (
                      <div
                        key={expense.id}
                        className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <FlexBetween>
                          <HStack gap={4}>
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                              {getStatusIcon(expense.status)}
                            </div>
                            <div>
                              <h4 className="font-semibold text-lg text-gray-800 dark:text-gray-100">
                                {expense.title}
                              </h4>
                              <div className="flex items-center space-x-3 text-sm theme-text-secondary">
                                <span>{new Date(expense.date).toLocaleDateString()}</span>
                                <span className="bg-gray-100 dark:bg-gray-700 dark:text-gray-200 px-2 py-1 rounded-full text-xs">
                                  {expense.split_method}
                                </span>
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                                    expense.status === 'settled'
                                      ? 'bg-green-100 text-green-800'
                                      : expense.status === 'active'
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                                  }`}
                                >
                                  {expense.status}
                                </span>
                              </div>
                            </div>
                          </HStack>
                          <div className="text-right">
                            <div className="text-xl font-bold text-gray-800 dark:text-gray-100">
                              {formatCurrency(parseFloat(expense.total_amount), authState.user)}
                            </div>
                            <div className="text-sm theme-text-secondary">
                              {expense.shares?.length || 0} people
                            </div>
                          </div>
                        </FlexBetween>
                        {expense.description && (
                          <p className="mt-2 text-sm theme-text-secondary pl-16">
                            {expense.description}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-12 text-center">
              <div className="bg-blue-100 p-6 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <PieChart className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-xl font-medium theme-text-primary mb-2">
                Select a group to view expenses
              </h3>
              <p className="theme-text-secondary text-lg">
                Choose a group from the left to see detailed expense information and balances
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Group Modal */}
      <FormModal
        isOpen={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        title="Create New Group"
        size="lg"
      >
        <form onSubmit={handleCreateGroup} className="space-y-5 p-6">
          <Input
            label="Group Name"
            type="text"
            value={newGroup.name}
            onChange={(e) => setNewGroup((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., Weekend Trip, Office Lunch, Shared Apartment"
            required
          />

          <Input
            label="Description"
            value={newGroup.description}
            onChange={(e) => setNewGroup((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Optional description of what this group is for"
            multiline
            rows={3}
          />

          <Select
            label="Group Type"
            value={newGroup.group_type}
            onChange={(value) =>
              setNewGroup((prev) => ({
                ...prev,
                group_type: value as 'one-to-one' | 'multi-person',
              }))
            }
            options={[
              { value: 'multi-person', label: 'Multi-person group' },
              { value: 'one-to-one', label: 'One-on-one split' },
            ]}
          />

          <FlexBetween className="pt-6 border-t border-gray-200 dark:border-gray-700 justify-end">
            <div></div>
            <HStack gap={3}>
              <Button type="button" onClick={() => setShowCreateGroupModal(false)} variant="ghost">
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={createGroupMutation.isPending}>
                {createGroupMutation.isPending ? 'Creating...' : 'Create Group'}
              </Button>
            </HStack>
          </FlexBetween>
        </form>
      </FormModal>

      {/* Add Expense Modal */}
      <FormModal
        isOpen={showAddExpenseModal}
        onClose={() => setShowAddExpenseModal(false)}
        title={`Add Expense to ${selectedGroup?.name || 'Group'}`}
        size="lg"
      >
        <form onSubmit={handleCreateExpense} className="space-y-5 p-6">
          <Input
            label="Expense Title"
            type="text"
            value={newExpense.title}
            onChange={(e) => setNewExpense((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="e.g., Dinner at restaurant, Groceries, Gas"
            required
          />

          <Input
            label="Description"
            value={newExpense.description}
            onChange={(e) => setNewExpense((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Optional details about this expense"
            multiline
            rows={3}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input
              label="Amount"
              type="number"
              step="0.01"
              value={newExpense.total_amount}
              onChange={(e) => setNewExpense((prev) => ({ ...prev, total_amount: e.target.value }))}
              placeholder="0.00"
              required
              icon={Coins}
            />

            <Input
              label="Date"
              type="date"
              value={newExpense.date}
              onChange={(e) => setNewExpense((prev) => ({ ...prev, date: e.target.value }))}
              required
            />
          </div>

          <Select
            label="Split Method"
            value={newExpense.split_method}
            onChange={(e) =>
              setNewExpense((prev) => ({
                ...prev,
                split_method: e.target.value as 'equal' | 'amount' | 'percentage' | 'shares',
              }))
            }
            options={[
              { value: 'equal', label: 'Split equally' },
              { value: 'amount', label: 'Custom amounts' },
              { value: 'percentage', label: 'Percentage split' },
              { value: 'shares', label: 'Split by shares' },
            ]}
          />

          <FlexBetween className="pt-6 border-t border-gray-200 dark:border-gray-700 justify-end">
            <div></div>
            <HStack gap={3}>
              <Button type="button" onClick={() => setShowAddExpenseModal(false)} variant="ghost">
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={createExpenseMutation.isPending}>
                {createExpenseMutation.isPending ? 'Adding...' : 'Add Expense'}
              </Button>
            </HStack>
          </FlexBetween>
        </form>
      </FormModal>

      {/* Manage Members Modal */}
      <FormModal
        isOpen={showManageMembersModal}
        onClose={() => setShowManageMembersModal(false)}
        title={`Manage Members - ${selectedGroup?.name || 'Group'}`}
        size="lg"
      >
        <div className="p-6 space-y-6">
          {/* Current Members */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Current Members</h3>
            <div className="space-y-2">
              {groupMembers.map((member) => (
                <FlexBetween key={member.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <HStack gap={3}>
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium">{member.user.username}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {member.user.email}
                      </div>
                    </div>
                  </HStack>
                  <HStack gap={2}>
                    <span className="text-sm bg-gray-200 dark:bg-gray-600 dark:text-gray-200 px-2 py-1 rounded">
                      {member.role}
                    </span>
                    {member.user.id !== authState.user?.id && (
                      <Button
                        onClick={() => handleRemoveMember(member.user.id)}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                      >
                        Remove
                      </Button>
                    )}
                  </HStack>
                </FlexBetween>
              ))}
            </div>
          </div>

          {/* Add New Member */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Add New Member</h3>
            <div className="space-y-4">
              <div className="relative">
                <Input
                  type="text"
                  value={newMemberQuery}
                  onChange={(e) => {
                    setNewMemberQuery(e.target.value);
                    setShowUserSearch(e.target.value.length > 2);
                  }}
                  placeholder="Search by email or username"
                  className="flex-1"
                />

                {/* Search Results Dropdown */}
                {showUserSearch && searchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {searchResults.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleAddMember(user)}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-3"
                        disabled={addMemberMutation.isPending}
                      >
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium">{user.username}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {user.email}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* No Results */}
                {showUserSearch && newMemberQuery.length > 2 && searchResults.length === 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg">
                    <div className="px-4 py-3 text-center text-gray-500 dark:text-gray-400">
                      No users found. Try searching by exact email.
                    </div>
                  </div>
                )}
              </div>

              {/* Manual Email Entry */}
              <HStack gap={3}>
                <Button
                  onClick={handleAddMemberByEmail}
                  variant="secondary"
                  disabled={addMemberMutation.isPending || !newMemberQuery.trim()}
                  className="flex-1"
                >
                  {addMemberMutation.isPending ? 'Adding...' : 'Add by Email'}
                </Button>
              </HStack>

              <p className="text-sm text-gray-500 dark:text-gray-400">
                If the user is not found in search, try adding them by their exact email address.
              </p>
            </div>
          </div>
        </div>
      </FormModal>

      <ConfirmDialog
        isOpen={!!groupToDelete}
        onClose={() => setGroupToDelete(null)}
        onConfirm={handleDeleteGroup}
        title="Delete Group"
        message="Are you sure you want to delete this group? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};

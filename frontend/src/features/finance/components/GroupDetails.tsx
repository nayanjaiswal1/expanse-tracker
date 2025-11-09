import React, { useState } from 'react';
import {
  Users,
  Coins,
  Calendar,
  Plus,
  Edit,
  UserPlus,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { useAuth } from '../../../contexts/AuthContext';
import { formatCurrency } from '../../../utils/preferences';
import { SplitwiseGroup } from '../hooks/useSplitwiseGroups';
import { GroupForm } from './GroupForm';
import { InviteMember } from './InviteMember';
import { ExpenseForm } from './ExpenseForm';
import { FlexBetween, HStack } from '../../../components/ui/Layout';

interface GroupDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  group: SplitwiseGroup;
  showBalances: boolean;
}

export const GroupDetails: React.FC<GroupDetailsProps> = ({
  isOpen,
  onClose,
  group,
  showBalances,
}) => {
  const { state: authState } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'expenses'>('overview');
  const [showEditForm, setShowEditForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);

  // Handle showing forms
  const handleShowEditForm = () => {
    setShowEditForm(true);
  };

  const handleShowExpenseForm = () => {
    setShowExpenseForm(true);
  };

  const handleShowInviteForm = () => {
    setShowInviteForm(true);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={group.name} size="lg">
      <div className="space-y-6">
        {/* Group Header */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {group.name}
              </h2>
              <p className="text-gray-600 dark:text-gray-300">{group.description}</p>
            </div>
            <HStack gap={2} className="text-sm text-gray-500 dark:text-gray-400">
              <Users className="w-4 h-4" />
              <span>{group.member_count} members</span>
            </HStack>
          </div>

          {/* Budget Status - Show if budget is set */}
          {group.budget_status.has_budget && (
            <div className="mb-4 bg-white dark:bg-gray-800 rounded-lg p-4">
              <FlexBetween className="mb-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Budget Status
                </p>
                {group.budget_status.is_over_budget ? (
                  <HStack className="text-xs font-medium text-red-600 dark:text-red-400">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    Over Budget
                  </HStack>
                ) : group.budget_status.is_warning ? (
                  <HStack className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    Warning
                  </HStack>
                ) : (
                  <HStack className="text-xs font-medium text-green-600 dark:text-green-400">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    On Track
                  </HStack>
                )}
              </FlexBetween>

              {/* Progress Bar */}
              <div className="mb-2">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      group.budget_status.is_over_budget
                        ? 'bg-red-500'
                        : group.budget_status.is_warning
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                    }`}
                    style={{
                      width: `${Math.min(group.budget_status.percentage_used || 0, 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Budget Details */}
              <div className="flex justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">
                  Spent:{' '}
                  {showBalances
                    ? formatCurrency(group.budget_status.total_spent, authState.user)
                    : '••••'}
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                  Limit:{' '}
                  {showBalances
                    ? formatCurrency(group.budget_status.budget_limit || 0, authState.user)
                    : '••••'}
                </span>
              </div>
              <div className="mt-1 text-xs">
                <span
                  className={`font-medium ${
                    group.budget_status.is_over_budget
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {group.budget_status.remaining !== null && group.budget_status.remaining >= 0
                    ? `${showBalances ? formatCurrency(group.budget_status.remaining, authState.user) : '••••'} remaining`
                    : `${showBalances ? formatCurrency(Math.abs(group.budget_status.remaining || 0), authState.user) : '••••'} over budget`}
                </span>
                <span className="text-gray-500 dark:text-gray-400 ml-2">
                  ({group.budget_status.percentage_used?.toFixed(1)}% used)
                </span>
              </div>
            </div>
          )}

          {/* Financial Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Group Expenses</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {showBalances ? formatCurrency(group.total_contributed, authState.user) : '••••'}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">You Have Paid</p>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                {showBalances ? formatCurrency(group.your_contribution, authState.user) : '••••'}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: Coins },
              { id: 'members', label: 'Members', icon: Users },
              { id: 'expenses', label: 'Expenses', icon: Calendar },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  <HStack gap={2}>
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </HStack>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="min-h-[200px]">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Group Statistics
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Created:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">
                      {new Date(group.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Owner:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">
                      {group.is_owner ? 'You' : 'Other member'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'members' && (
            <div className="space-y-3">
              {group.members.map((member) => (
                <FlexBetween className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg" key={member.id}>
                  <HStack gap={3}>
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full">
                      <HStack>
                        <span className="text-white font-bold">{member.name.charAt(0)}</span>
                      </HStack>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{member.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">@{member.username}</p>
                    </div>
                  </HStack>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {member.role}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Joined {new Date(member.joined_at).toLocaleDateString()}
                    </p>
                  </div>
                </FlexBetween>
              ))}
            </div>
          )}

          {activeTab === 'expenses' && (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No expenses yet
              </h4>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Start by adding your first shared expense
              </p>
              <Button onClick={handleShowExpenseForm}>
                <HStack gap={2}>
                  <Plus className="w-4 h-4" />
                  <span>Add Expense</span>
                </HStack>
              </Button>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex space-x-3">
            {group.is_owner && (
              <Button variant="outline" onClick={handleShowEditForm}>
                <HStack gap={2}>
                  <Edit className="w-4 h-4" />
                  <span>Edit Group</span>
                </HStack>
              </Button>
            )}
            <Button variant="outline" onClick={handleShowInviteForm}>
              <HStack gap={2}>
                <UserPlus className="w-4 h-4" />
                <span>Invite Members</span>
              </HStack>
            </Button>
          </div>
          <Button onClick={handleShowExpenseForm}>
            <HStack gap={2}>
              <Plus className="w-4 h-4" />
              <span>Add Expense</span>
            </HStack>
          </Button>
        </div>
      </div>

      {/* Edit Group Form */}
      {showEditForm && (
        <GroupForm isOpen={showEditForm} onClose={() => setShowEditForm(false)} editGroup={group} />
      )}

      {/* Add Expense Form */}
      {showExpenseForm && (
        <ExpenseForm
          isOpen={showExpenseForm}
          onClose={() => setShowExpenseForm(false)}
          group={group}
        />
      )}

      {/* Invite Members Form */}
      {showInviteForm && (
        <InviteMember
          isOpen={showInviteForm}
          onClose={() => setShowInviteForm(false)}
          groupId={group.id}
          existingMembers={group.members}
        />
      )}
    </Modal>
  );
};

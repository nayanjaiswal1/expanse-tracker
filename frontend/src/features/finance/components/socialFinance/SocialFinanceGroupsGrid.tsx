import React from 'react';
import { Users, MoreVertical, Plus, Settings } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { formatCurrency } from '../../../../utils/preferences';
import type { User } from '../../../../types';
import type { SocialFinanceGroup } from '../../hooks/socialFinance/useSocialFinanceData';
import { FlexBetween, HStack } from '../../../../components/ui/Layout';

interface SocialFinanceGroupsGridProps {
  groups: SocialFinanceGroup[];
  user: User | null;
  activeDropdown: number | null;
  onDropdownToggle: (groupId: number | null) => void;
  onCreateGroup: () => void;
  onAddExpense: (group: SocialFinanceGroup) => void;
  onManageGroup?: (group: SocialFinanceGroup) => void;
}

export const SocialFinanceGroupsGrid: React.FC<SocialFinanceGroupsGridProps> = ({
  groups,
  user,
  activeDropdown,
  onDropdownToggle,
  onCreateGroup,
  onAddExpense,
  onManageGroup,
}) => {
  if (groups.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg">
        <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-medium theme-text-primary mb-2">No groups yet</h3>
        <p className="theme-text-secondary mb-6">
          Create your first group to start splitting expenses
        </p>
        <Button onClick={onCreateGroup} variant="primary" size="lg">
          Create Group
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {groups.map((group) => (
        <div
          key={group.id}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 hover:shadow-xl transition-shadow duration-200"
        >
          <FlexBetween className="mb-4">
            <h3 className="text-xl font-bold text-gray-800 truncate">{group.name}</h3>
            <div className="relative">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onDropdownToggle(activeDropdown === group.id ? null : group.id);
                }}
                variant="ghost"
                size="icon"
              >
                <MoreVertical className="h-5 w-5" />
              </Button>

              {activeDropdown === group.id && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 py-1">
                  <button
                    onClick={() => {
                      onDropdownToggle(null);
                      onAddExpense(group);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Expense
                  </button>
                  <button
                    onClick={() => {
                      onDropdownToggle(null);
                      onManageGroup?.(group);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Manage Group
                  </button>
                </div>
              )}
            </div>
          </FlexBetween>

          <p className="theme-text-secondary text-sm mb-4">
            {group.description || 'No description'}
          </p>

          <div className="space-y-3">
            <FlexBetween>
              <span className="text-sm theme-text-secondary">Total Expenses</span>
              <span className="font-semibold text-gray-800">
                {formatCurrency(group.totalExpenses, user)}
              </span>
            </FlexBetween>

            <FlexBetween>
              <span className="text-sm theme-text-secondary">Your Balance</span>
              <span
                className={`font-semibold text-lg ${
                  group.balance >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {group.balance >= 0 ? '+' : ''}
                {formatCurrency(group.balance, user)}
              </span>
            </FlexBetween>

            <FlexBetween>
              <span className="text-sm theme-text-secondary">Members</span>
              <span className="text-sm text-gray-800">{group.members.length} people</span>
            </FlexBetween>

            <div className="pt-3 border-t border-gray-100 dark:border-gray-700 mt-4">
              <span className="text-xs theme-text-muted">
                Last activity: {group.recentActivity}
              </span>
            </div>
          </div>

          <Button onClick={() => onAddExpense(group)} className="w-full mt-6" variant="secondary">
            Add Expense
          </Button>
        </div>
      ))}
    </div>
  );
};

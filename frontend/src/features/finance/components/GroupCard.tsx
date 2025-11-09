import React, { useState } from 'react';
import { Users, Calendar, Edit, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { useAuth } from '../../../contexts/AuthContext';
import { formatCurrency } from '../../../utils/preferences';
import { FlexBetween, HStack } from '../../../components/ui/Layout';
import { SplitwiseGroup } from '../hooks/useSplitwiseGroups';
import { GroupForm } from './GroupForm';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';

interface GroupCardProps {
  group: SplitwiseGroup;
  showBalances: boolean;
  onViewDetails: (group: SplitwiseGroup) => void;
  onDelete?: (groupId: string) => void;
}

export const GroupCard: React.FC<GroupCardProps> = ({
  group,
  showBalances,
  onViewDetails,
  onDelete,
}) => {
  const { state: authState } = useAuth();
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Calculate what you owe or are owed (simplified calculation)
  const totalExpenses = group.total_contributed;
  const yourShare = totalExpenses / group.member_count; // Equal split assumption
  const yourBalance = group.your_contribution - yourShare; // Positive = you're owed, Negative = you owe

  return (
    <>
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:border-purple-300 dark:hover:border-purple-600 hover:-translate-y-1 transition-all duration-300 group cursor-pointer min-h-[200px] flex flex-col"
        onClick={() => onViewDetails(group)}
      >
        {/* Header */}
        <FlexBetween className="items-start mb-4">
          <HStack gap={3} className="flex-1 min-w-0">
            <div className="p-2.5 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors truncate">
                {group.name}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-1">
                <Users className="w-3 h-3" />
                <span>{group.member_count} members</span>
              </p>
            </div>
          </HStack>

          {/* Action buttons */}
          <HStack gap={1} className="opacity-0 group-hover:opacity-100 transition-opacity">
            {group.is_owner && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowEditForm(true);
                }}
                title="Edit Group"
                className="p-1.5 h-7 w-7"
              >
                <Edit className="w-3 h-3" />
              </Button>
            )}
            {group.is_owner && onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(true);
                }}
                title="Delete Group"
                className="p-1.5 h-7 w-7 text-red-500 hover:text-red-600"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </HStack>
        </FlexBetween>

        {/* Description */}
        {group.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2 leading-relaxed">
            {group.description}
          </p>
        )}

        {/* Budget Warning Badge */}
        {group.budget_status.has_budget &&
          (group.budget_status.is_over_budget || group.budget_status.is_warning) && (
            <div
              className={`mb-3 px-3 py-2 rounded-lg flex items-center space-x-2 ${
                group.budget_status.is_over_budget
                  ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                  : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
              }`}
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium">
                  {group.budget_status.is_over_budget ? 'Over Budget!' : 'Budget Warning'}
                </p>
                <p className="text-xs opacity-90">
                  {group.budget_status.percentage_used?.toFixed(0)}% of budget used
                </p>
              </div>
            </div>
          )}

        {/* Financial Summary */}
        {showBalances && (
          <div className="grid grid-cols-2 gap-3 mb-4 flex-1">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-800/50 rounded-xl p-3 shadow-inner">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                Total Expenses
              </p>
              <p className="text-base font-bold text-gray-900 dark:text-white">
                {formatCurrency(totalExpenses, authState.user)}
              </p>
            </div>
            <div
              className={`rounded-xl p-3 shadow-md ${
                yourBalance > 0
                  ? 'bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800'
                  : yourBalance < 0
                    ? 'bg-gradient-to-br from-red-50 to-rose-100 dark:from-red-900/20 dark:to-rose-900/20 border border-red-200 dark:border-red-800'
                    : 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-800/50'
              }`}
            >
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                Your Balance
              </p>
              <p
                className={`text-base font-bold ${
                  yourBalance > 0
                    ? 'text-green-700 dark:text-green-400'
                    : yourBalance < 0
                      ? 'text-red-700 dark:text-red-400'
                      : 'text-gray-700 dark:text-gray-400'
                }`}
              >
                {yourBalance > 0 && '+'}
                {formatCurrency(Math.abs(yourBalance), authState.user)}
              </p>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                {yourBalance > 0 ? 'You are owed' : yourBalance < 0 ? 'You owe' : 'Settled'}
              </p>
            </div>
          </div>
        )}

        {/* Members Preview - Simplified */}
        <FlexBetween className="pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center -space-x-2">
            {group.members.slice(0, 3).map((member, idx) => (
              <div
                key={member.id}
                className="w-8 h-8 bg-gradient-to-br from-purple-400 via-blue-400 to-cyan-400 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800 shadow-md transition-transform hover:scale-110 hover:z-10"
                style={{ zIndex: 3 - idx }}
                title={member.name}
              >
                <span className="text-white text-xs font-bold">
                  {member.name.charAt(0).toUpperCase()}
                </span>
              </div>
            ))}
            {group.members.length > 3 && (
              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800 shadow-md">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                  +{group.members.length - 3}
                </span>
              </div>
            )}
          </div>

          <HStack
            gap={1.5}
            className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2.5 py-1 rounded-full"
          >
            <Calendar className="w-3 h-3" />
            <span>Active</span>
          </HStack>
        </FlexBetween>
      </div>

      {/* Edit Group Form Modal */}
      {showEditForm && (
        <GroupForm isOpen={showEditForm} onClose={() => setShowEditForm(false)} editGroup={group} />
      )}

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          if (onDelete) {
            onDelete(group.id);
          }
          setShowDeleteConfirm(false);
        }}
        title="Delete Group"
        message="Are you sure you want to delete this group?"
        confirmText="Delete"
        variant="danger"
      />
    </>
  );
};

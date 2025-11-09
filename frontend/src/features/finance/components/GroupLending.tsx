import React, { useState } from 'react';
import { Users, Plus } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { FlexBetween, HStack } from '../../../components/ui/Layout';
import { useAuth } from '../../../contexts/AuthContext';

import { GroupForm } from './GroupForm';
import { GroupCard } from './GroupCard';
import { GroupDetails } from './GroupDetails';
import { LendingTransactionList } from './LendingTransactionList';
import { EmptyState } from './EmptyState';
import {
  useSplitwiseGroups,
  useDeleteSplitwiseGroup,
  SplitwiseGroup,
} from '../hooks/useSplitwiseGroups';

interface GroupLendingProps {
  showBalances: boolean;
  searchTerm?: string;
}

export const GroupLending: React.FC<GroupLendingProps> = ({ showBalances, searchTerm }) => {
  const { state: authState } = useAuth();
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<SplitwiseGroup | null>(null);

  // Real API calls
  const { data: lendingGroups = [], isLoading } = useSplitwiseGroups(
    searchTerm ? { search: searchTerm } : undefined
  );
  const deleteGroupMutation = useDeleteSplitwiseGroup();

  // Calculate totals from real data
  const totalGroups = lendingGroups.length;
  const totalContributed = lendingGroups.reduce((sum, group) => sum + group.your_contribution, 0);
  const totalTarget = lendingGroups.reduce((sum, group) => sum + (group.target_amount || 0), 0);

  // Mock recent transactions for now - this could be moved to a separate hook
  const groupTransactions = [];

  // Handle group deletion
  const handleDeleteGroup = async (groupId: string) => {
    try {
      await deleteGroupMutation.mutateAsync(parseInt(groupId));
    } catch (error) {
      console.error('Failed to delete group:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Loading summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 animate-pulse"
            >
              <FlexBetween>
                <div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-2"></div>
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                </div>
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
              </FlexBetween>
            </div>
          ))}
        </div>

        {/* Loading groups grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 animate-pulse"
            >
              <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action Button */}
      <FlexBetween>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Your Money Groups</h2>
        <Button onClick={() => setShowGroupForm(true)}>
          <HStack gap={2}>
            <Plus className="w-4 h-4" />
            <span>Create Group</span>
          </HStack>
        </Button>
      </FlexBetween>

      {/* Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {lendingGroups.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              hasActiveFilters={Boolean(searchTerm)}
              onButtonClick={() => setShowGroupForm(true)}
              onClearFilters={() => {}}
              title={searchTerm ? 'No groups found' : 'No money groups yet'}
              message={
                searchTerm
                  ? 'Try adjusting your search or filters.'
                  : 'Create a group to pool money with friends for shared goals'
              }
              buttonText="Create Your First Group"
              icon={<Users className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />}
            />
          </div>
        ) : (
          lendingGroups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              showBalances={showBalances}
              onViewDetails={setSelectedGroup}
              onDelete={handleDeleteGroup}
            />
          ))
        )}
      </div>

      {/* Recent Group Transactions */}
      {groupTransactions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recent Group Activity
          </h3>
          <LendingTransactionList
            transactions={groupTransactions}
            showBalances={showBalances}
            type="group"
          />
        </div>
      )}

      {/* Group Creation Form */}
      {showGroupForm && (
        <GroupForm isOpen={showGroupForm} onClose={() => setShowGroupForm(false)} />
      )}

      {/* Group Details Modal */}
      {selectedGroup && (
        <GroupDetails
          isOpen={!!selectedGroup}
          onClose={() => setSelectedGroup(null)}
          group={selectedGroup}
          showBalances={showBalances}
        />
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { Search, UserPlus, X, Check } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { useSearchUsers, useAddGroupMember, User } from '../hooks/useSplitwiseGroups';
import { FlexBetween, HStack } from '../../../components/ui/Layout';

interface InviteMemberProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: number;
  existingMembers: Array<{ id: number; name: string; username: string }>;
}

export const InviteMember: React.FC<InviteMemberProps> = ({
  isOpen,
  onClose,
  groupId,
  existingMembers,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [isInviting, setIsInviting] = useState(false);

  // Get search results
  const { data: searchResults = [] } = useSearchUsers(searchQuery);
  const addMemberMutation = useAddGroupMember();

  // Filter out existing members from search results
  const availableUsers = searchResults.filter(
    (user) => !existingMembers.some((member) => member.id === user.id)
  );

  const handleSelectUser = (user: User) => {
    if (selectedUsers.find((u) => u.id === user.id)) {
      setSelectedUsers(selectedUsers.filter((u) => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const handleInviteMembers = async () => {
    if (selectedUsers.length === 0) return;

    setIsInviting(true);
    try {
      // Invite each selected user
      await Promise.all(
        selectedUsers.map((user) =>
          addMemberMutation.mutateAsync({
            groupId,
            userId: user.id,
          })
        )
      );

      // Reset form and close modal
      setSelectedUsers([]);
      setSearchQuery('');
      onClose();
    } catch (error) {
      console.error('Failed to invite members:', error);
    } finally {
      setIsInviting(false);
    }
  };

  const handleClose = () => {
    setSelectedUsers([]);
    setSearchQuery('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Invite Members" size="md" zIndex="z-[60]">
      <div className="space-y-6">
        {/* Search Input */}
        <div className="relative">
          <HStack className="absolute inset-y-0 left-0 pl-3 pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </HStack>
          <input
            type="text"
            placeholder="Search users by name or username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
          />
        </div>

        {/* Selected Users */}
        {selectedUsers.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Selected Members ({selectedUsers.length})
            </h4>
            <div className="space-y-1">
              {selectedUsers.map((user) => (
                <FlexBetween
                  key={user.id}
                  className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
                >
                  <HStack gap={2}>
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-semibold">
                        {user.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {user.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">@{user.username}</p>
                    </div>
                  </HStack>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSelectUser(user)}
                    className="text-red-500 hover:text-red-600 p-1"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </FlexBetween>
              ))}
            </div>
          </div>
        )}

        {/* Search Results */}
        {searchQuery.length >= 2 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Search Results</h4>

            {availableUsers.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {searchResults.length === 0
                    ? 'No users found'
                    : 'All found users are already members'}
                </p>
              </div>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-1">
                {availableUsers.map((user) => {
                  const isSelected = selectedUsers.find((u) => u.id === user.id);
                  return (
                    <FlexBetween
                      key={user.id}
                      className={`p-2 rounded-lg cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700'
                          : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      onClick={() => handleSelectUser(user)}
                    >
                      <HStack gap={2}>
                        <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-semibold">
                            {user.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            @{user.username}
                          </p>
                        </div>
                      </HStack>
                      {isSelected && <Check className="w-4 h-4 text-blue-500" />}
                    </FlexBetween>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {searchQuery.length > 0 && searchQuery.length < 2 && (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Type at least 2 characters to search for users
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" onClick={handleClose} disabled={isInviting}>
            Cancel
          </Button>
          <Button onClick={handleInviteMembers} disabled={selectedUsers.length === 0 || isInviting}>
            <HStack gap={2}>
              <UserPlus className="w-4 h-4" />
              <span>
                {isInviting
                  ? 'Inviting...'
                  : `Invite ${selectedUsers.length} Member${selectedUsers.length !== 1 ? 's' : ''}`}
              </span>
            </HStack>
          </Button>
        </div>
      </div>
    </Modal>
  );
};

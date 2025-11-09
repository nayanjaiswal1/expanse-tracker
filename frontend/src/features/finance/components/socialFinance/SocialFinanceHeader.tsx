import React from 'react';
import { Users, HandHeart, User, Plus } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { FlexBetween, HStack } from '../../../../components/ui/Layout';

type SocialFinanceTab = 'groups' | 'lending';

interface SocialFinanceHeaderProps {
  groupsCount: number;
  lendingContactsCount: number;
  contactsCount: number;
  activeTab: SocialFinanceTab;
  onAddContact: () => void;
  onPrimaryAction: () => void;
}

export const SocialFinanceHeader: React.FC<SocialFinanceHeaderProps> = ({
  groupsCount,
  lendingContactsCount,
  contactsCount,
  activeTab,
  onAddContact,
  onPrimaryAction,
}) => {
  const primaryActionLabel = activeTab === 'groups' ? 'Create Group' : 'Add Transaction';

  return (
    <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-red-500 rounded-2xl p-6 text-white shadow-lg">
      <FlexBetween className="flex-col lg:flex-row lg:items-center">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold mb-2">🤝 Social Finance</h1>
          <p className="text-purple-100 text-lg">Manage group expenses and personal lending</p>
          <HStack className="mt-4 space-x-6 text-sm">
            <HStack>
              <Users className="w-5 h-5 mr-2" />
              <span>{groupsCount} groups</span>
            </HStack>
            <HStack>
              <HandHeart className="w-5 h-5 mr-2" />
              <span>{lendingContactsCount} lending contacts</span>
            </HStack>
            <HStack>
              <User className="w-5 h-5 mr-2" />
              <span>{contactsCount} total contacts</span>
            </HStack>
          </HStack>
        </div>
        <HStack className="mt-6 lg:mt-0 flex-col sm:flex-row gap-3">
          <Button onClick={onAddContact} variant="ghost-white" size="sm">
            <User className="w-4 h-4 mr-2" />
            Add Contact
          </Button>
          <Button onClick={onPrimaryAction} variant="primary" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            {primaryActionLabel}
          </Button>
        </HStack>
      </FlexBetween>
    </div>
  );
};

import React from 'react';
import { Users, HandHeart } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';

type SocialFinanceTab = 'groups' | 'lending';

interface SocialFinanceTabSwitcherProps {
  activeTab: SocialFinanceTab;
  onTabChange: (tab: SocialFinanceTab) => void;
  groupsCount: number;
  lendingTransactionCount: number;
}

export const SocialFinanceTabSwitcher: React.FC<SocialFinanceTabSwitcherProps> = ({
  activeTab,
  onTabChange,
  groupsCount,
  lendingTransactionCount,
}) => {
  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <nav className="-mb-px flex space-x-8">
        <Button
          onClick={() => onTabChange('groups')}
          variant={activeTab === 'groups' ? 'primary' : 'ghost'}
          className="py-4 px-1 border-b-2 font-medium text-sm"
        >
          <Users className="w-5 h-5 inline mr-2" />
          Group Expenses ({groupsCount})
        </Button>
        <Button
          onClick={() => onTabChange('lending')}
          variant={activeTab === 'lending' ? 'primary' : 'ghost'}
          className="py-4 px-1 border-b-2 font-medium text-sm"
        >
          <HandHeart className="w-5 h-5 inline mr-2" />
          Lending & Borrowing ({lendingTransactionCount})
        </Button>
      </nav>
    </div>
  );
};

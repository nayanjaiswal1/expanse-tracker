import React from 'react';
import {
  Plus,
  Eye,
  EyeOff,
  X,
  CreditCard,
  Wallet,
  CheckCircle,
  Building,
  RefreshCw,
} from 'lucide-react';
import { SummaryCards } from '../../../components/ui/SummaryCards';
import { Button } from '../../../components/ui/Button';
import { FlexBetween, HStack } from '../../../components/ui/Layout';

interface AccountOverviewSidebarProps {
  totalAccounts: number;
  totalBalance: string;
  activeAccounts: number;
  accountTypes: number;
  showBalances: boolean;
  onClose: () => void;
  onToggleBalances: () => void;
  onAddAccount: () => void;
  onRefresh: () => void;
}

export const AccountOverviewSidebar: React.FC<AccountOverviewSidebarProps> = ({
  totalAccounts,
  totalBalance,
  activeAccounts,
  accountTypes,
  showBalances,
  onClose,
  onToggleBalances,
  onAddAccount,
  onRefresh,
}) => {
  const summaryCards = [
    {
      id: 'total',
      label: 'Total Accounts',
      value: totalAccounts,
      icon: CreditCard,
      iconColor: 'text-blue-500',
    },
    {
      id: 'balance',
      label: showBalances ? 'Total Balance' : 'Hidden',
      value: showBalances ? totalBalance : '•••••',
      icon: showBalances ? Wallet : EyeOff,
      iconColor: showBalances ? 'text-emerald-500' : 'text-gray-400',
    },
    {
      id: 'active',
      label: 'Active Accounts',
      value: activeAccounts,
      icon: CheckCircle,
      iconColor: 'text-emerald-500',
    },
    {
      id: 'types',
      label: 'Account Types',
      value: accountTypes,
      icon: Building,
      iconColor: 'text-purple-500',
    },
  ];

  return (
    <aside className="border-l border-gray-700/30 bg-gray-800/40 backdrop-blur-sm shadow-lg h-screen sticky top-0 overflow-y-auto">
      <div className="p-6 space-y-6">
        <FlexBetween className="border-b border-gray-700/30 pb-4">
          <HStack gap={2}>
            <h2 className="text-lg font-semibold text-gray-100">Overview</h2>
            <Button onClick={onRefresh} variant="ghost-subtle">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </HStack>
          <Button onClick={onClose} variant="ghost-subtle">
            <X className="w-5 h-5" />
          </Button>
        </FlexBetween>
        <SummaryCards cards={summaryCards} gridClassName="grid grid-cols-1 gap-3" />
        <div className="flex flex-col gap-2 border-t border-gray-700/30 pt-4"></div>
      </div>
    </aside>
  );
};

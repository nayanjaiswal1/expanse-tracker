import React from 'react';
import {
  Plus,
  Eye,
  EyeOff,
  X,
  ArrowUpRight,
  ArrowDownLeft,
  Receipt,
  Users,
  RefreshCw,
} from 'lucide-react';
import { SummaryCards } from '../../../components/ui/SummaryCards';
import { Button } from '../../../components/ui/Button';
import { FlexBetween, HStack } from '../../../components/ui/Layout';

interface ExpenseOverviewSidebarProps {
  totalOwed: string;
  totalOwing: string;
  totalExpenses: string;
  activeGroups: number;
  showBalances: boolean;
  onClose: () => void;
  onToggleBalances: () => void;
  onRefresh: () => void;
}

export const ExpenseOverviewSidebar: React.FC<ExpenseOverviewSidebarProps> = ({
  totalOwed,
  totalOwing,
  totalExpenses,
  activeGroups,
  showBalances,
  onClose,
  onToggleBalances,
  onRefresh,
}) => {
  const summaryCards = [
    {
      id: 'lent',
      label: 'You lent',
      value: showBalances ? totalOwed : '••••',
      icon: ArrowUpRight,
      iconColor: 'text-emerald-500',
    },
    {
      id: 'borrowed',
      label: 'You borrowed',
      value: showBalances ? totalOwing : '••••',
      icon: ArrowDownLeft,
      iconColor: 'text-rose-500',
    },
    {
      id: 'total',
      label: 'Total activity',
      value: showBalances ? totalExpenses : '••••',
      icon: Receipt,
      iconColor: 'text-blue-500',
    },
    {
      id: 'groups',
      label: 'Active groups',
      value: activeGroups,
      icon: Users,
      iconColor: 'text-amber-500',
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

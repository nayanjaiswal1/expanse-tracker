import React from 'react';
import { Plus, Clock, X, Wallet, Target, PiggyBank, Coins, RefreshCw } from 'lucide-react';
import { SummaryCards } from '../../../components/ui/SummaryCards';
import { Button } from '../../../components/ui/Button';
import { FlexBetween, HStack } from '../../../components/ui/Layout';

interface BudgetOverviewSidebarProps {
  totalBudgets: number;
  activeBudgets: number;
  totalBudgetAmount: string;
  totalSpent: string;
  onClose: () => void;
  onRefresh: () => void;
  onCreateBudget: () => void;
}

export const BudgetOverviewSidebar: React.FC<BudgetOverviewSidebarProps> = ({
  totalBudgets,
  activeBudgets,
  totalBudgetAmount,
  totalSpent,
  onClose,
  onRefresh,
  onCreateBudget,
}) => {
  const summaryCards = [
    {
      id: 'total-budgets',
      label: 'Total Budgets',
      value: totalBudgets,
      icon: Wallet,
      iconColor: 'text-blue-500',
    },
    {
      id: 'active-budgets',
      label: 'Active Budgets',
      value: activeBudgets,
      icon: Target,
      iconColor: 'text-green-500',
    },
    {
      id: 'total-budget-amount',
      label: 'Total Budgeted',
      value: totalBudgetAmount,
      icon: PiggyBank,
      iconColor: 'text-purple-500',
    },
    {
      id: 'total-spent',
      label: 'Total Spent',
      value: totalSpent,
      icon: Coins,
      iconColor: 'text-orange-500',
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

import React from 'react';
import {
  Plus,
  Eye,
  EyeOff,
  X,
  Target,
  TrendingUp,
  Coins,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';
import { SummaryCards } from '../../../components/ui/SummaryCards';
import { Button } from '../../../components/ui/Button';
import { FlexBetween, HStack } from '../../../components/ui/Layout';

interface GoalOverviewSidebarProps {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  totalTargetAmount: string;
  showAmounts: boolean;
  onClose: () => void;
  onToggleAmounts: () => void;
  onCreateGoal: () => void;
  onRefresh: () => void;
}

export const GoalOverviewSidebar: React.FC<GoalOverviewSidebarProps> = ({
  totalGoals,
  activeGoals,
  completedGoals,
  totalTargetAmount,
  showAmounts,
  onClose,
  onToggleAmounts,
  onCreateGoal,
  onRefresh,
}) => {
  const summaryCards = [
    {
      id: 'total-goals',
      label: 'Total goals',
      value: totalGoals,
      icon: Target,
      iconColor: 'text-blue-500',
    },
    {
      id: 'active-goals',
      label: 'Active goals',
      value: activeGoals,
      icon: TrendingUp,
      iconColor: 'text-green-500',
    },
    {
      id: 'completed-goals',
      label: 'Completed goals',
      value: completedGoals,
      icon: CheckCircle,
      iconColor: 'text-purple-500',
    },
    {
      id: 'total-target',
      label: 'Total target',
      value: showAmounts ? totalTargetAmount : '••••••',
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

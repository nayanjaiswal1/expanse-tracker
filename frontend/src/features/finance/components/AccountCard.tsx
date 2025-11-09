import React from 'react';
import { motion } from 'framer-motion';
import {
  Banknote,
  Landmark,
  PiggyBank,
  CreditCard,
  Briefcase,
  HandCoins,
  MoreVertical,
  Trash2,
  Edit,
  Eye,
} from 'lucide-react';
import type { Account, AccountType } from '../../../types';
import { useCurrency } from '../../../contexts/CurrencyContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../components/ui/DropdownMenu';
import { Button } from '../../../components/ui/Button';

interface AccountCardProps {
  account: Account;
  onSelect: (account: Account) => void;
  onEdit: (account: Account) => void;
  onDelete: (account: Account) => void;
  onViewDetails: (account: Account) => void;
  isSelected: boolean;
}

const accountIcons: Record<AccountType | 'other', React.ElementType> = {
  checking: Landmark,
  savings: PiggyBank,
  credit: CreditCard,
  investment: Briefcase,
  loan: Banknote,
  cash: HandCoins,
  other: Banknote,
};

const statusConfig: Record<string, { className: string; label: string }> = {
  active: {
    className: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    label: 'Active',
  },
  inactive: {
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
    label: 'Inactive',
  },
  closed: {
    className: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
    label: 'Closed',
  },
  frozen: {
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    label: 'Frozen',
  },
  pending: {
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300',
    label: 'Pending',
  },
};

export const AccountCard: React.FC<AccountCardProps> = ({
  account,
  onSelect,
  onEdit,
  onDelete,
  onViewDetails,
  isSelected,
}) => {
  const { formatCurrency } = useCurrency();
  const balance = parseFloat(account.balance) || 0;
  const isNegative = balance < 0;
  const formattedBalance = formatCurrency(Math.abs(balance), account.currency);

  const Icon = accountIcons[account.account_type as keyof typeof accountIcons] || Banknote;
  const statusInfo = statusConfig[account.status] || statusConfig.pending;

  return (
    <motion.div
      onClick={() => onSelect(account)}
      className={`relative w-80 flex-shrink-0 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all duration-200 cursor-pointer ${
        isSelected
          ? 'ring-2 ring-blue-500 dark:ring-blue-400'
          : 'hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600'
      }`}
      whileTap={{ scale: 0.99 }}
    >
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
              <Icon className="w-6 h-6 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white truncate">
                {account.name}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {account.institution || 'No Institution'}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onViewDetails(account)}>
                <Eye className="mr-2 h-4 w-4" />
                <span>View Details</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(account)}>
                <Edit className="mr-2 h-4 w-4" />
                <span>Edit</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(account)}
                className="text-red-600 dark:text-red-400"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-5 flex items-end justify-between">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400">Balance</span>
            <p
              className={`text-2xl font-semibold text-slate-800 dark:text-white ${isNegative ? 'text-red-500 dark:text-red-400' : ''}`}
            >
              {isNegative ? '-' : ''}
              {formattedBalance}
            </p>
          </div>
          <div className={`px-2 py-1 text-xs font-medium rounded-full ${statusInfo.className}`}>
            {statusInfo.label}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

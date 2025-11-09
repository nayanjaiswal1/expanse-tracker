import { useMemo, type ComponentType } from 'react';
import {
  Trash2,
  Copy,
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  Repeat,
  ShoppingCart,
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
} from 'lucide-react';
import type { Transaction } from '../../../types';
import { useToast } from '../../../components/ui/Toast';
import { getAccountIcon, isAccountIconUrl } from '../utils/accountIcons';
import { getCategoryIcon } from '../utils/categoryIcons';
import { FlexBetween, HStack } from '../../../components/ui/Layout';

interface TransactionCardListProps {
  transactions: Transaction[];
  accounts: Array<{ id: number; name: string; currency?: string; icon?: string }>;
  categories: Array<{ id: string; name: string }>;
  onDelete: (transaction: Transaction) => Promise<void>;
  onDuplicate: (transaction: Transaction) => Promise<void>;
}

const typeIconMap: Record<string, ComponentType<{ className?: string }>> = {
  income: ArrowUpCircle,
  expense: ArrowDownCircle,
  transfer: Repeat,
  buy: ShoppingCart,
  sell: TrendingUp,
  dividend: DollarSign,
  lend: ArrowUpRight,
  borrow: ArrowDownRight,
  repayment: ShieldCheck,
  default: ArrowDownCircle,
};

const positiveTypes = new Set<Transaction['transaction_type']>([
  'income',
  'sell',
  'dividend',
  'repayment',
]);

const formatDate = (date: string) => {
  try {
    return new Date(date).toLocaleDateString();
  } catch (error) {
    return date;
  }
};

export const TransactionCardList: React.FC<TransactionCardListProps> = ({
  transactions,
  accounts,
  categories,
  onDelete,
  onDuplicate,
}) => {
  const { showError, showSuccess } = useToast();

  const accountsMap = useMemo(
    () => new Map(accounts.map((account) => [String(account.id), account])),
    [accounts]
  );
  const categoriesMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories]
  );

  const handleDelete = async (transaction: Transaction) => {
    try {
      await onDelete(transaction);
      showSuccess('Transaction deleted');
    } catch (error) {
      console.error('Failed to delete transaction', error);
      showError('Failed to delete transaction');
    }
  };

  const handleDuplicate = async (transaction: Transaction) => {
    try {
      await onDuplicate(transaction);
      showSuccess('Transaction duplicated');
    } catch (error) {
      console.error('Failed to duplicate transaction', error);
      showError('Failed to duplicate transaction');
    }
  };

  return (
    <div className="space-y-3 pb-20">
      {transactions.map((transaction) => {
        const amountValue = parseFloat(transaction.amount || '0');
        const isPositive = positiveTypes.has(transaction.transaction_type);
        const formattedAmount = Number.isFinite(amountValue)
          ? `${isPositive ? '+' : '-'}${Math.abs(amountValue).toFixed(2)}`
          : transaction.amount;

        const account = accountsMap.get(String(transaction.account_id));
        const iconUrl = account?.icon && isAccountIconUrl(account.icon) ? account.icon : undefined;
        const AccountIcon = iconUrl ? null : getAccountIcon(account?.icon, Wallet);
        const category = transaction.category_id
          ? categoriesMap.get(transaction.category_id)
          : undefined;
        const TypeIcon = typeIconMap[transaction.transaction_type] || typeIconMap.default;

        return (
          <div
            key={transaction.id}
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm px-4 py-3"
          >
            <FlexBetween className="items-start">
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  {transaction.description || 'Untitled transaction'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {formatDate(transaction.date)}
                </div>
              </div>
              <HStack
                className={`text-sm font-semibold tabular-nums gap-1 ${
                  isPositive
                    ? 'text-emerald-600 dark:text-emerald-300'
                    : 'text-rose-600 dark:text-rose-300'
                }`}
              >
                <TypeIcon className="w-3.5 h-3.5" />
                {formattedAmount}
              </HStack>
            </FlexBetween>

            <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-gray-600 dark:text-gray-300">
              <HStack className="gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                  {iconUrl ? (
                    <img
                      src={iconUrl}
                      alt={`${account?.name || 'Account'} icon`}
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    AccountIcon && (
                      <AccountIcon className="w-3.5 h-3.5 text-primary-600 dark:text-primary-300" />
                    )
                  )}
                </span>
                <span className="font-medium text-sm text-gray-800 dark:text-gray-200">
                  {account?.name || 'No account'}
                </span>
                {account?.currency && (
                  <span className="text-[11px] text-gray-400 dark:text-gray-500">
                    {account.currency}
                  </span>
                )}
              </HStack>

              {category && (
                <HStack className="gap-2">
                  <span className="text-primary-500 dark:text-primary-300 flex items-center">
                    {getCategoryIcon(category.name)}
                  </span>
                  <span>{category.name}</span>
                </HStack>
              )}

              {transaction.merchant_name && (
                <HStack className="gap-2 text-gray-500 dark:text-gray-400">
                  <span className="uppercase tracking-wide text-[10px] font-semibold">
                    Merchant
                  </span>
                  <span>{transaction.merchant_name}</span>
                </HStack>
              )}

              <HStack className="gap-2 text-gray-500 dark:text-gray-400">
                <span className="uppercase tracking-wide text-[10px] font-semibold">Status</span>
                <span>{transaction.verified ? 'Verified' : 'Pending'}</span>
              </HStack>
            </div>

            <HStack className="mt-3 justify-end gap-2">
              <button
                onClick={() => handleDuplicate(transaction)}
                className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/40"
              >
                <Copy className="w-3.5 h-3.5" /> Duplicate
              </button>
              <button
                onClick={() => handleDelete(transaction)}
                className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-900/30 rounded-full hover:bg-rose-100 dark:hover:bg-rose-900/40"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </HStack>
          </div>
        );
      })}
    </div>
  );
};

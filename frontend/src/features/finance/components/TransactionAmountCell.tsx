import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowDownCircle,
  ArrowDownRight,
  ArrowUpCircle,
  ArrowUpRight,
  DollarSign,
  Repeat,
  ShieldCheck,
  ShoppingCart,
  TrendingUp,
} from 'lucide-react';
import type { Transaction, User } from '../../../types';
import { CurrencySymbol } from '../../../components/ui/CurrencySymbol';

const transactionTypeLabels: Record<Transaction['transaction_type'], string> = {
  income: 'Income',
  expense: 'Expense',
  transfer: 'Transfer',
  buy: 'Buy',
  sell: 'Sell',
  dividend: 'Dividend',
  lend: 'Lend',
  borrow: 'Borrow',
  repayment: 'Repayment',
};

const transactionTypeOrder: Transaction['transaction_type'][] = [
  'income',
  'expense',
  'transfer',
  'buy',
  'sell',
  'dividend',
  'lend',
  'borrow',
  'repayment',
];

const transactionTypeIconMap = {
  income: ArrowUpCircle,
  expense: ArrowDownCircle,
  transfer: Repeat,
  buy: ShoppingCart,
  sell: TrendingUp,
  dividend: DollarSign,
  lend: ArrowUpRight,
  borrow: ArrowDownRight,
  repayment: ShieldCheck,
} satisfies Record<Transaction['transaction_type'], typeof ArrowUpCircle>;

const transactionTypeStyles: Record<string, { iconBg: string; amountClass: string }> = {
  income: {
    iconBg: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300',
    amountClass: 'text-emerald-600 dark:text-emerald-300',
  },
  expense: {
    iconBg: 'bg-rose-100 text-rose-600 dark:bg-rose-900/20 dark:text-rose-300',
    amountClass: 'text-rose-600 dark:text-rose-300',
  },
  transfer: {
    iconBg: 'bg-sky-100 text-sky-600 dark:bg-sky-900/20 dark:text-sky-300',
    amountClass: 'text-sky-600 dark:text-sky-300',
  },
  buy: {
    iconBg: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-300',
    amountClass: 'text-indigo-600 dark:text-indigo-300',
  },
  sell: {
    iconBg: 'bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-300',
    amountClass: 'text-amber-600 dark:text-amber-300',
  },
  dividend: {
    iconBg: 'bg-teal-100 text-teal-600 dark:bg-teal-900/20 dark:text-teal-300',
    amountClass: 'text-teal-600 dark:text-teal-300',
  },
  lend: {
    iconBg: 'bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-300',
    amountClass: 'text-purple-600 dark:text-purple-300',
  },
  borrow: {
    iconBg: 'bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-300',
    amountClass: 'text-orange-600 dark:text-orange-300',
  },
  repayment: {
    iconBg: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300',
    amountClass: 'text-emerald-600 dark:text-emerald-300',
  },
  default: {
    iconBg: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-300',
    amountClass: 'text-gray-800 dark:text-gray-100',
  },
};

const positiveTransactionTypes = new Set<Transaction['transaction_type']>([
  'income',
  'sell',
  'dividend',
  'repayment',
]);

export type TransactionTableRow = Transaction & { category?: string };

interface TransactionAmountCellProps {
  transaction: TransactionTableRow;
  onTypeChange: (id: number, type: Transaction['transaction_type']) => void;
  user: User | null | undefined;
  showCurrency?: boolean;
}

export const TransactionAmountCell: React.FC<TransactionAmountCellProps> = ({
  transaction,
  onTypeChange,
  user,
  showCurrency = true,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (containerRef.current && !containerRef.current.contains(target)) {
        setMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [menuOpen]);

  const type = transaction.transaction_type || 'expense';
  const TypeIcon = transactionTypeIconMap[type] ?? ArrowDownCircle;
  const styles = transactionTypeStyles[type] || transactionTypeStyles.default;
  const isPositive = positiveTransactionTypes.has(type);
  const rawAmount = parseFloat(transaction.amount || '0');
  const displayAmount = Number.isFinite(rawAmount)
    ? Math.abs(rawAmount).toFixed(2)
    : transaction.amount;

  const handleSelect = (nextType: Transaction['transaction_type']) => {
    setMenuOpen(false);
    if (nextType !== type) {
      onTypeChange(transaction.id, nextType);
    }
  };

  return (
    <div ref={containerRef} className="relative flex h-8 items-center justify-between gap-2 px-2">
      <button
        type="button"
        onClick={() => setMenuOpen((prev) => !prev)}
        className={`group relative flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-transparent transition-colors ${styles.iconBg} hover:border-primary-200 dark:hover:border-primary-700`}
        aria-haspopup="true"
        aria-expanded={menuOpen}
        aria-label="Change transaction type"
      >
        <TypeIcon className="h-3.5 w-3.5" />
        <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[10px] font-semibold text-white opacity-0 shadow transition group-hover:opacity-100 dark:bg-gray-700">
          {transactionTypeLabels[type] || type}
        </span>
      </button>

      {menuOpen && (
        <div className="absolute top-8 left-0 z-50 w-44 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
          {transactionTypeOrder.map((option) => {
            const OptionIcon = transactionTypeIconMap[option] ?? ArrowDownCircle;
            const optionStyles = transactionTypeStyles[option] || transactionTypeStyles.default;
            const isActive = option === type;

            return (
              <button
                key={option}
                type="button"
                onClick={() => handleSelect(option)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-200'
                    : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800/60'
                }`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full ${optionStyles.iconBg}`}
                >
                  <OptionIcon className="h-3.5 w-3.5" />
                </span>
                <span className="flex-1 text-left">{transactionTypeLabels[option]}</span>
              </button>
            );
          })}
        </div>
      )}

      <div
        className={`flex items-baseline gap-0.5 text-sm font-medium tabular-nums ${styles.amountClass}`}
      >
        <span className="text-xs">{isPositive ? '+' : '-'}</span>
        {showCurrency && (
          <CurrencySymbol
            currency={transaction.currency}
            user={user}
            className="text-xs"
            ariaLabel={transaction.currency ? undefined : 'Default currency symbol'}
          />
        )}
        <span>{displayAmount}</span>
      </div>
    </div>
  );
};

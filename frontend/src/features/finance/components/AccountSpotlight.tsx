import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Plus,
  Wifi,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
  List,
} from 'lucide-react';

import type { Account, User } from '../../../types';
import { formatCurrency } from '../../../utils/preferences';

const animationStyleId = 'account-spotlight-animations';

const ensureAnimationsInjected = () => {
  if (typeof document === 'undefined') return;
  if (document.getElementById(animationStyleId)) return;

  const style = document.createElement('style');
  style.id = animationStyleId;
  style.textContent = `
    @keyframes spotlightFadeUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes spotlightSlideForward {
      from { opacity: 0; transform: translateX(35px) scale(0.98); }
      to { opacity: 1; transform: translateX(0) scale(1); }
    }
    @keyframes spotlightSlideBackward {
      from { opacity: 0; transform: translateX(-35px) scale(0.98); }
      to { opacity: 1; transform: translateX(0) scale(1); }
    }
    .spotlight-fade-up {
      animation: spotlightFadeUp 0.5s ease forwards;
    }
    .spotlight-slide-forward {
      animation: spotlightSlideForward 0.45s ease forwards;
    }
    .spotlight-slide-backward {
      animation: spotlightSlideBackward 0.45s ease forwards;
    }
  `;

  document.head.appendChild(style);
};

type CardTheme = {
  gradient: string;
  glow: string;
  accent: string;
};

const cardThemes: Record<string, CardTheme> = {
  checking: {
    gradient: 'from-slate-900 via-slate-900 to-slate-800',
    glow: 'shadow-[0_25px_80px_rgba(15,23,42,.45)]',
    accent: 'bg-slate-500/30',
  },
  savings: {
    gradient: 'from-emerald-600 via-emerald-500 to-teal-500',
    glow: 'shadow-[0_25px_80px_rgba(5,150,105,.45)]',
    accent: 'bg-teal-300/30',
  },
  credit: {
    gradient: 'from-indigo-600 via-indigo-500 to-purple-500',
    glow: 'shadow-[0_25px_80px_rgba(99,102,241,.45)]',
    accent: 'bg-purple-300/40',
  },
  investment: {
    gradient: 'from-orange-500 via-pink-500 to-rose-500',
    glow: 'shadow-[0_25px_80px_rgba(249,115,22,.45)]',
    accent: 'bg-orange-300/30',
  },
  loan: {
    gradient: 'from-amber-700 via-orange-600 to-amber-500',
    glow: 'shadow-[0_25px_80px_rgba(217,119,6,.45)]',
    accent: 'bg-amber-200/40',
  },
  cash: {
    gradient: 'from-lime-600 via-green-500 to-emerald-500',
    glow: 'shadow-[0_25px_80px_rgba(101,163,13,.45)]',
    accent: 'bg-lime-200/40',
  },
  other: {
    gradient: 'from-slate-800 via-slate-700 to-slate-900',
    glow: 'shadow-[0_25px_80px_rgba(30,41,59,.45)]',
    accent: 'bg-slate-500/20',
  },
};

const statusColors: Record<Account['status'], string> = {
  active: 'bg-emerald-500/20 text-emerald-200',
  inactive: 'bg-slate-500/30 text-slate-200',
  closed: 'bg-red-500/20 text-red-200',
  frozen: 'bg-amber-500/20 text-amber-200',
  pending: 'bg-blue-500/20 text-blue-200',
};

const getCardTheme = (account: Account): CardTheme => {
  return cardThemes[account.account_type] || cardThemes.other;
};

const maskAccountNumber = (account: Account) => {
  if (account.account_number_masked) return account.account_number_masked;
  if (account.account_number) {
    const trimmed = account.account_number.trim();
    if (trimmed.length <= 4) return trimmed;
    return `•••• ${trimmed.slice(-4)}`;
  }
  return '•••• 0000';
};

interface AccountSpotlightProps {
  accounts: Account[];
  totalBalance: number;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onAddAccount: () => void;
  onExpandList: () => void;
  onActiveAccountChange?: (account: Account) => void;
  user?: User | null;
  isLoading?: boolean;
}

export const AccountSpotlight: React.FC<AccountSpotlightProps> = ({
  accounts,
  totalBalance,
  searchValue,
  onSearchChange,
  onAddAccount,
  onExpandList,
  onActiveAccountChange,
  user,
  isLoading,
}) => {
  ensureAnimationsInjected();

  const safeAccounts = useMemo(() => accounts.filter(Boolean), [accounts]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [transitionDirection, setTransitionDirection] = useState<'forward' | 'backward' | null>(
    null
  );

  useEffect(() => {
    if (!safeAccounts.length) {
      setCurrentIndex(0);
      return;
    }
    setCurrentIndex((prev) => Math.min(prev, safeAccounts.length - 1));
  }, [safeAccounts.length]);

  const visibleCards = useMemo(() => {
    if (!safeAccounts.length) return null;
    const len = safeAccounts.length;
    const normalize = (index: number) => (index + len) % len;
    return {
      current: safeAccounts[normalize(currentIndex)],
      prev: safeAccounts[normalize(currentIndex - 1)],
      next: safeAccounts[normalize(currentIndex + 1)],
    };
  }, [safeAccounts, currentIndex]);

  useEffect(() => {
    if (visibleCards?.current && onActiveAccountChange) {
      onActiveAccountChange(visibleCards.current);
    }
  }, [visibleCards?.current?.id, visibleCards, onActiveAccountChange]);

  const handleNext = () => {
    if (safeAccounts.length <= 1) return;
    setTransitionDirection('forward');
    setCurrentIndex((prev) => (prev + 1) % safeAccounts.length);
  };

  const handlePrev = () => {
    if (safeAccounts.length <= 1) return;
    setTransitionDirection('backward');
    setCurrentIndex((prev) => (prev - 1 + safeAccounts.length) % safeAccounts.length);
  };

  useEffect(() => {
    if (!transitionDirection) return;
    const timeout = setTimeout(() => setTransitionDirection(null), 450);
    return () => clearTimeout(timeout);
  }, [transitionDirection]);

  const activeAccounts = safeAccounts.filter(
    (account) => account.status === 'active' || account.is_active
  );
  const institutions = new Set(
    safeAccounts.map((account) => account.institution?.trim()).filter(Boolean) as string[]
  );

  const totalBalanceDisplay = formatCurrency(totalBalance, user);

  if (isLoading) {
    return (
      <div className="rounded-3xl bg-slate-900/80 p-6 text-white shadow-2xl">
        <div className="h-6 w-40 animate-pulse rounded-full bg-white/10" />
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="h-24 rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
        <div className="mt-6 h-64 rounded-3xl bg-white/5 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white shadow-[0_30px_80px_rgba(2,6,23,0.65)]">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute -top-24 right-10 h-72 w-72 rounded-full bg-emerald-500/40 blur-[120px]" />
        <div className="absolute bottom-0 left-5 h-72 w-72 rounded-full bg-indigo-500/30 blur-[120px]" />
      </div>

      <div className="relative space-y-8 p-6 lg:p-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
          <div className="flex-1 space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Account hub</p>
            <h1 className="text-2xl font-semibold md:text-3xl">Everything about your balances</h1>
            <p className="text-sm text-white/70 md:text-base">
              Swipe through your most important accounts, spot trends instantly and jump into list
              view whenever you need more control.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
              <input
                className="w-full rounded-2xl border border-white/10 bg-white/10 py-3 pl-11 pr-4 text-sm text-white placeholder:text-white/60 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
                placeholder="Search by name, bank or type"
                value={searchValue}
                onChange={(event) => onSearchChange(event.target.value)}
              />
            </div>
            <button
              onClick={onAddAccount}
              className="flex items-center justify-center gap-2 rounded-2xl bg-white/90 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-white"
            >
              <Plus className="h-4 w-4" />
              Add account
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.2em] text-white/60">Total balance</p>
            <p className="mt-2 text-3xl font-semibold">{totalBalanceDisplay}</p>
            <div className="mt-3 flex items-center gap-1 text-xs text-emerald-200">
              <ArrowUpRight className="h-4 w-4" />
              <span>Consolidated across all accounts</span>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.2em] text-white/60">Active accounts</p>
            <p className="mt-2 text-3xl font-semibold">{activeAccounts.length}</p>
            <p className="mt-3 text-xs text-white/70">
              {safeAccounts.length} total • {institutions.size || 0} institutions
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.2em] text-white/60">Last updated</p>
            <p className="mt-2 text-3xl font-semibold">
              {visibleCards?.current?.updated_at
                ? new Date(visibleCards.current.updated_at).toLocaleDateString()
                : '—'}
            </p>
            <p className="mt-3 text-xs text-white/70">
              {visibleCards?.current?.name
                ? `Now focused on ${visibleCards.current.name}`
                : 'Awaiting data'}
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex gap-3">
              <button
                aria-label="Previous account"
                onClick={handlePrev}
                disabled={safeAccounts.length <= 1}
                className="rounded-2xl border border-white/10 bg-white/5 p-3 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                aria-label="Next account"
                onClick={handleNext}
                disabled={safeAccounts.length <= 1}
                className="rounded-2xl border border-white/10 bg-white/5 p-3 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            <button
              onClick={onExpandList}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/0 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              <List className="h-4 w-4" />
              Expand to list
            </button>
          </div>

          {!visibleCards ? (
            <div className="rounded-3xl border border-dashed border-white/20 bg-white/5 py-16 text-center">
              <p className="text-lg font-semibold">No accounts to show yet</p>
              <p className="mt-2 text-sm text-white/70">
                Add your first account to start using the interactive view.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center gap-6 md:gap-10">
                <SideCard account={visibleCards.prev} position="left" />
                <MainCard
                  account={visibleCards.current}
                  user={user}
                  transitionDirection={transitionDirection}
                  onClick={() =>
                    visibleCards.current && onActiveAccountChange?.(visibleCards.current)
                  }
                />
                <SideCard account={visibleCards.next} position="right" />
              </div>
              <div className="flex items-center justify-center gap-2">
                {safeAccounts.map((account, index) => (
                  <button
                    key={account.id}
                    onClick={() => setCurrentIndex(index)}
                    className={`h-2 rounded-full transition-all ${
                      index === currentIndex ? 'w-8 bg-white' : 'w-3 bg-white/40 hover:bg-white/70'
                    }`}
                    aria-label={`Show ${account.name}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

interface SideCardProps {
  account: Account;
  position: 'left' | 'right';
}

const SideCard: React.FC<SideCardProps> = ({ account, position }) => {
  const theme = getCardTheme(account);

  return (
    <div
      className={`relative w-48 cursor-pointer rounded-3xl bg-gradient-to-br ${theme.gradient} p-4 text-white opacity-60 transition duration-500 hover:opacity-80 ${
        position === 'left'
          ? '-mr-10 origin-right hover:rotate-1'
          : '-ml-10 origin-left hover:-rotate-1'
      }`}
    >
      <div className="absolute inset-0 opacity-30">
        <div className={`absolute top-0 right-0 h-24 w-24 rounded-full ${theme.accent} blur-3xl`} />
      </div>
      <div className="relative space-y-3">
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/70">
          {account.account_type}
        </p>
        <p className="text-sm font-semibold">{account.name}</p>
        <p className="text-lg font-bold">{formatCurrency(account.balance, account.currency)}</p>
      </div>
    </div>
  );
};

interface MainCardProps {
  account: Account;
  user?: User | null;
  transitionDirection: 'forward' | 'backward' | null;
  onClick?: () => void;
}

const MainCard: React.FC<MainCardProps> = ({ account, user, transitionDirection, onClick }) => {
  const theme = getCardTheme(account);
  const statusColor = statusColors[account.status] || 'bg-slate-500/30 text-slate-200';
  const balanceValue = parseFloat(account.balance?.toString() || '0');
  const balanceIsPositive = balanceValue >= 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick?.();
        }
      }}
      className={`relative h-72 w-full max-w-md cursor-pointer rounded-[32px] border border-white/10 bg-gradient-to-br ${theme.gradient} p-8 text-white shadow-2xl transition hover:scale-[1.01] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
        theme.glow
      } ${transitionDirection ? `spotlight-slide-${transitionDirection === 'forward' ? 'forward' : 'backward'}` : 'spotlight-fade-up'}`}
    >
      <div className="absolute inset-0 opacity-20">
        <div
          className={`absolute -top-5 -right-5 h-32 w-32 rounded-full ${theme.accent} blur-3xl`}
        />
        <div className="absolute inset-4 rounded-[28px] border border-white/10" />
        <div className="absolute right-10 top-10 h-20 w-20 rounded-full border border-white/20" />
      </div>

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-white/60">
            {account.account_type}
          </p>
          <h3 className="mt-2 text-2xl font-semibold">{account.name}</h3>
        </div>
        <Wifi className="h-6 w-6 rotate-90 text-white/70" />
      </div>

      <div className="relative mt-6 space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-white/60">Balance</p>
        <div className="flex items-baseline gap-2">
          <p className="text-4xl font-bold">{formatCurrency(balanceValue, user)}</p>
          {balanceValue !== 0 && (
            <>
              {balanceIsPositive ? (
                <ArrowUpRight className="h-4 w-4 text-emerald-200" />
              ) : (
                <ArrowDownLeft className="h-4 w-4 text-rose-200" />
              )}
            </>
          )}
        </div>
        {account.available_balance && account.available_balance !== account.balance && (
          <p className="text-xs text-white/80">
            Available {formatCurrency(account.available_balance, user)}
          </p>
        )}
      </div>

      <div className="relative mt-8 flex items-center justify-between text-xs">
        <div>
          <p className="text-white/60">Account</p>
          <p className="font-mono text-sm font-semibold">{maskAccountNumber(account)}</p>
        </div>
        <div className="text-right">
          <p className="text-white/60">Institution</p>
          <p className="font-semibold">{account.institution || '—'}</p>
        </div>
      </div>

      <div className="relative mt-6 flex items-center justify-between text-xs">
        <span className={`rounded-full px-3 py-1 font-semibold ${statusColor}`}>
          {account.status}
        </span>
        <span className="text-white/70">
          Updated{' '}
          {account.updated_at ? new Date(account.updated_at).toLocaleDateString() : 'Recently'}
        </span>
      </div>
    </div>
  );
};

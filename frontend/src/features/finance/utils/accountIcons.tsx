import type { LucideIcon } from 'lucide-react';
import {
  Wallet,
  CreditCard,
  PiggyBank,
  Briefcase,
  Coins,
  Building,
  Banknote,
  Home,
} from 'lucide-react';

export const accountIconMap: Record<string, LucideIcon> = {
  wallet: Wallet,
  'credit-card': CreditCard,
  'piggy-bank': PiggyBank,
  briefcase: Briefcase,
  coins: Coins,
  building: Building,
  bank: Building,
  loan: Home,
  cash: Banknote,
};

export const isAccountIconUrl = (icon?: string): boolean =>
  typeof icon === 'string' && /^(https?:\/\/|data:image)/i.test(icon.trim());

export const getAccountIcon = (icon?: string, fallback: LucideIcon = Wallet): LucideIcon => {
  if (!icon) {
    return fallback;
  }
  return accountIconMap[icon] || fallback;
};

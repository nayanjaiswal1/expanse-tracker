import React from 'react';
import type { User } from '../../types';
import { getCurrencySymbol, resolveCurrencyCode } from '../../utils/preferences';

interface CurrencySymbolProps {
  currency?: string | null;
  user?: User | null;
  className?: string;
  ariaLabel?: string;
}

export const CurrencySymbol: React.FC<CurrencySymbolProps> = ({
  currency,
  user,
  className,
  ariaLabel,
}) => {
  const fallbackCode =
    user?.preferences?.preferred_currency ??
    user?.preferred_currency ??
    user?.default_currency ??
    undefined;

  const code = resolveCurrencyCode(currency ?? user ?? fallbackCode, fallbackCode);
  const symbol = getCurrencySymbol(code);

  return (
    <span className={className} aria-hidden={ariaLabel ? undefined : true} aria-label={ariaLabel}>
      {symbol}
    </span>
  );
};

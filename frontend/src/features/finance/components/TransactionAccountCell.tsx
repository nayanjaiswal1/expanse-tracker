import React, { useMemo } from 'react';
import { Wallet } from 'lucide-react';
import { getAccountIcon, isAccountIconUrl } from '../utils/accountIcons';
import { SelectCell } from '../../../components/ui/NotionTable';
import type { Transaction } from '../../../types';

interface TransactionAccountCellProps {
  transaction: Transaction & { account?: number | null };
  options: Array<{ value: string; label: string; color?: string; icon?: string }>;
  onChange: (id: number, value: string | null) => void;
}

export const TransactionAccountCell: React.FC<TransactionAccountCellProps> = ({
  transaction,
  options,
  onChange,
}) => {
  const value = useMemo(() => {
    if (transaction.account_id !== undefined && transaction.account_id !== null) {
      return String(transaction.account_id);
    }
    if (transaction.account !== undefined && transaction.account !== null) {
      return String(transaction.account);
    }
    return '';
  }, [transaction.account_id, transaction.account]);

  const accountOption = options.find((opt) => opt.value === value);
  const iconUrl =
    accountOption?.icon && isAccountIconUrl(accountOption.icon) ? accountOption.icon : null;
  const AccountIcon = iconUrl ? null : getAccountIcon(accountOption?.icon, Wallet);
  const accountColor = accountOption?.color || '#3b82f6';

  return (
    <div className="flex h-8 items-center gap-2">
      {accountOption && (
        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          {iconUrl ? (
            <img
              src={iconUrl}
              alt={`${accountOption.label} icon`}
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            AccountIcon && <AccountIcon className="h-3.5 w-3.5" style={{ color: accountColor }} />
          )}
        </span>
      )}
      <div className="flex-1">
        <SelectCell
          value={value}
          options={options}
          onChange={(newValue) => onChange(transaction.id, newValue || null)}
          placeholder="Select account"
        />
      </div>
    </div>
  );
};

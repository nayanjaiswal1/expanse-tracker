import React from 'react';
import { AccountCard } from './AccountCard';
import type { Account } from '../../../types';

interface AccountGridProps {
  accounts: Account[];
  showBalances: boolean;
  user: { id: number; currency?: string } | string;
  dragOverAccount: number | null;
  selectedAccountForHistory: Account | null;
  onAccountEdit: (account: Account) => void;
  onAccountDelete: (account: Account) => void;
  onAccountSelect: (account: Account) => void;
  onDragOver: (e: React.DragEvent, accountId: number) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, accountId: number) => void;
}

export const AccountGrid: React.FC<AccountGridProps> = ({
  accounts,
  showBalances,
  user,
  dragOverAccount,
  selectedAccountForHistory,
  onAccountEdit,
  onAccountDelete,
  onAccountSelect,
  onDragOver,
  onDragLeave,
  onDrop,
}) => {
  return (
    <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
      {accounts.map((account) => (
        <AccountCard
          key={account.id}
          account={account}
          showBalances={showBalances}
          isDraggedOver={dragOverAccount === account.id}
          isSelected={selectedAccountForHistory?.id === account.id}
          user={user}
          onEdit={onAccountEdit}
          onDelete={onAccountDelete}
          onSelect={onAccountSelect}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        />
      ))}
    </div>
  );
};

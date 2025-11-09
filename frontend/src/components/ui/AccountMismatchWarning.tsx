import React from 'react';
import { Alert } from './Alert';
import { Button } from './Button';

interface Account {
  id: number;
  name: string;
  account_type: string;
}

interface AccountMismatchWarningProps {
  detectedAccount: Account;
  selectedAccount: Account;
  onSwitchAccount: (account: Account) => void;
}

export const AccountMismatchWarning: React.FC<AccountMismatchWarningProps> = ({
  detectedAccount,
  selectedAccount,
  onSwitchAccount,
}) => {
  if (detectedAccount.id === selectedAccount.id) {
    return null;
  }

  return (
    <Alert variant="warning" title="Account Mismatch Detected">
      <div className="flex items-start justify-between">
        <div>
          <p>
            We detected this statement belongs to <strong>{detectedAccount.name}</strong>, but you
            selected <strong>{selectedAccount.name}</strong>.
          </p>
          <p className="text-sm mt-1">Consider switching to the detected account for accuracy.</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => onSwitchAccount(detectedAccount)}>
          Use {detectedAccount.name}
        </Button>
      </div>
    </Alert>
  );
};

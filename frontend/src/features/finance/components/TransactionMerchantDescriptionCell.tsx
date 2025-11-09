import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import type { Transaction } from '../../../types';

interface TransactionMerchantDescriptionCellProps {
  transaction: Transaction;
  onChange: (id: number, merchant: string, description: string) => void;
}

export const TransactionMerchantDescriptionCell = ({
  transaction,
  onChange,
}: TransactionMerchantDescriptionCellProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Format the initial value as "merchant | description" or just the available value
  useEffect(() => {
    const merchant = transaction.merchant_name || '';
    const description = transaction.description || '';

    if (merchant && description) {
      setValue(`${merchant} | ${description}`);
    } else if (merchant) {
      setValue(merchant);
    } else if (description) {
      setValue(description);
    } else {
      setValue('');
    }
  }, [transaction.merchant_name, transaction.description]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const parseValue = (inputValue: string): { merchant: string; description: string } => {
    // Split by the separator "|"
    const parts = inputValue.split('|').map((part) => part.trim());

    if (parts.length >= 2) {
      // If there are 2+ parts, first is merchant, rest is description
      const merchant = parts[0];
      const description = parts.slice(1).join(' | '); // In case there are multiple "|"
      return { merchant, description };
    } else if (parts.length === 1) {
      // If only one part, treat it as description
      return { merchant: '', description: parts[0] };
    }

    return { merchant: '', description: '' };
  };

  const handleSave = () => {
    const { merchant, description } = parseValue(value);

    // Only call onChange if values actually changed
    if (
      merchant !== (transaction.merchant_name || '') ||
      description !== (transaction.description || '')
    ) {
      onChange(transaction.id, merchant, description);
    }

    setIsEditing(false);
  };

  const handleCancel = () => {
    // Reset to original value
    const merchant = transaction.merchant_name || '';
    const description = transaction.description || '';

    if (merchant && description) {
      setValue(`${merchant} | ${description}`);
    } else if (merchant) {
      setValue(merchant);
    } else if (description) {
      setValue(description);
    } else {
      setValue('');
    }

    setIsEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    } else if (e.key === 'Tab') {
      handleSave();
    }
  };

  if (!isEditing) {
    const merchant = transaction.merchant_name;
    const description = transaction.description;

    return (
      <div
        onClick={() => setIsEditing(true)}
        className="flex h-8 cursor-text items-center px-3 py-1 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
      >
        {merchant && description ? (
          <span className="truncate text-sm text-gray-900 dark:text-gray-100">
            <span className="font-medium">{merchant}</span>
            <span className="mx-1.5 text-gray-400 dark:text-gray-500">|</span>
            <span className="text-gray-600 dark:text-gray-400">{description}</span>
          </span>
        ) : merchant ? (
          <span className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
            {merchant}
          </span>
        ) : description ? (
          <span className="truncate text-sm text-gray-900 dark:text-gray-100">{description}</span>
        ) : (
          <span className="truncate text-sm italic text-gray-400 dark:text-gray-500">
            No description
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-8 items-center px-3 py-1">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        placeholder="Merchant | Description"
        className="m-0 w-full border-none bg-transparent p-0 text-sm text-gray-900 outline-none focus:ring-0 dark:text-gray-100"
        style={{ boxShadow: 'none', height: '20px' }}
      />
    </div>
  );
};

import type { TableConfig } from '../../../types/table';
import type { Transaction, User } from '../../../types';
import { Copy, Trash2 } from 'lucide-react';
import type { TransactionTableRow } from '../components/TransactionAmountCell';
import { TransactionAmountCell } from '../components/TransactionAmountCell';
import { TransactionAccountCell } from '../components/TransactionAccountCell';
import { TransactionTagsCell } from '../components/TransactionTagsCell';
import { TransactionCategoryCell } from '../components/TransactionCategoryCell';
import { TransactionMerchantDescriptionCell } from '../components/TransactionMerchantDescriptionCell';

export const createTransactionTableConfig = (
  accounts: Array<{ id: number; name: string; color?: string; icon?: string }>,
  categories: Array<{ id: string; name: string; color?: string }>,
  authState: { user?: User | null } | null,
  columnSizing: Record<string, number> | undefined,
  onFieldUpdate: (id: number, field: keyof Transaction, value: unknown) => void,
  showCurrency: boolean = true,
  onMultiFieldUpdate?: (id: number, fields: Partial<Transaction>) => void
): TableConfig<TransactionTableRow> => {
  const accountOptions = accounts.map((acc) => ({
    value: acc.id.toString(),
    label: acc.name,
    color: acc.color,
    icon: acc.icon,
  }));

  const categoryOptions = categories.map((cat) => ({
    value: cat.id,
    label: cat.name,
    color: cat.color,
  }));

  return {
    title: 'Transactions',
    subtitle: 'Manage all your financial transactions',
    enableSearch: false, // Disabled: using backend search via TransactionFilters component
    enableRowSelection: true,
    enableUndo: true,
    enableAutoSave: true,
    autoSaveDelay: 2000,
    searchPlaceholder: 'Search transactions...',
    emptyMessage:
      'No transactions found. Start by importing a bank statement or adding a transaction manually.',

    columns: [
      {
        id: 'sr_no',
        accessorKey: 'id',
        header: '#',
        size: columnSizing?.sr_no || 60,
        editable: false,
        renderCell: (_value: unknown, _row: TransactionTableRow, index?: number) => (
          <div className="flex h-8 items-center justify-center px-3 py-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {index !== undefined ? index + 1 : 0}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'date',
        header: 'Date',
        size: columnSizing?.date || 120,
        type: 'text',
        editable: true,
        placeholder: 'YYYY-MM-DD',
      },
      {
        id: 'merchant_description',
        accessorKey: 'description',
        header: 'Merchant / Description',
        size: columnSizing?.description || 300,
        editable: true,
        renderCell: (_value: unknown, row: TransactionTableRow, _i, helpers) => (
          <TransactionMerchantDescriptionCell
            transaction={row}
            onChange={(id, merchant, description) => {
              // Use multi-field update if available, otherwise fall back to individual updates
              if (onMultiFieldUpdate) {
                onMultiFieldUpdate(id, {
                  merchant_name: merchant,
                  description: description,
                });
              } else {
                // Fallback to individual field updates
                onFieldUpdate(id, 'merchant_name', merchant);
                onFieldUpdate(id, 'description', description);
              }

              // Update the local state through helpers if available
              if (helpers?.update) {
                helpers.update(id, description);
              }
            }}
          />
        ),
      },
      {
        accessorKey: 'amount',
        header: 'Amount',
        size: columnSizing?.amount || 150,
        editable: false,
        renderCell: (_value: unknown, row: TransactionTableRow) => (
          <TransactionAmountCell
            transaction={row}
            onTypeChange={(id, type) => onFieldUpdate(id, 'transaction_type', type)}
            user={authState?.user ?? null}
            showCurrency={showCurrency}
          />
        ),
      },
      {
        accessorKey: 'account_id',
        header: 'Account',
        size: columnSizing?.account || 180,
        type: 'select',
        options: accountOptions,
        editable: true,
        placeholder: 'Select account',
        renderCell: (_value: unknown, row: TransactionTableRow, _i, helpers) => (
          <TransactionAccountCell
            transaction={row}
            options={accountOptions}
            onChange={(id, value) => {
              helpers?.update?.(id, value);
              onFieldUpdate(id, 'account_id', value);
            }}
          />
        ),
      },
      {
        accessorKey: 'category_id',
        header: 'Category',
        size: columnSizing?.category || 180,
        type: 'select',
        options: categoryOptions,
        editable: true,
        placeholder: 'No category',
        renderCell: (_value: unknown, row: TransactionTableRow, _i, helpers) => (
          <TransactionCategoryCell
            transaction={row}
            options={categoryOptions}
            onChange={(id, value) => {
              helpers?.update?.(id, value);
              onFieldUpdate(id, 'category_id', value);
            }}
          />
        ),
      },
      {
        accessorKey: 'tags',
        header: 'Tags',
        size: columnSizing?.tags || 150,
        editable: false,
        renderCell: (value: unknown) => <TransactionTagsCell tags={(value as string[]) || []} />,
      },
      {
        accessorKey: 'notes',
        header: 'Notes',
        size: columnSizing?.notes || 200,
        type: 'text',
        editable: true,
      },
    ],

    initialColumnSizing: columnSizing,

    rowActions: [
      {
        label: 'Duplicate',
        action: 'duplicate',
        icon: <Copy className="h-4 w-4" />,
      },
      {
        label: 'Delete',
        action: 'delete',
        icon: <Trash2 className="h-4 w-4 text-red-600" />,
      },
    ],
  };
};

import React from 'react';
import { Loader2, Paperclip, PlusCircle, Send, UploadCloud } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import type {
  FinanceAssistantDockProps,
  FinanceAssistantFormState,
} from './FinanceAssistantDock.types';
import { FlexBetween, HStack } from '../../../components/ui/Layout';

type FinanceAssistantFormProps = {
  accounts: FinanceAssistantDockProps['accounts'];
  categories: FinanceAssistantDockProps['categories'];
  formData: FinanceAssistantFormState;
  onFormChange: (
    field: keyof FinanceAssistantFormState
  ) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void | Promise<void>;
  isSending: boolean;
  isCreating: boolean;
  attachment: File | null;
  onAttachmentClick: () => void;
  onAttachmentChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAttachment: () => void;
  invoiceAccount: string;
  onInvoiceAccountChange: (value: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onCreateTransaction: () => void | Promise<void>;
  onReset: () => void;
};

export const FinanceAssistantForm: React.FC<FinanceAssistantFormProps> = ({
  accounts,
  categories,
  formData,
  onFormChange,
  input,
  onInputChange,
  onSend,
  isSending,
  isCreating,
  attachment,
  onAttachmentClick,
  onAttachmentChange,
  onRemoveAttachment,
  invoiceAccount,
  onInvoiceAccountChange,
  fileInputRef,
  onCreateTransaction,
  onReset,
}) => (
  <div className="space-y-3">
    <div>
      <FlexBetween className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        <span>Message</span>
        {attachment && (
          <Button type="button" onClick={onRemoveAttachment} variant="link-danger">
            Remove attachment
          </Button>
        )}
      </FlexBetween>
      <div className="relative mt-1">
        <textarea
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          rows={2}
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 pr-14 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-primary-400"
          placeholder={
            attachment
              ? 'Add notes for the receipt (optional)'
              : 'Describe the transaction or ask for insights...'
          }
        />
        <HStack gap={1} className="absolute bottom-1.5 right-2">
          <Button
            type="button"
            onClick={onAttachmentClick}
            variant="icon-circle-muted"
            title="Attach receipt or document"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            onClick={onSend}
            disabled={isSending}
            variant="primary-circle"
            size="none"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </HStack>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.heic"
        className="hidden"
        onChange={onAttachmentChange}
      />
      {attachment && (
        <FlexBetween className="mt-2 rounded-lg bg-gray-100 px-3 py-2 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
          <HStack gap={2}>
            <UploadCloud className="h-4 w-4" />
            <span className="truncate">{attachment.name}</span>
          </HStack>
          <span className="text-[11px] text-gray-400">Will parse with OCR</span>
        </FlexBetween>
      )}
    </div>

    {attachment && (
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
            Assign to account
          </label>
          <select
            value={invoiceAccount}
            onChange={(event) => onInvoiceAccountChange(event.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
            Default currency
          </label>
          <Input value={formData.currency} onChange={onFormChange('currency')} placeholder="USD" />
        </div>
      </div>
    )}

    <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-3 py-3 text-xs text-gray-600 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
      <HStack gap={2} className="text-sm font-semibold text-gray-800 dark:text-gray-100">
        <PlusCircle className="h-4 w-4" />
        <p>Transaction details</p>
      </HStack>
      <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
        I populate these automatically. Adjust anything before tapping "Create transaction".
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
            Amount
          </label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={formData.amount}
            onChange={onFormChange('amount')}
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
            Type
          </label>
          <select
            value={formData.transaction_type}
            onChange={onFormChange('transaction_type')}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          >
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="transfer">Transfer</option>
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
            <option value="dividend">Dividend</option>
            <option value="lend">Lend</option>
            <option value="borrow">Borrow</option>
            <option value="repayment">Repayment</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
            Account
          </label>
          <select
            value={formData.account_id}
            onChange={onFormChange('account_id')}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          >
            <option value="">Select account</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
            Category
          </label>
          <select
            value={formData.category_id}
            onChange={onFormChange('category_id')}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          >
            <option value="">No category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
            Merchant
          </label>
          <Input
            value={formData.merchant_name}
            onChange={onFormChange('merchant_name')}
            placeholder="Optional"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
            Date
          </label>
          <Input type="date" value={formData.date} onChange={onFormChange('date')} />
        </div>
      </div>
      <FlexBetween className="mt-3 gap-3">
        <Button
          type="button"
          onClick={onCreateTransaction}
          disabled={isCreating}
          className="flex-1 gap-2"
        >
          {isCreating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <PlusCircle className="h-4 w-4" />
          )}
          Create transaction
        </Button>
        <Button type="button" variant="secondary" onClick={onReset}>
          Reset
        </Button>
      </FlexBetween>
    </div>
  </div>
);

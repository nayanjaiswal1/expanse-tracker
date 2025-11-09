import type { Transaction } from '../types';

/**
 * Helper functions for working with the optimized transaction model
 */

/**
 * Get the transaction type from the new optimized model
 * Provides backward compatibility with the old transaction_type field
 */
export function getTransactionType(
  transaction: Transaction
):
  | 'income'
  | 'expense'
  | 'transfer'
  | 'buy'
  | 'sell'
  | 'dividend'
  | 'lend'
  | 'borrow'
  | 'repayment' {
  // If old transaction_type exists, use it
  if (transaction.transaction_type) {
    return transaction.transaction_type;
  }

  // Otherwise, derive from new fields
  const subtype = transaction.transaction_subtype || transaction.metadata?.transaction_subtype;

  if (subtype === 'transfer') return 'transfer';
  if (subtype === 'lending') {
    // Check metadata for lending-specific type
    const lendingType = transaction.metadata?.lending_type;
    if (lendingType === 'lend') return 'lend';
    if (lendingType === 'borrow') return 'borrow';
    if (lendingType === 'repayment') return 'repayment';
  }
  if (subtype === 'investment') {
    const investmentType = transaction.metadata?.investment_action;
    if (investmentType === 'buy') return 'buy';
    if (investmentType === 'sell') return 'sell';
    if (investmentType === 'dividend') return 'dividend';
  }

  // Default based on is_credit
  return transaction.is_credit ? 'income' : 'expense';
}

/**
 * Get the merchant name from transaction
 * Handles both old merchant_name field and new transaction_group
 */
export function getMerchantName(transaction: Transaction): string | undefined {
  return transaction.transaction_group?.name || transaction.merchant_name;
}

/**
 * Check if a transaction is income (money in)
 */
export function isIncome(transaction: Transaction): boolean {
  return transaction.is_credit === true;
}

/**
 * Check if a transaction is expense (money out)
 */
export function isExpense(transaction: Transaction): boolean {
  return transaction.is_credit === false && getTransactionType(transaction) === 'expense';
}

/**
 * Check if a transaction is a transfer
 */
export function isTransfer(transaction: Transaction): boolean {
  const subtype = transaction.transaction_subtype || transaction.metadata?.transaction_subtype;
  return subtype === 'transfer' || getTransactionType(transaction) === 'transfer';
}

/**
 * Get the display amount with proper sign
 * Positive for income, negative for expenses
 */
export function getDisplayAmount(transaction: Transaction): number {
  const amount =
    typeof transaction.amount === 'string' ? parseFloat(transaction.amount) : transaction.amount;

  return transaction.is_credit ? amount : -amount;
}

/**
 * Format transaction for display
 */
export function formatTransaction(transaction: Transaction): {
  type: string;
  typeLabel: string;
  merchantName?: string;
  displayAmount: number;
  isIncome: boolean;
  isExpense: boolean;
  isTransfer: boolean;
} {
  const type = getTransactionType(transaction);

  const typeLabels: Record<string, string> = {
    income: 'Income',
    expense: 'Expense',
    transfer: 'Transfer',
    buy: 'Buy',
    sell: 'Sell',
    dividend: 'Dividend',
    lend: 'Lent',
    borrow: 'Borrowed',
    repayment: 'Repayment',
  };

  return {
    type,
    typeLabel: typeLabels[type] || type,
    merchantName: getMerchantName(transaction),
    displayAmount: getDisplayAmount(transaction),
    isIncome: isIncome(transaction),
    isExpense: isExpense(transaction),
    isTransfer: isTransfer(transaction),
  };
}

/**
 * Prepare transaction data for API submission
 * Converts UI model to backend model
 */
export function prepareTransactionForSubmit(data: Partial<Transaction>): any {
  const payload: any = {
    date: data.date,
    description: data.description,
    currency: data.currency || 'USD',
    notes: data.notes,
    status: data.status || 'active',
    is_credit: data.is_credit,
    account_id: data.account_id || data.account,
    transaction_group_id: data.transaction_group_id,
    tags: data.tags || [],
  };

  if (data.amount !== undefined) {
    payload.amount = typeof data.amount === 'number' ? data.amount.toString() : data.amount;
  }

  // Build metadata object
  const metadata: any = { ...(data.metadata || {}) };

  if (data.category_id !== undefined) metadata.category_id = data.category_id;
  if (data.suggested_category_id !== undefined)
    metadata.suggested_category_id = data.suggested_category_id;
  if (data.original_description !== undefined)
    metadata.original_description = data.original_description;
  if (data.transfer_account_id !== undefined)
    metadata.transfer_account_id = data.transfer_account_id;
  if (data.gmail_message_id !== undefined) metadata.gmail_message_id = data.gmail_message_id;
  if (data.verified !== undefined) metadata.verified = data.verified;
  if (data.confidence_score !== undefined) metadata.confidence_score = data.confidence_score;
  if (data.source !== undefined) metadata.source = data.source;
  if (data.transaction_subtype !== undefined)
    metadata.transaction_subtype = data.transaction_subtype;
  if (data.transaction_category !== undefined)
    metadata.transaction_category = data.transaction_category;
  if (data.investment_id !== undefined) metadata.investment_id = data.investment_id;
  if (data.investment_symbol !== undefined) metadata.investment_symbol = data.investment_symbol;
  if (data.quantity !== undefined) metadata.quantity = data.quantity;
  if (data.price_per_unit !== undefined) metadata.price_per_unit = data.price_per_unit;
  if (data.fees !== undefined) metadata.fees = data.fees;

  payload.metadata = metadata;

  // Map old fields to new structure for backward compatibility
  if (data.transaction_type) {
    const typeMapping: Record<string, { is_credit: boolean; subtype: string }> = {
      income: { is_credit: true, subtype: 'income' },
      expense: { is_credit: false, subtype: 'expense' },
      transfer: { is_credit: false, subtype: 'transfer' },
      buy: { is_credit: false, subtype: 'investment' },
      sell: { is_credit: true, subtype: 'investment' },
      dividend: { is_credit: true, subtype: 'investment' },
      lend: { is_credit: false, subtype: 'lending' },
      borrow: { is_credit: true, subtype: 'lending' },
      repayment: { is_credit: true, subtype: 'lending' },
    };

    const mapping = typeMapping[data.transaction_type];
    if (mapping) {
      payload.is_credit = mapping.is_credit;
      payload.metadata.transaction_subtype = mapping.subtype;

      if (
        data.transaction_type === 'buy' ||
        data.transaction_type === 'sell' ||
        data.transaction_type === 'dividend'
      ) {
        payload.metadata.investment_action = data.transaction_type;
      }
      if (
        data.transaction_type === 'lend' ||
        data.transaction_type === 'borrow' ||
        data.transaction_type === 'repayment'
      ) {
        payload.metadata.lending_type = data.transaction_type;
      }
    }
  }

  return payload;
}

/**
 * Get category ID from transaction (handles both old and new structure)
 */
export function getCategoryId(transaction: Transaction): number | undefined {
  return transaction.category_id || transaction.metadata?.category_id;
}

/**
 * Check if transaction has line items/details
 */
export function hasLineItems(transaction: Transaction): boolean {
  return (
    transaction.has_details || (transaction.details && transaction.details.length > 0) || false
  );
}

/**
 * Get transaction source label
 */
export function getSourceLabel(source: string): string {
  const sourceLabels: Record<string, string> = {
    manual: 'Manual Entry',
    gmail: 'Gmail',
    csv: 'CSV Import',
    splitwise: 'Splitwise',
    sms: 'SMS',
    invoice: 'Invoice',
    bank_sync: 'Bank Sync',
  };

  return sourceLabels[source] || source;
}

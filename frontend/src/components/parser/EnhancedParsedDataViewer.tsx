import { useState, useEffect, useMemo } from 'react';
import { X, Edit2, Save, Download, Upload } from 'lucide-react';
import { apiClient } from '../../api/client';
import toast from 'react-hot-toast';
import { checkboxClassName } from '../ui/Checkbox';
import { Button } from '../ui/Button';
import { FlexBetween, FlexCenter, FlexStart, HStack } from '../ui/Layout';
import type { Transaction } from '../../types';
import { prepareTransactionForSubmit } from '../../utils/transactionHelpers';

interface ParsedData {
  file_name: string;
  num_pages: number;
  pages?: PageData[];
  document_type?: 'statement' | 'invoice' | 'receipt' | 'unknown';
  extracted_transactions?: ExtractedTransaction[];
  account_info?: AccountInfo;
  quality_score?: number;
  detection_confidence?: number;
  parsing_status?: 'success' | 'partial' | 'failed';
  validation?: ValidationResult;
  metadata?: any;
}

interface ValidationResult {
  is_valid: boolean;
  warnings: string[];
  suggestions: string[];
}

interface PageData {
  page_number: number;
  text_blocks: TextBlock[];
  tables: Table[];
}

interface TextBlock {
  bbox: [number, number, number, number];
  text: string;
  type: string;
}

interface Table {
  bbox: [number, number, number, number];
  rows: string[][];
  row_count: number;
  col_count: number;
}

interface ExtractedTransaction {
  id?: string;
  date: string;
  description: string;
  amount: string;
  type: 'debit' | 'credit';
  balance?: string;
  category?: string;
  selected: boolean;
}

type TransactionInState = ExtractedTransaction & { id: string; selected: boolean };

interface Account {
  id: number;
  name: string;
  account_type: string;
}

interface AccountInfo {
  account_number?: string;
  account_name?: string;
  opening_balance?: string;
  closing_balance?: string;
  statement_period?: string;
  bank?: string;
  card_number?: string;
  credit_limit?: string;
  available_credit?: string;
  invoice_number?: string;
  merchant?: {
    name?: string;
    phone?: string;
  };
}

interface EnhancedParsedDataViewerProps {
  data: ParsedData;
  onImportComplete?: () => void;
}

export function EnhancedParsedDataViewer({
  data,
  onImportComplete,
}: EnhancedParsedDataViewerProps) {
  const [transactions, setTransactions] = useState<TransactionInState[]>(
    extractTransactionsFromData(data)
  );
  const accountInfo = useMemo(() => extractAccountInfo(data), [data]);
  const [selectedAccount, setSelectedAccount] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);

  // Load accounts on mount
  useEffect(() => {
    loadAccounts();
  }, []);

  async function loadAccounts() {
    try {
      const accountList = await apiClient.getAccounts();
      setAccounts(accountList);
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  }

  function toggleSelectAll() {
    const allSelected = transactions.every((t) => t.selected);
    setTransactions(transactions.map((t) => ({ ...t, selected: !allSelected })));
  }

  function toggleTransaction(id: string) {
    setTransactions(transactions.map((t) => (t.id === id ? { ...t, selected: !t.selected } : t)));
  }

  function updateTransaction(id: string, field: keyof ExtractedTransaction, value: any) {
    setTransactions(transactions.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
  }

  function deleteTransaction(id: string) {
    setTransactions(transactions.filter((t) => t.id !== id));
  }

  async function handleImport() {
    if (!selectedAccount) {
      return;
    }

    const selectedTransactions = transactions.filter((t) => t.selected);
    if (selectedTransactions.length === 0) {
      return;
    }

    setIsImporting(true);
    try {
      const results = await Promise.all(
        selectedTransactions.map((transaction) => {
          const rawAmount = normaliseAmount(transaction.amount);
          const subtype = mapTransactionSubtype(transaction.type);
          const isCredit = subtype === 'income';
          const payload = prepareTransactionForSubmit({
            account_id: selectedAccount,
            amount: Math.abs(rawAmount),
            description: transaction.description,
            date: transaction.date,
            currency: 'USD',
            is_credit: isCredit,
            transaction_subtype: subtype,
            category_id: transaction.category ? Number(transaction.category) : undefined,
            source: 'statement_upload',
            metadata: {
              balance: transaction.balance,
            },
            tags: [],
            verified: false,
          });

          return apiClient.createTransaction(payload);
        })
      );

      // Remove imported transactions
      setTransactions(transactions.filter((t) => !t.selected));

      if (onImportComplete) {
        onImportComplete();
      }
    } catch (error: any) {
    } finally {
      setIsImporting(false);
    }
  }

  function exportToCSV() {
    const headers = ['Date', 'Description', 'Amount', 'Type', 'Balance', 'Category'];
    const rows = transactions.map((t) => [
      t.date,
      t.description,
      t.amount,
      t.type,
      t.balance || '',
      t.category || '',
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${data.file_name.replace(/\.[^/.]+$/, '')}_transactions.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const selectedCount = transactions.filter((t) => t.selected).length;

  const getDocumentTypeColor = (type?: string) => {
    switch (type) {
      case 'statement':
        return 'bg-blue-100 text-blue-800';
      case 'invoice':
        return 'bg-green-100 text-green-800';
      case 'receipt':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getQualityColor = (score?: number) => {
    if (!score) return 'text-gray-500';
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-4">
      {/* Document Type and Quality Indicators */}
      {(data.document_type || data.quality_score !== undefined) && (
        <HStack gap={3} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
          {data.document_type && (
            <HStack gap={2}>
              <span className="text-sm text-gray-600">Type:</span>
              <span
                className={`px-2 py-1 text-xs font-medium rounded-full ${getDocumentTypeColor(data.document_type)}`}
              >
                {data.document_type.charAt(0).toUpperCase() + data.document_type.slice(1)}
              </span>
            </HStack>
          )}
          {data.quality_score !== undefined && (
            <HStack gap={2} className="border-l border-gray-300 pl-3">
              <span className="text-sm text-gray-600">Quality:</span>
              <span className={`text-sm font-semibold ${getQualityColor(data.quality_score)}`}>
                {(data.quality_score * 100).toFixed(0)}%
              </span>
            </HStack>
          )}
          {data.detection_confidence !== undefined && (
            <HStack gap={2} className="border-l border-gray-300 pl-3">
              <span className="text-sm text-gray-600">Confidence:</span>
              <span className="text-sm font-medium text-gray-700">
                {(data.detection_confidence * 100).toFixed(0)}%
              </span>
            </HStack>
          )}
        </HStack>
      )}

      {/* Validation Warnings */}
      {data.validation && data.validation.warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <HStack gap={2} className="font-semibold text-yellow-900 mb-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            Validation Warnings
          </HStack>
          <ul className="space-y-1 text-sm text-yellow-800">
            {data.validation.warnings.map((warning, idx) => (
              <li key={idx}>
                <FlexStart gap={2}>
                  <span className="mt-1">•</span>
                  <span>{warning}</span>
                </FlexStart>
              </li>
            ))}
          </ul>
          {data.validation.suggestions.length > 0 && (
            <div className="mt-3 pt-3 border-t border-yellow-300">
              <h5 className="font-medium text-yellow-900 mb-1">Suggestions:</h5>
              <ul className="space-y-1 text-sm text-yellow-700">
                {data.validation.suggestions.map((suggestion, idx) => (
                  <li key={idx}>
                    <FlexStart gap={2}>
                      <span className="mt-1">→</span>
                      <span>{suggestion}</span>
                    </FlexStart>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Account/Merchant Information */}
      {accountInfo && Object.keys(accountInfo).length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">
            {data.document_type === 'invoice' || data.document_type === 'receipt'
              ? 'Merchant Information'
              : 'Account Information'}
          </h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {/* Bank Statement Fields */}
            {accountInfo.bank && (
              <div>
                <span className="text-gray-600">Bank:</span>{' '}
                <span className="font-medium">{accountInfo.bank}</span>
              </div>
            )}
            {accountInfo.account_number && (
              <div>
                <span className="text-gray-600">Account:</span>{' '}
                <span className="font-medium">{accountInfo.account_number}</span>
              </div>
            )}
            {accountInfo.statement_period && (
              <div>
                <span className="text-gray-600">Period:</span>{' '}
                <span className="font-medium">{accountInfo.statement_period}</span>
              </div>
            )}
            {accountInfo.opening_balance && (
              <div>
                <span className="text-gray-600">Opening Balance:</span>{' '}
                <span className="font-medium">{accountInfo.opening_balance}</span>
              </div>
            )}
            {accountInfo.closing_balance && (
              <div>
                <span className="text-gray-600">Closing Balance:</span>{' '}
                <span className="font-medium">{accountInfo.closing_balance}</span>
              </div>
            )}
            {/* Credit Card Fields */}
            {accountInfo.card_number && (
              <div>
                <span className="text-gray-600">Card:</span>{' '}
                <span className="font-medium">{accountInfo.card_number}</span>
              </div>
            )}
            {accountInfo.credit_limit && (
              <div>
                <span className="text-gray-600">Credit Limit:</span>{' '}
                <span className="font-medium">{accountInfo.credit_limit}</span>
              </div>
            )}
            {accountInfo.available_credit && (
              <div>
                <span className="text-gray-600">Available Credit:</span>{' '}
                <span className="font-medium">{accountInfo.available_credit}</span>
              </div>
            )}
            {/* Invoice Fields */}
            {accountInfo.invoice_number && (
              <div>
                <span className="text-gray-600">Invoice #:</span>{' '}
                <span className="font-medium">{accountInfo.invoice_number}</span>
              </div>
            )}
            {accountInfo.merchant && typeof accountInfo.merchant === 'object' && (
              <>
                {accountInfo.merchant.name && (
                  <div className="col-span-2">
                    <span className="text-gray-600">Merchant:</span>{' '}
                    <span className="font-medium">{accountInfo.merchant.name}</span>
                  </div>
                )}
                {accountInfo.merchant.phone && (
                  <div>
                    <span className="text-gray-600">Phone:</span>{' '}
                    <span className="font-medium">{accountInfo.merchant.phone}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Action Bar */}
      <FlexBetween className="bg-gray-50 p-3 rounded-lg border border-gray-200">
        <HStack gap={3}>
          <select
            value={selectedAccount || ''}
            onChange={(e) => setSelectedAccount(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Account</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.account_type})
              </option>
            ))}
          </select>
          <span className="text-sm text-gray-600">
            {selectedCount} of {transactions.length} selected
          </span>
        </HStack>
        <HStack gap={2}>
          <Button
            onClick={exportToCSV}
            variant="outline-soft"
            size="none"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
          <Button
            onClick={handleImport}
            disabled={isImporting || selectedCount === 0 || !selectedAccount}
            variant="primary"
            size="none"
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm shadow-none"
          >
            <Upload className="w-4 h-4" />
            {isImporting
              ? 'Importing...'
              : `Import ${selectedCount > 0 ? `(${selectedCount})` : ''}`}
          </Button>
        </HStack>
      </FlexBetween>

      {/* Transactions Table */}
      {transactions.length > 0 ? (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-12 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={transactions.every((t) => t.selected)}
                      onChange={toggleSelectAll}
                      className={checkboxClassName}
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Balance
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className={`hover:bg-gray-50 ${transaction.selected ? 'bg-blue-50' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={transaction.selected}
                        onChange={() => toggleTransaction(transaction.id)}
                        className={checkboxClassName}
                      />
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {editingId === transaction.id ? (
                        <input
                          type="date"
                          value={transaction.date}
                          onChange={(e) =>
                            updateTransaction(transaction.id, 'date', e.target.value)
                          }
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        transaction.date
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {editingId === transaction.id ? (
                        <input
                          type="text"
                          value={transaction.description}
                          onChange={(e) =>
                            updateTransaction(transaction.id, 'description', e.target.value)
                          }
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        transaction.description
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium">
                      {editingId === transaction.id ? (
                        <input
                          type="number"
                          step="0.01"
                          value={transaction.amount}
                          onChange={(e) =>
                            updateTransaction(transaction.id, 'amount', e.target.value)
                          }
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                        />
                      ) : (
                        <span
                          className={
                            transaction.type === 'debit' ? 'text-red-600' : 'text-green-600'
                          }
                        >
                          {transaction.type === 'debit' ? '-' : '+'}
                          {transaction.amount}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          transaction.type === 'credit'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {transaction.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-600">
                      {transaction.balance || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <FlexCenter gap={2}>
                        {editingId === transaction.id ? (
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                            title="Save"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => setEditingId(transaction.id)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteTransaction(transaction.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </FlexCenter>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-600">No transactions extracted from this document</p>
          <p className="text-sm text-gray-500 mt-2">Try uploading a bank statement or invoice</p>
        </div>
      )}
    </div>
  );
}

// Helper function to extract transactions from parsed data
function extractTransactionsFromData(data: ParsedData): TransactionInState[] {
  if (data.extracted_transactions && data.extracted_transactions.length > 0) {
    return data.extracted_transactions.map((t, index) => ({
      ...t,
      id: t.id ?? `extracted-${index}`,
      selected: t.selected ?? true,
    }));
  }

  const transactions: TransactionInState[] = [];

  // Simple extraction from tables
  data.pages?.forEach((page) => {
    page.tables.forEach((table) => {
      // Skip header row
      const dataRows = table.rows.slice(1);

      dataRows.forEach((row, index) => {
        // Try to parse transaction from row
        const transaction = parseTransactionFromRow(row, `${page.page_number}-${index}`);
        if (transaction) {
          transactions.push(transaction);
        }
      });
    });
  });

  return transactions;
}

function parseTransactionFromRow(row: string[], id: string): TransactionInState | null {
  // Simple heuristic parsing - can be enhanced
  if (row.length < 3) return null;

  // Try to find date, description, and amount columns
  let date = '';
  let description = '';
  let amount = '';
  let balance = '';
  let type: 'debit' | 'credit' = 'debit';

  for (let i = 0; i < row.length; i++) {
    const cell = row[i].trim();

    // Check if it's a date
    if (!date && /\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/.test(cell)) {
      date = cell;
    }
    // Check if it's an amount
    else if (/^-?[\d,]+\.?\d*$/.test(cell.replace(/[,$]/g, ''))) {
      if (!amount) {
        amount = cell.replace(/[,$]/g, '');
        if (cell.startsWith('-')) {
          type = 'debit';
          amount = amount.substring(1);
        } else {
          type = 'credit';
        }
      } else if (!balance) {
        balance = cell.replace(/[,$]/g, '');
      }
    }
    // Treat as description
    else if (cell && !description) {
      description = cell;
    }
  }

  if (date && description && amount) {
    return {
      id,
      date,
      description,
      amount,
      type,
      balance,
      selected: true,
    };
  }

  return null;
}

function extractAccountInfo(data: ParsedData): AccountInfo {
  if (data.account_info) {
    return data.account_info;
  }
  const info: AccountInfo = {};

  // Extract from text blocks
  const allText = data.pages?.flatMap((p) => p.text_blocks.map((b) => b.text)).join('\n') ?? '';

  // Simple regex patterns
  const accountNumberMatch = allText.match(/Account\s*(?:Number|No\.?)?\s*:?\s*([\d\s-]+)/i);
  if (accountNumberMatch) {
    info.account_number = accountNumberMatch[1].trim();
  }

  const openingBalanceMatch = allText.match(/Opening\s*Balance\s*:?\s*([\d,]+\.?\d*)/i);
  if (openingBalanceMatch) {
    info.opening_balance = openingBalanceMatch[1];
  }

  const closingBalanceMatch = allText.match(/Closing\s*Balance\s*:?\s*([\d,]+\.?\d*)/i);
  if (closingBalanceMatch) {
    info.closing_balance = closingBalanceMatch[1];
  }

  return info;
}
const normaliseAmount = (value: string): number => {
  const numericValue = Number(value.replace(/[^\d.-]/g, ''));
  if (!Number.isFinite(numericValue)) {
    return 0;
  }
  return numericValue;
};

const mapTransactionSubtype = (type: ExtractedTransaction['type']): 'income' | 'expense' =>
  type === 'credit' ? 'income' : 'expense';

import React, { useState, useMemo } from 'react';
import { AlertCircle, Check, X } from 'lucide-react';
import { ParsedInvoiceData, InvoiceLineItem, invoiceApi } from '../../../api/invoiceApi';
import { useAccounts, useCategories } from '../../../hooks/finance';
import { formatCurrency } from '../../../utils/preferences';
import { useAuth } from '../../../contexts/AuthContext';
import { Button } from '../../../components/ui/Button';

interface InvoiceReviewFormProps {
  parsedData: ParsedInvoiceData;
  onSuccess: () => void;
  onCancel: () => void;
}

const InvoiceReviewForm: React.FC<InvoiceReviewFormProps> = ({
  parsedData,
  onSuccess,
  onCancel,
}) => {
  const { state: authState } = useAuth();
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();

  const [accountId, setAccountId] = useState<number | ''>('');
  const [date, setDate] = useState(
    parsedData.invoice_date || new Date().toISOString().split('T')[0]
  );
  const [merchantName, setMerchantName] = useState(parsedData.merchant_details?.name || '');
  const [invoiceNumber, setInvoiceNumber] = useState(parsedData.invoice_number || '');
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>(
    parsedData.line_items.map((item) => ({ ...item, selected: true }))
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const expenseCategories = useMemo(() => {
    if (!categories) return [];
    return categories.filter(
      (cat: any) => cat.category_type === 'expense' || cat.category_type === 'both'
    );
  }, [categories]);

  const totalAmount = useMemo(() => {
    return lineItems
      .filter((item) => item.selected)
      .reduce((sum, item) => sum + Number(item.total_price), 0);
  }, [lineItems]);

  const handleLineItemChange = (index: number, field: keyof InvoiceLineItem, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const handleToggleLineItem = (index: number) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], selected: !updated[index].selected };
    setLineItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!accountId) {
      setError('Please select an account');
      return;
    }

    if (!merchantName.trim()) {
      setError('Please enter merchant name');
      return;
    }

    const selectedItems = lineItems.filter((item) => item.selected);
    if (selectedItems.length === 0) {
      setError('Please select at least one line item');
      return;
    }

    setIsSubmitting(true);

    try {
      await invoiceApi.approveInvoice({
        account_id: Number(accountId),
        date,
        merchant_name: merchantName,
        invoice_number: invoiceNumber,
        total_amount: totalAmount,
        currency: parsedData.currency || 'USD',
        notes,
        line_items: selectedItems,
        tax_amount: parsedData.tax_details?.total_tax
          ? Number(parsedData.tax_details.total_tax)
          : undefined,
        payment_method: parsedData.payment_method,
      });

      onSuccess();
    } catch (error: any) {
      console.error('Invoice approval error:', error);
      setError(error.response?.data?.error || 'Failed to import invoice. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Account <span className="text-red-500">*</span>
          </label>
          <select
            value={accountId}
            onChange={(e) => setAccountId(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select account</option>
            {accounts?.map((account: any) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Merchant Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={merchantName}
            onChange={(e) => setMerchantName(e.target.value)}
            placeholder="Enter merchant name"
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Invoice Number
          </label>
          <input
            type="text"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            placeholder="Optional"
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes"
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Line Items</h3>
        <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-10">
                    <input
                      type="checkbox"
                      checked={lineItems.every((item) => item.selected)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setLineItems(lineItems.map((item) => ({ ...item, selected: checked })));
                      }}
                      className="rounded border-gray-300 dark:border-slate-600"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32">
                    Qty
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32">
                    Price
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-48">
                    Category
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                {lineItems.map((item, index) => (
                  <tr
                    key={index}
                    className={item.selected ? '' : 'opacity-50 bg-gray-50 dark:bg-slate-700/30'}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => handleToggleLineItem(index)}
                        className="rounded border-gray-300 dark:border-slate-600"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                        disabled={!item.selected}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        step="0.01"
                        value={item.quantity || ''}
                        onChange={(e) =>
                          handleLineItemChange(
                            index,
                            'quantity',
                            e.target.value ? Number(e.target.value) : undefined
                          )
                        }
                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                        disabled={!item.selected}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        step="0.01"
                        value={item.total_price}
                        onChange={(e) =>
                          handleLineItemChange(index, 'total_price', Number(e.target.value))
                        }
                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                        disabled={!item.selected}
                        required={item.selected}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={item.category_id || ''}
                        onChange={(e) =>
                          handleLineItemChange(
                            index,
                            'category_id',
                            e.target.value ? Number(e.target.value) : undefined
                          )
                        }
                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                        disabled={!item.selected}
                      >
                        <option value="">Select category</option>
                        {expenseCategories.map((category: any) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 dark:bg-slate-700/50">
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Total:
                  </td>
                  <td
                    colSpan={2}
                    className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white"
                  >
                    {formatCurrency(totalAmount, authState.user)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
        <Button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          variant="outline-neutral-lg"
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} variant="primary-with-icon">
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              Importing...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              Import Invoice
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

export default InvoiceReviewForm;

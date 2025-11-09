import React, { useState } from 'react';
import { Save, X, Edit2, Check, CheckSquare, Square } from 'lucide-react';
import { Button } from './Button';
import { formatCurrency } from '../../utils/preferences';

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category?: string;
  type: 'income' | 'expense' | 'transfer';
  merchant?: string;
  confidence?: number;
  status: 'pending' | 'verified' | 'edited' | 'error';
}

interface Category {
  id: string;
  name: string;
}

interface TransactionEditRowProps {
  transaction: Transaction;
  categories: Category[];
  isSelected: boolean;
  isEditing: boolean;
  authUser: any;
  onSelect: (selected: boolean) => void;
  onEdit: (id: string, field: keyof Transaction, value: any) => void;
  onStartEdit: () => void;
  onStopEdit: () => void;
}

export const TransactionEditRow: React.FC<TransactionEditRowProps> = ({
  transaction,
  categories,
  isSelected,
  isEditing,
  authUser,
  onSelect,
  onEdit,
  onStartEdit,
  onStopEdit,
}) => {
  const [editValues, setEditValues] = useState({
    date: transaction.date,
    description: transaction.description,
    amount: transaction.amount,
    category: transaction.category || '',
    type: transaction.type,
  });

  const handleSave = () => {
    Object.entries(editValues).forEach(([field, value]) => {
      onEdit(transaction.id, field as keyof Transaction, value);
    });
    onStopEdit();
  };

  const handleCancel = () => {
    setEditValues({
      date: transaction.date,
      description: transaction.description,
      amount: transaction.amount,
      category: transaction.category || '',
      type: transaction.type,
    });
    onStopEdit();
  };

  const getStatusColor = (status: Transaction['status']) => {
    switch (status) {
      case 'verified':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'edited':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    }
  };

  return (
    <tr
      className={`hover:bg-gray-50 dark:hover:bg-gray-800 ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
    >
      {/* Selection checkbox */}
      <td className="px-4 py-3">
        <button onClick={() => onSelect(!isSelected)}>
          {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
        </button>
      </td>

      {/* Date */}
      <td className="px-4 py-3">
        {isEditing ? (
          <input
            type="date"
            value={editValues.date}
            onChange={(e) => setEditValues((prev) => ({ ...prev, date: e.target.value }))}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
          />
        ) : (
          <span className="text-sm text-gray-900 dark:text-white">
            {new Date(transaction.date).toLocaleDateString()}
          </span>
        )}
      </td>

      {/* Description */}
      <td className="px-4 py-3">
        {isEditing ? (
          <input
            type="text"
            value={editValues.description}
            onChange={(e) => setEditValues((prev) => ({ ...prev, description: e.target.value }))}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
          />
        ) : (
          <div>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {transaction.description}
            </span>
            {transaction.merchant && (
              <div className="text-xs text-gray-500 dark:text-gray-400">{transaction.merchant}</div>
            )}
          </div>
        )}
      </td>

      {/* Amount */}
      <td className="px-4 py-3">
        {isEditing ? (
          <input
            type="number"
            step="0.01"
            value={editValues.amount}
            onChange={(e) =>
              setEditValues((prev) => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))
            }
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
          />
        ) : (
          <span
            className={`text-sm font-medium ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}
          >
            {transaction.type === 'income' ? '+' : '-'}
            {formatCurrency(Math.abs(transaction.amount), authUser)}
          </span>
        )}
      </td>

      {/* Category */}
      <td className="px-4 py-3">
        {isEditing ? (
          <select
            value={editValues.category}
            onChange={(e) => setEditValues((prev) => ({ ...prev, category: e.target.value }))}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
          >
            <option value="">Select category...</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {transaction.category || 'Uncategorized'}
          </span>
        )}
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <span
          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(transaction.status)}`}
        >
          {transaction.status}
        </span>
        {transaction.confidence && (
          <div className="text-xs text-gray-500 mt-1">
            {Math.round(transaction.confidence * 100)}% confidence
          </div>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        {isEditing ? (
          <div className="flex items-center space-x-1">
            <Button onClick={handleSave} variant="icon-success" size="none">
              <Save className="w-4 h-4" />
            </Button>
            <Button onClick={handleCancel} variant="icon-danger" size="none">
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center space-x-1">
            <Button onClick={onStartEdit} variant="icon-primary" size="none">
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button
              onClick={() =>
                onEdit(
                  transaction.id,
                  'status',
                  transaction.status === 'verified' ? 'pending' : 'verified'
                )
              }
              variant="icon-success"
              size="none"
            >
              <Check className="w-4 h-4" />
            </Button>
          </div>
        )}
      </td>
    </tr>
  );
};

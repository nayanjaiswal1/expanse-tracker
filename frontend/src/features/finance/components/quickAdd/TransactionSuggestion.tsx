import React, { useState } from 'react';
import {
  DollarSign,
  Calendar,
  Tag,
  Users,
  TrendingDown,
  TrendingUp,
  Edit2,
  Check,
  X,
} from 'lucide-react';
import type { ChatMessage as ChatMessageType } from '../../../../api/modules/quickAdd';

interface TransactionSuggestionProps {
  message: ChatMessageType;
  onSave: (edits?: any) => void;
}

export const TransactionSuggestion: React.FC<TransactionSuggestionProps> = ({
  message,
  onSave,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({
    amount: message.metadata?.parsed?.amount || 0,
    description: message.metadata?.parsed?.description || '',
    category: message.metadata?.parsed?.category || '',
    date: message.metadata?.parsed?.date || new Date().toISOString().split('T')[0],
    is_expense: message.metadata?.parsed?.is_expense ?? true,
  });

  const parsed = message.metadata?.parsed;
  const confidence = parsed?.confidence || 0;
  const mentions = parsed?.mentions || [];

  // Get confidence color
  const getConfidenceColor = (conf: number) => {
    if (conf >= 90) return 'text-green-600 bg-green-50';
    if (conf >= 70) return 'text-yellow-600 bg-yellow-50';
    return 'text-orange-600 bg-orange-50';
  };

  // Handle save
  const handleSave = () => {
    const edits: any = {};

    // Only include changed fields
    if (editedData.amount !== parsed?.amount) edits.amount = editedData.amount;
    if (editedData.description !== parsed?.description) edits.description = editedData.description;
    if (editedData.category !== parsed?.category) edits.category = editedData.category;
    if (editedData.date !== parsed?.date) edits.date = editedData.date;
    if (editedData.is_expense !== parsed?.is_expense) edits.is_expense = editedData.is_expense;

    onSave(Object.keys(edits).length > 0 ? edits : undefined);
    setIsEditing(false);
  };

  // Handle cancel
  const handleCancel = () => {
    setEditedData({
      amount: parsed?.amount || 0,
      description: parsed?.description || '',
      category: parsed?.category || '',
      date: parsed?.date || new Date().toISOString().split('T')[0],
      is_expense: parsed?.is_expense ?? true,
    });
    setIsEditing(false);
  };

  return (
    <div className="flex justify-center">
      <div className="max-w-md w-full bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-4 shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {editedData.is_expense ? (
              <TrendingDown className="text-red-600" size={20} />
            ) : (
              <TrendingUp className="text-green-600" size={20} />
            )}
            <span className="font-semibold text-gray-900">
              {editedData.is_expense ? 'Expense' : 'Income'}
            </span>
          </div>

          {/* Confidence Badge */}
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(confidence)}`}>
            {confidence}% confident
          </div>
        </div>

        {/* Amount */}
        <div className="mb-3">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <DollarSign className="text-gray-400" size={20} />
              <input
                type="number"
                value={editedData.amount}
                onChange={(e) => setEditedData({ ...editedData, amount: parseFloat(e.target.value) })}
                className="flex-1 px-3 py-2 border rounded-lg text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                step="0.01"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <DollarSign className="text-gray-600" size={24} />
              <span className="text-3xl font-bold text-gray-900">
                {editedData.amount.toFixed(2)}
              </span>
              <span className="text-lg text-gray-500">{parsed?.currency || 'USD'}</span>
            </div>
          )}
        </div>

        {/* Description */}
        <div className="mb-3">
          {isEditing ? (
            <input
              type="text"
              value={editedData.description}
              onChange={(e) => setEditedData({ ...editedData, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Description"
            />
          ) : (
            <p className="text-gray-700 font-medium">{editedData.description}</p>
          )}
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          {/* Category */}
          <div className="flex items-center gap-2 text-sm">
            <Tag className="text-gray-400" size={16} />
            {isEditing ? (
              <input
                type="text"
                value={editedData.category}
                onChange={(e) => setEditedData({ ...editedData, category: e.target.value })}
                className="flex-1 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Category"
              />
            ) : (
              <span className="text-gray-600">{editedData.category || 'Uncategorized'}</span>
            )}
          </div>

          {/* Date */}
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="text-gray-400" size={16} />
            {isEditing ? (
              <input
                type="date"
                value={editedData.date}
                onChange={(e) => setEditedData({ ...editedData, date: e.target.value })}
                className="flex-1 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <span className="text-gray-600">
                {new Date(editedData.date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            )}
          </div>
        </div>

        {/* Mentions */}
        {mentions.length > 0 && (
          <div className="mb-3 p-2 bg-white rounded-lg">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
              <Users size={14} />
              <span className="font-medium">Mentioned:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {mentions.map((mention, idx) => (
                <span
                  key={idx}
                  className={`px-2 py-0.5 rounded-full text-xs ${
                    mention.found
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  @{mention.text}
                  {!mention.found && ' (not found)'}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Split Info */}
        {parsed?.split_with && parsed.split_with.length > 0 && (
          <div className="mb-3 p-2 bg-white rounded-lg">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users size={14} />
              <span className="font-medium">
                Split {parsed.split_method || 'equally'} with {parsed.split_with.length} people
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 font-medium"
              >
                <Check size={18} />
                Save
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center gap-2 font-medium"
              >
                <X size={18} />
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onSave()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                disabled={message.status === 'completed'}
              >
                {message.status === 'completed' ? 'Saved ✓' : 'Save Transaction'}
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                disabled={message.status === 'completed'}
              >
                <Edit2 size={16} />
                Edit
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

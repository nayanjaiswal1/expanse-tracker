import React, { useState } from 'react';
import { Calendar, ArrowUpRight, ArrowDownLeft, ArrowRight } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';
import { Button } from '../../../components/ui/Button';
import { FlexBetween, HStack } from '../../../components/ui/Layout';
import { useCreateLendingTransaction } from '../hooks/useIndividualLending';

interface QuickTransactionInputProps {
  contactId: number;
  onTransactionAdded: () => void;
}

export const QuickTransactionInput: React.FC<QuickTransactionInputProps> = ({
  contactId,
  onTransactionAdded,
}) => {
  const [input, setInput] = useState('');
  const [type, setType] = useState<'lend' | 'borrow'>('lend');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const createTransaction = useCreateLendingTransaction();
  const { showSuccess, showError } = useToast();

  // Smart parsing function to extract amount and description
  const parseInput = (value: string) => {
    if (!value.trim()) return { amount: '', description: '', isNegative: false };

    // Check for negative sign at the beginning
    const isNegative = value.trim().startsWith('-');
    const cleanValue = value.replace(/^-/, '').trim();

    // Extract number from the beginning or anywhere in the string
    const numberMatch = cleanValue.match(/^(\d+(?:\.\d{1,2})?)/);

    if (numberMatch) {
      const amount = numberMatch[1];
      // Get the rest as description, removing the number part
      const description = cleanValue.replace(numberMatch[0], '').trim();
      return { amount, description, isNegative };
    }

    // If no number found at start, look for any number in the string
    const anyNumberMatch = cleanValue.match(/(\d+(?:\.\d{1,2})?)/);
    if (anyNumberMatch) {
      const amount = anyNumberMatch[1];
      // Get everything except the number as description
      const description = cleanValue.replace(anyNumberMatch[0], '').trim();
      return { amount, description, isNegative };
    }

    // No number found, treat entire input as description
    return { amount: '', description: cleanValue, isNegative };
  };

  // Smart description suggestions based on amount
  const getSmartDescription = (amount: number) => {
    if (amount >= 3 && amount <= 8) return 'Coffee';
    if (amount >= 10 && amount <= 25) return 'Lunch';
    if (amount >= 25 && amount <= 60) return 'Dinner';
    if (amount >= 8 && amount <= 15) return 'Snacks';
    if (amount >= 50 && amount <= 150) return 'Groceries';
    if (amount >= 20 && amount <= 50) return 'Gas/Fuel';
    if (amount >= 100 && amount <= 500) return 'Shopping';
    if (amount >= 200 && amount <= 800) return 'Rent help';
    if (amount >= 500 && amount <= 2000) return 'Emergency fund';
    if (amount >= 1000) return 'Large expense';
    return 'Quick transaction';
  };

  const handleInputChange = (value: string) => {
    setInput(value);

    const parsed = parseInput(value);
    if (parsed.isNegative) {
      setType('borrow');
    } else if (parsed.amount) {
      setType('lend');
    }
  };

  const getParsedData = () => {
    const parsed = parseInput(input);
    const amount = parsed.amount ? parseFloat(parsed.amount) : 0;
    const description = parsed.description || (amount > 0 ? getSmartDescription(amount) : '');
    return { amount, description, parsed };
  };

  const handleSubmit = async () => {
    const { amount, description } = getParsedData();

    if (!amount || amount <= 0) {
      showError('Invalid amount', 'Please enter a valid amount');
      return;
    }

    try {
      await createTransaction.mutateAsync({
        contact_user_id: contactId,
        amount: amount,
        description: description,
        type: type,
        due_date: date,
      });

      showSuccess(
        'Transaction created!',
        `Successfully recorded ${description.toLowerCase()} - ${type === 'lend' ? 'money lent' : 'money borrowed'}`
      );

      // Reset form
      setInput('');
      setType('lend');
      setDate(new Date().toISOString().split('T')[0]);
      onTransactionAdded();
    } catch (error) {
      showError('Failed to create transaction', 'Please try again');
    }
  };

  const { amount, description } = getParsedData();

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
      {/* Type Indicator - Moved to top */}
      {amount > 0 && (
        <HStack className="mb-2 justify-center">
          <span
            className={`text-xs px-2 py-1 rounded-full ${
              type === 'borrow'
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
            }`}
          >
            {type === 'borrow' ? 'You will borrow' : 'You will lend'} ${amount.toFixed(2)} for{' '}
            {description.toLowerCase()} on {new Date(date).toLocaleDateString()}
          </span>
        </HStack>
      )}

      {/* WhatsApp/Telegram Style Input */}
      <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-2">
        {/* Single Smart Input Row */}
        <HStack gap={2}>
          {/* Date Picker */}
          <div className="relative">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-8 h-8 opacity-0 absolute cursor-pointer"
            />
            <Button variant="icon-muted" className="transition-colors" type="button">
              <Calendar className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </Button>
          </div>

          {/* Toggle Buttons */}
          <button
            type="button"
            onClick={() => setType(type === 'lend' ? 'borrow' : 'lend')}
            className={`p-2 rounded-full transition-all duration-200 ${
              type === 'lend'
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-red-500 text-white hover:bg-red-600'
            }`}
            title={`Switch to ${type === 'lend' ? 'borrow' : 'lend'}`}
          >
            {type === 'lend' ? (
              <ArrowUpRight className="w-4 h-4" />
            ) : (
              <ArrowDownLeft className="w-4 h-4" />
            )}
          </button>

          {/* Smart Input - Amount + Description */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Type: 4 coffee, 15 lunch, 30 dinner..."
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              className="w-full pl-2 pr-3 py-2 bg-transparent border-0 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-0 focus:outline-none"
            />
          </div>

          {/* Send Button - Always visible */}
          <button
            onClick={handleSubmit}
            disabled={createTransaction.isPending || !amount || amount <= 0}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 disabled:opacity-50 ${
              type === 'borrow'
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            {createTransaction.isPending ? (
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
          </button>
        </HStack>
      </div>
    </div>
  );
};

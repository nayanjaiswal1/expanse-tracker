import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Alert } from '../../../components/ui/Alert';
import { FlexBetween, HStack } from '../../../components/ui/Layout';
import { User, Plus, Trash2, CheckCircle, InfoIcon } from 'lucide-react';

interface ManualAnnotationInterfaceProps {
  sessionId: string;
  textContent: string[];
  onSubmit: (annotations: Transaction[]) => void;
  isProcessing: boolean;
}

interface Transaction {
  date: string;
  amount: number;
  description: string;
  transaction_type: string;
  confidence?: number;
}

interface AnnotationForm {
  id: string;
  date: string;
  amount: string;
  description: string;
  transaction_type: string;
  selectedLine: number | null;
}

const TRANSACTION_TYPES = [
  { value: 'income', label: 'Income', color: 'bg-green-100 text-green-800' },
  { value: 'expense', label: 'Expense', color: 'bg-red-100 text-red-800' },
  { value: 'transfer', label: 'Transfer', color: 'bg-blue-100 text-blue-800' },
];

export function ManualAnnotationInterface({
  sessionId,
  textContent,
  onSubmit,
  isProcessing,
}: ManualAnnotationInterfaceProps) {
  const [annotations, setAnnotations] = useState<AnnotationForm[]>([]);
  const [selectedLines, setSelectedLines] = useState<Set<number>>(new Set());
  const [currentForm, setCurrentForm] = useState<AnnotationForm>({
    id: '',
    date: '',
    amount: '',
    description: '',
    transaction_type: 'expense',
    selectedLine: null,
  });
  const [error, setError] = useState<string | null>(null);

  const generateId = () => Math.random().toString(36).substring(2, 15);

  const handleLineSelect = (lineIndex: number) => {
    const line = textContent[lineIndex];

    // Try to auto-extract information from the selected line
    const dateMatch = line.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/);
    const amountMatch = line.match(/\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/);

    // Remove date and amount from line to get description
    let description = line;
    if (dateMatch) {
      description = description.replace(dateMatch[0], '').trim();
    }
    if (amountMatch) {
      description = description.replace(amountMatch[0], '').trim();
    }

    setCurrentForm({
      ...currentForm,
      id: generateId(),
      date: dateMatch ? formatDate(dateMatch[0]) : '',
      amount: amountMatch ? amountMatch[1].replace(/,/g, '') : '',
      description: description || line.slice(0, 50),
      selectedLine: lineIndex,
    });
  };

  const formatDate = (dateStr: string) => {
    try {
      // Convert various date formats to YYYY-MM-DD
      const parts = dateStr.split(/[\/\-]/);
      if (parts.length === 3) {
        let [month, day, year] = parts;

        // Handle 2-digit years
        if (year.length === 2) {
          year = parseInt(year) < 50 ? `20${year}` : `19${year}`;
        }

        // Ensure 2-digit month and day
        month = month.padStart(2, '0');
        day = day.padStart(2, '0');

        return `${year}-${month}-${day}`;
      }
    } catch (error) {
      console.error('Date formatting error:', error);
    }
    return dateStr;
  };

  const handleFormChange = (field: keyof AnnotationForm, value: string) => {
    setCurrentForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const addAnnotation = () => {
    // Validate form
    if (!currentForm.date || !currentForm.amount || !currentForm.description) {
      setError('Please fill in all required fields');
      return;
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(currentForm.date)) {
      setError('Please enter date in YYYY-MM-DD format');
      return;
    }

    // Validate amount
    const amount = parseFloat(currentForm.amount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid positive amount');
      return;
    }

    const newAnnotation: AnnotationForm = {
      ...currentForm,
      id: currentForm.id || generateId(),
    };

    setAnnotations((prev) => [...prev, newAnnotation]);

    // Mark line as selected if applicable
    if (currentForm.selectedLine !== null) {
      setSelectedLines((prev) => new Set([...prev, currentForm.selectedLine!]));
    }

    // Reset form
    setCurrentForm({
      id: '',
      date: '',
      amount: '',
      description: '',
      transaction_type: 'expense',
      selectedLine: null,
    });

    setError(null);
  };

  const removeAnnotation = (id: string) => {
    const annotation = annotations.find((a) => a.id === id);
    if (annotation && annotation.selectedLine !== null) {
      setSelectedLines((prev) => {
        const newSet = new Set(prev);
        newSet.delete(annotation.selectedLine!);
        return newSet;
      });
    }

    setAnnotations((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSubmit = () => {
    if (annotations.length === 0) {
      setError('Please add at least one transaction annotation');
      return;
    }

    // Convert annotations to Transaction format
    const transactions: Transaction[] = annotations.map((annotation) => ({
      date: annotation.date,
      amount: parseFloat(annotation.amount),
      description: annotation.description,
      transaction_type: annotation.transaction_type,
      confidence: 1.0, // Manual annotations have full confidence
    }));

    onSubmit(transactions);
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              <HStack gap={2}>
                <User className="w-5 h-5" />
                Manual Transaction Annotation
              </HStack>
            </h2>
            <p className="text-sm text-gray-600">
              Manually identify and annotate transactions from the text
            </p>
          </div>
          <div className="space-y-6">
            {/* Error Display */}
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <HStack gap={2}>
                  <InfoIcon className="w-4 h-4 text-red-600" />
                  <span className="text-red-700">{error}</span>
                </HStack>
              </Alert>
            )}

            {/* Current Annotations */}
            {annotations.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-3">
                  Annotated Transactions ({annotations.length})
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {annotations.map((annotation) => {
                    const transactionType = TRANSACTION_TYPES.find(
                      (t) => t.value === annotation.transaction_type
                    );
                    return (
                      <FlexBetween key={annotation.id} className="p-3 border rounded-lg">
                        <div className="flex-1 min-w-0">
                          <HStack gap={2} className="mb-1">
                            <span className="font-medium text-sm">{annotation.date}</span>
                            <span className="font-bold text-sm">${annotation.amount}</span>
                            <Badge className={transactionType?.color}>
                              {transactionType?.label}
                            </Badge>
                          </HStack>
                          <p className="text-sm text-gray-600 truncate">{annotation.description}</p>
                          {annotation.selectedLine !== null && (
                            <p className="text-xs text-gray-400">
                              From line {annotation.selectedLine + 1}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAnnotation(annotation.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </FlexBetween>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Annotation Form */}
            <div>
              <h3 className="text-sm font-medium mb-3">Add New Transaction</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                    Date (YYYY-MM-DD)
                  </label>
                  <input
                    id="date"
                    type="date"
                    value={currentForm.date}
                    onChange={(e) => handleFormChange('date', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                    Amount
                  </label>
                  <input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={currentForm.amount}
                    onChange={(e) => handleFormChange('amount', e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Description
                  </label>
                  <input
                    id="description"
                    value={currentForm.description}
                    onChange={(e) => handleFormChange('description', e.target.value)}
                    placeholder="Transaction description"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="transaction-type"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Transaction Type
                  </label>
                  <select
                    value={currentForm.transaction_type}
                    onChange={(e) => handleFormChange('transaction_type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {TRANSACTION_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <Button onClick={addAnnotation} className="w-full">
                    <HStack gap={2}>
                      <Plus className="w-4 h-4" />
                      Add Transaction
                    </HStack>
                  </Button>
                </div>
              </div>
            </div>

            {/* Text Content for Reference */}
            <div>
              <h3 className="text-sm font-medium mb-3">
                Text Content (Click lines to auto-extract)
              </h3>
              <div className="bg-gray-50 border rounded-lg p-3 max-h-64 overflow-y-auto">
                {textContent.slice(0, 50).map((line, index) => (
                  <div
                    key={index}
                    className={`text-xs font-mono cursor-pointer p-1 rounded transition-colors ${
                      selectedLines.has(index)
                        ? 'bg-green-100 text-green-800'
                        : currentForm.selectedLine === index
                          ? 'bg-blue-100 text-blue-800'
                          : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => handleLineSelect(index)}
                    title="Click to auto-extract transaction data"
                  >
                    <span className="text-gray-400 mr-2">
                      {(index + 1).toString().padStart(3, '0')}:
                    </span>
                    {line}
                  </div>
                ))}
                {textContent.length > 50 && (
                  <p className="text-xs text-gray-500 mt-2">
                    ... and {textContent.length - 50} more lines
                  </p>
                )}
              </div>
              <HStack gap={4} className="mt-2 text-xs text-gray-500">
                <HStack gap={1}>
                  <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
                  <span>Annotated</span>
                </HStack>
                <HStack gap={1}>
                  <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded"></div>
                  <span>Selected</span>
                </HStack>
                <HStack gap={1}>
                  <div className="w-3 h-3 bg-gray-100 border border-gray-200 rounded"></div>
                  <span>Available</span>
                </HStack>
              </HStack>
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSubmit}
                disabled={isProcessing || annotations.length === 0}
                className="flex-1"
              >
                <HStack gap={2}>
                  <CheckCircle className="w-4 h-4" />
                  {isProcessing
                    ? 'Submitting...'
                    : `Submit ${annotations.length} Annotation${annotations.length !== 1 ? 's' : ''}`}
                </HStack>
              </Button>
            </div>

            {/* Instructions */}
            <Alert>
              <HStack gap={2} className="items-start">
                <InfoIcon className="w-4 h-4 mt-0.5" />
                <div>
                  <strong>Instructions:</strong>
                  <ul className="list-disc list-inside mt-2 text-sm space-y-1">
                    <li>Click on text lines to auto-extract transaction data</li>
                    <li>Review and edit the extracted information</li>
                    <li>Add multiple transactions to build a training dataset</li>
                    <li>Manual annotations help improve future parsing accuracy</li>
                  </ul>
                </div>
              </HStack>
            </Alert>
          </div>
        </div>
      </Card>
    </div>
  );
}

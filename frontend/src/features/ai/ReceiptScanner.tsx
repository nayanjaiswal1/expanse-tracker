import React, { useState, useEffect } from 'react';
import { Camera, X, Check, AlertCircle, Eye, EyeOff, Loader, Sparkles } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { Account, Category } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { FlexBetween, HStack } from '../../components/ui/Layout';
import {
  useProcessReceiptMutation,
  useCreateTransactionFromReceiptMutation,
  type OCRResult,
} from './hooks/queries';

interface ReceiptScannerProps {
  accounts: Account[];
  categories: Category[];
  onTransactionCreated?: (transactionId: number) => void;
  onClose?: () => void;
}

const ReceiptScanner: React.FC<ReceiptScannerProps> = ({
  accounts,
  categories,
  onTransactionCreated,
  onClose,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<number | null>(null);
  const [ocrResult, setOCRResult] = useState<OCRResult | null>(null);
  const [showRawText, setShowRawText] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Editable transaction details
  const [merchantName, setMerchantName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [accountOptions, setAccountOptions] = useState<Array<{ value: number; label: string }>>([]);
  const [categoryOptions, setCategoryOptions] = useState<Array<{ value: string; label: string }>>(
    []
  );

  useEffect(() => {
    setAccountOptions(
      accounts.map((account) => ({
        value: account.id,
        label: `${account.name} (${account.account_type})`,
      }))
    );
  }, [accounts]);

  useEffect(() => {
    setCategoryOptions(
      [{ value: '', label: 'Choose a category...' }].concat(
        categories.map((category) => ({
          value: category.name,
          label: category.name,
        }))
      )
    );
  }, [categories]);

  // Hooks
  const processReceiptMutation = useProcessReceiptMutation();
  const createTransactionMutation = useCreateTransactionFromReceiptMutation();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/bmp',
        'image/tiff',
      ];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please select a valid image file (JPG, PNG, GIF, BMP, TIFF)');
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }

      setSelectedFile(file);
      setOCRResult(null);

      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const processReceipt = async () => {
    if (!selectedFile) return;

    try {
      const result = await processReceiptMutation.mutateAsync({
        receiptImage: selectedFile,
        accountId: selectedAccount || undefined,
      });

      if (result.success) {
        setOCRResult(result.ocr_result);

        // Pre-fill form with OCR results
        setMerchantName(result.ocr_result.merchant_name || '');
        setAmount(result.ocr_result.amount || '');
        setDate(result.ocr_result.date || new Date().toISOString().split('T')[0]);
        setSelectedCategory(result.ocr_result.suggested_category || '');

        // Set notes with items if available
        if (result.ocr_result.items.length > 0) {
          setNotes(`Items: ${result.ocr_result.items.join(', ')}`);
        }

        toast.success(
          `Receipt processed! Confidence: ${Math.round(result.ocr_result.confidence * 100)}%`
        );
      } else {
        toast.error('Failed to process receipt');
      }
    } catch (error: any) {
      console.error('Receipt processing error:', error);
      toast.error(error.response?.data?.error || 'Failed to process receipt');
    }
  };

  const createTransaction = async () => {
    if (!merchantName || !amount || !date || !selectedAccount) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const result = await createTransactionMutation.mutateAsync({
        merchant_name: merchantName,
        amount: parseFloat(amount),
        date: date,
        account_id: selectedAccount,
        category_name: selectedCategory,
        items: ocrResult?.items,
        notes: notes,
      });

      if (result.success) {
        toast.success('Transaction created successfully!');
        onTransactionCreated?.(result.transaction_id);
        resetForm();
      }
    } catch (error: any) {
      console.error('Transaction creation error:', error);
      toast.error(error.response?.data?.error || 'Failed to create transaction');
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setOCRResult(null);
    setMerchantName('');
    setAmount('');
    setDate('');
    setSelectedCategory('');
    setNotes('');
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <FlexBetween className="mb-6">
        <HStack gap={3}>
          <div className="p-2 bg-blue-100 rounded-lg">
            <Camera className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Receipt Scanner</h1>
            <p className="text-gray-600">
              Scan receipts with AI-powered OCR and auto-categorization
            </p>
          </div>
        </HStack>
        {onClose && (
          <Button onClick={onClose} variant="ghost" size="md">
            <X className="h-5 w-5" />
          </Button>
        )}
      </FlexBetween>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - File Upload & Preview */}
        <div className="space-y-6">
          {/* Account Selection */}
          <Select
            options={accountOptions}
            value={selectedAccount ?? undefined}
            onChange={(value) => {
              if (value === '' || value === undefined || value === null) {
                setSelectedAccount(null);
                return;
              }
              setSelectedAccount(typeof value === 'number' ? value : parseInt(String(value), 10));
            }}
            label="Select Account"
            required
          />

          {/* File Upload */}
          <Input
            label="Upload Receipt Image"
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            wrapperClassName="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
          />

          {/* Image Preview */}
          {previewUrl && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Image Preview</label>
              <div className="border rounded-lg overflow-hidden">
                <img
                  src={previewUrl}
                  alt="Receipt preview"
                  className="w-full h-64 object-contain bg-gray-50"
                />
              </div>

              {/* Process Button */}
              <Button
                onClick={processReceipt}
                disabled={processReceiptMutation.isPending || !selectedAccount}
                className="w-full mt-4 flex items-center justify-center space-x-2"
                variant="primary"
                size="lg"
              >
                {processReceiptMutation.isPending ? (
                  <>
                    <Loader className="h-5 w-5 animate-spin" />
                    <span>Processing with AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    <span>Process Receipt with AI</span>
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Right Column - OCR Results & Transaction Form */}
        <div className="space-y-6">
          {/* OCR Results */}
          {ocrResult && (
            <div className="bg-white border rounded-lg p-6">
              <FlexBetween className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">OCR Results</h3>
                <HStack gap={2} className={getConfidenceColor(ocrResult.confidence)}>
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {Math.round(ocrResult.confidence * 100)}% confidence
                  </span>
                </HStack>
              </FlexBetween>

              {/* AI Analysis */}
              {ocrResult.ai_analysis && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>AI Analysis:</strong> {ocrResult.ai_analysis}
                  </p>
                </div>
              )}

              {/* Items Found */}
              {ocrResult.items.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Items Found:</h4>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    {ocrResult.items.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Raw Text Toggle */}
              <button
                onClick={() => setShowRawText(!showRawText)}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                <HStack gap={2}>
                  {showRawText ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  <span>{showRawText ? 'Hide' : 'Show'} raw OCR text</span>
                </HStack>
              </button>

              {showRawText && (
                <div className="mt-3 p-3 bg-gray-50 rounded text-xs text-gray-600 font-mono max-h-32 overflow-y-auto">
                  {ocrResult.raw_text}
                </div>
              )}
            </div>
          )}

          {/* Transaction Form */}
          {ocrResult && (
            <div className="bg-white border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Transaction</h3>

              <div className="space-y-4">
                <Input
                  label="Merchant Name"
                  type="text"
                  value={merchantName}
                  onChange={(e) => setMerchantName(e.target.value)}
                  placeholder="Enter merchant name"
                  required
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Amount"
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                  />

                  <Input
                    label="Date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <Select
                    options={categoryOptions}
                    value={selectedCategory}
                    onChange={(value) => setSelectedCategory(String(value))}
                    label="Category"
                  />
                </div>

                <Input
                  label="Notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  multiline
                  rows={3}
                  placeholder="Additional notes..."
                />

                <div className="flex space-x-3 pt-4">
                  <Button
                    onClick={createTransaction}
                    disabled={
                      createTransactionMutation.isPending ||
                      !merchantName ||
                      !amount ||
                      !date ||
                      !selectedAccount
                    }
                    className="flex-1 flex items-center justify-center space-x-2"
                    variant="primary"
                    size="lg"
                  >
                    {createTransactionMutation.isPending ? (
                      <>
                        <Loader className="h-5 w-5 animate-spin" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <Check className="h-5 w-5" />
                        <span>Create Transaction</span>
                      </>
                    )}
                  </Button>

                  <Button onClick={resetForm} variant="secondary" size="lg">
                    Reset
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReceiptScanner;

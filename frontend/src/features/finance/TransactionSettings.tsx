import React, { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';

// Object-driven form imports
import { ObjectForm } from '../../components/forms/ObjectForm';
import { createTransactionSettingsFormConfig } from './forms';
import { TransactionSettingsFormData } from './schemas';

export const TransactionSettings: React.FC = () => {
  const { showSuccess, showError } = useToast();

  const [loading, setLoading] = useState(false);
  const [categories] = useState([
    { value: '1', label: 'Food & Dining' },
    { value: '2', label: 'Transportation' },
    { value: '3', label: 'Shopping' },
    { value: '4', label: 'Entertainment' },
    { value: '5', label: 'Bills & Utilities' },
  ]);
  const [currentSettings, setCurrentSettings] = useState<Partial<TransactionSettingsFormData>>({});

  useEffect(() => {
    loadTransactionSettings();
  }, []);

  const loadTransactionSettings = async () => {
    try {
      // For now, use default values
      // In a real implementation, you'd load from API
      setCurrentSettings({
        default_category_id: '',
        auto_categorize_transactions: true,
        require_verification: false,
        default_tags: '',
        enable_transaction_suggestions: true,
        duplicate_detection_enabled: true,
        duplicate_detection_days: 7,
        default_transaction_source: 'manual',
        auto_mark_transfers: true,
        minimum_transfer_amount: 0,
        enable_receipt_scanning: true,
        auto_create_from_receipts: false,
      });
    } catch (error) {
      console.error('Failed to load transaction settings:', error);
      showError('Failed to load transaction settings');
    }
  };

  const handleSaveSettings = async (data: TransactionSettingsFormData) => {
    setLoading(true);

    try {
      // In a real implementation, this would save to a transaction settings endpoint
      // For now, we'll just simulate a successful save
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Update current settings state
      setCurrentSettings(data);

      showSuccess('Transaction settings saved successfully');
    } catch (error: any) {
      console.error('Failed to save transaction settings:', error);
      throw new Error(error.message || 'Failed to save transaction settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold theme-text-primary flex items-center">
          <FileText className="h-8 w-8 mr-3 text-blue-600 dark:text-blue-400" />
          Transaction Settings
        </h1>
        <p className="theme-text-secondary mt-2">
          Configure how transactions are processed and managed
        </p>
      </div>

      <ObjectForm
        config={createTransactionSettingsFormConfig(
          handleSaveSettings,
          loading,
          currentSettings,
          categories
        )}
      />
    </div>
  );
};

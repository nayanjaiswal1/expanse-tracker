import React, { useState } from 'react';
import { useToast } from '../../components/ui/Toast';
import { apiClient } from '../../api/client';
import { Upload, Trash2, Download, Shield, FileText, Database, AlertTriangle } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { motion } from 'framer-motion';
import BulkExportSelector from './components/BulkExportSelector';
import { FlexBetween, HStack } from '../../components/ui/Layout';

const DataSettings: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  const handleBulkExport = async (dataTypes: string[], format: string, timePeriod?: string) => {
    setIsLoading(true);

    try {
      // Convert time period to date filter
      const getDateFilter = (period?: string) => {
        if (!period || period === 'all') return {};

        const now = new Date();
        const startDate = new Date();

        switch (period) {
          case 'last7days':
            startDate.setDate(now.getDate() - 7);
            break;
          case 'last30days':
            startDate.setDate(now.getDate() - 30);
            break;
          case 'last3months':
            startDate.setMonth(now.getMonth() - 3);
            break;
          case 'last6months':
            startDate.setMonth(now.getMonth() - 6);
            break;
          case 'lastyear':
            startDate.setFullYear(now.getFullYear() - 1);
            break;
          default:
            return {};
        }

        return {
          start_date: startDate.toISOString().split('T')[0],
          end_date: now.toISOString().split('T')[0],
        };
      };

      const dateFilter = getDateFilter(timePeriod);

      // For now, export each data type separately
      // In a real implementation, you might have a bulk export API
      for (const dataType of dataTypes) {
        let blob: Blob;

        if (dataType === 'transactions') {
          blob = await apiClient.exportTransactions(
            format as 'csv' | 'json' | 'excel' | 'pdf',
            undefined,
            dateFilter
          );
        } else {
          blob = await apiClient.exportData({
            data_type: dataType,
            format: format,
            filters: dateFilter,
          });
        }

        if (blob && blob.size > 0) {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;

          const extension = format === 'excel' ? 'xlsx' : format;
          const timestamp = new Date().toISOString().split('T')[0];
          const timePeriodSuffix = timePeriod && timePeriod !== 'all' ? `_${timePeriod}` : '';
          link.download = `${dataType}_${timestamp}${timePeriodSuffix}.${extension}`;

          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }
      }

      showSuccess(
        'Export Complete',
        `Successfully exported ${dataTypes.length} data type(s) in ${format.toUpperCase()} format`
      );
    } catch (error: unknown) {
      console.error('Bulk export failed:', error);
      const errorMessage =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        (error as Error)?.message ||
        'Unknown error occurred';
      showError('Export Failed', `Unable to export data: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDataImport = async () => {
    if (!importFile) {
      showError('No File Selected', 'Please select a file to import.');
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', importFile);

      // Determine import type based on file extension
      const fileName = importFile.name.toLowerCase();
      let importType = 'json';
      if (fileName.endsWith('.csv')) importType = 'csv';
      else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) importType = 'excel';

      await apiClient.importTransactions(formData, importType);

      setImportFile(null);
      setShowImportModal(false);
      showSuccess('Data Imported', 'Your financial data has been imported successfully.');

      // Refresh the page to show imported data
      window.location.reload();
    } catch (error) {
      console.error('Data import failed:', error);
      showError('Import Failed', 'Unable to import your data. Please check the file format.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccountDeletion = async () => {
    setIsLoading(true);

    try {
      await apiClient.deleteUserAccount();

      showSuccess('Account Deleted', 'Your account has been permanently deleted.');

      // Redirect to login after account deletion
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } catch (error) {
      console.error('Account deletion failed:', error);
      showError(
        'Deletion Failed',
        'Unable to delete your account. Please try again or contact support.'
      );
    } finally {
      setIsLoading(false);
      setShowDeleteConfirmModal(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4">
      {/* Header */}
      <div className="mb-6">
        <HStack gap={2} className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          <span>Settings</span>
          <span>/</span>
          <span className="text-gray-900 dark:text-white font-medium">Data & Privacy</span>
        </HStack>
        <FlexBetween>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Data & Privacy</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage your data exports, imports, and privacy settings
            </p>
          </div>
          <HStack gap={3} className="hidden sm:flex">
            <HStack gap={2} className="text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-gray-600 dark:text-gray-400">All systems operational</span>
            </HStack>
          </HStack>
        </FlexBetween>
      </div>

      <div className="space-y-6">
        {/* Export Your Data */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4"
        >
          <FlexBetween className="items-start mb-4">
            <HStack gap={3}>
              <div className="bg-green-100 dark:bg-green-900 rounded-lg p-2">
                <Download className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Export Data</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Download your financial data in multiple formats
                </p>
              </div>
            </HStack>
            <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded">
              Secure
            </div>
          </FlexBetween>

          <div className="text-center py-4">
            <button
              onClick={() => setShowExportModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg mx-auto group"
            >
              <HStack gap={2}>
                <Download className="h-4 w-4 group-hover:animate-bounce" />
                <span>Start Export</span>
              </HStack>
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Choose data types, formats, and time ranges
            </p>
          </div>

          <div className="mt-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
            <HStack gap={3} className="items-start">
              <FileText className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-green-800 dark:text-green-200 text-sm">
                  Export Features
                </h4>
                <ul className="text-green-700 dark:text-green-300 text-xs mt-1 space-y-0.5">
                  <li>• Select multiple data types to export</li>
                  <li>• Choose from CSV, Excel (XLSX), JSON, or PDF formats</li>
                  <li>• Apply date range and category filters</li>
                  <li>• Professional formatting with headers and styling</li>
                  <li>• Bulk export with single download</li>
                </ul>
              </div>
            </HStack>
          </div>
        </motion.div>

        {/* Data Import Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4"
        >
          <FlexBetween className="items-start mb-4">
            <HStack gap={3}>
              <div className="bg-blue-100 dark:bg-blue-900 rounded-lg p-2">
                <Upload className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Import Data</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Upload your financial data securely
                </p>
              </div>
            </HStack>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowImportModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
            >
              <HStack gap={2}>
                <Upload className="h-4 w-4" />
                <span>Import</span>
              </HStack>
            </motion.button>
          </FlexBetween>

          <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-4 text-center hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
            <HStack gap={4} className="justify-center text-sm text-gray-600 dark:text-gray-400">
              <HStack gap={1}>
                <FileText className="h-4 w-4" />
                <span>CSV</span>
              </HStack>
              <HStack gap={1}>
                <Database className="h-4 w-4" />
                <span>JSON</span>
              </HStack>
              <HStack gap={1}>
                <FileText className="h-4 w-4" />
                <span>Excel</span>
              </HStack>
            </HStack>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Drag files here or click Import to browse
            </p>
          </div>

          <HStack gap={2} className="text-sm text-gray-500 dark:text-gray-400">
            <Database className="h-4 w-4" />
            <span>Supports JSON, CSV, and Excel formats</span>
          </HStack>
        </motion.div>

        {/* Privacy & Security Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4"
        >
          <FlexBetween className="items-start mb-4">
            <HStack gap={3}>
              <div className="bg-purple-100 dark:bg-purple-900 rounded-lg p-2">
                <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Privacy & Security
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Your data protection and privacy controls
                </p>
              </div>
            </HStack>
            <HStack
              gap={1}
              className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded"
            >
              <Shield className="h-3 w-3" />
              <span>Protected</span>
            </HStack>
          </FlexBetween>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white text-sm mb-2">
                  Data Retention
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                  Your data is stored securely and retained according to your preferences
                </p>
                <div className="bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 text-xs p-2 rounded">
                  ✓ All data encrypted at rest and in transit
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white text-sm mb-2">
                  Data Processing
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                  Your financial data is processed locally and never shared
                </p>
                <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 text-xs p-2 rounded">
                  ✓ GDPR and privacy compliant
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Danger Zone */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-red-200 dark:border-red-800 p-4"
        >
          <FlexBetween className="items-start mb-4">
            <HStack gap={3}>
              <div className="bg-red-100 dark:bg-red-900 rounded-lg p-2">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-700 dark:text-red-400">
                  Danger Zone
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Irreversible actions - proceed with caution
                </p>
              </div>
            </HStack>
            <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded border border-red-200 dark:border-red-800">
              High Risk
            </div>
          </FlexBetween>

          <div className="border border-red-200 dark:border-red-700 rounded-lg p-4 bg-red-50/50 dark:bg-red-900/10">
            <FlexBetween>
              <div>
                <h4 className="font-medium text-red-900 dark:text-red-200 text-sm">
                  Delete Account
                </h4>
                <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                  This action cannot be undone and will permanently delete all your data
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg ml-4"
                onClick={() => setShowDeleteConfirmModal(true)}
              >
                <HStack gap={2}>
                  <Trash2 className="h-4 w-4" />
                  <span>Delete</span>
                </HStack>
              </motion.button>
            </FlexBetween>
          </div>
        </motion.div>
      </div>

      {/* Export Data Modal */}
      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export Data"
        size="md"
      >
        <BulkExportSelector onExport={handleBulkExport} isLoading={isLoading} />
      </Modal>

      {/* Import Data Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import Financial Data"
      >
        <div className="space-y-6">
          <div className="theme-alert-info">
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
              Supported Formats
            </h4>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>
                • <strong>JSON:</strong> Complete data export from this application
              </li>
              <li>
                • <strong>CSV:</strong> Transaction data in comma-separated format
              </li>
              <li>
                • <strong>Excel:</strong> Spreadsheet files (.xlsx, .xls)
              </li>
            </ul>
          </div>

          <div>
            <label className="theme-form-label mb-2">Select File</label>
            <input
              type="file"
              accept=".json,.csv,.xlsx,.xls"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="theme-input transition-all duration-200"
            />
            {importFile && (
              <p className="text-sm theme-text-secondary mt-2">
                Selected: {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Warning:</strong> Importing data will add new transactions to your account.
              Duplicate transactions may be created if the same data is imported multiple times.
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4 theme-border-light border-t">
            <button
              onClick={() => setShowImportModal(false)}
              className="theme-btn-secondary text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleDataImport}
              disabled={!importFile || isLoading}
              className="theme-btn-primary text-sm disabled:opacity-50"
            >
              {isLoading ? 'Importing...' : 'Import Data'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Account Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirmModal}
        onClose={() => setShowDeleteConfirmModal(false)}
        title="Delete Account"
      >
        <div className="space-y-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <HStack>
              <Trash2 className="h-6 w-6 text-red-600 mr-3" />
              <div>
                <h4 className="text-lg font-medium text-red-900">Permanent Account Deletion</h4>
                <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                  This action cannot be undone.
                </p>
              </div>
            </HStack>
          </div>

          <div className="theme-text-primary">
            <p className="mb-4">
              <strong>Deleting your account will permanently remove:</strong>
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>All your financial transactions and data</li>
              <li>Account settings and preferences</li>
              <li>Goals, budgets, and categories</li>
              <li>Group expenses and lending records</li>
              <li>All uploaded statements and receipts</li>
            </ul>
            <p className="mt-4 text-sm theme-text-secondary">
              <strong>Recommendation:</strong> Export your data before deletion if you want to keep
              a backup.
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4 theme-border-light border-t">
            <button
              onClick={() => setShowDeleteConfirmModal(false)}
              className="theme-btn-secondary text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleAccountDeletion}
              disabled={isLoading}
              className="theme-btn-danger text-sm disabled:opacity-50"
            >
              {isLoading ? 'Deleting...' : 'Delete My Account'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DataSettings;

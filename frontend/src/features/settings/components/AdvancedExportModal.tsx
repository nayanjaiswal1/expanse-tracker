import React, { useState } from 'react';
import { X, Download, Settings, Filter, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../../../components/ui/Toast';
import { apiClient } from '../../../api/client';
import { Button } from '../../../components/ui/Button';
import ExportFilters, { ExportFilterOptions } from './ExportFilters';
import MultiDataTypeExport from './MultiDataTypeExport';
import FormatSelector from './FormatSelectorNew';
import { FlexBetween, HStack } from '../../../components/ui/Layout';

interface AdvancedExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FormatOptions {
  includeHeaders?: boolean;
  dateFormat?: 'iso' | 'us' | 'eu';
  numberFormat?: 'decimal' | 'currency' | 'accounting';
  encoding?: 'utf8' | 'ascii' | 'latin1';
  delimiter?: ',' | ';' | '\t' | '|';
  includeMetadata?: boolean;
}

const AdvancedExportModal: React.FC<AdvancedExportModalProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState<'select' | 'filter' | 'format' | 'review'>(
    'select'
  );
  const [selectedData, setSelectedData] = useState<{
    dataTypes: string[];
    fields: Record<string, string[]>;
  }>({
    dataTypes: ['transactions'],
    fields: {},
  });
  const [filters, setFilters] = useState<ExportFilterOptions>({
    dateRange: { preset: 'last30days' },
    transactionTypes: ['income', 'expense'],
  });
  const [format, setFormat] = useState<string>('csv');
  const [_formatOptions, setFormatOptions] = useState<FormatOptions>({
    includeHeaders: true,
    dateFormat: 'iso',
    numberFormat: 'decimal',
    encoding: 'utf8',
    delimiter: ',',
    includeMetadata: true,
  });
  const [isExporting, setIsExporting] = useState(false);

  const { showSuccess, showError } = useToast();

  const steps = [
    { id: 'select', label: 'Select Data', icon: Database },
    { id: 'filter', label: 'Apply Filters', icon: Filter },
    { id: 'format', label: 'Choose Format', icon: Settings },
    { id: 'review', label: 'Review & Export', icon: Download },
  ];

  const getCurrentStepIndex = () => steps.findIndex((step) => step.id === currentStep);

  const handleNext = () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].id as 'select' | 'filter' | 'format' | 'review');
    }
  };

  const handlePrevious = () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].id as 'select' | 'filter' | 'format' | 'review');
    }
  };

  const handleExport = async () => {
    if (selectedData.dataTypes.length === 0) {
      showError('No Data Selected', 'Please select at least one data type to export.');
      return;
    }

    setIsExporting(true);

    try {
      // Use the appropriate API method
      let blob: Blob;
      if (selectedData.dataTypes.length === 1 && selectedData.dataTypes[0] === 'transactions') {
        // Use specific transactions export if only transactions are selected
        blob = await apiClient.exportTransactions(format as 'csv' | 'json' | 'excel' | 'pdf');
      } else {
        // Use generic export for multiple data types
        blob = await apiClient.exportData({
          data_type: selectedData.dataTypes.join(','),
          format: format,
          fields: Object.values(selectedData.fields).flat(),
          filters: filters,
        });
      }

      if (!blob || blob.size === 0) {
        throw new Error('Empty response from server');
      }

      // Create download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const timestamp = new Date().toISOString().split('T')[0];
      const extension = format === 'excel' ? 'xlsx' : format;
      const fileName =
        selectedData.dataTypes.length === 1
          ? `${selectedData.dataTypes[0]}_export_${timestamp}.${extension}`
          : `multi_data_export_${timestamp}.${extension}`;

      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showSuccess('Export Complete', `Your data has been exported successfully as ${fileName}`);
      onClose();
    } catch (error: unknown) {
      console.error('Export failed:', error);
      const errorMessage =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        (error as Error)?.message ||
        'Unknown error occurred';
      showError('Export Failed', `Unable to export data: ${errorMessage}`);
    } finally {
      setIsExporting(false);
    }
  };

  const getEstimatedSize = () => {
    const baseSize = selectedData.dataTypes.length * 100; // KB
    const fieldMultiplier = Object.values(selectedData.fields).flat().length / 10;
    return `~${Math.round(baseSize * fieldMultiplier)}KB`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <FlexBetween>
              <HStack gap={3}>
                <div className="h-10 w-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <Download className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Advanced Data Export
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Step {getCurrentStepIndex() + 1} of {steps.length}:{' '}
                    {steps.find((s) => s.id === currentStep)?.label}
                  </p>
                </div>
              </HStack>
              <Button
                onClick={onClose}
                variant="icon-soft"
                size="none"
                className="rounded-full p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </Button>
            </FlexBetween>

            {/* Progress Steps */}
            <div className="mt-6">
              <FlexBetween>
                {steps.map((step, index) => {
                  const StepIcon = step.icon;
                  const isActive = step.id === currentStep;
                  const isCompleted = getCurrentStepIndex() > index;

                  return (
                    <React.Fragment key={step.id}>
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                            isActive
                              ? 'bg-indigo-600 text-white'
                              : isCompleted
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                          }`}
                        >
                          <StepIcon className="h-5 w-5" />
                        </div>
                        <span
                          className={`text-xs mt-2 font-medium ${
                            isActive
                              ? 'text-indigo-600 dark:text-indigo-400'
                              : 'text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                      {index < steps.length - 1 && (
                        <div
                          className={`flex-1 h-0.5 mx-4 ${
                            isCompleted ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-700'
                          }`}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </FlexBetween>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {currentStep === 'select' && (
              <MultiDataTypeExport onSelectionChange={setSelectedData} />
            )}

            {currentStep === 'filter' && <ExportFilters onFiltersChange={setFilters} />}

            {currentStep === 'format' && (
              <FormatSelector
                onFormatChange={(fmt, opts) => {
                  setFormat(fmt);
                  setFormatOptions(opts);
                }}
              />
            )}

            {currentStep === 'review' && (
              <div className="space-y-6">
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-4">Export Summary</h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Data Types
                      </h5>
                      <div className="space-y-2">
                        {selectedData.dataTypes.map((type) => (
                          <FlexBetween key={type} className="text-sm">
                            <span className="text-gray-600 dark:text-gray-400 capitalize">
                              {type.replace('_', ' ')}
                            </span>
                            <span className="text-gray-500 dark:text-gray-500">
                              {selectedData.fields[type]?.length || 0} fields
                            </span>
                          </FlexBetween>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Export Details
                      </h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Format:</span>
                          <span className="text-gray-900 dark:text-white font-medium">
                            {format.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Date Range:</span>
                          <span className="text-gray-900 dark:text-white">
                            {filters.dateRange.preset === 'custom'
                              ? `${filters.dateRange.from} to ${filters.dateRange.to}`
                              : filters.dateRange.preset
                                  ?.replace('last', 'Last ')
                                  .replace('days', ' days') || 'All time'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Estimated Size:</span>
                          <span className="text-gray-900 dark:text-white">
                            {getEstimatedSize()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h5 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                    Export Information
                  </h5>
                  <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                    <li>
                      • Export will include {Object.values(selectedData.fields).flat().length} total
                      fields
                    </li>
                    <li>• Data will be filtered according to your specified criteria</li>
                    <li>• File will be automatically downloaded to your device</li>
                    <li>• All exported data is encrypted during transfer</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <FlexBetween className="p-6 border-t border-gray-200 dark:border-gray-700">
            <Button
              onClick={handlePrevious}
              disabled={getCurrentStepIndex() === 0}
              variant="outline-soft"
              size="none"
              className="rounded-lg px-4 py-2 text-gray-700 dark:text-gray-300"
            >
              Previous
            </Button>

            <div className="text-sm text-gray-500 dark:text-gray-400">
              {selectedData.dataTypes.length} data type
              {selectedData.dataTypes.length !== 1 ? 's' : ''} selected
            </div>

            {getCurrentStepIndex() < steps.length - 1 ? (
              <Button
                onClick={handleNext}
                disabled={selectedData.dataTypes.length === 0}
                variant="primary-elevated"
                size="none"
                className="rounded-lg px-6 py-2"
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={handleExport}
                disabled={isExporting || selectedData.dataTypes.length === 0}
                variant="success"
                size="none"
                className="flex items-center space-x-2 rounded-lg px-6 py-2"
              >
                {isExporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Exporting...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    <span>Export Data</span>
                  </>
                )}
              </Button>
            )}
          </FlexBetween>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AdvancedExportModal;

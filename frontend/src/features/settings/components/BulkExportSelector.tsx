import React, { useState } from 'react';
import { Download, FileText, Table, FileCode, Calendar, Check } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';
import { FlexBetween, HStack } from '../../../components/ui/Layout';

interface BulkExportSelectorProps {
  onExport: (dataTypes: string[], format: string, timePeriod?: string) => void;
  isLoading?: boolean;
}

const BulkExportSelector: React.FC<BulkExportSelectorProps> = ({ onExport, isLoading = false }) => {
  const { showError } = useToast();
  const [selectedDataTypes, setSelectedDataTypes] = useState<string[]>(['transactions']);
  const [selectedFormat, setSelectedFormat] = useState<string>('csv');
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<string>('thismonth');

  const dataTypes = [
    { id: 'transactions', label: 'Transactions', icon: '💸' },
    { id: 'accounts', label: 'Accounts', icon: '🏦' },
    { id: 'goals', label: 'Goals', icon: '🎯' },
    { id: 'budgets', label: 'Budgets', icon: '💰' },
    { id: 'group_expenses', label: 'Group Expenses', icon: '👥' },
    { id: 'investments', label: 'Investments', icon: '📈' },
  ];

  const formats = [
    { id: 'csv', label: 'CSV', icon: <FileText className="h-4 w-4" /> },
    { id: 'excel', label: 'Excel', icon: <Table className="h-4 w-4" /> },
    { id: 'json', label: 'JSON', icon: <FileCode className="h-4 w-4" /> },
  ];

  const timePeriods = [
    { id: 'thismonth', label: 'This month' },
    { id: 'lastmonth', label: 'Last month' },
    { id: 'last7days', label: 'Last 7 days' },
    { id: 'last30days', label: 'Last 30 days' },
    { id: 'last3months', label: 'Last 3 months' },
    { id: 'last6months', label: 'Last 6 months' },
    { id: 'lastyear', label: 'Last year' },
    { id: 'all', label: 'All time' },
  ];

  const handleDataTypeToggle = (dataTypeId: string) => {
    setSelectedDataTypes((prev) =>
      prev.includes(dataTypeId) ? prev.filter((id) => id !== dataTypeId) : [...prev, dataTypeId]
    );
  };

  const handleQuickSelect = (preset: 'recent' | 'backup') => {
    if (preset === 'recent') {
      setSelectedDataTypes(['transactions']);
      setSelectedFormat('csv');
      setSelectedTimePeriod('thismonth');
    } else {
      setSelectedDataTypes(['transactions', 'accounts', 'goals', 'budgets']);
      setSelectedFormat('json');
      setSelectedTimePeriod('all');
    }
  };

  const handleExport = async () => {
    if (selectedDataTypes.length === 0) {
      showError('No Data Selected', 'Please select at least one data type to export.');
      return;
    }

    try {
      await onExport(selectedDataTypes, selectedFormat, selectedTimePeriod);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Progress Steps */}
      <HStack gap={2} className="mb-4">
        <HStack gap={2} className="text-xs text-gray-500 dark:text-gray-400">
          <div className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
            1
          </div>
          <span className="font-medium">Time Period</span>
        </HStack>
        <div className="w-8 h-px bg-gray-200 dark:bg-gray-700"></div>
        <HStack gap={2} className="text-xs text-gray-500 dark:text-gray-400">
          <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full flex items-center justify-center text-xs font-medium">
            2
          </div>
          <span>Data Types</span>
        </HStack>
        <div className="w-8 h-px bg-gray-200 dark:bg-gray-700"></div>
        <HStack gap={2} className="text-xs text-gray-500 dark:text-gray-400">
          <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full flex items-center justify-center text-xs font-medium">
            3
          </div>
          <span>Format</span>
        </HStack>
      </HStack>

      {/* Time Period */}
      <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-3">
        <label className="font-medium text-gray-900 dark:text-white mb-3 text-sm">
          <HStack gap={2}>
            <Calendar className="h-4 w-4 text-indigo-600" />
            <span>Select Time Period</span>
            <span className="text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900 px-2 py-0.5 rounded">
              Step 1
            </span>
          </HStack>
        </label>
        <select
          value={selectedTimePeriod}
          onChange={(e) => setSelectedTimePeriod(e.target.value)}
          className="w-full p-2 border border-indigo-200 dark:border-indigo-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
        >
          {timePeriods.map((period) => (
            <option key={period.id} value={period.id}>
              {period.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
          Selected: {timePeriods.find((p) => p.id === selectedTimePeriod)?.label}
        </p>
      </div>

      {/* Quick Presets */}
      <div>
        <h4 className="font-medium text-gray-900 dark:text-white mb-2 text-sm">
          <HStack gap={2}>
            <span>⚡</span>
            <span>Quick Presets</span>
          </HStack>
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleQuickSelect('recent')}
            className="p-3 border-2 border-dashed border-blue-200 dark:border-blue-700 rounded-lg hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left text-sm group"
          >
            <div className="flex items-center space-x-2">
              <span className="text-lg group-hover:scale-110 transition-transform">📊</span>
              <div>
                <div className="font-medium text-gray-900 dark:text-white text-sm">Recent Data</div>
                <div className="text-xs text-gray-500">This month • CSV format</div>
              </div>
            </div>
          </button>
          <button
            onClick={() => handleQuickSelect('backup')}
            className="p-3 border-2 border-dashed border-green-200 dark:border-green-700 rounded-lg hover:border-green-400 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all text-left text-sm group"
          >
            <div className="flex items-center space-x-2">
              <span className="text-lg group-hover:scale-110 transition-transform">💾</span>
              <div>
                <div className="font-medium text-gray-900 dark:text-white text-sm">Full Backup</div>
                <div className="text-xs text-gray-500">All data • JSON format</div>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Data Types */}
      <div>
        <FlexBetween className="mb-3">
          <h4 className="font-medium text-gray-900 dark:text-white text-sm">
            <HStack gap={2}>
              <span>📋</span>
              <span>Select Data Types</span>
              <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900 px-2 py-0.5 rounded">
                Step 2
              </span>
            </HStack>
          </h4>
          <button
            onClick={() =>
              setSelectedDataTypes(
                selectedDataTypes.length === dataTypes.length ? [] : dataTypes.map((d) => d.id)
              )
            }
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
          >
            {selectedDataTypes.length === dataTypes.length ? 'Deselect All' : 'Select All'}
          </button>
        </FlexBetween>
        <div className="grid grid-cols-2 gap-2 mb-2">
          {dataTypes.map((dataType) => (
            <FlexBetween
              as="button"
              key={dataType.id}
              onClick={() => handleDataTypeToggle(dataType.id)}
              className={`p-3 text-left border-2 rounded-lg transition-all text-sm group ${
                selectedDataTypes.includes(dataType.id)
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ring-2 ring-indigo-200 dark:ring-indigo-800'
                  : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span
                  className={`text-base transition-transform ${
                    selectedDataTypes.includes(dataType.id) ? 'scale-110' : 'group-hover:scale-105'
                  }`}
                >
                  {dataType.icon}
                </span>
                <span className="font-medium text-gray-900 dark:text-white text-sm">
                  {dataType.label}
                </span>
              </div>
              {selectedDataTypes.includes(dataType.id) && (
                <Check className="h-4 w-4 text-indigo-600 animate-in fade-in duration-200" />
              )}
            </FlexBetween>
          ))}
        </div>
        <FlexBetween className="text-xs">
          <span
            className={`${selectedDataTypes.length > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}
          >
            {selectedDataTypes.length} of {dataTypes.length} selected
          </span>
          {selectedDataTypes.length > 0 && (
            <span className="text-green-600 dark:text-green-400 flex items-center space-x-1">
              <Check className="h-3 w-3" />
              <span>Ready to export</span>
            </span>
          )}
        </FlexBetween>
      </div>

      {/* Format */}
      <div>
        <h4 className="font-medium text-gray-900 dark:text-white mb-3 text-sm">
          <HStack gap={2}>
            <span>📄</span>
            <span>Choose Export Format</span>
            <span className="text-xs text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900 px-2 py-0.5 rounded">
              Step 3
            </span>
          </HStack>
        </h4>
        <div className="grid grid-cols-3 gap-2 mb-2">
          {formats.map((format) => (
            <button
              key={format.id}
              onClick={() => setSelectedFormat(format.id)}
              className={`p-3 border-2 rounded-lg transition-all flex flex-col items-center space-y-2 group ${
                selectedFormat === format.id
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ring-2 ring-indigo-200 dark:ring-indigo-800'
                  : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600'
              }`}
            >
              <div
                className={`transition-transform ${
                  selectedFormat === format.id ? 'scale-110' : 'group-hover:scale-105'
                }`}
              >
                {format.icon}
              </div>
              <span className="text-xs font-medium text-gray-900 dark:text-white">
                {format.label}
              </span>
              {selectedFormat === format.id && (
                <Check className="h-3 w-3 text-indigo-600 animate-in fade-in duration-200" />
              )}
            </button>
          ))}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {selectedFormat === 'csv' &&
            'Comma-separated values - compatible with Excel and Google Sheets'}
          {selectedFormat === 'excel' &&
            'Microsoft Excel format with formatting and multiple sheets'}
          {selectedFormat === 'json' && 'JavaScript Object Notation - machine-readable format'}
        </div>
      </div>

      {/* Export Summary & Button */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <FlexBetween className="mb-3">
          <h4 className="font-medium text-gray-900 dark:text-white text-sm">Export Summary</h4>
          <span className="text-xs text-gray-500 dark:text-gray-400">Review before export</span>
        </FlexBetween>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Time Period:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {timePeriods.find((p) => p.id === selectedTimePeriod)?.label}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Data Types:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {selectedDataTypes.length} selected
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Format:</span>
            <span className="font-medium text-gray-900 dark:text-white uppercase">
              {selectedFormat}
            </span>
          </div>
        </div>

        <button
          onClick={handleExport}
          disabled={isLoading || selectedDataTypes.length === 0}
          className={`w-full mt-4 px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
            selectedDataTypes.length === 0
              ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              : isLoading
                ? 'bg-indigo-400 text-white cursor-wait'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg'
          }`}
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              <span>Preparing Export...</span>
            </>
          ) : selectedDataTypes.length === 0 ? (
            <>
              <span>Select Data Types to Export</span>
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              <span>
                Export {selectedDataTypes.length} Data Type
                {selectedDataTypes.length !== 1 ? 's' : ''}
              </span>
            </>
          )}
        </button>

        {selectedDataTypes.length > 0 && !isLoading && (
          <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
            Files will download automatically
          </p>
        )}
      </div>
    </div>
  );
};

export default BulkExportSelector;

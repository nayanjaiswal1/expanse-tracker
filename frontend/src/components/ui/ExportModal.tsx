import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { Download, FileText, Table, Code, FileCode } from 'lucide-react';
import { checkboxClassName } from './Checkbox';
import { Button } from './Button';
import { FlexBetween, HStack } from './Layout';
import { Modal } from './Modal';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDataType?: string;
  defaultFilters?: Record<string, string | number | boolean>;
}

interface DataType {
  value: string;
  label: string;
  fields: string[];
}

interface Format {
  value: string;
  label: string;
}

const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  defaultDataType,
  defaultFilters = {},
}) => {
  const [dataTypes, setDataTypes] = useState<DataType[]>([]);
  const [formats, setFormats] = useState<Format[]>([]);
  const [selectedDataType, setSelectedDataType] = useState(defaultDataType || '');
  const [selectedFormat, setSelectedFormat] = useState('csv');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(true);
  const [filters] = useState<Record<string, string | number | boolean>>(defaultFilters);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadExportOptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (selectedDataType) {
      const dataType = dataTypes.find((dt) => dt.value === selectedDataType);
      if (dataType && selectAll) {
        setSelectedFields(dataType.fields);
      }
    }
  }, [selectedDataType, selectAll, dataTypes]);

  const loadExportOptions = async () => {
    try {
      const options = await apiClient.getExportOptions();
      setDataTypes(options.data_types);
      setFormats(options.formats);

      if (!selectedDataType && options.data_types.length > 0) {
        setSelectedDataType(options.data_types[0].value);
      }
    } catch (err) {
      console.error('Failed to load export options:', err);
      setError('Failed to load export options');
    }
  };

  const handleFieldToggle = (field: string) => {
    setSelectAll(false);
    setSelectedFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  const handleSelectAllToggle = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);

    if (newSelectAll) {
      const dataType = dataTypes.find((dt) => dt.value === selectedDataType);
      if (dataType) {
        setSelectedFields(dataType.fields);
      }
    } else {
      setSelectedFields([]);
    }
  };

  const handleExport = async () => {
    if (!selectedDataType || !selectedFormat) {
      setError('Please select data type and format');
      return;
    }

    if (selectedFields.length === 0) {
      setError('Please select at least one field');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const blob = await apiClient.exportData({
        data_type: selectedDataType,
        format: selectedFormat,
        fields: selectAll ? undefined : selectedFields,
        filters: filters,
      });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const extension = selectedFormat === 'excel' ? 'xlsx' : selectedFormat;
      const timestamp = new Date().toISOString().split('T')[0];
      link.download = `${selectedDataType}_export_${timestamp}.${extension}`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (err: unknown) {
      console.error('Export failed:', err);
      setError(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          'Export failed'
      );
    } finally {
      setLoading(false);
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'csv':
        return <FileText className="h-5 w-5" />;
      case 'excel':
        return <Table className="h-5 w-5" />;
      case 'json':
        return <Code className="h-5 w-5" />;
      case 'xml':
        return <FileCode className="h-5 w-5" />;
      default:
        return <Download className="h-5 w-5" />;
    }
  };

  const currentDataType = dataTypes.find((dt) => dt.value === selectedDataType);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Export Data"
      subtitle="Export your data in various formats"
      size="lg"
      density="default"
      footer={
        <HStack gap={3} className="justify-end">
          <Button
            onClick={onClose}
            disabled={loading}
            variant="outline-soft"
            size="none"
            className="rounded-lg px-4 py-2 text-gray-700 dark:text-gray-300"
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={loading || selectedFields.length === 0}
            variant="primary-elevated"
            size="none"
            className="flex items-center space-x-2 rounded-lg px-6 py-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                <span>Export</span>
              </>
            )}
          </Button>
        </HStack>
      }
    >
      <div className="space-y-6">
        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-800 dark:text-red-200">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-sm text-green-800 dark:text-green-200">
            Export completed successfully!
          </div>
        )}

        {/* Data Type Selection */}
        {dataTypes.length > 1 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Data Type
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {dataTypes.map((dt) => (
                <Button
                  key={dt.value}
                  type="button"
                  onClick={() => setSelectedDataType(dt.value)}
                  variant="outline-soft"
                  size="none"
                  className={`p-3 border-2 rounded-lg text-left transition-all ${
                    selectedDataType === dt.value
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:border-indigo-500'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {dt.label}
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Format Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Export Format
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {formats.map((format) => (
              <Button
                key={format.value}
                type="button"
                onClick={() => setSelectedFormat(format.value)}
                variant="outline-soft"
                size="none"
                className={`flex flex-col items-center justify-center space-y-2 rounded-lg border-2 p-4 transition-all ${
                  selectedFormat === format.value
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:border-indigo-500'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                {getFormatIcon(format.value)}
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {format.label}
                </span>
              </Button>
            ))}
          </div>
        </div>

        {/* Field Selection */}
        {currentDataType && (
          <div>
            <FlexBetween className="mb-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Fields to Export
              </label>
              <Button
                onClick={handleSelectAllToggle}
                variant="link-indigo"
                size="none"
                className="text-sm"
              >
                {selectAll ? 'Deselect All' : 'Select All'}
              </Button>
            </FlexBetween>

            <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-2">
              {currentDataType.fields.map((field) => (
                <label
                  key={field}
                  className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedFields.includes(field)}
                    onChange={() => handleFieldToggle(field)}
                    className={checkboxClassName}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {field.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </span>
                </label>
              ))}
            </div>

            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {selectedFields.length} of {currentDataType.fields.length} fields selected
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ExportModal;

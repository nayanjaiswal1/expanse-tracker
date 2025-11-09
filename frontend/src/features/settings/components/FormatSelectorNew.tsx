import React, { useState } from 'react';
import { FileText, Table, Code, File } from 'lucide-react';

interface FormatOption {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  features: string[];
  fileExtension: string;
  bestFor: string;
}

interface FormatSelectorProps {
  onFormatChange: (format: string, options: FormatOptions) => void;
  className?: string;
}

interface FormatOptions {
  includeHeaders?: boolean;
  dateFormat?: 'iso' | 'us' | 'eu';
  numberFormat?: 'decimal' | 'currency' | 'accounting';
  encoding?: 'utf8' | 'ascii' | 'latin1';
  delimiter?: ',' | ';' | '\t' | '|';
  includeMetadata?: boolean;
}

const FormatSelector: React.FC<FormatSelectorProps> = ({ onFormatChange, className = '' }) => {
  const [selectedFormat, setSelectedFormat] = useState<string>('csv');
  const [formatOptions, setFormatOptions] = useState<FormatOptions>({
    includeHeaders: true,
    dateFormat: 'iso',
    numberFormat: 'decimal',
    encoding: 'utf8',
    delimiter: ',',
    includeMetadata: true,
  });

  const formats: FormatOption[] = [
    {
      id: 'csv',
      label: 'CSV',
      description: 'Comma-separated values file',
      icon: FileText,
      fileExtension: '.csv',
      bestFor: 'Excel, Google Sheets, data analysis',
      features: [
        'Universal compatibility',
        'Small file size',
        'Easy to edit',
        'Great for spreadsheets',
      ],
    },
    {
      id: 'excel',
      label: 'Excel',
      description: 'Microsoft Excel spreadsheet',
      icon: Table,
      fileExtension: '.xlsx',
      bestFor: 'Advanced Excel analysis and formatting',
      features: ['Rich formatting', 'Multiple sheets', 'Charts and graphs', 'Excel formulas'],
    },
    {
      id: 'json',
      label: 'JSON',
      description: 'JavaScript Object Notation',
      icon: Code,
      fileExtension: '.json',
      bestFor: 'Developers, APIs, data processing',
      features: [
        'Structured data',
        'Programming friendly',
        'Nested relationships',
        'API integration',
      ],
    },
    {
      id: 'pdf',
      label: 'PDF Report',
      description: 'Formatted PDF document',
      icon: File,
      fileExtension: '.pdf',
      bestFor: 'Reports, presentations, sharing',
      features: ['Professional layout', 'Charts and tables', 'Print-ready', 'Easy sharing'],
    },
  ];

  const handleFormatSelect = (formatId: string) => {
    setSelectedFormat(formatId);
    onFormatChange(formatId, formatOptions);
  };

  const handleOptionsChange = (newOptions: Partial<FormatOptions>) => {
    const updatedOptions = { ...formatOptions, ...newOptions };
    setFormatOptions(updatedOptions);
    onFormatChange(selectedFormat, updatedOptions);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <h4 className="font-medium text-gray-900 dark:text-white mb-4">Export Format</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {formats.map((format) => {
            const IconComponent = format.icon;
            const isSelected = selectedFormat === format.id;

            return (
              <div
                key={format.id}
                onClick={() => handleFormatSelect(format.id)}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 ring-2 ring-indigo-200 dark:ring-indigo-800'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex flex-col items-center text-center space-y-3">
                  <div
                    className={`p-3 rounded-lg ${
                      isSelected
                        ? 'bg-indigo-100 dark:bg-indigo-900'
                        : 'bg-gray-100 dark:bg-gray-700'
                    }`}
                  >
                    <IconComponent
                      className={`h-6 w-6 ${
                        isSelected
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}
                    />
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-900 dark:text-white">{format.label}</h5>
                    <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded mt-1 inline-block">
                      {format.fileExtension}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{format.bestFor}</p>
                </div>

                {isSelected && (
                  <div className="mt-3 pt-3 border-t border-indigo-200 dark:border-indigo-800">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                      <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                        Selected
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Format Options */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <h5 className="font-medium text-gray-900 dark:text-white mb-4">Export Options</h5>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formatOptions.includeHeaders || false}
                onChange={(e) => handleOptionsChange({ includeHeaders: e.target.checked })}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Include column headers
              </span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formatOptions.includeMetadata || false}
                onChange={(e) => handleOptionsChange({ includeMetadata: e.target.checked })}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Include export metadata
              </span>
            </label>
          </div>

          {selectedFormat === 'csv' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Delimiter
                </label>
                <select
                  value={formatOptions.delimiter || ','}
                  onChange={(e) =>
                    handleOptionsChange({ delimiter: e.target.value as FormatOptions['delimiter'] })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value=",">Comma (,)</option>
                  <option value=";">Semicolon (;)</option>
                  <option value="\t">Tab</option>
                  <option value="|">Pipe (|)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Encoding
                </label>
                <select
                  value={formatOptions.encoding || 'utf8'}
                  onChange={(e) =>
                    handleOptionsChange({ encoding: e.target.value as FormatOptions['encoding'] })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="utf8">UTF-8</option>
                  <option value="ascii">ASCII</option>
                  <option value="latin1">Latin-1</option>
                </select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date Format
              </label>
              <select
                value={formatOptions.dateFormat || 'iso'}
                onChange={(e) =>
                  handleOptionsChange({ dateFormat: e.target.value as FormatOptions['dateFormat'] })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="iso">ISO (2024-01-15)</option>
                <option value="us">US (01/15/2024)</option>
                <option value="eu">EU (15/01/2024)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Number Format
              </label>
              <select
                value={formatOptions.numberFormat || 'decimal'}
                onChange={(e) =>
                  handleOptionsChange({
                    numberFormat: e.target.value as FormatOptions['numberFormat'],
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="decimal">Decimal (123.45)</option>
                <option value="currency">Currency ($123.45)</option>
                <option value="accounting">Accounting ($123.45)</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormatSelector;

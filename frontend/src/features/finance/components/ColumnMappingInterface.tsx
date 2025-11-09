import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Alert } from '../../../components/ui/Alert';
import { Table, InfoIcon, CheckCircle } from 'lucide-react';
import { FlexBetween, HStack } from '../../../components/ui/Layout';

interface ColumnMappingInterfaceProps {
  sessionId: string;
  fileType: string;
  onSubmit: (columnMappings: Record<string, string>) => void;
  isProcessing: boolean;
}

interface ColumnSuggestion {
  columns: string[];
  sample_data: Record<string, any>[];
  suggested_mappings: Record<string, string>;
  learned_mappings: Array<{
    source_column_name: string;
    mapped_field_type: string;
    confidence_score: number;
  }>;
  mapping_template: {
    required_fields: string[];
    optional_fields: string[];
    field_descriptions: Record<string, string>;
  };
}

const FIELD_TYPES = [
  { value: 'date', label: 'Transaction Date', required: true },
  { value: 'amount', label: 'Transaction Amount', required: true },
  { value: 'description', label: 'Description', required: true },
  { value: 'debit', label: 'Debit Amount', required: false },
  { value: 'credit', label: 'Credit Amount', required: false },
  { value: 'balance', label: 'Account Balance', required: false },
  { value: 'category', label: 'Category', required: false },
  { value: 'merchant', label: 'Merchant Name', required: false },
  { value: 'reference', label: 'Reference Number', required: false },
  { value: 'account_number', label: 'Account Number', required: false },
];

export function ColumnMappingInterface({
  sessionId,
  fileType,
  onSubmit,
  isProcessing,
}: ColumnMappingInterfaceProps) {
  const [suggestions, setSuggestions] = useState<ColumnSuggestion | null>(null);
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadColumnSuggestions();
  }, [sessionId]);

  const loadColumnSuggestions = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/finance/sessions/${sessionId}/column-mapping-suggestions/`
      );

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data);

        // Initialize mappings with suggestions
        setColumnMappings(data.suggested_mappings || {});
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load column suggestions');
      }
    } catch (error) {
      console.error('Failed to load column suggestions:', error);
      setError('Network error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMappingChange = (fieldType: string, columnName: string) => {
    setColumnMappings((prev) => ({
      ...prev,
      [fieldType]: columnName === 'none' ? '' : columnName,
    }));
  };

  const handleSubmit = () => {
    // Validate required fields
    const requiredFields = suggestions?.mapping_template?.required_fields || [
      'date',
      'amount',
      'description',
    ];
    const missingRequired = requiredFields.filter((field) => !columnMappings[field]);

    if (missingRequired.length > 0) {
      setError(`Please map required fields: ${missingRequired.join(', ')}`);
      return;
    }

    onSubmit(columnMappings);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getLearnedMapping = (fieldType: string) => {
    return suggestions?.learned_mappings?.find(
      (mapping) => mapping.mapped_field_type === fieldType
    );
  };

  if (isLoading) {
    return (
      <Card>
        <div className="p-6">
          <HStack gap={2}>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span>Loading column suggestions...</span>
          </HStack>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="p-6">
          <Alert className="border-red-200 bg-red-50">
            <HStack gap={2}>
              <InfoIcon className="w-4 h-4 text-red-600" />
              <span className="text-red-700">{error}</span>
            </HStack>
          </Alert>
        </div>
      </Card>
    );
  }

  if (!suggestions) {
    return (
      <Card>
        <div className="p-6">
          <Alert>
            <HStack gap={2}>
              <InfoIcon className="w-4 h-4" />
              <span>No column suggestions available</span>
            </HStack>
          </Alert>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="p-6">
          <div className="mb-6">
            <HStack gap={2} className="text-lg font-semibold text-gray-900 dark:text-white">
              <Table className="w-5 h-5" />
              <h2>Column Mapping Configuration</h2>
            </HStack>
            <p className="text-sm text-gray-600">
              Map columns from your file to transaction fields
            </p>
          </div>
          <div className="space-y-6">
            {/* Sample Data Preview */}
            {suggestions.sample_data.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-3">Sample Data Preview</h3>
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          {suggestions.columns.map((column, index) => (
                            <th
                              key={index}
                              className="px-3 py-2 text-left font-medium text-gray-700"
                            >
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {suggestions.sample_data.slice(0, 3).map((row, rowIndex) => (
                          <tr key={rowIndex} className="border-t">
                            {suggestions.columns.map((column, colIndex) => (
                              <td key={colIndex} className="px-3 py-2 text-gray-900">
                                {String(row[column] || '').slice(0, 50)}
                                {String(row[column] || '').length > 50 && '...'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Column Mappings */}
            <div>
              <h3 className="text-sm font-medium mb-3">Field Mappings</h3>
              <div className="space-y-4">
                {FIELD_TYPES.map((fieldType) => {
                  const learnedMapping = getLearnedMapping(fieldType.value);
                  const currentMapping = columnMappings[fieldType.value];

                  return (
                    <div key={fieldType.value} className="p-4 border rounded-lg">
                      <HStack gap={4}>
                        <div className="flex-1">
                          <HStack gap={2}>
                            <label className="font-medium text-sm">{fieldType.label}</label>
                            {fieldType.required && (
                              <Badge variant="destructive" className="text-xs">
                                Required
                              </Badge>
                            )}
                            {learnedMapping && (
                              <Badge
                                className={getConfidenceColor(learnedMapping.confidence_score)}
                              >
                                Learned ({Math.round(learnedMapping.confidence_score * 100)}%)
                              </Badge>
                            )}
                          </HStack>
                          {suggestions.mapping_template.field_descriptions[fieldType.value] && (
                            <p className="text-xs text-gray-500 mt-1">
                              {suggestions.mapping_template.field_descriptions[fieldType.value]}
                            </p>
                          )}
                        </div>
                        <div className="w-64">
                          <select
                            value={currentMapping || 'none'}
                            onChange={(e) => handleMappingChange(fieldType.value, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="none">No mapping</option>
                            {suggestions.columns.map((column) => (
                              <option key={column} value={column}>
                                {column}
                              </option>
                            ))}
                          </select>
                        </div>
                      </HStack>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Learned Mappings Info */}
            {suggestions.learned_mappings.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-3">Previously Learned Mappings</h3>
                <div className="space-y-2">
                  {suggestions.learned_mappings.map((mapping, index) => (
                    <FlexBetween key={index} className="p-2 bg-gray-50 rounded">
                      <span className="text-sm">
                        <strong>{mapping.source_column_name}</strong> → {mapping.mapped_field_type}
                      </span>
                      <Badge className={getConfidenceColor(mapping.confidence_score)}>
                        {Math.round(mapping.confidence_score * 100)}%
                      </Badge>
                    </FlexBetween>
                  ))}
                </div>
              </div>
            )}

            {/* Validation Status */}
            <div className="space-y-2">
              {FIELD_TYPES.filter((ft) => ft.required).map((fieldType) => (
                <HStack key={fieldType.value} gap={2} className="text-sm">
                  {columnMappings[fieldType.value] ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                  )}
                  <span
                    className={columnMappings[fieldType.value] ? 'text-green-700' : 'text-gray-500'}
                  >
                    {fieldType.label}{' '}
                    {columnMappings[fieldType.value] && `→ ${columnMappings[fieldType.value]}`}
                  </span>
                </HStack>
              ))}
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <Button onClick={handleSubmit} disabled={isProcessing} className="flex-1">
                {isProcessing ? 'Processing...' : 'Apply Column Mapping'}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

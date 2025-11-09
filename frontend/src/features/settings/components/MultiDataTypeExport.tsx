import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { FlexBetween, HStack } from '../../../components/ui/Layout';

interface DataTypeField {
  name: string;
  label: string;
  description?: string;
  required?: boolean;
}

interface DataTypeOption {
  id: string;
  label: string;
  icon: string;
  description: string;
  fields: DataTypeField[];
  estimatedSize?: string;
}

interface MultiDataTypeExportProps {
  onSelectionChange: (selection: { dataTypes: string[]; fields: Record<string, string[]> }) => void;
  className?: string;
}

const MultiDataTypeExport: React.FC<MultiDataTypeExportProps> = ({
  onSelectionChange,
  className,
}) => {
  const { t } = useTranslation('settings');
  const [selectedDataTypes, setSelectedDataTypes] = useState<string[]>(['transactions']);
  const [selectedFields, setSelectedFields] = useState<Record<string, string[]>>({});
  const [expandedTypes, setExpandedTypes] = useState<string[]>(['transactions']);

  const dataTypeOptions: DataTypeOption[] = [
    {
      id: 'transactions',
      label: t('dataTypes.transactions.label'),
      icon: '💸',
      description: t('dataTypes.transactions.description'),
      estimatedSize: t('dataTypes.transactions.estimatedSize'),
      fields: [
        { name: 'id', label: t('dataTypes.transactions.fields.id'), required: true },
        { name: 'date', label: t('dataTypes.transactions.fields.date'), required: true },
        { name: 'amount', label: t('dataTypes.transactions.fields.amount'), required: true },
        { name: 'description', label: t('dataTypes.transactions.fields.description') },
        { name: 'category', label: t('dataTypes.transactions.fields.category') },
        { name: 'account', label: t('dataTypes.transactions.fields.account') },
        { name: 'type', label: t('dataTypes.transactions.fields.type') },
        { name: 'tags', label: t('dataTypes.transactions.fields.tags') },
        { name: 'notes', label: t('dataTypes.transactions.fields.notes') },
        { name: 'receipt_url', label: t('dataTypes.transactions.fields.receipt_url') },
      ],
    },
    {
      id: 'accounts',
      label: t('dataTypes.accounts.label'),
      icon: '🏦',
      description: t('dataTypes.accounts.description'),
      estimatedSize: t('dataTypes.accounts.estimatedSize'),
      fields: [
        { name: 'id', label: t('dataTypes.accounts.fields.id'), required: true },
        { name: 'name', label: t('dataTypes.accounts.fields.name'), required: true },
        { name: 'type', label: t('dataTypes.accounts.fields.type'), required: true },
        { name: 'balance', label: t('dataTypes.accounts.fields.balance') },
        { name: 'currency', label: t('dataTypes.accounts.fields.currency') },
        { name: 'institution', label: t('dataTypes.accounts.fields.institution') },
        { name: 'account_number', label: t('dataTypes.accounts.fields.account_number') },
        { name: 'created_date', label: t('dataTypes.accounts.fields.created_date') },
      ],
    },
    {
      id: 'budgets',
      label: t('dataTypes.budgets.label'),
      icon: '💰',
      description: t('dataTypes.budgets.description'),
      estimatedSize: t('dataTypes.budgets.estimatedSize'),
      fields: [
        { name: 'id', label: t('dataTypes.budgets.fields.id'), required: true },
        { name: 'name', label: t('dataTypes.budgets.fields.name'), required: true },
        { name: 'amount', label: t('dataTypes.budgets.fields.amount') },
        { name: 'spent', label: t('dataTypes.budgets.fields.spent') },
        { name: 'remaining', label: t('dataTypes.budgets.fields.remaining') },
        { name: 'period', label: t('dataTypes.budgets.fields.period') },
        { name: 'categories', label: t('dataTypes.budgets.fields.categories') },
        { name: 'start_date', label: t('dataTypes.budgets.fields.start_date') },
        { name: 'end_date', label: t('dataTypes.budgets.fields.end_date') },
      ],
    },
    {
      id: 'goals',
      label: t('dataTypes.goals.label'),
      icon: '🎯',
      description: t('dataTypes.goals.description'),
      estimatedSize: t('dataTypes.goals.estimatedSize'),
      fields: [
        { name: 'id', label: t('dataTypes.goals.fields.id'), required: true },
        { name: 'name', label: t('dataTypes.goals.fields.name'), required: true },
        { name: 'target_amount', label: t('dataTypes.goals.fields.target_amount') },
        { name: 'current_amount', label: t('dataTypes.goals.fields.current_amount') },
        { name: 'progress_percentage', label: t('dataTypes.goals.fields.progress_percentage') },
        { name: 'target_date', label: t('dataTypes.goals.fields.target_date') },
        { name: 'category', label: t('dataTypes.goals.fields.category') },
        { name: 'status', label: t('dataTypes.goals.fields.status') },
      ],
    },
    {
      id: 'categories',
      label: t('dataTypes.categories.label'),
      icon: '🏷️',
      description: t('dataTypes.categories.description'),
      estimatedSize: t('dataTypes.categories.estimatedSize'),
      fields: [
        { name: 'id', label: t('dataTypes.categories.fields.id'), required: true },
        { name: 'name', label: t('dataTypes.categories.fields.name'), required: true },
        { name: 'type', label: t('dataTypes.categories.fields.type') },
        { name: 'parent_category', label: t('dataTypes.categories.fields.parent_category') },
        { name: 'color', label: t('dataTypes.categories.fields.color') },
        { name: 'icon', label: t('dataTypes.categories.fields.icon') },
        { name: 'total_spent', label: t('dataTypes.categories.fields.total_spent') },
        { name: 'transaction_count', label: t('dataTypes.categories.fields.transaction_count') },
      ],
    },
    {
      id: 'group_expenses',
      label: t('dataTypes.group_expenses.label'),
      icon: '👥',
      description: t('dataTypes.group_expenses.description'),
      estimatedSize: t('dataTypes.group_expenses.estimatedSize'),
      fields: [
        { name: 'id', label: t('dataTypes.group_expenses.fields.id'), required: true },
        { name: 'title', label: t('dataTypes.group_expenses.fields.title'), required: true },
        { name: 'total_amount', label: t('dataTypes.group_expenses.fields.total_amount') },
        { name: 'paid_by', label: t('dataTypes.group_expenses.fields.paid_by') },
        { name: 'participants', label: t('dataTypes.group_expenses.fields.participants') },
        { name: 'split_method', label: t('dataTypes.group_expenses.fields.split_method') },
        { name: 'date', label: t('dataTypes.group_expenses.fields.date') },
        { name: 'status', label: t('dataTypes.group_expenses.fields.status') },
      ],
    },
  ];

  useEffect(() => {
    // Initialize default fields for selected data types
    const initialFields: Record<string, string[]> = {};
    selectedDataTypes.forEach((typeId) => {
      const dataType = dataTypeOptions.find((dt) => dt.id === typeId);
      if (dataType) {
        initialFields[typeId] = dataType.fields
          .filter((field) => field.required)
          .map((field) => field.name);
      }
    });
    setSelectedFields(initialFields);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDataTypes]);

  useEffect(() => {
    onSelectionChange({
      dataTypes: selectedDataTypes,
      fields: selectedFields,
    });
  }, [selectedDataTypes, selectedFields, onSelectionChange]);

  const handleDataTypeToggle = (typeId: string) => {
    if (selectedDataTypes.includes(typeId)) {
      setSelectedDataTypes((prev) => prev.filter((id) => id !== typeId));
      setSelectedFields((prev) => {
        const { [typeId]: _removed, ...rest } = prev;
        return rest;
      });
    } else {
      setSelectedDataTypes((prev) => [...prev, typeId]);
      const dataType = dataTypeOptions.find((dt) => dt.id === typeId);
      if (dataType) {
        setSelectedFields((prev) => ({
          ...prev,
          [typeId]: dataType.fields.filter((field) => field.required).map((field) => field.name),
        }));
      }
    }
  };

  const handleFieldToggle = (typeId: string, fieldName: string) => {
    setSelectedFields((prev) => {
      const currentFields = prev[typeId] || [];
      const field = dataTypeOptions
        .find((dt) => dt.id === typeId)
        ?.fields.find((f) => f.name === fieldName);

      if (field?.required) return prev; // Don't allow toggling required fields

      if (currentFields.includes(fieldName)) {
        return {
          ...prev,
          [typeId]: currentFields.filter((name) => name !== fieldName),
        };
      } else {
        return {
          ...prev,
          [typeId]: [...currentFields, fieldName],
        };
      }
    });
  };

  const handleSelectAllFields = (typeId: string) => {
    const dataType = dataTypeOptions.find((dt) => dt.id === typeId);
    if (dataType) {
      setSelectedFields((prev) => ({
        ...prev,
        [typeId]: dataType.fields.map((field) => field.name),
      }));
    }
  };

  const handleDeselectAllFields = (typeId: string) => {
    const dataType = dataTypeOptions.find((dt) => dt.id === typeId);
    if (dataType) {
      setSelectedFields((prev) => ({
        ...prev,
        [typeId]: dataType.fields.filter((field) => field.required).map((field) => field.name),
      }));
    }
  };

  const toggleExpanded = (typeId: string) => {
    setExpandedTypes((prev) =>
      prev.includes(typeId) ? prev.filter((id) => id !== typeId) : [...prev, typeId]
    );
  };

  const getTotalEstimatedSize = () => {
    const sizes = selectedDataTypes
      .map((typeId) => {
        const dataType = dataTypeOptions.find((dt) => dt.id === typeId);
        return dataType?.estimatedSize || '';
      })
      .filter(Boolean);

    if (sizes.length === 0) return '';
    return `Estimated total: ${sizes.join(', ')}`;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <FlexBetween>
        <h4 className="font-medium text-gray-900 dark:text-white">
          {t('multiDataTypeExport.title')}
        </h4>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {t('multiDataTypeExport.selectedTypes', { count: selectedDataTypes.length })}
        </span>
      </FlexBetween>

      <div className="space-y-3">
        {dataTypeOptions.map((dataType) => {
          const isSelected = selectedDataTypes.includes(dataType.id);
          const isExpanded = expandedTypes.includes(dataType.id);
          const selectedFieldsForType = selectedFields[dataType.id] || [];

          return (
            <div
              key={dataType.id}
              className={`border rounded-lg transition-all ${
                isSelected
                  ? 'border-indigo-300 bg-indigo-50/50 dark:bg-indigo-900/20 dark:border-indigo-600'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              {/* Data Type Header */}
              <div className="p-4">
                <HStack gap={3}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleDataTypeToggle(dataType.id)}
                    className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:focus:ring-indigo-600 dark:ring-offset-gray-800"
                  />

                  <div className="flex-1">
                    <HStack gap={2}>
                      <span className="text-xl">{dataType.icon}</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {dataType.label}
                      </span>
                      {isSelected && (
                        <span className="text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded">
                          {t('multiDataTypeExport.selectedFields', {
                            count: selectedFieldsForType.length,
                          })}
                        </span>
                      )}
                    </HStack>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {dataType.description}
                    </p>
                    {dataType.estimatedSize && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {dataType.estimatedSize}
                      </p>
                    )}
                  </div>

                  {isSelected && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpanded(dataType.id)}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </HStack>
              </div>

              {/* Field Selection */}
              {isSelected && isExpanded && (
                <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
                  <FlexBetween className="mb-3">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('multiDataTypeExport.selectFields')}
                    </span>
                    <div className="space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSelectAllFields(dataType.id)}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                      >
                        {t('multiDataTypeExport.selectAll')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeselectAllFields(dataType.id)}
                        className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        {t('multiDataTypeExport.requiredOnly')}
                      </Button>
                    </div>
                  </FlexBetween>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {dataType.fields.map((field) => {
                      const isFieldSelected = selectedFieldsForType.includes(field.name);
                      const isDisabled = field.required;

                      return (
                        <label
                          key={field.name}
                          className={`flex items-center space-x-2 p-2 rounded cursor-pointer transition-colors ${
                            isDisabled
                              ? 'bg-gray-50 dark:bg-gray-700/50 cursor-not-allowed'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isFieldSelected}
                            disabled={isDisabled}
                            onChange={() => handleFieldToggle(dataType.id, field.name)}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 rounded disabled:opacity-50"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <span
                                className={`text-sm ${isDisabled ? 'font-medium' : ''} text-gray-900 dark:text-white`}
                              >
                                {field.label}
                              </span>
                              {field.required && (
                                <span className="text-xs bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-400 px-1 rounded">
                                  {t('multiDataTypeExport.required')}
                                </span>
                              )}
                            </div>
                            {field.description && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {field.description}
                              </p>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedDataTypes.length > 0 && (
        <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-800 dark:text-green-200">
            <strong>{t('multiDataTypeExport.exportSummaryTitle')}</strong>{' '}
            {t('multiDataTypeExport.exportSummaryText', { count: selectedDataTypes.length })}
          </p>
          {getTotalEstimatedSize() && (
            <p className="text-xs text-green-700 dark:text-green-300 mt-1">
              {getTotalEstimatedSize()}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default MultiDataTypeExport;

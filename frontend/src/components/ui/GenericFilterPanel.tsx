import { useState, type ChangeEvent, type FC, type ReactNode } from 'react';
import { Input } from './Input';
import { Button } from './Button';
import { Select } from './Select';
import { checkboxClassName } from './Checkbox';
import { X } from 'lucide-react';

/**
 * Generic filter panel component for reusable filtering UI
 * Supports text search, select filters, date ranges, and custom filters
 *
 * @example
 * <GenericFilterPanel
 *   filters={[
 *     { name: 'search', label: 'Search', type: 'text', placeholder: 'Search...' },
 *     { name: 'status', label: 'Status', type: 'select', options: [
 *       { value: 'active', label: 'Active' },
 *       { value: 'inactive', label: 'Inactive' }
 *     ]}
 *   ]}
 *   onApply={(values) => console.log(values)}
 *   onClear={() => console.log('cleared')}
 * />
 */

export type FilterType =
  | 'text'
  | 'select'
  | 'date'
  | 'dateRange'
  | 'number'
  | 'numberRange'
  | 'checkbox'
  | 'custom';

export interface FilterOption {
  value: string | number;
  label: string;
}

export interface FilterField {
  name: string;
  label: string;
  type: FilterType;
  placeholder?: string;
  options?: FilterOption[];
  value?: string | number | boolean;
  min?: number;
  max?: number;
  startName?: string; // For range filters (min/max or start/end)
  endName?: string;
  startValue?: string | number;
  endValue?: string | number;
  render?: (field: FilterField, value: unknown, onChange: (v: unknown) => void) => ReactNode;
}

interface GenericFilterPanelProps {
  filters: FilterField[];
  onApply: (values: Record<string, any>) => void;
  onClear: () => void;
  isLoading?: boolean;
  className?: string;
}

export const GenericFilterPanel: FC<GenericFilterPanelProps> = ({
  filters,
  onApply,
  onClear,
  isLoading = false,
  className = '',
}) => {
  const [values, setValues] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    filters.forEach((f) => {
      if (f.type === 'dateRange' || f.type === 'numberRange') {
        initial[f.startName || `${f.name}_start`] = f.startValue || '';
        initial[f.endName || `${f.name}_end`] = f.endValue || '';
      } else {
        initial[f.name] = f.value || '';
      }
    });
    return initial;
  });

  const handleChange = (key: string, value: any) => {
    setValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleApply = () => {
    // Filter out empty values
    const filteredValues = Object.fromEntries(
      Object.entries(values).filter(([, v]) => v !== '' && v !== null && v !== undefined)
    );
    onApply(filteredValues);
  };

  const handleClear = () => {
    const cleared: Record<string, any> = {};
    filters.forEach((f) => {
      if (f.type === 'dateRange' || f.type === 'numberRange') {
        cleared[f.startName || `${f.name}_start`] = '';
        cleared[f.endName || `${f.name}_end`] = '';
      } else {
        cleared[f.name] = '';
      }
    });
    setValues(cleared);
    onClear();
  };

  const renderFilter = (field: FilterField) => {
    // Custom render function
    if (field.render) {
      return field.render(field, values[field.name], (v) => handleChange(field.name, v));
    }

    const baseProps = {
      disabled: isLoading,
      className: 'w-full',
    };

    switch (field.type) {
      case 'text':
        return (
          <Input
            {...baseProps}
            type="text"
            placeholder={field.placeholder}
            value={values[field.name] || ''}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              handleChange(field.name, event.target.value)
            }
          />
        );

      case 'date':
        return (
          <Input
            {...baseProps}
            type="date"
            value={values[field.name] || ''}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              handleChange(field.name, event.target.value)
            }
          />
        );

      case 'dateRange': {
        const startKey = field.startName || `${field.name}_start`;
        const endKey = field.endName || `${field.name}_end`;
        return (
          <div className="flex gap-2">
            <Input
              type="date"
              placeholder="From"
              value={values[startKey] || ''}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                handleChange(startKey, event.target.value)
              }
              disabled={isLoading}
              className="w-1/2"
            />
            <Input
              type="date"
              placeholder="To"
              value={values[endKey] || ''}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                handleChange(endKey, event.target.value)
              }
              disabled={isLoading}
              className="w-1/2"
            />
          </div>
        );
      }

      case 'number':
        return (
          <Input
            {...baseProps}
            type="number"
            placeholder={field.placeholder}
            value={values[field.name] || ''}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              handleChange(field.name, event.target.value)
            }
            min={field.min}
            max={field.max}
          />
        );

      case 'numberRange': {
        const minKey = field.startName || `${field.name}_min`;
        const maxKey = field.endName || `${field.name}_max`;
        return (
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder={field.placeholder ? `Min ${field.placeholder}` : 'Min'}
              value={values[minKey] || ''}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                handleChange(minKey, event.target.value)
              }
              disabled={isLoading}
              className="w-1/2"
            />
            <Input
              type="number"
              placeholder={field.placeholder ? `Max ${field.placeholder}` : 'Max'}
              value={values[maxKey] || ''}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                handleChange(maxKey, event.target.value)
              }
              disabled={isLoading}
              className="w-1/2"
            />
          </div>
        );
      }

      case 'select':
        return (
          <Select
            {...baseProps}
            options={field.options || []}
            value={values[field.name] || ''}
            onChange={(value: string | number) => handleChange(field.name, value)}
            placeholder={field.placeholder}
          />
        );

      case 'checkbox':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={values[field.name] || false}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                handleChange(field.name, event.target.checked)
              }
              disabled={isLoading}
              className={checkboxClassName}
            />
            <span className="text-sm text-gray-900 dark:text-gray-100">{field.label}</span>
          </label>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      <div className="space-y-4">
        {filters.map((field) => (
          <div key={field.name}>
            {field.type !== 'checkbox' && (
              <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
            )}
            {renderFilter(field)}
          </div>
        ))}
      </div>

      <div className="flex gap-2 mt-6 pt-4 border-t border-gray-200">
        <Button onClick={handleApply} disabled={isLoading} className="flex-1">
          Apply Filters
        </Button>
        <Button onClick={handleClear} variant="ghost" disabled={isLoading} className="flex-1">
          <X className="w-4 h-4 mr-2" />
          Clear
        </Button>
      </div>
    </div>
  );
};

export default GenericFilterPanel;

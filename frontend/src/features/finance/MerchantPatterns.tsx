import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { LoadingSpinner } from '../../components/layout/LoadingSpinner';
import { FormModal } from '../../components/ui/FormModal';
import { Button } from '../../components/ui/Button';
import { DebouncedInput } from '../../components/ui/DebouncedInput';
import { Select } from '../../components/ui/Select';
import { StatusBadge } from '../../components/common/StatusBadge';
import { apiClient } from '../../api';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { checkboxClassName } from '../../components/ui/Checkbox';
import type { Category } from '../../types';

interface MerchantPattern {
  id: number;
  pattern: string;
  kind: string;
  merchant_name: string;
  category: number;
  category_name?: string;
  confidence: number;
  is_active: boolean;
  usage_count: number;
  last_used: string | null;
  created_at: string;
}

interface MerchantPatternFormData {
  pattern: FormDataEntryValue | null;
  merchant_name: FormDataEntryValue | null;
  kind: FormDataEntryValue | null;
  category: number;
  confidence: number;
  is_active: boolean;
}

const MerchantPatterns: React.FC = () => {
  const [patterns, setPatterns] = useState<MerchantPattern[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPattern, setEditingPattern] = useState<MerchantPattern | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  const [patternToDelete, setPatternToDelete] = useState<MerchantPattern | null>(null);

  useEffect(() => {
    loadPatterns();
    loadCategories();
  }, []);

  const loadPatterns = async () => {
    try {
      const response = await apiClient.getMerchantPatterns();
      setPatterns(response);
    } catch (error: unknown) {
      console.error('Error loading merchant patterns:', error);
      toast.error('Failed to load merchant patterns');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await apiClient.getCategories();
      setCategories(response);
    } catch (error: unknown) {
      console.error('Error loading categories:', error);
    }
  };

  const createPattern = async (data: MerchantPatternFormData) => {
    try {
      await apiClient.createMerchantPattern(data);
      toast.success('Merchant pattern created successfully!');
      setShowCreateModal(false);
      loadPatterns();
    } catch (error: unknown) {
      console.error('Error creating pattern:', error);
      const err = error as { response?: { data?: Record<string, string[]> } };
      if (err.response?.data) {
        const errorMessages = Object.values(err.response.data).flat();
        toast.error(errorMessages.join(', '));
      } else {
        toast.error('Failed to create merchant pattern');
      }
    }
  };

  const updatePattern = async (data: MerchantPatternFormData) => {
    if (!editingPattern) return;

    try {
      await apiClient.updateMerchantPattern(editingPattern.id, data);
      toast.success('Merchant pattern updated successfully!');
      setEditingPattern(null);
      loadPatterns();
    } catch (error: unknown) {
      console.error('Error updating pattern:', error);
      const err = error as { response?: { data?: Record<string, string[]> } };
      if (err.response?.data) {
        const errorMessages = Object.values(err.response.data).flat();
        toast.error(errorMessages.join(', '));
      } else {
        toast.error('Failed to update merchant pattern');
      }
    }
  };

  const deletePattern = async () => {
    if (!patternToDelete) return;

    try {
      await apiClient.deleteMerchantPattern(patternToDelete.id);
      toast.success('Merchant pattern deleted');
      setPatternToDelete(null);
      loadPatterns();
    } catch (error) {
      console.error('Error deleting pattern:', error);
      toast.error('Failed to delete merchant pattern');
      setPatternToDelete(null);
    }
  };

  const togglePatternStatus = async (pattern: MerchantPattern) => {
    try {
      await apiClient.updateMerchantPattern(pattern.id, {
        is_active: !pattern.is_active,
      });
      toast.success(`Pattern ${pattern.is_active ? 'disabled' : 'enabled'}`);
      loadPatterns();
    } catch (error) {
      console.error('Error toggling pattern status:', error);
      toast.error('Failed to update pattern status');
    }
  };

  const filteredPatterns = patterns.filter((pattern) => {
    const matchesSearch =
      searchTerm === '' ||
      pattern.pattern.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pattern.merchant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pattern.kind.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = filterActive === null || pattern.is_active === filterActive;

    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Merchant Pattern Management</h1>
          <p className="text-gray-600">
            Manage patterns to automatically recognize merchants and improve transaction
            categorization
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} size="sm">
          ➕ Add Pattern
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <DebouncedInput
            type="text"
            placeholder="Search patterns, merchants, or types..."
            value={searchTerm}
            onChange={setSearchTerm}
            wrapperClassName="flex-1 relative"
            debounceMs={300}
          />
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setFilterActive(null)}
            variant={filterActive === null ? 'primary' : 'secondary'}
            size="sm"
          >
            All
          </Button>
          <Button
            onClick={() => setFilterActive(true)}
            variant={filterActive === true ? 'success' : 'secondary'}
            size="sm"
          >
            Active
          </Button>
          <Button
            onClick={() => setFilterActive(false)}
            variant={filterActive === false ? 'danger' : 'secondary'}
            size="sm"
          >
            Inactive
          </Button>
        </div>
      </div>

      {/* Patterns List */}
      {filteredPatterns.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🏪</div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            {searchTerm || filterActive !== null
              ? 'No patterns match your filters'
              : 'No merchant patterns yet'}
          </h3>
          <p className="text-gray-500 mb-6">
            {searchTerm || filterActive !== null
              ? 'Try adjusting your search or filters'
              : 'Create patterns to help automatically categorize transactions from specific merchants'}
          </p>
          {!searchTerm && filterActive === null && (
            <Button onClick={() => setShowCreateModal(true)}>Create Your First Pattern</Button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pattern
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Merchant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPatterns.map((pattern) => (
                  <tr key={pattern.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 font-mono">
                          {pattern.pattern}
                        </div>
                        <div className="text-sm text-gray-500">{pattern.kind}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{pattern.merchant_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {pattern.category_name || 'Unknown'}
                      </div>
                      <div className="text-sm text-gray-500">
                        Confidence: {Math.round(pattern.confidence * 100)}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{pattern.usage_count} times</div>
                      {pattern.last_used && (
                        <div className="text-sm text-gray-500">
                          Last: {new Date(pattern.last_used).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge
                        status={pattern.is_active ? 'active' : 'inactive'}
                        className={
                          pattern.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <Button onClick={() => setEditingPattern(pattern)} variant="ghost" size="sm">
                        Edit
                      </Button>
                      <Button
                        onClick={() => togglePatternStatus(pattern)}
                        variant={pattern.is_active ? 'secondary' : 'success'}
                        size="sm"
                      >
                        {pattern.is_active ? 'Disable' : 'Enable'}
                      </Button>
                      <Button
                        onClick={() => setPatternToDelete(pattern)}
                        variant="danger"
                        size="sm"
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stats */}
      {patterns.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <h3 className="text-sm font-medium text-gray-500">Total Patterns</h3>
            <p className="text-2xl font-bold text-gray-900">{patterns.length}</p>
          </Card>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Active Patterns</h3>
            <p className="text-2xl font-bold text-green-600">
              {patterns.filter((p) => p.is_active).length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Usage</h3>
            <p className="text-2xl font-bold text-blue-600">
              {patterns.reduce((sum, p) => sum + p.usage_count, 0)}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Avg Confidence</h3>
            <p className="text-2xl font-bold text-purple-600">
              {Math.round(
                (patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length) * 100
              )}
              %
            </p>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      <FormModal
        isOpen={showCreateModal || editingPattern !== null}
        onClose={() => {
          setShowCreateModal(false);
          setEditingPattern(null);
        }}
        title={editingPattern ? 'Edit Merchant Pattern' : 'Create Merchant Pattern'}
        size="lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const data = {
              pattern: formData.get('pattern'),
              merchant_name: formData.get('merchant_name'),
              kind: formData.get('kind'),
              category: parseInt(formData.get('category') as string),
              confidence: parseFloat(formData.get('confidence') as string),
              is_active: formData.get('is_active') === 'on',
            };
            if (editingPattern) {
              updatePattern(data);
            } else {
              createPattern(data);
            }
          }}
          className="space-y-4"
        >
          <Input
            label="Transaction Pattern"
            type="text"
            name="pattern"
            defaultValue={editingPattern?.pattern || ''}
            placeholder="e.g., AMZN Mktp, STARBUCKS, TST* Restaurant"
            required
          />

          <Input
            label="Merchant Name"
            type="text"
            name="merchant_name"
            defaultValue={editingPattern?.merchant_name || ''}
            placeholder="e.g., Amazon, Starbucks, Test Restaurant"
            required
          />

          <Input
            label="Transaction Type"
            type="text"
            name="kind"
            defaultValue={editingPattern?.kind || ''}
            placeholder="e.g., online_purchase, coffee_shop, restaurant"
            required
          />

          <Select
            label="Default Category"
            name="category"
            defaultValue={editingPattern?.category || ''}
            required
            options={categories.map((cat) => ({
              value: cat.id,
              label: cat.name,
            }))}
          />

          <Input
            label="Confidence Score"
            type="number"
            name="confidence"
            defaultValue={editingPattern?.confidence || 0.8}
            min="0"
            max="1"
            step="0.1"
            placeholder="0.8"
            required
          />

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={editingPattern?.is_active ?? true}
              className={checkboxClassName}
            />
            <span className="text-sm text-gray-900 dark:text-gray-100">Active</span>
          </label>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              onClick={() => {
                setShowCreateModal(false);
                setEditingPattern(null);
              }}
              variant="secondary"
              size="md"
            >
              Cancel
            </Button>
            <Button type="submit" size="md">
              {editingPattern ? 'Update Pattern' : 'Create Pattern'}
            </Button>
          </div>
        </form>
      </FormModal>

      <ConfirmDialog
        isOpen={!!patternToDelete}
        onClose={() => setPatternToDelete(null)}
        onConfirm={deletePattern}
        title="Delete Merchant Pattern"
        message="Are you sure you want to delete this merchant pattern?"
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};

export default MerchantPatterns;

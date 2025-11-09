import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { LoadingSpinner } from '../../components/layout/LoadingSpinner';
import { Modal } from '../../components/ui/Modal';
import { StatusBadge } from '../../components/common/StatusBadge';
import { apiClient } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { ObjectForm } from '../../components/forms';
import { AutomationRuleFormData } from '../../shared/schemas/forms';
import type { Category } from '../../types';
import type { ProcessingRule } from '../../api/modules/types';
import { createAutomationRuleFormConfig } from '../../shared/forms';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

interface RuleChoices {
  condition_fields: [string, string][];
  condition_operators: [string, string][];
  action_types: [string, string][];
}

const FALLBACK_CONDITION_FIELDS: [string, string][] = [
  ['description', 'Description'],
  ['merchant_name', 'Merchant Name'],
  ['amount', 'Amount'],
  ['notes', 'Notes'],
];

const FALLBACK_CONDITION_OPERATORS: [string, string][] = [
  ['contains', 'contains'],
  ['equals', 'equals'],
  ['starts_with', 'starts with'],
  ['ends_with', 'ends with'],
];

const ACTION_TYPE_CHOICES: [string, string][] = [
  ['set_category', 'Set Category'],
  ['set_account', 'Set Account'],
  ['add_tag', 'Add Tag'],
  ['set_description', 'Set Description'],
];

const fallbackChoices: RuleChoices = {
  condition_fields: FALLBACK_CONDITION_FIELDS,
  condition_operators: FALLBACK_CONDITION_OPERATORS,
  action_types: ACTION_TYPE_CHOICES,
};

interface TestResult {
  matches_count: number;
  matches: Array<{
    id: number;
    description: string;
    amount: string;
    date: string;
    current_category?: string | null;
  }>;
  total_tested: number;
}

const ProcessingRules: React.FC = () => {
  const [rules, setRules] = useState<ProcessingRule[]>([]);
  const [choices, setChoices] = useState<RuleChoices>(fallbackChoices);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRule, setEditingRule] = useState<ProcessingRule | null>(null);
  const [testingRule, setTestingRule] = useState<ProcessingRule | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [dragging, setDragging] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<ProcessingRule | null>(null);
  const [ruleToApply, setRuleToApply] = useState<ProcessingRule | null>(null);

  useEffect(() => {
    loadRules();
    loadChoices();
    loadCategories();
  }, []);

  const loadRules = async () => {
    try {
      const response = await apiClient.getProcessingRules();
      setRules(response);
    } catch (error: unknown) {
      console.error('Error loading rules:', error);
      toast.error('Failed to load automation rules');
    } finally {
      setLoading(false);
    }
  };

  const loadChoices = async () => {
    const toChoiceTuples = (record?: Record<string, string[]>) => {
      if (!record) return [] as [string, string][];
      return Object.entries(record).map(([value, labels]) => [value, labels?.[0] ?? value]);
    };

    try {
      const response = await apiClient.getProcessingRuleChoices();
      const mappedFields = toChoiceTuples(response.field_choices);
      const mappedOperators = toChoiceTuples(response.operator_choices);

      const mappedActions = toChoiceTuples(response.action_choices);

      setChoices({
        condition_fields: mappedFields.length ? mappedFields : FALLBACK_CONDITION_FIELDS,
        condition_operators: mappedOperators.length
          ? mappedOperators
          : FALLBACK_CONDITION_OPERATORS,
        action_types: mappedActions.length ? mappedActions : ACTION_TYPE_CHOICES,
      });
    } catch (error: unknown) {
      console.error('Error loading choices:', error);
      setChoices(fallbackChoices);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await apiClient.getCategories();
      setCategories(response as Category[]);
    } catch (error: unknown) {
      console.error('Error loading categories:', error);
    }
  };

  const createRule = async (data: AutomationRuleFormData) => {
    try {
      await apiClient.createProcessingRule(data);
      toast.success('Automation rule created successfully!');
      setShowCreateModal(false);
      loadRules();
    } catch (error: unknown) {
      console.error('Error creating rule:', error);
      const err = error as { response?: { data?: Record<string, string[]> } };
      if (err.response?.data) {
        const errorMessages = Object.values(err.response.data).flat();
        toast.error(errorMessages.join(', '));
      } else {
        toast.error('Failed to create automation rule');
      }
    }
  };

  const updateRule = async (data: AutomationRuleFormData) => {
    if (!editingRule) return;

    try {
      await apiClient.updateProcessingRule(editingRule.id, data);
      toast.success('Automation rule updated successfully!');
      setEditingRule(null);
      loadRules();
    } catch (error: unknown) {
      console.error('Error updating rule:', error);
      const err = error as { response?: { data?: Record<string, string[]> } };
      if (err.response?.data) {
        const errorMessages = Object.values(err.response.data).flat();
        toast.error(errorMessages.join(', '));
      } else {
        toast.error('Failed to update automation rule');
      }
    }
  };

  const deleteRule = async () => {
    if (!ruleToDelete) return;

    try {
      await apiClient.deleteProcessingRule(ruleToDelete.id);
      toast.success('Automation rule deleted');
      setRuleToDelete(null);
      loadRules();
    } catch (error: unknown) {
      console.error('Error deleting rule:', error);
      toast.error('Failed to delete automation rule');
      setRuleToDelete(null);
    }
  };

  const toggleRuleStatus = async (rule: ProcessingRule) => {
    try {
      await apiClient.updateProcessingRule(rule.id, {
        is_active: !rule.is_active,
      });
      toast.success(`Rule ${rule.is_active ? 'disabled' : 'enabled'}`);
      loadRules();
    } catch (error: unknown) {
      console.error('Error toggling rule status:', error);
      toast.error('Failed to update rule status');
    }
  };

  const testRule = async (rule: ProcessingRule) => {
    setTestingRule(rule);
    try {
      const response = await apiClient.testProcessingRule(rule.id);
      const matchesRaw = response.matched_transactions ?? [];
      const matches = matchesRaw.map((match) => ({
        id: typeof match.id === 'number' ? match.id : Number(match.id),
        description: match.description ?? '',
        amount:
          typeof match.amount === 'number' ? match.amount.toFixed(2) : String(match.amount ?? ''),
        date: match.date ?? '',
        current_category:
          (match as { current_category?: string | null }).current_category ??
          match.category_name ??
          null,
      }));

      setTestResult({
        matches_count: response.match_count ?? matches.length,
        matches: matches.slice(0, 10),
        total_tested: response.total_tested ?? matchesRaw.length,
      });
    } catch (error: unknown) {
      console.error('Error testing rule:', error);
      toast.error('Failed to test rule');
    }
  };

  const applyToExisting = async () => {
    if (!ruleToApply) return;

    try {
      const response = await apiClient.applyProcessingRuleToExisting(ruleToApply.id);
      toast.success(`Applied to ${response.updated_count} transactions`);
      setRuleToApply(null);
    } catch (error: unknown) {
      console.error('Error applying rule:', error);
      toast.error('Failed to apply rule to existing transactions');
      setRuleToApply(null);
    }
  };

  const reorderRules = async (newOrder: ProcessingRule[]) => {
    try {
      const ruleIds = newOrder.map((rule) => rule.id);
      await apiClient.reorderProcessingRules(ruleIds);
      setRules(newOrder);
      toast.success('Rules reordered successfully');
    } catch (error: unknown) {
      console.error('Error reordering rules:', error);
      toast.error('Failed to reorder rules');
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
    setDragging(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));

    if (dragIndex !== dropIndex) {
      const newRules = [...rules];
      const draggedRule = newRules[dragIndex];
      newRules.splice(dragIndex, 1);
      newRules.splice(dropIndex, 0, draggedRule);

      // Update priorities
      const updatedRules = newRules.map((rule, index) => ({
        ...rule,
        priority: rules.length - index,
      }));

      reorderRules(updatedRules);
    }
    setDragging(false);
  };

  const getChoiceLabel = (choices: [string, string][], value: string) => {
    const choice = choices.find(([key]) => key === value);
    return choice ? choice[1] : value;
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            Transaction Automation Rules
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Keep repetitive transaction cleanup light with simple, reorderable rules.
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          size="sm"
          variant="outline"
          className="gap-2"
        >
          <span className="text-base leading-none">＋</span>
          Create Rule
        </Button>
      </div>

      {/* Rules Priority Info */}
      {rules.length > 0 && (
        <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-sm text-blue-700 shadow-sm dark:border-blue-900/50 dark:bg-blue-900/30 dark:text-blue-200">
          <h3 className="font-semibold">Rule priority</h3>
          <p className="mt-1 leading-relaxed">
            Rules run from top to bottom. Drag to reorder whenever priorities change.
          </p>
        </div>
      )}

      {/* Rules List */}
      {rules.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white/60 py-12 text-center shadow-inner dark:border-gray-700 dark:bg-gray-800/60">
          <div className="text-4xl mb-3">⚙️</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            No automation rules yet
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Create your first rule to put repetitive transaction edits on autopilot.
          </p>
          <Button onClick={() => setShowCreateModal(true)} size="sm" className="mt-5">
            Create your first rule
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule, index) => (
            <div
              key={rule.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              className={`rounded-2xl border border-gray-100 bg-white/90 p-5 shadow-sm transition-all hover:border-gray-200 hover:shadow-md dark:border-gray-700 dark:bg-gray-800/80 dark:hover:border-gray-600 ${
                dragging ? 'opacity-60' : 'opacity-100'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{rule.name}</h3>
                    <span className="text-sm text-gray-500">Priority: {rule.priority}</span>
                    <StatusBadge
                      status={rule.is_active ? 'active' : 'inactive'}
                      variant={rule.is_active ? 'success' : 'default'}
                    />
                  </div>

                  <div className="text-sm text-gray-600 space-y-1">
                    <p>
                      <strong>When:</strong>{' '}
                      {getChoiceLabel(choices.condition_fields, rule.condition_field)}{' '}
                      {getChoiceLabel(choices.condition_operators, rule.condition_operator)} "
                      {rule.condition_value}"
                    </p>
                    <p>
                      <strong>Then:</strong>{' '}
                      {getChoiceLabel(choices.action_types, rule.action_type)}
                      {rule.action_type === 'set_category' && (
                        <span>
                          {' '}
                          to "
                          {categories.find((c) => c.id.toString() === rule.action_value)?.name ||
                            rule.action_value}
                          "
                        </span>
                      )}
                      {rule.action_type !== 'set_category' && <span> "{rule.action_value}"</span>}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button onClick={() => testRule(rule)} size="sm" variant="secondary">
                    Test
                  </Button>
                  <Button onClick={() => setEditingRule(rule)} size="sm" variant="secondary">
                    Edit
                  </Button>
                  <Button
                    onClick={() => toggleRuleStatus(rule)}
                    size="sm"
                    variant={rule.is_active ? 'secondary' : 'success'}
                  >
                    {rule.is_active ? 'Disable' : 'Enable'}
                  </Button>
                  <Button
                    onClick={() => setRuleToApply(rule)}
                    disabled={!rule.is_active}
                    size="sm"
                    variant="info"
                  >
                    Apply to Existing
                  </Button>
                  <Button onClick={() => setRuleToDelete(rule)} size="sm" variant="danger">
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showCreateModal || editingRule !== null}
        onClose={() => {
          setShowCreateModal(false);
          setEditingRule(null);
        }}
        title={editingRule ? 'Edit Automation Rule' : 'Create Automation Rule'}
        subtitle="Automatically categorize and process transactions based on rules."
        size="lg"
      >
        <ObjectForm
          config={createAutomationRuleFormConfig(
            editingRule ? updateRule : createRule,
            categories.map((cat) => ({
              value: cat.id.toString(),
              label: cat.name,
            })),
            choices.condition_fields.map(([value, label]) => ({ value, label })),
            choices.condition_operators.map(([value, label]) => ({ value, label })),
            false,
            editingRule
              ? {
                  name: editingRule.name,
                  condition_field: editingRule.condition_field,
                  condition_operator: editingRule.condition_operator,
                  condition_value: editingRule.condition_value,
                  action_type: editingRule.action_type,
                  action_value: editingRule.action_value,
                  priority: editingRule.priority,
                  is_active: editingRule.is_active,
                }
              : undefined
          )}
        />
      </Modal>

      {/* Test Results Modal */}
      <Modal
        isOpen={testingRule !== null}
        onClose={() => {
          setTestingRule(null);
          setTestResult(null);
        }}
        title={`Test Results: ${testingRule?.name}`}
        size="lg"
      >
        {testResult && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-800 mb-2">Summary</h3>
              <p className="text-sm text-blue-700">
                Found {testResult.matches_count} matching transactions out of{' '}
                {testResult.total_tested} tested.
              </p>
            </div>

            {testResult.matches.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">
                  Sample Matches (showing first 10):
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {testResult.matches.map((match) => (
                    <div key={match.id} className="border border-gray-200 rounded p-3 text-sm">
                      <div className="font-medium">{match.description}</div>
                      <div className="text-gray-600">
                        Amount: ${match.amount} | Date: {new Date(match.date).toLocaleDateString()}
                        {match.current_category && ` | Current Category: ${match.current_category}`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {testResult.matches_count === 0 && (
              <div className="text-center py-8 text-gray-500">
                No transactions match this rule. Consider adjusting the conditions.
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!ruleToDelete}
        onClose={() => setRuleToDelete(null)}
        onConfirm={deleteRule}
        title="Delete Automation Rule"
        message="Are you sure you want to delete this automation rule?"
        confirmText="Delete"
        variant="danger"
      />

      {/* Apply to Existing Confirmation */}
      <ConfirmDialog
        isOpen={!!ruleToApply}
        onClose={() => setRuleToApply(null)}
        onConfirm={applyToExisting}
        title="Apply Rule to Existing Transactions"
        message="Apply this rule to all existing transactions? This action cannot be undone."
        confirmText="Apply"
        variant="warning"
      />
    </div>
  );
};

export default ProcessingRules;

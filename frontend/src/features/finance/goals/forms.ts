import { FormConfig } from '../../../shared/schemas';
import { goalEnhancedSchema, GoalEnhancedFormData } from '../schemas/forms';
import {
  goalTypeOptions,
  goalPriorityOptions,
  goalContributionFrequencyOptions,
} from '../constants/goalConstants';

interface GoalFormConfigOptions {
  onSubmit: (data: GoalEnhancedFormData) => Promise<void>;
  isLoading?: boolean;
  initialData?: Partial<GoalEnhancedFormData>;
  isEdit?: boolean;
  accounts?: Array<{ value: number; label: string }>;
  categories?: Array<{ value: string; label: string }>;
  onCancel?: () => void;
  onDelete?: () => void;
}

export const createGoalFormConfig = ({
  onSubmit,
  isLoading = false,
  initialData,
  isEdit = false,
  accounts = [],
  categories = [],
  onCancel,
  onDelete,
}: GoalFormConfigOptions): FormConfig<GoalEnhancedFormData> => {
  return {
    schema: goalEnhancedSchema,
    titleKey: isEdit ? 'finance.goals.form.editTitle' : 'finance.goals.form.addTitle',
    descriptionKey: isEdit
      ? 'finance.goals.form.editDescription'
      : 'finance.goals.form.addDescription',
    showHeader: false, // Title and description will be shown in Modal header
    fields: [
      {
        name: 'name',
        type: 'input',
        label: 'Goal Name',
        labelKey: 'finance.goals.form.fields.name',
        placeholder: 'e.g., Emergency Fund, Vacation, New Car',
        placeholderKey: 'finance.goals.form.fields.namePlaceholder',
        validation: { required: true },
        description: 'Choose a meaningful name for your goal',
        descriptionKey: 'finance.goals.form.fields.nameDescription',
        className: 'md:col-span-2', // Full width
      },
      {
        name: 'goal_type',
        type: 'select',
        label: 'Goal Type',
        labelKey: 'finance.goals.form.fields.goalType',
        className: 'md:col-span-2', // Full width
        options: goalTypeOptions,
        validation: { required: true },
        descriptionKey: 'finance.goals.form.fields.goalTypeDescription',
      },
      {
        name: 'target_amount',
        type: 'currency',
        label: 'Target Amount',
        labelKey: 'finance.goals.form.fields.targetAmount',
        placeholder: '1000.00',
        validation: { required: true },
        descriptionKey: 'finance.goals.form.fields.targetAmountDescription',
        // Takes 1 column - can share row with current_amount
      },
      {
        name: 'current_amount',
        type: 'currency',
        label: 'Current Amount',
        labelKey: 'finance.goals.form.fields.currentAmount',
        placeholder: '0.00',
        descriptionKey: 'finance.goals.form.fields.currentAmountDescription',
        // Takes 1 column - shares row with target_amount
      },
      {
        name: 'target_date',
        type: 'date',
        label: 'Target Date',
        labelKey: 'finance.goals.form.fields.targetDate',
        validation: { required: true },
        descriptionKey: 'finance.goals.form.fields.targetDateDescription',
        // Takes 1 column - can share row with priority
      },
      {
        name: 'priority',
        type: 'select',
        label: 'Priority',
        labelKey: 'finance.goals.form.fields.priority',
        options: goalPriorityOptions,
        validation: { required: true },
        descriptionKey: 'finance.goals.form.fields.priorityDescription',
        // Takes 1 column - shares row with target_date
      },
    ],
    advancedFields: [
      {
        name: 'description',
        type: 'textarea',
        label: 'Description',
        labelKey: 'finance.goals.form.fields.description',
        placeholder: 'Describe your goal and why it matters to you...',
        placeholderKey: 'finance.goals.form.fields.descriptionPlaceholder',
        rows: 3,
        className: 'md:col-span-2', // Full width
      },
      {
        name: 'category',
        type: 'select',
        label: 'Category',
        labelKey: 'finance.goals.form.fields.category',
        options: categories,
        descriptionKey: 'finance.goals.form.fields.categoryDescription',
        // Takes 1 column - can share row
      },
      {
        name: 'account',
        type: 'select',
        label: 'Linked Account',
        labelKey: 'finance.goals.form.fields.account',
        options: accounts,
        descriptionKey: 'finance.goals.form.fields.accountDescription',
        // Takes 1 column - can share row
      },
      {
        name: 'is_active',
        type: 'checkbox',
        label: 'Goal is active',
        labelKey: 'finance.goals.form.fields.isActive',
        descriptionKey: 'finance.goals.form.fields.isActiveDescription',
        // Takes 1 column
      },
      {
        name: 'auto_contribute',
        type: 'checkbox',
        label: 'Enable automatic contributions',
        labelKey: 'finance.goals.form.fields.autoContribute',
        descriptionKey: 'finance.goals.form.fields.autoContributeDescription',
        // Takes 1 column
      },
      {
        name: 'contribution_frequency',
        type: 'select',
        label: 'Contribution Frequency',
        labelKey: 'finance.goals.form.fields.contributionFrequency',
        options: goalContributionFrequencyOptions,
        conditional: {
          field: 'auto_contribute',
          operator: 'equals',
          value: true,
        },
        // Takes 1 column - can share row
      },
      {
        name: 'contribution_amount',
        type: 'currency',
        label: 'Contribution Amount',
        labelKey: 'finance.goals.form.fields.contributionAmount',
        placeholder: '100.00',
        conditional: {
          field: 'auto_contribute',
          operator: 'equals',
          value: true,
        },
        // Takes 1 column - can share row
      },
    ],
    layout: 'grid',
    submission: {
      onSubmit,
      onCancel,
      submitText: isEdit ? 'Update Goal' : 'Create Goal',
      submitTextKey: isEdit ? 'finance.goals.form.submitUpdate' : 'finance.goals.form.submitCreate',
      cancelText: 'Cancel',
      cancelTextKey: 'common.actions.cancel',
      loading: isLoading,
    },
    defaultValues: {
      name: '',
      description: '',
      goal_type: 'savings',
      target_amount: 0,
      current_amount: 0,
      target_date: '',
      category: undefined,
      priority: 'medium',
      is_active: true,
      auto_contribute: false,
      contribution_frequency: undefined,
      contribution_amount: undefined,
      ...initialData,
    },
  };
};

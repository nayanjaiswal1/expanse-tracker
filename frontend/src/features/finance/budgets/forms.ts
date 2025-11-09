import { FormConfig } from '../../../shared/schemas';
import { budgetEnhancedSchema, BudgetEnhancedFormData } from '../schemas/forms';
import { budgetPeriodTypeOptionConfigs } from '../constants/budgetConstants';

interface BudgetFormConfigOptions {
  onSubmit: (data: BudgetEnhancedFormData) => Promise<void>;
  isLoading?: boolean;
  initialData?: Partial<BudgetEnhancedFormData>;
  isEdit?: boolean;
  onCancel?: () => void;
}

export const createBudgetFormConfig = ({
  onSubmit,
  isLoading = false,
  initialData,
  isEdit = false,
  onCancel,
}: BudgetFormConfigOptions): FormConfig<BudgetEnhancedFormData> => {
  // Auto-suggest budget name with current/next month
  const getDefaultBudgetName = () => {
    if (initialData?.name) return initialData.name;
    const today = new Date();
    const currentMonth = today.toLocaleString('default', { month: 'long' });
    const currentYear = today.getFullYear();
    return `${currentMonth} ${currentYear} Budget`;
  };

  // Set default dates to current month
  const getDefaultDates = () => {
    if (initialData?.start_date && initialData?.end_date) {
      return {
        start_date: initialData.start_date,
        end_date: initialData.end_date,
      };
    }
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return {
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
    };
  };

  const defaultDates = getDefaultDates();

  return {
    schema: budgetEnhancedSchema,
    titleKey: isEdit
      ? 'finance.budgets.modal.editBudgetTitle'
      : 'finance.budgets.modal.createNewBudgetTitle',
    title: isEdit ? 'Edit Budget' : 'Create New Budget',
    descriptionKey: isEdit
      ? 'finance.budgets.modal.editBudgetDescription'
      : 'finance.budgets.modal.createNewBudgetDescription',
    description: isEdit
      ? 'Update your budget details below.'
      : 'Create a new budget to track your spending goals.',
    showHeader: false, // Title shown in Modal header
    fields: [
      {
        name: 'name',
        type: 'input',
        label: 'Name',
        labelKey: 'finance.budgets.form.fields.name',
        placeholder: 'e.g., Monthly Budget - March 2024',
        placeholderKey: 'finance.budgets.form.fields.namePlaceholder',
        validation: { required: true },
        description: 'Choose a descriptive name for your budget',
        descriptionKey: 'finance.budgets.form.fields.nameDescription',
        className: 'md:col-span-2',
      },
      {
        name: 'description',
        type: 'textarea',
        label: 'Description',
        labelKey: 'finance.budgets.form.fields.description',
        placeholder: 'Brief description of this budget',
        placeholderKey: 'finance.budgets.form.fields.descriptionPlaceholder',
        rows: 2,
        descriptionKey: 'finance.budgets.form.fields.descriptionHint',
        className: 'md:col-span-2',
      },
      {
        name: 'period_type',
        type: 'select',
        label: 'Period Type',
        labelKey: 'finance.budgets.form.fields.periodType',
        options: budgetPeriodTypeOptionConfigs.filter((option) => option.value !== 'all'),
        validation: { required: true },
        descriptionKey: 'finance.budgets.form.fields.periodTypeDescription',
        className: 'md:col-span-2',
      },
      {
        name: 'start_date',
        type: 'date',
        label: 'Start Date',
        labelKey: 'finance.budgets.form.fields.startDate',
        validation: { required: true },
        descriptionKey: 'finance.budgets.form.fields.startDateDescription',
        className: 'md:col-span-1',
      },
      {
        name: 'end_date',
        type: 'date',
        label: 'End Date',
        labelKey: 'finance.budgets.form.fields.endDate',
        validation: { required: true },
        descriptionKey: 'finance.budgets.form.fields.endDateDescription',
        conditional: {
          field: 'period_type',
          operator: 'equals',
          value: 'custom',
        },
        className: 'md:col-span-1',
      },
      {
        name: 'total_amount',
        type: 'currency',
        label: 'Total Budget Amount',
        labelKey: 'finance.budgets.form.fields.totalAmount',
        placeholder: '0.00',
        validation: { required: true },
        descriptionKey: 'finance.budgets.form.fields.totalAmountDescription',
        className: 'md:col-span-2',
      },
      {
        name: 'is_active',
        type: 'checkbox',
        label: 'Active Budget',
        labelKey: 'finance.budgets.form.fields.isActive',
        descriptionKey: 'finance.budgets.form.fields.isActiveDescription',
        className: 'md:col-span-1',
      },
      {
        name: 'auto_rollover',
        type: 'checkbox',
        label: 'Auto-create next period budget',
        labelKey: 'finance.budgets.form.fields.autoRollover',
        descriptionKey: 'finance.budgets.form.fields.autoRolloverDescription',
        className: 'md:col-span-1',
      },
    ],
    layout: 'grid',
    submission: {
      onSubmit,
      onCancel,
      submitText: isEdit ? 'Update Budget' : 'Create Budget',
      submitTextKey: isEdit
        ? 'finance.budgets.form.updateSuccess'
        : 'finance.budgets.form.createSuccess',
      cancelText: 'Cancel',
      cancelTextKey: 'common.actions.cancel',
      loading: isLoading,
    },
    defaultValues: {
      name: getDefaultBudgetName(),
      description: '',
      period_type: 'monthly',
      start_date: defaultDates.start_date,
      end_date: defaultDates.end_date,
      total_amount: '',
      is_active: true,
      auto_rollover: false,
      ...initialData,
    },
  };
};

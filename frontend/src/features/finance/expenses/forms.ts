import { FormConfig } from '../../../shared/schemas';
import { expenseSchema, ExpenseFormData } from '../schemas/forms';
import { expenseSplitMethodOptions } from '../constants/expenseConstants';

interface ExpenseFormConfigOptions {
  onSubmit: (data: ExpenseFormData) => Promise<void>;
  isLoading?: boolean;
  group: {
    id: number;
    members: Array<{ id: number; name: string }>;
    member_count: number;
  };
  currentUserId?: number;
  onCancel?: () => void;
}

export const createExpenseFormConfig = ({
  onSubmit,
  isLoading = false,
  group,
  currentUserId,
  onCancel,
}: ExpenseFormConfigOptions): FormConfig<ExpenseFormData> => {
  const memberOptions = group.members.map((member) => ({
    value: member.id,
    label: member.id === currentUserId ? `${member.name} (You)` : member.name,
  }));

  return {
    schema: expenseSchema,
    titleKey: 'finance.expenses.form.addTitle',
    title: 'Add Expense',
    descriptionKey: 'finance.expenses.form.description',
    description: `This expense will be split equally among all ${group.member_count} members.`,
    showHeader: false, // Title shown in Modal header
    fields: [
      {
        name: 'title',
        type: 'input',
        label: 'Expense Description',
        labelKey: 'finance.expenses.form.fields.title',
        placeholder: 'e.g., Dinner at restaurant, Uber ride, Movie tickets',
        placeholderKey: 'finance.expenses.form.fields.titlePlaceholder',
        validation: { required: true },
        descriptionKey: 'finance.expenses.form.fields.titleDescription',
      },
      {
        name: 'total_amount',
        type: 'currency',
        label: 'Total Amount',
        labelKey: 'finance.expenses.form.fields.totalAmount',
        placeholder: '0.00',
        validation: { required: true },
        descriptionKey: 'finance.expenses.form.fields.totalAmountDescription',
      },
      {
        name: 'paid_by_user_id',
        type: 'select',
        label: 'Paid by',
        labelKey: 'finance.expenses.form.fields.paidBy',
        options: memberOptions,
        validation: { required: true },
        descriptionKey: 'finance.expenses.form.fields.paidByDescription',
      },
      {
        name: 'date',
        type: 'date',
        label: 'Date',
        labelKey: 'finance.expenses.form.fields.date',
        validation: { required: true },
        descriptionKey: 'finance.expenses.form.fields.dateDescription',
      },
      {
        name: 'split_method',
        type: 'select',
        label: 'Split Method',
        labelKey: 'finance.expenses.form.fields.splitMethod',
        options: expenseSplitMethodOptions,
        validation: { required: true },
        descriptionKey: 'finance.expenses.form.fields.splitMethodDescription',
      },
      {
        name: 'description',
        type: 'textarea',
        label: 'Notes (Optional)',
        labelKey: 'finance.expenses.form.fields.notes',
        placeholder: 'Add any additional details about this expense...',
        placeholderKey: 'finance.expenses.form.fields.notesPlaceholder',
        rows: 3,
      },
    ],
    layout: 'vertical',
    submission: {
      onSubmit,
      onCancel,
      submitText: 'Add Expense',
      submitTextKey: 'finance.expenses.form.submit',
      cancelText: 'Cancel',
      cancelTextKey: 'common.actions.cancel',
      loading: isLoading,
    },
    defaultValues: {
      title: '',
      total_amount: 0,
      split_method: 'equal',
      paid_by_user_id: currentUserId || group.members[0]?.id || 0,
      description: '',
      date: new Date().toISOString().split('T')[0],
    },
  };
};

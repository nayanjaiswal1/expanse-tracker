import { FormConfig } from '../../../shared/schemas';
import { lendingSchema, LendingFormData } from '../schemas/forms';

interface LendingFormConfigOptions {
  onSubmit: (data: LendingFormData) => Promise<void>;
  isLoading?: boolean;
  initialData?: Partial<LendingFormData>;
  isEdit?: boolean;
  type?: 'lend' | 'borrow';
  contacts: Array<{ id: number; name: string }>;
  onCancel?: () => void;
}

export const createLendingFormConfig = ({
  onSubmit,
  isLoading = false,
  initialData,
  isEdit = false,
  type,
  contacts = [],
  onCancel,
}: LendingFormConfigOptions): FormConfig<LendingFormData> => {
  const contactOptions = contacts.map((contact) => ({
    value: contact.id,
    label: contact.name,
  }));

  const selectedType = type || initialData?.type || 'lend';

  return {
    schema: lendingSchema,
    titleKey: isEdit
      ? `finance.lending.form.editTitle.${selectedType}`
      : 'finance.lending.form.addTitle',
    title: isEdit
      ? `Edit ${selectedType === 'lend' ? 'Lending' : 'Borrowing'} Transaction`
      : 'Manage Money Transaction',
    descriptionKey: isEdit
      ? `finance.lending.form.editDescription.${selectedType}`
      : 'finance.lending.form.description',
    description: isEdit
      ? 'Update the lending transaction details below.'
      : 'Record money lent to or borrowed from someone.',
    showHeader: false, // Title shown in Modal header
    fields: [
      // Type Selection - Only show if not editing
      ...(!isEdit
        ? [
            {
              name: 'type' as const,
              type: 'radio' as const,
              label: 'What would you like to do?',
              labelKey: 'finance.lending.form.fields.type',
              options: [
                {
                  value: 'lend',
                  label: 'Lend Money',
                  labelKey: 'finance.lending.types.lend',
                },
                {
                  value: 'borrow',
                  label: 'Borrow Money',
                  labelKey: 'finance.lending.types.borrow',
                },
              ],
              validation: { required: true },
              descriptionKey: 'finance.lending.form.fields.typeDescription',
            },
          ]
        : []),
      {
        name: 'contact_user_id',
        type: 'select',
        label: 'Contact',
        labelKey: 'finance.lending.form.fields.contact',
        placeholder: 'Select person...',
        placeholderKey: 'finance.lending.form.fields.contactPlaceholder',
        options: contactOptions,
        validation: { required: true },
        descriptionKey: 'finance.lending.form.fields.contactDescription',
      },
      {
        name: 'amount',
        type: 'currency',
        label: 'Amount',
        labelKey: 'finance.lending.form.fields.amount',
        placeholder: '0.00',
        validation: { required: true },
        descriptionKey: 'finance.lending.form.fields.amountDescription',
      },
      {
        name: 'description',
        type: 'input',
        label: "What's this for?",
        labelKey: 'finance.lending.form.fields.description',
        placeholder: 'e.g., Car repair, Emergency fund, Rent payment',
        placeholderKey: 'finance.lending.form.fields.descriptionPlaceholder',
        validation: { required: true },
        descriptionKey: 'finance.lending.form.fields.descriptionHint',
      },
      {
        name: 'due_date',
        type: 'date',
        label: 'Due Date',
        labelKey: 'finance.lending.form.fields.dueDate',
        descriptionKey: 'finance.lending.form.fields.dueDateDescription',
      },
      {
        name: 'interest_rate',
        type: 'number',
        label: 'Interest Rate (%)',
        labelKey: 'finance.lending.form.fields.interestRate',
        placeholder: '0.00',
        step: 0.01,
        min: 0,
        max: 100,
        descriptionKey: 'finance.lending.form.fields.interestRateDescription',
      },
      {
        name: 'notes',
        type: 'textarea',
        label: 'Additional Notes',
        labelKey: 'finance.lending.form.fields.notes',
        placeholder: 'Optional notes...',
        placeholderKey: 'finance.lending.form.fields.notesPlaceholder',
        rows: 2,
      },
    ],
    layout: 'vertical',
    submission: {
      onSubmit,
      onCancel,
      submitText: isEdit
        ? 'Update Transaction'
        : selectedType === 'lend'
          ? 'Record Loan'
          : 'Record Borrowing',
      submitTextKey: isEdit
        ? 'finance.lending.form.update'
        : `finance.lending.form.submit.${selectedType}`,
      cancelText: 'Cancel',
      cancelTextKey: 'common.actions.cancel',
      loading: isLoading,
    },
    defaultValues: {
      type: selectedType,
      contact_user_id: 0,
      amount: 0,
      description: '',
      due_date: '',
      interest_rate: undefined,
      notes: '',
      ...initialData,
    },
  };
};

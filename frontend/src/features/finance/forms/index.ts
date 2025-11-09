import type { FormConfig } from '../../../shared/schemas';
import {
  accountSchema,
  type AccountFormData,
  merchantPatternSchema,
  bankStatementUploadSchema,
  type MerchantPatternFormData,
  type BankStatementUploadFormData,
  type TransactionSettingsFormData,
  type AccountManagementFormData,
  accountManagementSchema,
} from '../schemas/forms';
import type { AccountType } from '../../../types/finance/account.types';
import type { Currency } from '../../../types/currency';

type FieldType = 'text' | 'number' | 'select' | 'switch' | 'file' | 'textarea' | 'section';

// Constants
const CONSTANTS = {
  ACCOUNT_TYPE_OPTIONS: [
    { value: 'checking' as const, label: 'Checking' },
    { value: 'savings' as const, label: 'Savings' },
    { value: 'credit' as const, label: 'Credit Card' },
    { value: 'loan' as const, label: 'Loan' },
    { value: 'cash' as const, label: 'Cash' },
    { value: 'investment' as const, label: 'Investment' },
    { value: 'other' as const, label: 'Other' },
  ],
  ACCOUNT_STATUS_OPTIONS: [
    { value: 'active' as const, label: 'Active' },
    { value: 'inactive' as const, label: 'Inactive' },
    { value: 'closed' as const, label: 'Closed' },
    { value: 'frozen' as const, label: 'Frozen' },
    { value: 'pending' as const, label: 'Pending' },
  ],
  DEFAULT_COL_SPAN: 6,
  FULL_WIDTH_COL_SPAN: 12,
} as const;

// Types
interface FormFieldBase<T = FieldType> {
  name: string;
  label: string | ((values: Record<string, unknown>) => string);
  type: T;
  required?: boolean;
  placeholder?: string;
  colSpan?: number;
  show?: (values: Record<string, unknown>) => boolean;
  description?: string | ((values: Record<string, unknown>) => string);
}

interface TextField extends FormFieldBase<'text' | 'textarea'> {
  defaultValue?: string;
  inputMode?: 'text' | 'numeric' | 'decimal' | 'email' | 'search' | 'tel' | 'url';
  maxLength?: number;
  rows?: number;
}

interface NumberField extends FormFieldBase<'number'> {
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
}

interface SelectField extends FormFieldBase<'select'> {
  options: Array<{ value: string; label: string }>;
  defaultValue?: string;
  isMulti?: boolean;
}

interface SwitchField extends FormFieldBase<'switch'> {
  defaultValue?: boolean;
}

interface FileField extends FormFieldBase<'file'> {
  accept?: string;
  multiple?: boolean;
}

interface SectionField extends Omit<FormFieldBase<'section'>, 'name' | 'required'> {
  title: string;
  description: string;
}

type FormField = TextField | NumberField | SelectField | SwitchField | FileField | SectionField;

// Helper functions
const getBalanceLimitLabel = (accountType?: AccountType): string => {
  switch (accountType) {
    case 'credit':
      return 'Credit Limit';
    case 'checking':
    case 'savings':
      return 'Minimum Balance';
    case 'loan':
      return 'Loan Amount';
    default:
      return 'Balance Limit';
  }
};

export const createAccountFormConfig = (
  onSubmit: (data: AccountFormData) => Promise<void>,
  isLoading = false,
  initialData: Partial<AccountFormData> = {},
  isEdit = false,
  currencies: Currency[] = [],
  onCancel?: () => void
): FormConfig<AccountFormData> & { fields: FormField[] } => {
  const currencyOptions = currencies.map((currency) => ({
    value: currency.code,
    label: `${currency.code} - ${currency.name}`,
  }));

  const fields: FormField[] = [
    // Basic Information Section
    {
      type: 'section',
      title: 'Basic Information',
      description: 'Enter the basic details of your account.',
    },
    {
      name: 'name',
      label: 'Account Name',
      type: 'text',
      required: true,
      placeholder: 'e.g., Chase Checking, PayPal',
      colSpan: CONSTANTS.DEFAULT_COL_SPAN,
    },
    {
      name: 'account_type',
      label: 'Account Type',
      type: 'select',
      options: [...CONSTANTS.ACCOUNT_TYPE_OPTIONS],
      required: true,
      colSpan: CONSTANTS.DEFAULT_COL_SPAN,
    },
    // Financial Information Section
    {
      type: 'section',
      title: 'Financial Information',
      description: 'Enter the financial details of your account.',
    },
    {
      name: 'balance',
      label: 'Current Balance',
      type: 'number',
      required: true,
      defaultValue: 0,
      colSpan: CONSTANTS.DEFAULT_COL_SPAN,
    },
    {
      name: 'currency',
      label: 'Currency',
      type: 'select',
      options: currencyOptions,
      required: true,
      defaultValue: 'USD',
      colSpan: CONSTANTS.DEFAULT_COL_SPAN,
    },
    {
      name: 'balance_limit',
      label: (values: Record<string, unknown>) =>
        getBalanceLimitLabel(values?.account_type as AccountType),
      type: 'number',
      required: false,
      colSpan: CONSTANTS.DEFAULT_COL_SPAN,
      show: (values: Record<string, unknown>) =>
        ['checking', 'savings', 'credit', 'loan'].includes((values?.account_type as string) || ''),
      description: 'Balance limit for this account',
    },
    {
      type: 'section',
      title: 'Account Details',
      description: 'Additional details about your account.',
    },
    {
      name: 'account_number',
      label: 'Account Number (Last 4)',
      type: 'text',
      placeholder: 'Last 4 digits only',
      colSpan: CONSTANTS.DEFAULT_COL_SPAN,
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      options: [...CONSTANTS.ACCOUNT_STATUS_OPTIONS],
      defaultValue: 'active',
      colSpan: CONSTANTS.DEFAULT_COL_SPAN,
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      placeholder: 'Optional description or notes about this account',
      colSpan: CONSTANTS.FULL_WIDTH_COL_SPAN,
    },
  ];

  return {
    schema: accountSchema,
    title: isEdit ? 'Edit Account' : 'Add New Account',
    description: isEdit
      ? 'Update your account information.'
      : 'Add a new account to track your finances.',
    fields,
    actions: [
      {
        type: 'button',
        label: 'Cancel',
        variant: 'outline',
        onClick: onCancel || (() => window.history.back()),
      },
      {
        type: 'submit',
        label: isEdit ? 'Update Account' : 'Create Account',
        isLoading,
      },
    ],
  };
};

export const createMerchantPatternFormConfig = (
  onSubmit: (data: MerchantPatternFormData) => Promise<void>,
  isLoading = false,
  initialData: Partial<MerchantPatternFormData> = {},
  isEdit = false,
  categories: Array<{ value: string; label: string }> = []
): FormConfig<MerchantPatternFormData> & { fields: FormField[] } => ({
  schema: merchantPatternSchema,
  title: isEdit ? 'Edit Merchant Pattern' : 'Add New Merchant Pattern',
  description: isEdit
    ? 'Update the merchant pattern.'
    : 'Add a new merchant pattern to categorize transactions.',
  fields: [
    {
      name: 'merchant_name',
      label: 'Merchant Name',
      type: 'text',
      required: true,
      placeholder: 'e.g., Amazon, Netflix',
      colSpan: 6,
    },
    {
      name: 'pattern',
      label: 'Pattern (Regex)',
      type: 'text',
      required: true,
      placeholder: 'e.g., ^amazon\\.',
      colSpan: 6,
    },
    {
      name: 'category',
      label: 'Category',
      type: 'select',
      options: categories,
      required: true,
      colSpan: 6,
    },
    {
      name: 'is_active',
      label: 'Active',
      type: 'switch',
      defaultValue: true,
      colSpan: 6,
    },
  ],
  actions: [
    {
      type: 'button',
      label: 'Cancel',
      variant: 'outline',
      onClick: () => window.history.back(),
    },
    {
      type: 'submit',
      label: isEdit ? 'Update Pattern' : 'Create Pattern',
      isLoading,
    },
  ],
});

export const createBankStatementUploadFormConfig = (
  onSubmit: (data: BankStatementUploadFormData) => Promise<void>,
  isLoading = false,
  accounts: Array<{ id: string; name: string; type: string }> = [],
  supportedBanks: Array<{ key: string; name: string }> = [],
  showTextInput = false
): FormConfig<BankStatementUploadFormData> & { fields: FormField[] } => {
  const accountOptions = accounts.map((account) => ({
    value: account.id,
    label: `${account.name} (${account.type})`,
  }));

  const bankOptions = supportedBanks.map((bank) => ({
    value: bank.key,
    label: bank.name,
  }));

  return {
    schema: bankStatementUploadSchema,
    title: 'Upload Bank Statement',
    description: 'Upload a bank statement file or paste the content below.',
    fields: [
      {
        name: 'account_id',
        label: 'Account',
        type: 'select',
        options: [{ value: '', label: 'Select account (optional)' }, ...accountOptions],
        required: false,
        placeholder: 'Select account (optional)',
        colSpan: 6,
        description: 'Associate transactions with a specific account',
      },
      {
        name: 'bank_format',
        label: 'Bank Format',
        type: 'select',
        options: [{ value: 'auto', label: 'Auto-detect' }, ...bankOptions],
        required: true,
        colSpan: 6,
        description: 'Specify bank format or let the system auto-detect',
      },
      ...(showTextInput
        ? [
            {
              name: 'textContent',
              label: 'Or paste statement content',
              type: 'textarea',
              placeholder: 'Paste your bank statement content here...',
              required: true,
              colSpan: 12,
              rows: 10,
              description: 'Paste the content of your bank statement',
              className: 'font-mono text-sm',
            },
          ]
        : [
            {
              name: 'file',
              label: 'Bank Statement File',
              type: 'file',
              accept: '.csv,.txt,.tsv,.qfx,.ofx,.qbo',
              required: true,
              colSpan: 12,
              description: 'Upload CSV, TXT, TSV, QFX, OFX, or QBO files up to 10MB',
            },
          ]),
    ],
    actions: [
      {
        type: 'button',
        label: 'Cancel',
        variant: 'outline',
        onClick: () => window.history.back(),
      },
      {
        type: 'submit',
        label: isLoading ? 'Processing...' : showTextInput ? 'Parse Text' : 'Upload & Parse',
        isLoading,
      },
    ],
  };
};

// Account Management Form Config
export const createAccountManagementFormConfig = (
  onSubmit: (data: AccountManagementFormData) => Promise<void>,
  isLoading = false,
  initialData: Partial<AccountManagementFormData> = {},
  isEdit = false,
  currencies: Array<{ code: string; name: string; symbol: string }> = [],
  bankIcons: Array<{ identifier: string; name: string; icon_url: string }> = [],
  onCancel?: () => void
): FormConfig<AccountManagementFormData> & { fields: FormField[] } => {
  const currencyOptions = currencies.map((currency) => ({
    value: currency.code,
    label: `${currency.code} - ${currency.name}`,
  }));

  const bankIconOptions = bankIcons.map((icon) => ({
    value: icon.identifier,
    label: icon.name,
    icon: icon.icon_url,
  }));

  const fields: FormField[] = [
    // Basic Information Section
    {
      type: 'section',
      title: 'Basic Information',
      description: 'Enter the basic details of your account.',
    },
    {
      name: 'name',
      label: 'Account Name',
      type: 'text',
      required: true,
      placeholder: 'e.g., Chase Checking, PayPal',
      colSpan: 6,
    },
    {
      name: 'account_type',
      label: 'Account Type',
      type: 'select',
      options: [
        { value: 'checking', label: 'Checking' },
        { value: 'savings', label: 'Savings' },
        { value: 'credit', label: 'Credit Card' },
        { value: 'investment', label: 'Investment' },
        { value: 'loan', label: 'Loan' },
        { value: 'cash', label: 'Cash' },
        { value: 'other', label: 'Other' },
      ],
      required: true,
      colSpan: 6,
    },
    // Financial Information Section
    {
      type: 'section',
      title: 'Financial Information',
      description: 'Enter the financial details of your account.',
    },
    {
      name: 'balance',
      label: 'Current Balance',
      type: 'number',
      required: true,
      defaultValue: 0,
      colSpan: 4,
    },
    {
      name: 'currency',
      label: 'Currency',
      type: 'select',
      options: currencyOptions,
      required: true,
      colSpan: 4,
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'closed', label: 'Closed' },
      ],
      defaultValue: 'active',
      colSpan: 4,
    },
    // Account Details Section
    {
      type: 'section',
      title: 'Account Details',
      description: 'Additional details about your account.',
    },
    {
      name: 'institution',
      label: 'Institution',
      type: 'text',
      placeholder: 'e.g., Chase, Bank of America',
      colSpan: 6,
    },
    {
      name: 'account_number',
      label: 'Account Number (Last 4)',
      type: 'text',
      placeholder: 'Last 4 digits only',
      colSpan: 6,
    },
    {
      name: 'icon',
      label: 'Account Icon',
      type: 'select',
      options: bankIconOptions,
      placeholder: 'Select an icon',
      colSpan: 12,
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      placeholder: 'Optional description or notes about this account',
      colSpan: 12,
      rows: 3,
    },
  ];

  return {
    schema: accountManagementSchema,
    title: isEdit ? 'Edit Account' : 'Add New Account',
    description: isEdit
      ? 'Update your account information.'
      : 'Add a new account to track your finances.',
    fields,
    actions: [
      {
        type: 'button',
        label: 'Cancel',
        variant: 'outline',
        onClick: onCancel || (() => window.history.back()),
      },
      {
        type: 'submit',
        label: isEdit ? 'Update Account' : 'Create Account',
        isLoading,
      },
    ],
  };
};

// Transaction Settings Form Config
export const createTransactionSettingsFormConfig = (
  onSubmit: (data: TransactionSettingsFormData) => Promise<void>,
  isLoading?: boolean,
  initialData?: Partial<TransactionSettingsFormData>,
  categories: Array<{ value: string; label: string }> = []
): FormConfig<TransactionSettingsFormData> & { fields: FormField[] } => ({
  schema: transactionSettingsSchema,
  title: 'Transaction Settings',
  description: 'Configure how transactions are processed and managed',
  fields: [
    // Default Settings Section
    {
      name: 'default_transaction_source',
      type: 'select',
      label: 'Default Transaction Source',
      options: [], // transactionSourceOptions,
      description: 'Default source when creating new transactions',
    },
    {
      name: 'default_category_id',
      type: 'select',
      label: 'Default Category',
      placeholder: 'Select default category (optional)',
      options: [{ value: '', label: 'No default category' }, ...categories],
      description: 'Default category for new transactions',
    },
    {
      name: 'default_tags',
      type: 'text',
      label: 'Default Tags',
      placeholder: 'e.g., uncategorized, review',
      description: 'Comma-separated tags to apply to new transactions',
    },

    // Processing Settings
    {
      name: 'auto_categorize_transactions',
      type: 'switch',
      label: 'Auto-categorize transactions',
      description: 'Automatically categorize transactions based on merchant patterns',
    },
    {
      name: 'require_verification',
      type: 'switch',
      label: 'Require verification for auto-categorized transactions',
      description: 'Mark auto-categorized transactions as requiring manual review',
    },
    {
      name: 'enable_transaction_suggestions',
      type: 'switch',
      label: 'Enable transaction suggestions',
      description: 'Show suggested categories and merchants based on transaction history',
    },

    // Duplicate Detection
    {
      name: 'duplicate_detection_enabled',
      type: 'switch',
      label: 'Enable duplicate detection',
      description: 'Automatically detect and flag potential duplicate transactions',
    },
    {
      name: 'duplicate_detection_days',
      type: 'number',
      label: 'Duplicate detection window (days)',
      placeholder: '7',
      min: 1,
      max: 365,
      description: 'Number of days to look back when checking for duplicates',
      show: (values) => values.duplicate_detection_enabled,
    },

    // Transfer Detection
    {
      name: 'auto_mark_transfers',
      type: 'switch',
      label: 'Auto-mark transfers between accounts',
      description: 'Automatically identify and mark transfers between your accounts',
    },
    {
      name: 'minimum_transfer_amount',
      type: 'number',
      label: 'Minimum transfer amount',
      placeholder: '0.00',
      description: 'Minimum amount to consider as a potential transfer',
      show: (values) => values.auto_mark_transfers,
    },

    // Receipt Settings
    {
      name: 'enable_receipt_scanning',
      type: 'switch',
      label: 'Enable receipt scanning',
      description: 'Allow uploading and processing receipt images',
    },
    {
      name: 'auto_create_from_receipts',
      type: 'switch',
      label: 'Auto-create transactions from receipts',
      description: 'Automatically create transactions when receipts are processed',
      show: (values) => values.enable_receipt_scanning,
    },
  ],
  actions: [
    {
      type: 'submit',
      label: isLoading ? 'Saving...' : 'Save Settings',
      isLoading,
    },
  ],
  defaultValues: {
    default_category_id: '',
    auto_categorize_transactions: true,
    require_verification: false,
    default_tags: '',
    enable_transaction_suggestions: true,
    duplicate_detection_enabled: true,
    duplicate_detection_days: 7,
    default_transaction_source: 'manual',
    auto_mark_transfers: true,
    minimum_transfer_amount: 0,
    enable_receipt_scanning: true,
    auto_create_from_receipts: false,
    ...initialData,
  },
});

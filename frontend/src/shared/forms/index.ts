import { FormConfig } from '../schemas';
import {
  goalSchema,
  uploadFileSchema,
  recurringTransactionSchema,
  investmentAdvancedSchema,
  telegramBotSchema,
  automationRuleSchema,
  passwordPromptSchema,
  GoalAdvancedFormData,
  UploadFileFormData,
  RecurringTransactionFormData,
  InvestmentAdvancedFormData,
  TelegramBotFormData,
  AutomationRuleFormData,
  PasswordPromptFormData,
  InvestmentPortfolioFormData,
  investmentPortfolioSchema,
  BuySellInvestmentFormData,
  buySellInvestmentSchema,
  NewsletterSubscriptionFormData,
  newsletterSubscriptionSchema,
} from '../schemas';

export const createGoalFormConfig = (
  onSubmit: (data: GoalAdvancedFormData) => Promise<void>,
  isLoading?: boolean,
  initialData?: Partial<GoalAdvancedFormData>,
  isEdit = false
): FormConfig<GoalAdvancedFormData> => ({
  schema: goalSchema,
  title: isEdit ? 'Edit Goal' : 'Create New Goal',
  description: isEdit
    ? 'Update your financial goal details.'
    : 'Set a new financial goal to track your progress.',
  fields: [
    {
      name: 'name',
      type: 'input',
      label: 'Goal Name',
      placeholder: 'e.g., Emergency Fund, Vacation Savings',
      validation: { required: true },
      description: 'Choose a meaningful name for your goal',
      className: 'md:col-span-2',
    },
    {
      name: 'goal_type',
      type: 'select',
      label: 'Goal Type',
      options: [
        { value: 'savings', label: 'Savings Goal' },
        { value: 'spending', label: 'Spending Goal' },
        { value: 'debt_payoff', label: 'Debt Payoff' },
        { value: 'investment', label: 'Investment Goal' },
      ],
      validation: { required: true },
      className: 'md:col-span-1',
    },
    {
      name: 'priority',
      type: 'select',
      label: 'Priority',
      options: [
        { value: 1, label: '1 - Low' },
        { value: 2, label: '2 - Medium' },
        { value: 3, label: '3 - High' },
        { value: 4, label: '4 - Very High' },
        { value: 5, label: '5 - Critical' },
      ],
      validation: { required: true },
      className: 'md:col-span-1',
    },
    {
      name: 'target_amount',
      type: 'currency',
      label: 'Target Amount',
      placeholder: '10000.00',
      validation: { required: true },
      description: 'The total amount you want to achieve',
      className: 'md:col-span-1',
    },
    {
      name: 'current_amount',
      type: 'currency',
      label: 'Current Amount',
      placeholder: '0.00',
      description: 'How much you currently have towards this goal',
      className: 'md:col-span-1',
    },
    {
      name: 'currency',
      type: 'select',
      label: 'Currency',
      options: [
        { value: 'USD', label: 'USD - US Dollar' },
        { value: 'EUR', label: 'EUR - Euro' },
        { value: 'GBP', label: 'GBP - British Pound' },
        { value: 'JPY', label: 'JPY - Japanese Yen' },
      ],
      validation: { required: true },
      className: 'md:col-span-1',
    },
    {
      name: 'start_date',
      type: 'date',
      label: 'Start Date',
      validation: { required: true },
      className: 'md:col-span-1',
    },
    {
      name: 'target_date',
      type: 'date',
      label: 'Target Date',
      validation: { required: true },
      description: 'When do you want to achieve this goal?',
      className: 'md:col-span-1',
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Description',
      placeholder: 'Describe your goal and why it matters to you...',
      rows: 3,
      className: 'md:col-span-2',
    },
    {
      name: 'auto_track',
      type: 'checkbox',
      label: 'Auto-track progress',
      description: 'Automatically track progress based on account transactions',
      className: 'md:col-span-1',
    },
    {
      name: 'color',
      type: 'input',
      label: 'Color',
      placeholder: '#3B82F6',
      description: 'Color for displaying this goal in charts and dashboards',
      className: 'md:col-span-1',
    },
  ],
  layout: 'grid',
  submission: {
    onSubmit,
    submitText: isEdit ? 'Update Goal' : 'Create Goal',
    loading: isLoading,
  },
  defaultValues: {
    name: '',
    goal_type: 'savings',
    target_amount: '',
    current_amount: '0',
    currency: 'USD',
    start_date: new Date().toISOString().split('T')[0],
    target_date: '',
    description: '',
    priority: 3,
    auto_track: true,
    color: '#3B82F6',
    ...initialData,
  },
});

export const createUploadFileFormConfig = (
  onSubmit: (data: UploadFileFormData) => Promise<void>,
  accounts: Array<{ value: number; label: string }>,
  isLoading?: boolean
): FormConfig<UploadFileFormData> => ({
  schema: uploadFileSchema,
  title: 'Upload Financial Data',
  description: 'Upload and process your financial files (CSV, PDF, Excel).',
  fields: [
    {
      name: 'file',
      type: 'file',
      label: 'Select File',
      accept: '.csv,.pdf,.xlsx,.xls,.txt,.json',
      validation: { required: true },
      description: 'Supported formats: CSV, PDF, Excel, TXT, JSON (max 50MB)',
      className: 'md:col-span-2',
    },
    {
      name: 'account_id',
      type: 'select',
      label: 'Target Account',
      options: accounts,
      validation: { required: true },
      description: 'Which account should transactions be associated with?',
      className: 'md:col-span-1',
    },
    {
      name: 'date_format',
      type: 'select',
      label: 'Date Format',
      options: [
        { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US)' },
        { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (EU)' },
        { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)' },
      ],
      validation: { required: true },
      className: 'md:col-span-1',
    },
    {
      name: 'duplicate_handling',
      type: 'select',
      label: 'Duplicate Handling',
      options: [
        { value: 'skip', label: 'Skip duplicates' },
        { value: 'update', label: 'Update existing' },
        { value: 'create_new', label: 'Create new entries' },
      ],
      validation: { required: true },
      className: 'md:col-span-1',
    },
    {
      name: 'skip_first_row',
      type: 'checkbox',
      label: 'Skip first row (header)',
      description: 'Check if your file has column headers in the first row',
      className: 'md:col-span-1',
    },
    {
      name: 'password',
      type: 'password',
      label: 'File Password',
      placeholder: 'Enter password if file is protected',
      description: 'Only required for password-protected PDF files',
      className: 'md:col-span-2',
    },
  ],
  layout: 'grid',
  submission: {
    onSubmit,
    submitText: 'Upload & Process',
    loading: isLoading,
  },
  defaultValues: {
    date_format: 'MM/DD/YYYY',
    duplicate_handling: 'skip',
    skip_first_row: true,
  },
});

export const createRecurringTransactionFormConfig = (
  onSubmit: (data: RecurringTransactionFormData) => Promise<void>,
  accounts: Array<{ value: number; label: string }>,
  categories: Array<{ value: number; label: string }>,
  isLoading?: boolean,
  initialData?: Partial<RecurringTransactionFormData>
): FormConfig<RecurringTransactionFormData> => ({
  schema: recurringTransactionSchema,
  title: 'Create Recurring Transaction',
  description: 'Set up automatic recurring income or expenses.',
  fields: [
    {
      name: 'name',
      type: 'input',
      label: 'Transaction Name',
      placeholder: 'e.g., Monthly Salary, Rent Payment',
      validation: { required: true },
      className: 'md:col-span-2',
    },
    {
      name: 'transaction_type',
      type: 'radio',
      label: 'Type',
      options: [
        { value: 'income', label: 'Income' },
        { value: 'expense', label: 'Expense' },
      ],
      validation: { required: true },
      className: 'md:col-span-2',
    },
    {
      name: 'amount',
      type: 'currency',
      label: 'Amount',
      placeholder: '1000.00',
      validation: { required: true },
      className: 'md:col-span-1',
    },
    {
      name: 'account',
      type: 'select',
      label: 'Account',
      options: accounts,
      validation: { required: true },
      className: 'md:col-span-1',
    },
    {
      name: 'category',
      type: 'select',
      label: 'Category',
      options: categories,
      validation: { required: true },
      className: 'md:col-span-1',
    },
    {
      name: 'frequency',
      type: 'select',
      label: 'Frequency',
      options: [
        { value: 'daily', label: 'Daily' },
        { value: 'weekly', label: 'Weekly' },
        { value: 'monthly', label: 'Monthly' },
        { value: 'yearly', label: 'Yearly' },
      ],
      validation: { required: true },
      className: 'md:col-span-1',
    },
    {
      name: 'frequency_interval',
      type: 'number',
      label: 'Every',
      placeholder: '1',
      min: 1,
      max: 365,
      validation: { required: true },
      description: 'How often within the frequency period',
      className: 'md:col-span-1',
    },
    {
      name: 'start_date',
      type: 'date',
      label: 'Start Date',
      validation: { required: true },
      className: 'md:col-span-1',
    },
    {
      name: 'end_date',
      type: 'date',
      label: 'End Date',
      description: 'Leave empty for indefinite recurrence',
      className: 'md:col-span-1',
    },
    {
      name: 'max_executions',
      type: 'number',
      label: 'Max Executions',
      placeholder: '12',
      description: 'Maximum number of times to execute (optional)',
      className: 'md:col-span-1',
    },
    {
      name: 'description',
      type: 'input',
      label: 'Description',
      placeholder: 'Transaction description...',
      className: 'md:col-span-2',
    },
    {
      name: 'notes',
      type: 'textarea',
      label: 'Notes',
      placeholder: 'Additional notes...',
      rows: 3,
      className: 'md:col-span-2',
    },
  ],
  layout: 'grid',
  submission: {
    onSubmit,
    submitText: 'Create Recurring Transaction',
    loading: isLoading,
  },
  defaultValues: {
    name: '',
    transaction_type: 'expense',
    amount: '',
    frequency: 'monthly',
    frequency_interval: 1,
    start_date: new Date().toISOString().split('T')[0],
    ...initialData,
  },
});

export const createTelegramBotFormConfig = (
  onSubmit: (data: TelegramBotFormData) => Promise<void>,
  isLoading?: boolean
): FormConfig<TelegramBotFormData> => ({
  schema: telegramBotSchema,
  title: 'Add Telegram Bot',
  description: 'Connect a Telegram bot for transaction notifications and management.',
  showHeader: false, // Title shown in Modal header
  fields: [
    {
      name: 'name',
      type: 'input',
      label: 'Bot Name',
      placeholder: 'My Finance Bot',
      validation: { required: true },
      description: 'A friendly name to identify your bot',
    },
    {
      name: 'bot_token',
      type: 'input',
      label: 'Bot Token',
      placeholder: '123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ',
      validation: { required: true },
      description: 'Get this token from @BotFather on Telegram',
    },
    {
      name: 'webhook_url',
      type: 'input',
      label: 'Webhook URL',
      placeholder: 'https://your-domain.com/webhook',
      description: 'Optional: Custom webhook URL for advanced integrations',
    },
  ],
  layout: 'vertical',
  submission: {
    onSubmit,
    submitText: 'Add Bot',
    loading: isLoading,
  },
  defaultValues: {
    name: '',
    bot_token: '',
    webhook_url: '',
  },
});

export const createAutomationRuleFormConfig = (
  onSubmit: (data: AutomationRuleFormData) => Promise<void>,
  categories: Array<{ value: string; label: string }>,
  conditionFieldOptions: Array<{ value: string; label: string }>,
  conditionOperatorOptions: Array<{ value: string; label: string }>,
  isLoading?: boolean,
  initialData?: Partial<AutomationRuleFormData>
): FormConfig<AutomationRuleFormData> => ({
  schema: automationRuleSchema,
  title: initialData ? 'Edit Automation Rule' : 'Create Automation Rule',
  description: 'Automatically categorize and process transactions based on rules.',
  showHeader: false, // Title shown in Modal header
  fields: [
    {
      name: 'name',
      type: 'input',
      label: 'Rule Name',
      placeholder: 'e.g., Grocery Store Categorization',
      validation: { required: true },
    },
    {
      name: 'condition_field',
      type: 'select',
      label: 'When (Field)',
      options: conditionFieldOptions,
      validation: { required: true },
      placeholder: 'Select transaction field',
    },
    {
      name: 'condition_operator',
      type: 'select',
      label: 'Condition',
      options: conditionOperatorOptions,
      validation: { required: true },
    },
    {
      name: 'condition_value',
      type: 'input',
      label: 'Value',
      placeholder: 'e.g., Uber',
      validation: { required: true },
    },
    {
      name: 'action_type',
      type: 'select',
      label: 'Then',
      options: [
        { value: 'set_category', label: 'Set Category' },
        { value: 'set_account', label: 'Set Account' },
        { value: 'add_tag', label: 'Add Tag' },
        { value: 'set_description', label: 'Set Description' },
      ],
      validation: { required: true },
    },
    {
      name: 'action_value',
      type: 'select',
      label: 'Action Value',
      options: categories, // Use categories for now, could be conditional based on action_type
      validation: { required: true },
      description: 'What to set or add',
    },
    {
      name: 'priority',
      type: 'number',
      label: 'Priority',
      placeholder: '10',
      min: 1,
      max: 100,
      validation: { required: true },
      description: 'Lower numbers have higher priority',
    },
    {
      name: 'is_active',
      type: 'checkbox',
      label: 'Active',
      description: 'Enable this rule to process transactions',
    },
  ],
  layout: 'vertical',
  submission: {
    onSubmit,
    submitText: initialData ? 'Update Rule' : 'Create Rule',
    loading: isLoading,
  },
  defaultValues: {
    name: '',
    condition_field: conditionFieldOptions[0]?.value ?? '',
    condition_operator: conditionOperatorOptions[0]?.value ?? '',
    condition_value: '',
    action_type: 'set_category',
    action_value: '',
    priority: 10,
    is_active: true,
    ...initialData,
  },
});

export const createPasswordPromptFormConfig = (
  onSubmit: (data: PasswordPromptFormData) => Promise<void>,
  filename: string,
  onCancel?: () => void
): FormConfig<PasswordPromptFormData> => ({
  schema: passwordPromptSchema,
  title: 'Password Protected File',
  description: `The file "${filename}" is password protected. Please enter the password to continue.`,
  fields: [
    {
      name: 'password',
      type: 'password',
      label: 'Password',
      placeholder: 'Enter file password',
      validation: { required: true },
    },
  ],
  layout: 'vertical',
  submission: {
    onSubmit,
    onCancel,
    submitText: 'Unlock',
    cancelText: 'Cancel',
  },
  defaultValues: {
    password: '',
  },
});

export const createInvestmentFormConfig = (
  onSubmit: (data: InvestmentAdvancedFormData) => Promise<void>,
  isLoading?: boolean,
  initialData?: Partial<InvestmentAdvancedFormData>
): FormConfig<InvestmentAdvancedFormData> => ({
  schema: investmentAdvancedSchema,
  title: 'Add Investment',
  description: 'Add a new investment to track in your portfolio.',
  fields: [
    {
      name: 'name',
      type: 'input',
      label: 'Investment Name',
      placeholder: 'e.g., Apple Inc., S&P 500 ETF',
      validation: { required: true },
    },
    {
      name: 'symbol',
      type: 'input',
      label: 'Symbol/Ticker',
      placeholder: 'e.g., AAPL, SPY',
      validation: { required: true },
      description: 'Stock ticker symbol',
    },
    {
      name: 'investment_type',
      type: 'select',
      label: 'Investment Type',
      options: [
        { value: 'stock', label: 'Stock' },
        { value: 'bond', label: 'Bond' },
        { value: 'mutual_fund', label: 'Mutual Fund' },
        { value: 'etf', label: 'ETF' },
        { value: 'crypto', label: 'Cryptocurrency' },
        { value: 'other', label: 'Other' },
      ],
      validation: { required: true },
    },
    {
      name: 'current_price',
      type: 'currency',
      label: 'Current Price',
      placeholder: '0.00',
      validation: { required: true },
    },
    {
      name: 'sector',
      type: 'input',
      label: 'Sector',
      placeholder: 'e.g., Technology, Healthcare',
      description: 'Industry sector (optional)',
    },
    {
      name: 'country',
      type: 'input',
      label: 'Country',
      placeholder: 'e.g., USA, Germany',
      description: 'Country of origin (optional)',
    },
    {
      name: 'currency',
      type: 'select',
      label: 'Currency',
      options: [
        { value: 'USD', label: 'USD - US Dollar' },
        { value: 'EUR', label: 'EUR - Euro' },
        { value: 'GBP', label: 'GBP - British Pound' },
        { value: 'CAD', label: 'CAD - Canadian Dollar' },
      ],
      validation: { required: true },
    },
    {
      name: 'notes',
      type: 'textarea',
      label: 'Notes',
      placeholder: 'Additional notes about this investment',
      rows: 3,
    },
  ],
  layout: 'vertical',
  submission: {
    onSubmit,
    submitText: 'Add Investment',
    loading: isLoading,
  },
  defaultValues: {
    name: '',
    symbol: '',
    investment_type: 'stock',
    current_price: '',
    sector: '',
    country: '',
    currency: 'USD',
    notes: '',
    ...initialData,
  },
});

export const createInvestmentPortfolioFormConfig = (
  onSubmit: (data: InvestmentPortfolioFormData) => Promise<void>,
  investments: Array<{ value: number; label: string }>,
  isLoading?: boolean,
  initialData?: Partial<InvestmentPortfolioFormData>
): FormConfig<InvestmentPortfolioFormData> => ({
  schema: investmentPortfolioSchema,
  title: 'Create Portfolio',
  description: 'Create a portfolio to organize and track your investments.',
  fields: [
    {
      name: 'name',
      type: 'input',
      label: 'Portfolio Name',
      placeholder: 'e.g., Retirement Portfolio, Tech Stocks',
      validation: { required: true },
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Description',
      placeholder: 'Portfolio description and strategy...',
      rows: 3,
    },
    {
      name: 'investments',
      type: 'multiselect',
      label: 'Investments',
      options: investments,
      description: 'Select investments to include in this portfolio',
    },
  ],
  layout: 'vertical',
  submission: {
    onSubmit,
    submitText: 'Create Portfolio',
    loading: isLoading,
  },
  defaultValues: {
    name: '',
    description: '',
    investments: [],
    ...initialData,
  },
});

export const createBuySellInvestmentFormConfig = (
  onSubmit: (data: BuySellInvestmentFormData) => Promise<void>,
  investmentName: string,
  transactionType: 'buy' | 'sell',
  isLoading?: boolean,
  initialData?: Partial<BuySellInvestmentFormData>
): FormConfig<BuySellInvestmentFormData> => ({
  schema: buySellInvestmentSchema,
  title: `${transactionType === 'buy' ? 'Buy' : 'Sell'} ${investmentName}`,
  description: `${transactionType === 'buy' ? 'Purchase' : 'Sell'} shares of ${investmentName}.`,
  fields: [
    {
      name: 'quantity',
      type: 'number',
      label: 'Quantity',
      placeholder: '0',
      step: 0.001,
      validation: { required: true },
      description: 'Number of shares/units',
    },
    {
      name: 'price_per_unit',
      type: 'currency',
      label: 'Price per Unit',
      placeholder: '0.00',
      validation: { required: true },
    },
    {
      name: 'fees',
      type: 'currency',
      label: 'Fees',
      placeholder: '0.00',
      description: 'Transaction fees and commissions',
    },
    {
      name: 'notes',
      type: 'textarea',
      label: 'Notes',
      placeholder: 'Transaction notes',
      rows: 3,
    },
  ],
  layout: 'vertical',
  submission: {
    onSubmit,
    submitText: transactionType === 'buy' ? 'Buy' : 'Sell',
    loading: isLoading,
  },
  defaultValues: {
    quantity: '',
    price_per_unit: '',
    fees: '0',
    notes: '',
    ...initialData,
  },
});

export const createNewsletterSubscriptionFormConfig = (
  onSubmit: (data: NewsletterSubscriptionFormData) => Promise<void>,
  isLoading?: boolean
): FormConfig<NewsletterSubscriptionFormData> => ({
  schema: newsletterSubscriptionSchema,
  title: 'Stay Updated',
  description: 'Get the latest financial tips and product updates delivered to your inbox.',
  fields: [
    {
      name: 'email',
      type: 'email',
      label: 'Email Address',
      placeholder: 'Enter your email',
      validation: { required: true },
    },
    {
      name: 'name',
      type: 'input',
      label: 'Name',
      placeholder: 'Your name (optional)',
    },
    {
      name: 'frequency',
      type: 'select',
      label: 'Email Frequency',
      options: [
        { value: 'weekly', label: 'Weekly' },
        { value: 'monthly', label: 'Monthly' },
      ],
    },
  ],
  layout: 'vertical',
  submission: {
    onSubmit,
    submitText: 'Subscribe',
    loading: isLoading,
  },
  defaultValues: {
    email: '',
    name: '',
    frequency: 'weekly',
  },
});

// Alias for backward compatibility
export const createInvestmentAdvancedFormConfig = createInvestmentFormConfig;

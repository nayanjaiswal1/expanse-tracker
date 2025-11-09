import { z } from 'zod';

export const accountSchema = z.object({
  name: z
    .string()
    .min(1, 'Account name is required')
    .max(100, 'Account name must be less than 100 characters'),
  account_type: z.enum(['checking', 'savings', 'credit', 'investment', 'loan', 'cash', 'other'], {
    required_error: 'Please select an account type',
  }),
  balance: z
    .string()
    .min(1, 'Initial balance is required')
    .refine((val) => !isNaN(Number(val)), 'Balance must be a valid number'),
  currency: z.string().min(1, 'Currency is required').length(3, 'Currency must be a 3-letter code'),
  icon: z
    .string()
    .max(4096, 'Icon reference must be less than 4096 characters')
    .optional()
    .or(z.literal('')),
  institution: z.string().max(100, 'Institution name must be less than 100 characters').optional(),
  account_number_last4: z
    .string()
    .regex(/^\d{4}$/, 'Must be exactly 4 digits')
    .optional(),
  tags: z.array(z.string()).optional(),
});

export const transactionSchema = z.object({
  amount: z
    .string()
    .min(1, 'Amount is required')
    .refine(
      (val) => !isNaN(Number(val)) && Number(val) !== 0,
      'Amount must be a valid non-zero number'
    ),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(200, 'Description must be less than 200 characters'),
  category_id: z.number().min(1, 'Please select a category'),
  account_id: z.number().min(1, 'Please select an account'),
  transaction_date: z.string().min(1, 'Transaction date is required'),
  tags: z.array(z.string()).optional(),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
});

export const goalSchema = z.object({
  name: z
    .string()
    .min(1, 'Goal name is required')
    .max(100, 'Goal name must be less than 100 characters'),
  target_amount: z
    .string()
    .min(1, 'Target amount is required')
    .refine(
      (val) => !isNaN(Number(val)) && Number(val) > 0,
      'Target amount must be a positive number'
    ),
  target_date: z
    .string()
    .min(1, 'Target date is required')
    .refine((val) => new Date(val) > new Date(), 'Target date must be in the future'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  priority: z.enum(['low', 'medium', 'high'], {
    required_error: 'Please select a priority',
  }),
});

export const budgetSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Budget name is required')
      .max(100, 'Budget name must be less than 100 characters'),
    amount: z
      .string()
      .min(1, 'Budget amount is required')
      .refine(
        (val) => !isNaN(Number(val)) && Number(val) > 0,
        'Budget amount must be a positive number'
      ),
    category_id: z.number().min(1, 'Please select a category'),
    period: z.enum(['weekly', 'monthly', 'quarterly', 'yearly'], {
      required_error: 'Please select a budget period',
    }),
    start_date: z.string().min(1, 'Start date is required'),
    end_date: z.string().min(1, 'End date is required'),
  })
  .refine((data) => new Date(data.end_date) > new Date(data.start_date), {
    message: 'End date must be after start date',
    path: ['end_date'],
  });

export const investmentSchema = z.object({
  symbol: z
    .string()
    .min(1, 'Stock symbol is required')
    .max(10, 'Symbol must be less than 10 characters')
    .toUpperCase(),
  shares: z
    .string()
    .min(1, 'Number of shares is required')
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, 'Shares must be a positive number'),
  purchase_price: z
    .string()
    .min(1, 'Purchase price is required')
    .refine(
      (val) => !isNaN(Number(val)) && Number(val) > 0,
      'Purchase price must be a positive number'
    ),
  purchase_date: z.string().min(1, 'Purchase date is required'),
  account_id: z.number().min(1, 'Please select an account'),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
});

// Merchant Pattern Schema for AccountsManagement and MerchantPatterns
export const merchantPatternSchema = z.object({
  pattern: z
    .string()
    .min(1, 'Pattern is required')
    .max(200, 'Pattern must be less than 200 characters'),
  merchant_name: z
    .string()
    .min(1, 'Merchant name is required')
    .max(100, 'Merchant name must be less than 100 characters'),
  category: z.string().min(1, 'Category is required'),
  subcategory: z.string().optional(),
  is_regex: z.boolean().default(false),
  case_sensitive: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

// Extended Account Schema for AccountsManagement
export const accountManagementSchema = z.object({
  // Basic Information
  name: z
    .string()
    .min(1, 'Account name is required')
    .max(255, 'Account name must be less than 255 characters'),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .or(z.literal('')),
  account_type: z.enum(['checking', 'savings', 'credit', 'investment', 'loan', 'cash', 'other'], {
    required_error: 'Please select an account type',
  }),
  status: z
    .enum(['active', 'inactive', 'closed', 'frozen', 'pending'], {
      required_error: 'Please select an account status',
    })
    .default('active'),

  // Financial Information
  balance: z
    .number()
    .or(
      z
        .string()
        .transform((val) => Number(val))
        .refine((val) => !isNaN(val), 'Balance must be a valid number')
    )
    .default(0),
  currency: z.string().min(1, 'Currency is required').default('USD'),

  // Account Details
  account_number: z
    .string()
    .max(100, 'Account number must be less than 100 characters')
    .optional()
    .or(z.literal('')),

  // Balance limit (credit limit for credit cards, minimum balance for checking/savings, loan amount for loans)
  balance_limit: z
    .number()
    .or(
      z
        .string()
        .transform((val) => (val === '' ? null : Number(val)))
        .refine((val) => val === null || !isNaN(val), 'Must be a valid number')
    )
    .nullable()
    .default(null),

  // Additional Information
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.any()).default({}),
});

// Enhanced Goal Schema for Goals component (with additional fields)
export const goalEnhancedSchema = z.object({
  name: z
    .string()
    .min(1, 'Goal name is required')
    .max(100, 'Goal name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  target_amount: z
    .number()
    .positive('Target amount must be positive')
    .or(
      z
        .string()
        .refine(
          (val) => !isNaN(Number(val)) && Number(val) > 0,
          'Target amount must be a positive number'
        )
    ),
  current_amount: z
    .number()
    .min(0, 'Current amount cannot be negative')
    .or(
      z
        .string()
        .refine(
          (val) => !isNaN(Number(val)) && Number(val) >= 0,
          'Current amount must be non-negative'
        )
    )
    .default(0),
  target_date: z.string().min(1, 'Target date is required'),
  goal_type: z.enum(
    [
      'savings',
      'debt_payoff',
      'investment',
      'expense_reduction',
      'income_increase',
      'emergency_fund',
      'retirement',
      'education',
      'travel',
      'home',
      'car',
      'other',
    ],
    {
      required_error: 'Please select a goal type',
    }
  ),
  category: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high'], {
    required_error: 'Please select a priority',
  }),
  is_active: z.boolean().default(true),
  auto_contribute: z.boolean().default(false),
  contribution_frequency: z.enum(['weekly', 'monthly', 'quarterly', 'yearly']).optional(),
  contribution_amount: z
    .number()
    .positive('Contribution amount must be positive')
    .or(
      z
        .string()
        .refine(
          (val) => !isNaN(Number(val)) && Number(val) > 0,
          'Contribution amount must be positive'
        )
    )
    .optional(),
});

// Bank Statement Upload Schema
export const bankStatementUploadSchema = z
  .object({
    account_id: z.string().optional(),
    bank_format: z.string().default('auto'),
    file: z
      .instanceof(File)
      .refine((file) => file.size <= 10 * 1024 * 1024, 'File size must be less than 10MB')
      .refine((file) => {
        const allowedTypes = ['csv', 'txt', 'tsv'];
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        return allowedTypes.includes(fileExtension || '');
      }, 'File must be CSV, TXT, or TSV format')
      .optional(),
    textContent: z.string().optional(),
  })
  .refine((data) => data.file || data.textContent, {
    message: 'Either file or text content is required',
    path: ['file'],
  });

// Transaction Settings Schema
export const transactionSettingsSchema = z.object({
  default_category_id: z.string().optional(),
  auto_categorize_transactions: z.boolean().default(true),
  require_verification: z.boolean().default(false),
  default_tags: z.string().optional(),
  enable_transaction_suggestions: z.boolean().default(true),
  duplicate_detection_enabled: z.boolean().default(true),
  duplicate_detection_days: z
    .number()
    .int()
    .min(1, 'Must be at least 1 day')
    .max(365, 'Must be less than 365 days')
    .default(7),
  default_transaction_source: z
    .enum(['manual', 'import', 'api', 'auto'], {
      required_error: 'Please select a transaction source',
    })
    .default('manual'),
  auto_mark_transfers: z.boolean().default(true),
  minimum_transfer_amount: z.number().min(0, 'Amount must be non-negative').default(0),
  enable_receipt_scanning: z.boolean().default(true),
  auto_create_from_receipts: z.boolean().default(false),
});

export type AccountFormData = z.infer<typeof accountSchema>;
export type TransactionFormData = z.infer<typeof transactionSchema>;
export type GoalFormData = z.infer<typeof goalSchema>;
export type BudgetFormData = z.infer<typeof budgetSchema>;
export type InvestmentFormData = z.infer<typeof investmentSchema>;
export type MerchantPatternFormData = z.infer<typeof merchantPatternSchema>;
export type AccountManagementFormData = z.infer<typeof accountManagementSchema>;
export type GoalEnhancedFormData = z.infer<typeof goalEnhancedSchema>;
export type BankStatementUploadFormData = z.infer<typeof bankStatementUploadSchema>;
// Unified Balance Record Schema
export const balanceRecordSchema = z.object({
  balance: z
    .number()
    .or(z.string().refine((val) => !isNaN(Number(val)), 'Balance must be a valid number')),
  date: z
    .string()
    .min(1, 'Date is required')
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid date format'),
  entry_type: z
    .enum(['daily', 'monthly', 'weekly', 'manual', 'reconciliation'], {
      required_error: 'Please select an entry type',
    })
    .default('manual'),

  // Statement/Reconciliation Fields
  statement_balance: z
    .number()
    .or(z.string().refine((val) => !isNaN(Number(val)), 'Statement balance must be a valid number'))
    .optional(),
  reconciliation_status: z
    .enum(['pending', 'reconciled', 'discrepancy', 'investigation'], {
      required_error: 'Please select a reconciliation status',
    })
    .default('pending'),

  // Transaction Analysis
  total_income: z
    .number()
    .min(0, 'Total income must be non-negative')
    .or(
      z
        .string()
        .refine(
          (val) => !isNaN(Number(val)) && Number(val) >= 0,
          'Total income must be non-negative'
        )
    )
    .default(0),
  total_expenses: z
    .number()
    .min(0, 'Total expenses must be non-negative')
    .or(
      z
        .string()
        .refine(
          (val) => !isNaN(Number(val)) && Number(val) >= 0,
          'Total expenses must be non-negative'
        )
    )
    .default(0),
  calculated_change: z
    .number()
    .or(z.string().refine((val) => !isNaN(Number(val)), 'Calculated change must be a valid number'))
    .default(0),

  // Period Information
  period_start: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), 'Invalid start date format'),
  period_end: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), 'Invalid end date format'),
  is_month_end: z.boolean().default(false),

  // Additional Information
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional(),
  source: z.string().max(100, 'Source must be less than 100 characters').optional(),
  confidence_score: z
    .number()
    .min(0, 'Confidence score must be between 0 and 1')
    .max(1, 'Confidence score must be between 0 and 1')
    .or(
      z
        .string()
        .refine(
          (val) => !isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 1,
          'Confidence score must be between 0 and 1'
        )
    )
    .optional(),
  metadata: z.record(z.any()).default({}),
});

// Group Expense Schema (Splitwise)
export const expenseSchema = z.object({
  title: z
    .string()
    .min(1, 'Expense description is required')
    .max(200, 'Description must be less than 200 characters'),
  total_amount: z
    .number()
    .positive('Amount must be positive')
    .or(
      z
        .string()
        .refine((val) => !isNaN(Number(val)) && Number(val) > 0, 'Amount must be a positive number')
    ),
  split_method: z
    .enum(['equal', 'percentage', 'amount', 'shares'], {
      required_error: 'Please select a split method',
    })
    .default('equal'),
  paid_by_user_id: z.number().min(1, 'Please select who paid'),
  description: z.string().max(500, 'Notes must be less than 500 characters').optional(),
  date: z.string().min(1, 'Date is required'),
});

// Lending Transaction Schema (Individual Lending)
export const lendingSchema = z.object({
  contact_user_id: z.number().min(1, 'Please select a contact'),
  amount: z
    .number()
    .positive('Amount must be positive')
    .or(
      z
        .string()
        .refine((val) => !isNaN(Number(val)) && Number(val) > 0, 'Amount must be a positive number')
    ),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(200, 'Description must be less than 200 characters'),
  type: z.enum(['lend', 'borrow'], {
    required_error: 'Please select transaction type',
  }),
  due_date: z.string().optional(),
  interest_rate: z
    .number()
    .min(0, 'Interest rate must be non-negative')
    .max(100, 'Interest rate must be less than 100%')
    .or(
      z
        .string()
        .refine(
          (val) => !isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 100,
          'Interest rate must be between 0 and 100'
        )
    )
    .optional(),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
});

// Enhanced Budget Schema matching actual BudgetForm usage
export const budgetEnhancedSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Budget name is required')
      .max(100, 'Budget name must be less than 100 characters'),
    description: z.string().max(500, 'Description must be less than 500 characters').optional(),
    period_type: z.enum(['monthly', 'quarterly', 'yearly', 'custom'], {
      required_error: 'Please select a period type',
    }),
    start_date: z.string().min(1, 'Start date is required'),
    end_date: z.string().min(1, 'End date is required'),
    total_amount: z
      .number()
      .positive('Amount must be positive')
      .or(
        z
          .string()
          .refine(
            (val) => !isNaN(Number(val)) && Number(val) > 0,
            'Amount must be a positive number'
          )
      ),
    is_active: z.boolean().default(true),
    auto_rollover: z.boolean().default(false),
  })
  .refine((data) => new Date(data.end_date) > new Date(data.start_date), {
    message: 'End date must be after start date',
    path: ['end_date'],
  });

export type TransactionSettingsFormData = z.infer<typeof transactionSettingsSchema>;
export type BalanceRecordFormData = z.infer<typeof balanceRecordSchema>;
export type ExpenseFormData = z.infer<typeof expenseSchema>;
export type LendingFormData = z.infer<typeof lendingSchema>;
export type BudgetEnhancedFormData = z.infer<typeof budgetEnhancedSchema>;

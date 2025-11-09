import { z } from 'zod';

export const uploadFileSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size <= 50 * 1024 * 1024, 'File must be smaller than 50MB')
    .refine((file) => {
      const allowedTypes = [
        'text/csv',
        'application/pdf',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'application/json',
      ];
      return allowedTypes.includes(file.type);
    }, 'File type not supported'),
  account_id: z.number().min(1, 'Please select an account'),
  password: z.string().optional(),
  date_format: z.enum(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'], {
    message: 'Please select a date format',
  }),
  currency_column: z.string().optional(),
  skip_first_row: z.boolean(),
  duplicate_handling: z.enum(['skip', 'update', 'create_new'], {
    message: 'Please select duplicate handling strategy',
  }),
});

export const goalSchema = z.object({
  name: z
    .string()
    .min(1, 'Goal name is required')
    .max(100, 'Goal name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  goal_type: z.enum(['savings', 'spending', 'debt_payoff', 'investment'], {
    message: 'Please select a goal type',
  }),
  target_amount: z
    .string()
    .min(1, 'Target amount is required')
    .refine(
      (val) => !isNaN(Number(val)) && Number(val) > 0,
      'Target amount must be a positive number'
    ),
  current_amount: z
    .string()
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, 'Current amount must be non-negative')
    .optional(),
  currency: z.string().length(3, 'Currency must be a 3-letter code'),
  start_date: z.string().min(1, 'Start date is required'),
  target_date: z.string().min(1, 'Target date is required'),
  category: z.number().optional(),
  account: z.number().optional(),
  auto_track: z.boolean(),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please enter a valid hex color'),
  priority: z.number().min(1, 'Priority must be at least 1').max(5, 'Priority must be at most 5'),
});

export const recurringTransactionSchema = z.object({
  name: z
    .string()
    .min(1, 'Transaction name is required')
    .max(100, 'Name must be less than 100 characters'),
  transaction_type: z.enum(['expense', 'income'], {
    message: 'Please select transaction type',
  }),
  amount: z
    .string()
    .min(1, 'Amount is required')
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, 'Amount must be a positive number'),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly'], {
    message: 'Please select frequency',
  }),
  frequency_interval: z
    .number()
    .min(1, 'Interval must be at least 1')
    .max(365, 'Interval must be at most 365'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().optional(),
  max_executions: z.number().min(1, 'Max executions must be at least 1').optional(),
  account: z.number().min(1, 'Please select an account'),
  category: z.number().min(1, 'Please select a category'),
  description: z.string().max(200, 'Description must be less than 200 characters').optional(),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
});

export const investmentAdvancedSchema = z.object({
  name: z
    .string()
    .min(1, 'Investment name is required')
    .max(100, 'Name must be less than 100 characters'),
  symbol: z
    .string()
    .min(1, 'Symbol is required')
    .max(10, 'Symbol must be less than 10 characters')
    .toUpperCase(),
  investment_type: z.enum(['stock', 'bond', 'mutual_fund', 'etf', 'crypto', 'other'], {
    message: 'Please select investment type',
  }),
  current_price: z
    .string()
    .min(1, 'Current price is required')
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, 'Price must be a positive number'),
  sector: z.string().max(50, 'Sector must be less than 50 characters').optional(),
  country: z.string().max(50, 'Country must be less than 50 characters').optional(),
  exchange: z.string().max(20, 'Exchange must be less than 20 characters').optional(),
  currency: z.string().length(3, 'Currency must be a 3-letter code'),
  dividend_yield: z
    .string()
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, 'Dividend yield must be non-negative')
    .optional(),
  pe_ratio: z
    .string()
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, 'P/E ratio must be non-negative')
    .optional(),
  market_cap: z
    .string()
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, 'Market cap must be non-negative')
    .optional(),
  risk_rating: z.enum(['very_low', 'low', 'moderate', 'high', 'very_high'], {
    message: 'Please select risk rating',
  }),
  auto_track: z.boolean(),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional(),
});

export const passwordPromptSchema = z.object({
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean().optional(),
});

export const telegramBotSchema = z.object({
  name: z
    .string()
    .min(1, 'Bot name is required')
    .max(100, 'Bot name must be less than 100 characters'),
  bot_token: z
    .string()
    .min(1, 'Bot token is required')
    .regex(/^\d+:[A-Za-z0-9_-]+$/, 'Invalid bot token format'),
  webhook_url: z.string().url('Please enter a valid webhook URL').optional().or(z.literal('')),
});

export const automationRuleSchema = z.object({
  name: z
    .string()
    .min(1, 'Rule name is required')
    .max(100, 'Rule name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  condition_field: z.string().min(1, 'Please select a condition field'),
  condition_operator: z.string().min(1, 'Please select a condition operator'),
  condition_value: z.string().min(1, 'Condition value is required'),
  action_type: z.enum(['set_category', 'set_account', 'add_tag', 'set_description'], {
    message: 'Please select an action type',
  }),
  action_value: z.string().min(1, 'Action value is required'),
  is_active: z.boolean(),
  priority: z
    .number()
    .min(1, 'Priority must be at least 1')
    .max(100, 'Priority must be at most 100'),
});

export type UploadFileFormData = z.infer<typeof uploadFileSchema>;
export type GoalAdvancedFormData = z.infer<typeof goalSchema>;
export type RecurringTransactionFormData = z.infer<typeof recurringTransactionSchema>;
export type InvestmentAdvancedFormData = z.infer<typeof investmentAdvancedSchema>;
export type PasswordPromptFormData = z.infer<typeof passwordPromptSchema>;
export type TelegramBotFormData = z.infer<typeof telegramBotSchema>;
export type AutomationRuleFormData = z.infer<typeof automationRuleSchema>;

export const investmentPortfolioSchema = z.object({
  name: z
    .string()
    .min(1, 'Portfolio name is required')
    .max(100, 'Name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  investments: z.array(z.number()).optional(),
});

export type InvestmentPortfolioFormData = z.infer<typeof investmentPortfolioSchema>;

export const buySellInvestmentSchema = z.object({
  quantity: z
    .string()
    .min(1, 'Quantity is required')
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, 'Quantity must be a positive number'),
  price_per_unit: z
    .string()
    .min(1, 'Price per unit is required')
    .refine(
      (val) => !isNaN(Number(val)) && Number(val) > 0,
      'Price per unit must be a positive number'
    ),
  fees: z
    .string()
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, 'Fees must be non-negative')
    .optional(),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
});

export type BuySellInvestmentFormData = z.infer<typeof buySellInvestmentSchema>;

export const newsletterSubscriptionSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().optional(),
  frequency: z.enum(['weekly', 'monthly']).optional(),
});

export type NewsletterSubscriptionFormData = z.infer<typeof newsletterSubscriptionSchema>;

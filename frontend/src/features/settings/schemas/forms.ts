import { z } from 'zod';

export const profileSchema = z.object({
  full_name: z
    .string()
    .min(1, 'Full name is required')
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be less than 100 characters'),
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  phone: z
    .string()
    .regex(/^[+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number')
    .optional()
    .or(z.literal('')),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  website: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  location: z.string().max(100, 'Location must be less than 100 characters').optional(),
});

export const preferencesSchema = z.object({
  preferred_currency: z.string().length(3, 'Currency must be a 3-letter code'),
  preferred_date_format: z.enum(['YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY'], {
    message: 'Please select a date format',
  }),
  timezone: z.string().min(1, 'Timezone is required'),
  language: z.enum(['en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja'], {
    message: 'Please select a language',
  }),
  theme: z.enum(['light', 'dark', 'system'], {
    message: 'Please select a theme',
  }),
  notifications_enabled: z.boolean(),
  email_notifications: z.boolean(),
  push_notifications: z.boolean(),
});

export const securitySchema = z
  .object({
    current_password: z.string().min(1, 'Current password is required'),
    new_password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
    confirm_password: z.string().min(1, 'Please confirm your new password'),
    two_factor_enabled: z.boolean(),
    session_timeout: z.enum(['15', '30', '60', '120', 'never'], {
      message: 'Please select a session timeout',
    }),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords don't match",
    path: ['confirm_password'],
  });

export const notificationSchema = z.object({
  email_notifications: z.boolean(),
  push_notifications: z.boolean(),
  sms_notifications: z.boolean(),
  transaction_alerts: z.boolean(),
  budget_alerts: z.boolean(),
  goal_reminders: z.boolean(),
  weekly_summary: z.boolean(),
  monthly_report: z.boolean(),
  security_alerts: z.boolean(),
  marketing_emails: z.boolean(),
  notification_frequency: z.enum(['immediate', 'daily', 'weekly'], {
    message: 'Please select notification frequency',
  }),
  quiet_hours_start: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter a valid time format (HH:MM)')
    .optional(),
  quiet_hours_end: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter a valid time format (HH:MM)')
    .optional(),
});

export const integrationSchema = z.object({
  telegram_enabled: z.boolean(),
  telegram_username: z
    .string()
    .regex(/^@?[a-zA-Z0-9_]{5,32}$/, 'Please enter a valid Telegram username')
    .optional()
    .or(z.literal('')),
  gmail_enabled: z.boolean(),
  gmail_account: z
    .string()
    .email('Please enter a valid Gmail address')
    .optional()
    .or(z.literal('')),
  webhook_url: z.string().url('Please enter a valid webhook URL').optional().or(z.literal('')),
  api_key: z
    .string()
    .min(10, 'API key must be at least 10 characters')
    .optional()
    .or(z.literal('')),
});

export type ProfileFormData = z.infer<typeof profileSchema>;
export type PreferencesFormData = z.infer<typeof preferencesSchema>;
export type SecurityFormData = z.infer<typeof securitySchema>;
export type NotificationFormData = z.infer<typeof notificationSchema>;
export type IntegrationFormData = z.infer<typeof integrationSchema>;

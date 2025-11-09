import { z } from 'zod';
import { FormConfig } from '../../../shared/schemas';
import {
  profileSchema,
  preferencesSchema,
  securitySchema,
  notificationSchema,
  ProfileFormData,
  PreferencesFormData,
  SecurityFormData,
  NotificationFormData,
} from '../schemas';
import type { Currency } from '../../../api/client';

export const createProfileFormConfig = (
  onSubmit: (data: ProfileFormData) => Promise<void>,
  isLoading?: boolean,
  initialData?: Partial<ProfileFormData>
): FormConfig<ProfileFormData> => ({
  schema: profileSchema,
  title: '', // Remove duplicate title - already shown in component
  description: '',
  fields: [
    {
      name: 'full_name',
      type: 'input',
      label: 'Full Name',
      placeholder: 'Enter your full name',
      validation: { required: true },
      className: 'col-span-full',
    },
    {
      name: 'email',
      type: 'email',
      label: 'Email Address',
      placeholder: 'Enter your email address',
      validation: { required: true },
      description: 'This email cannot be changed for security reasons',
      className: 'col-span-full',
      disabled: true,
    },
    {
      name: 'phone',
      type: 'input',
      label: 'Phone Number',
      placeholder: '+1 (555) 123-4567',
      description: 'Optional - used for account security and SMS notifications',
      className: '',
    },
    {
      name: 'location',
      type: 'input',
      label: 'Location',
      placeholder: 'City, Country',
      description: 'Your current location',
      className: '',
    },
    {
      name: 'website',
      type: 'input',
      label: 'Website',
      placeholder: 'https://example.com',
      description: 'Your personal or professional website',
      className: 'col-span-full',
    },
    {
      name: 'bio',
      type: 'textarea',
      label: 'Bio',
      placeholder: 'Tell us a bit about yourself...',
      rows: 4,
      description: 'A brief description about yourself and your interests',
      className: 'col-span-full',
    },
  ],
  layout: 'profile',
  submission: {
    onSubmit,
    submitText: 'Save Profile Changes',
    loading: isLoading,
    className:
      'bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 text-sm rounded-md transition-colors duration-200 shadow-sm hover:shadow-md',
  },
  validation: {
    mode: 'onBlur',
    shouldFocusError: true,
  },
  defaultValues: {
    full_name: '',
    email: '',
    phone: '',
    bio: '',
    website: '',
    location: '',
    ...initialData,
  },
});

export const createPreferencesFormConfig = (
  onSubmit: (data: PreferencesFormData) => Promise<void>,
  isLoading?: boolean,
  initialData?: Partial<PreferencesFormData>,
  currencies: Currency[] = []
): FormConfig<PreferencesFormData> => ({
  schema: preferencesSchema,
  title: '', // Remove duplicate title - already shown in component
  description: 'Customize your app experience and regional settings.',
  fields: [
    // Regional Settings Section
    {
      name: 'preferred_currency',
      type: 'select',
      label: 'Default Currency',
      options: currencies?.map((currency) => ({
        value: currency.code,
        label: `${currency.symbol} ${currency.code} - ${currency.name}`,
      })),
      validation: { required: true },
      description: 'Primary currency for displaying amounts',
      className: 'md:col-span-1',
    },
    {
      name: 'preferred_date_format',
      type: 'select',
      label: 'Date Format',
      description: 'Choose your preferred date format',
      options: [
        { value: 'YYYY-MM-DD', label: '2024-01-15 (ISO)' },
        { value: 'MM/DD/YYYY', label: '01/15/2024 (US)' },
        { value: 'DD/MM/YYYY', label: '15/01/2024 (EU)' },
      ],
      validation: { required: true },
      className: 'md:col-span-1',
    },
    {
      name: 'timezone',
      type: 'select',
      label: 'Timezone',
      options: [
        { value: 'Asia/Kolkata', label: 'India Standard Time (UTC+5:30)' },
        { value: 'America/New_York', label: 'Eastern Time (UTC-5)' },
        { value: 'America/Chicago', label: 'Central Time (UTC-6)' },
        { value: 'America/Denver', label: 'Mountain Time (UTC-7)' },
        { value: 'America/Los_Angeles', label: 'Pacific Time (UTC-8)' },
        { value: 'Europe/London', label: 'GMT (UTC+0)' },
        { value: 'Europe/Paris', label: 'CET (UTC+1)' },
        { value: 'Asia/Tokyo', label: 'JST (UTC+9)' },
        { value: 'Australia/Sydney', label: 'AEST (UTC+10)' },
      ],
      validation: { required: true },
      className: 'md:col-span-1',
    },
    {
      name: 'language',
      type: 'select',
      label: 'Language',
      options: [
        { value: 'en', label: 'English' },
        { value: 'es', label: 'Español' },
        { value: 'fr', label: 'Français' },
        { value: 'de', label: 'Deutsch' },
        { value: 'it', label: 'Italiano' },
        { value: 'pt', label: 'Português' },
        { value: 'zh', label: '中文' },
        { value: 'ja', label: '日本語' },
      ],
      validation: { required: true },
      className: 'md:col-span-1',
    },
    // Appearance Section
    {
      name: 'theme',
      type: 'radio',
      label: 'Theme Preference',
      options: [
        { value: 'light', label: 'Light Mode', description: 'Clean and bright interface' },
        { value: 'dark', label: 'Dark Mode', description: 'Easy on the eyes in low light' },
        { value: 'system', label: 'System Default', description: 'Follow your device settings' },
      ],
      validation: { required: true },
      description: 'Choose your preferred color scheme',
      className: 'md:col-span-2',
    },

    // Email & Notification Settings Section
    {
      name: 'notifications_enabled',
      type: 'checkbox',
      label: 'Enable notifications',
      description: 'Receive notifications about account activity',
      className: 'md:col-span-2',
    },
    {
      name: 'email_notifications',
      type: 'checkbox',
      label: 'Email notifications',
      description: 'Get important updates via email',
      conditional: {
        field: 'notifications_enabled',
        operator: 'equals',
        value: true,
      },
      className: 'md:col-span-1',
    },
    {
      name: 'push_notifications',
      type: 'checkbox',
      label: 'Push notifications',
      description: 'Receive real-time push notifications',
      conditional: {
        field: 'notifications_enabled',
        operator: 'equals',
        value: true,
      },
      className: 'md:col-span-1',
    },
  ],
  layout: 'grid',
  submission: {
    onSubmit,
    submitText: 'Save Preferences',
    loading: isLoading,
    className:
      'bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 py-3 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl',
  },
  defaultValues: {
    preferred_currency: currencies[0]?.code || 'USD',
    preferred_date_format: 'DD/MM/YYYY',
    timezone: 'Asia/Kolkata',
    language: 'en',
    theme: 'system',
    notifications_enabled: true,
    email_notifications: true,
    push_notifications: false,
    ...initialData,
  },
});

export const createSecurityFormConfig = (
  onSubmit: (data: SecurityFormData) => Promise<void>,
  isLoading?: boolean
): FormConfig<SecurityFormData> => ({
  schema: securitySchema,
  title: 'Security Settings',
  description: 'Update your password and security preferences.',
  fields: [
    {
      name: 'current_password',
      type: 'password',
      label: 'Current Password',
      placeholder: 'Enter your current password',
      validation: { required: true },
      className: 'md:col-span-2',
    },
    {
      name: 'new_password',
      type: 'password',
      label: 'New Password',
      placeholder: 'Enter your new password',
      validation: { required: true },
      description: 'Must contain at least 8 characters with uppercase, lowercase, and a number',
      className: 'md:col-span-1',
    },
    {
      name: 'confirm_password',
      type: 'password',
      label: 'Confirm New Password',
      placeholder: 'Confirm your new password',
      validation: { required: true },
      className: 'md:col-span-1',
    },
    {
      name: 'two_factor_enabled',
      type: 'checkbox',
      label: 'Enable Two-Factor Authentication',
      description: 'Add an extra layer of security to your account',
      className: 'md:col-span-1',
    },
    {
      name: 'session_timeout',
      type: 'select',
      label: 'Session Timeout',
      options: [
        { value: '15', label: '15 minutes' },
        { value: '30', label: '30 minutes' },
        { value: '60', label: '1 hour' },
        { value: '120', label: '2 hours' },
        { value: 'never', label: 'Never' },
      ],
      validation: { required: true },
      description: 'Automatically log out after this period of inactivity',
      className: 'md:col-span-1',
    },
  ],
  layout: 'grid',
  submission: {
    onSubmit,
    submitText: 'Update Security Settings',
    loading: isLoading,
  },
  defaultValues: {
    current_password: '',
    new_password: '',
    confirm_password: '',
    two_factor_enabled: false,
    session_timeout: '60',
  },
});

// Simple password change form
export const createPasswordChangeFormConfig = (
  onSubmit: (data: {
    current_password: string;
    new_password: string;
    confirm_password: string;
  }) => Promise<void>,
  isLoading?: boolean
): FormConfig<{ current_password: string; new_password: string; confirm_password: string }> => ({
  schema: z
    .object({
      current_password: z.string().min(1, 'Current password is required'),
      new_password: z.string().min(8, 'Password must be at least 8 characters'),
      confirm_password: z.string().min(1, 'Please confirm your password'),
    })
    .refine((data) => data.new_password === data.confirm_password, {
      message: "Passwords don't match",
      path: ['confirm_password'],
    }),
  title: '',
  description: '',
  fields: [
    {
      name: 'current_password',
      type: 'password',
      label: 'Current Password',
      placeholder: 'Enter your current password',
      validation: { required: true },
      description: 'Your existing account password',
    },
    {
      name: 'new_password',
      type: 'password',
      label: 'New Password',
      placeholder: 'Enter your new password',
      validation: { required: true },
      description: 'Must contain at least 8 characters with uppercase, lowercase, and numbers',
    },
    {
      name: 'confirm_password',
      type: 'password',
      label: 'Confirm New Password',
      placeholder: 'Confirm your new password',
      validation: { required: true },
      description: 'Re-enter your new password to confirm',
    },
  ],
  layout: 'vertical',
  submission: {
    onSubmit,
    submitText: 'Update Password',
    loading: isLoading,
    className:
      'bg-green-600 hover:bg-green-700 text-white font-medium px-8 py-3 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl',
  },
  defaultValues: {
    current_password: '',
    new_password: '',
    confirm_password: '',
  },
});

export const createNotificationFormConfig = (
  onSubmit: (data: NotificationFormData) => Promise<void>,
  isLoading?: boolean,
  initialData?: Partial<NotificationFormData>
): FormConfig<NotificationFormData> => ({
  schema: notificationSchema,
  title: 'Notification Settings',
  description: 'Choose how and when you want to receive notifications.',
  fields: [
    {
      name: 'email_notifications',
      type: 'checkbox',
      label: 'Email Notifications',
      description: 'Receive notifications via email',
      className: 'md:col-span-1',
    },
    {
      name: 'push_notifications',
      type: 'checkbox',
      label: 'Push Notifications',
      description: 'Receive notifications in your browser',
      className: 'md:col-span-1',
    },
    {
      name: 'sms_notifications',
      type: 'checkbox',
      label: 'SMS Notifications',
      description: 'Receive notifications via text message',
      className: 'md:col-span-1',
    },
    {
      name: 'transaction_alerts',
      type: 'checkbox',
      label: 'Transaction Alerts',
      description: 'Get notified when new transactions are detected',
      className: 'md:col-span-1',
    },
    {
      name: 'budget_alerts',
      type: 'checkbox',
      label: 'Budget Alerts',
      description: 'Receive alerts when approaching budget limits',
      className: 'md:col-span-1',
    },
    {
      name: 'goal_reminders',
      type: 'checkbox',
      label: 'Goal Reminders',
      description: 'Regular reminders about your financial goals',
      className: 'md:col-span-1',
    },
    {
      name: 'weekly_summary',
      type: 'checkbox',
      label: 'Weekly Summary',
      description: 'Weekly summary of your financial activity',
      className: 'md:col-span-1',
    },
    {
      name: 'monthly_report',
      type: 'checkbox',
      label: 'Monthly Report',
      description: 'Detailed monthly financial report',
      className: 'md:col-span-1',
    },
    {
      name: 'security_alerts',
      type: 'checkbox',
      label: 'Security Alerts',
      description: 'Important security and account alerts',
      className: 'md:col-span-1',
    },
    {
      name: 'marketing_emails',
      type: 'checkbox',
      label: 'Marketing Emails',
      description: 'Product updates and promotional emails',
      className: 'md:col-span-1',
    },
    {
      name: 'notification_frequency',
      type: 'select',
      label: 'Notification Frequency',
      options: [
        { value: 'immediate', label: 'Immediate' },
        { value: 'daily', label: 'Daily Digest' },
        { value: 'weekly', label: 'Weekly Digest' },
      ],
      validation: { required: true },
      className: 'md:col-span-2',
    },
    {
      name: 'quiet_hours_start',
      type: 'input',
      label: 'Quiet Hours Start',
      placeholder: '22:00',
      description: 'Time to stop sending notifications (24-hour format)',
      className: 'md:col-span-1',
    },
    {
      name: 'quiet_hours_end',
      type: 'input',
      label: 'Quiet Hours End',
      placeholder: '08:00',
      description: 'Time to resume sending notifications (24-hour format)',
      className: 'md:col-span-1',
    },
  ],
  layout: 'grid',
  submission: {
    onSubmit,
    submitText: 'Save Notification Settings',
    loading: isLoading,
  },
  defaultValues: {
    email_notifications: true,
    push_notifications: false,
    sms_notifications: false,
    transaction_alerts: true,
    budget_alerts: true,
    goal_reminders: true,
    weekly_summary: true,
    monthly_report: true,
    security_alerts: true,
    marketing_emails: false,
    notification_frequency: 'immediate',
    quiet_hours_start: '22:00',
    quiet_hours_end: '08:00',
    ...initialData,
  },
});

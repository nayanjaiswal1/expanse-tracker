// Onboarding related type definitions

export interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  required: boolean;
  order: number;
}

export interface OnboardingProgress {
  current_step: number;
  total_steps: number;
  completion_percentage: number;
  completed_steps: number[];
  skipped_steps: number[];
}

export interface UserPreferences {
  preferred_currency: string;
  preferred_date_format: string;
  timezone: string;
  language: string;
  enable_notifications: boolean;
}

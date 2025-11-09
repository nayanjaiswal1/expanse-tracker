import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../../contexts/AuthContext';
import { DEFAULT_TARGET_AMOUNT, DEFAULT_CURRENT_AMOUNT } from '../constants/goalConstants';
import type { Goal } from '../../../types';

const goalFormSchema = z.object({
  name: z.string().min(1, 'common:form.validation.nameRequired').max(200),
  description: z.string().optional(),
  goal_type: z.enum([
    'savings',
    'spending',
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
  ]),
  target_amount: z
    .string()
    .refine(
      (val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0,
      'finance:goals.form.validation.targetAmountPositive'
    ),
  current_amount: z
    .string()
    .refine(
      (val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0,
      'finance:goals.form.validation.currentAmountPositive'
    ),
  currency: z.string().default('USD'),
  start_date: z.string(),
  target_date: z.string().optional(),
  category: z.number().optional(),
  account: z.number().optional(),
  auto_track: z.boolean().default(false),
  images: z
    .array(
      z.object({
        file: z.instanceof(File),
        caption: z.string().optional(),
      })
    )
    .optional(),
});

export type GoalFormValues = z.infer<typeof goalFormSchema>;

export function useGoalForm(editingGoal?: Goal | null) {
  const { state: authState } = useAuth();

  const getDefaultValues = (): GoalFormValues => {
    if (editingGoal) {
      return {
        name: editingGoal.name,
        description: editingGoal.description || '',
        goal_type: editingGoal.goal_type || 'savings',
        target_amount: editingGoal.target_amount,
        current_amount: editingGoal.current_amount,
        currency: editingGoal.currency || 'USD',
        start_date: editingGoal.start_date || new Date().toISOString().split('T')[0],
        target_date: editingGoal.target_date || '',
        category: undefined,
        account: undefined,
        auto_track: false,
        images: [],
      };
    }

    return {
      name: '',
      description: '',
      goal_type: 'savings',
      target_amount: DEFAULT_TARGET_AMOUNT,
      current_amount: DEFAULT_CURRENT_AMOUNT,
      currency: authState.user?.preferred_currency || 'USD',
      start_date: new Date().toISOString().split('T')[0],
      target_date: '',
      category: undefined,
      account: undefined,
      auto_track: false,
      images: [],
    };
  };

  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: getDefaultValues(),
  });

  const prepareFormData = (values: GoalFormValues): FormData => {
    const formData = new FormData();

    formData.append('name', values.name);
    formData.append('description', values.description || '');
    formData.append('goal_type', values.goal_type);
    formData.append('target_amount', values.target_amount);
    formData.append('current_amount', values.current_amount);
    formData.append('currency', values.currency);
    formData.append('start_date', values.start_date);

    if (values.target_date) {
      formData.append('target_date', values.target_date);
    }
    if (values.category) {
      formData.append('category', values.category.toString());
    }
    if (values.account) {
      formData.append('account', values.account.toString());
    }

    formData.append('auto_track', values.auto_track.toString());
    formData.append('status', 'active');

    if (values.images && values.images.length > 0) {
      values.images.forEach((image, index) => {
        formData.append('images', image.file);
        if (image.caption) {
          formData.append(`image_captions_${index}`, image.caption);
        }
      });
    }

    return formData;
  };

  return {
    form,
    prepareFormData,
  };
}

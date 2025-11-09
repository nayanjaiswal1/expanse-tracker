import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../../../contexts/AuthContext';
import { autoDetectLocation } from '../../../utils/geoDetection';
import { safeLog } from '../../../utils/logger';
import { useCompleteOnboardingStep } from '../../../hooks/auth';
import { apiClient } from '../../../api/client';
import { useToast } from '../../../components/ui/Toast';
import { useTranslation } from 'react-i18next';
import {
  DEFAULTS,
  FORM_FIELDS,
  PHONE_REGEX,
  STEPS,
  VALIDATION_MESSAGES,
  FormValues,
  PrimaryUseCase,
  PrimaryGoal,
  isPrimaryUseCase,
  isPrimaryGoal,
} from '../constants/onboarding';

const createSchema = () =>
  z.object({
    [FORM_FIELDS.FULL_NAME]: z
      .string()
      .trim()
      .min(1, VALIDATION_MESSAGES.REQUIRED)
      .max(100, VALIDATION_MESSAGES.MAX_LENGTH(100)),
    [FORM_FIELDS.PHONE]: z
      .string()
      .trim()
      .optional()
      .refine((value: string | undefined) => !value || PHONE_REGEX.test(value), {
        message: VALIDATION_MESSAGES.INVALID_PHONE,
      }),
    [FORM_FIELDS.PHONE_COUNTRY_CODE]: z.string().min(1, VALIDATION_MESSAGES.REQUIRED),
    [FORM_FIELDS.COUNTRY]: z.string().trim().min(2, VALIDATION_MESSAGES.REQUIRED),
    [FORM_FIELDS.CURRENCY]: z.string().min(1, VALIDATION_MESSAGES.REQUIRED),
    [FORM_FIELDS.TIMEZONE]: z.string().min(1, VALIDATION_MESSAGES.REQUIRED),
    [FORM_FIELDS.LANGUAGE]: z.string().min(1, VALIDATION_MESSAGES.REQUIRED),
    [FORM_FIELDS.THEME]: z.enum(['system', 'light', 'dark'] as const),
    [FORM_FIELDS.PRIMARY_USE_CASE]: z.string().refine(isPrimaryUseCase, {
      message: 'Invalid primary use case',
    }),
    [FORM_FIELDS.PRIMARY_GOAL]: z.string().refine(isPrimaryGoal, {
      message: 'Invalid primary goal',
    }),
    [FORM_FIELDS.AI_FEATURES]: z.array(z.string()).optional(),
  });

interface UseOnboardingFormProps {
  onSuccess: () => void;
}

interface DetectedLocation {
  country?: string;
  currency?: string;
  timezone?: string;
  countryCode?: string;
}

type OnboardingStep = 1 | 2;

export const useOnboardingForm = ({ onSuccess }: UseOnboardingFormProps) => {
  const { t } = useTranslation('auth');
  const { state: authState, refreshAuth } = useAuth();
  const { showError } = useToast();
  const completeStep = useCompleteOnboardingStep();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detectedLocation, setDetectedLocation] = useState<DetectedLocation | null>(null);
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1);

  const schema = useMemo(() => createSchema(), []);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      [FORM_FIELDS.FULL_NAME]: '',
      [FORM_FIELDS.PHONE]: '',
      [FORM_FIELDS.PHONE_COUNTRY_CODE]: DEFAULTS.CURRENCY,
      [FORM_FIELDS.COUNTRY]: '',
      [FORM_FIELDS.CURRENCY]: DEFAULTS.CURRENCY,
      [FORM_FIELDS.TIMEZONE]: DEFAULTS.TIMEZONE,
      [FORM_FIELDS.LANGUAGE]: DEFAULTS.LANGUAGE,
      [FORM_FIELDS.THEME]: DEFAULTS.THEME as const,
      [FORM_FIELDS.PRIMARY_USE_CASE]: DEFAULTS.PRIMARY_USE_CASE,
      [FORM_FIELDS.PRIMARY_GOAL]: DEFAULTS.PRIMARY_GOAL,
      [FORM_FIELDS.AI_FEATURES]: [],
    },
    mode: 'onTouched',
  });

  const { setValue, watch, reset, handleSubmit } = form;

  // Detect user's location
  const detectAndSetLocation = useCallback(async () => {
    try {
      const location = (await autoDetectLocation()) as DetectedLocation | null;
      if (location) {
        setDetectedLocation(location);

        const currentValues = form.getValues();

        if (!currentValues[FORM_FIELDS.COUNTRY] && location.country) {
          setValue(FORM_FIELDS.COUNTRY, location.country, { shouldValidate: true });
        }

        if (location.currency) {
          setValue(FORM_FIELDS.CURRENCY, location.currency, { shouldValidate: true });
        }

        if (location.timezone) {
          setValue(FORM_FIELDS.TIMEZONE, location.timezone, { shouldValidate: true });
        }

        if (location.countryCode) {
          setValue(FORM_FIELDS.PHONE_COUNTRY_CODE, location.countryCode, { shouldValidate: true });
        }
      }
    } catch (error) {
      safeLog.warn('Failed to detect location', error);
    }
  }, [form, setValue]);

  // Initialize form with user data
  useEffect(() => {
    if (!authState.user) return;

    const { user } = authState;
    const personalizationPrefs = user.personalization_data;

    reset({
      [FORM_FIELDS.FULL_NAME]: user.full_name || '',
      [FORM_FIELDS.PHONE]: user.phone || '',
      [FORM_FIELDS.PHONE_COUNTRY_CODE]: detectedLocation?.countryCode || 'US',
      [FORM_FIELDS.COUNTRY]: user.country || user.location || '',
      [FORM_FIELDS.CURRENCY]: user.default_currency || DEFAULTS.CURRENCY,
      [FORM_FIELDS.TIMEZONE]: user.timezone || DEFAULTS.TIMEZONE,
      [FORM_FIELDS.LANGUAGE]: user.language || DEFAULTS.LANGUAGE,
      [FORM_FIELDS.THEME]: (user.theme as FormValues['theme']) || DEFAULTS.THEME,
      [FORM_FIELDS.PRIMARY_USE_CASE]:
        (personalizationPrefs?.primary_use_case as FormValues['primary_use_case']) ||
        DEFAULTS.PRIMARY_USE_CASE,
      [FORM_FIELDS.PRIMARY_GOAL]:
        (personalizationPrefs?.primary_goal as FormValues['primary_goal']) || DEFAULTS.PRIMARY_GOAL,
      [FORM_FIELDS.AI_FEATURES]: personalizationPrefs?.interested_ai_features || [],
    });
  }, [authState.user, detectedLocation, reset]);

  // Detect location on mount
  useEffect(() => {
    detectAndSetLocation();
  }, [detectAndSetLocation]);

  const handleStepOne = handleSubmit(async (data: FormValues) => {
    try {
      setIsSubmitting(true);

      await completeStep.mutateAsync({
        full_name: data[FORM_FIELDS.FULL_NAME],
        phone: data[FORM_FIELDS.PHONE],
        country: data[FORM_FIELDS.COUNTRY],
        default_currency: data[FORM_FIELDS.CURRENCY],
        timezone: data[FORM_FIELDS.TIMEZONE],
        language: data[FORM_FIELDS.LANGUAGE],
        theme: data[FORM_FIELDS.THEME],
        onboarding_step: 2,
      });

      await refreshAuth();
      onSuccess();
    } catch (error: any) {
      showError(
        t('flow.errors.setup.title'),
        error?.response?.data?.error || t('flow.errors.setup.default')
      );
    } finally {
      setIsSubmitting(false);
    }
  });

  const handleFinish = handleSubmit(async (data: FormValues) => {
    try {
      setIsSubmitting(true);

      const personalizationPayload = {
        primary_use_case: data[FORM_FIELDS.PRIMARY_USE_CASE],
        primary_goal: data[FORM_FIELDS.PRIMARY_GOAL],
        interested_ai_features: data[FORM_FIELDS.AI_FEATURES] || [],
        detected_location: detectedLocation || undefined,
      };

      await apiClient.updateUserPersonalization({
        personalization_data: personalizationPayload,
        has_completed_personalization: true,
        default_currency: data[FORM_FIELDS.CURRENCY],
        timezone: data[FORM_FIELDS.TIMEZONE],
        language: data[FORM_FIELDS.LANGUAGE],
        theme: data[FORM_FIELDS.THEME],
        country: data[FORM_FIELDS.COUNTRY],
        phone: data[FORM_FIELDS.PHONE],
        full_name: data[FORM_FIELDS.FULL_NAME],
      });

      await completeStep.mutateAsync({
        onboarding_step: 2,
        is_onboarded: true,
      });

      await refreshAuth();
      onSuccess();
    } catch (error: any) {
      showError(
        t('flow.errors.finish.title'),
        error?.response?.data?.error || t('flow.errors.finish.default')
      );
    } finally {
      setIsSubmitting(false);
    }
  });

  const toggleFeature = (featureId: string) => {
    const current = new Set(watch(FORM_FIELDS.AI_FEATURES) || []);
    if (current.has(featureId)) {
      current.delete(featureId);
    } else {
      current.add(featureId);
    }
    setValue(FORM_FIELDS.AI_FEATURES, Array.from(current));
  };

  // Update current step when auth state changes
  useEffect(() => {
    const serverStep = authState.user?.onboarding_step;
    if (typeof serverStep === 'number') {
      const normalized = Math.min(Math.max(serverStep, 1), 2) as OnboardingStep;
      setCurrentStep(normalized);
    }
  }, [authState.user?.onboarding_step]);

  return {
    form: form as UseFormReturn<FormValues>,
    isSubmitting,
    detectedLocation,
    toggleFeature,
    handleStepOne,
    handleFinish,
    steps: STEPS,
    currentStep,
    setCurrentStep,
    watch,
  } as const;
};

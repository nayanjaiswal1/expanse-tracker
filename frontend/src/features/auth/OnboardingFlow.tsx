import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { autoDetectLocation, DetectedLocation } from '../../utils/geoDetection';
import { useCompleteOnboardingStep } from '../../hooks/auth';
import { apiClient } from '../../api/client';
import { AddFirstAccount } from '../onboarding/AddFirstAccount';
import { GmailConnectionStep } from '../onboarding/GmailConnectionStep';
import type { PersonalizationData, UserPersonalization } from '../../types';
import Modal from '../../components/ui/Modal';
import { getCountryByName } from '../../utils/countries';
import { OnboardingHeader } from './components/OnboardingHeader';
import { ProfileForm } from './components/ProfileForm';
import { PersonalizeStep } from './components/PersonalizeStep';
import { useTranslation } from 'react-i18next';
import { safeLog } from '../../utils/logger';

const phoneRegex = /^[+]?[\d\s().-]{7,20}$/;

const setupSchema = (t: (key: string) => string) =>
  z.object({
    full_name: z
      .string()
      .trim()
      .min(1, t('flow.errors.fullName.required'))
      .max(100, t('flow.errors.fullName.maxLength')),
    phone: z
      .string()
      .trim()
      .optional()
      .refine((value) => !value || phoneRegex.test(value), {
        message: t('flow.errors.phone.invalid'),
      }),
    phoneCountryCode: z.string().min(1, t('flow.errors.phoneCountryCode.required')),
    country: z.string().trim().min(2, t('flow.errors.country.required')),
    default_currency: z.string().min(1, t('flow.errors.default_currency.required')),
    timezone: z.string().min(1, t('flow.errors.timezone.required')),
    language: z.string().min(1, t('flow.errors.language.required')),
    theme: z.enum(['system', 'light', 'dark']),
    primary_use_case: z.enum([
      'personal_expense_tracking',
      'business_finance_management',
      'freelance_income_expenses',
      'family_budget_management',
      'investment_portfolio_tracking',
      'just_exploring',
    ]),
    primary_goal: z.enum([
      'save_time',
      'better_organization',
      'track_cash_flow',
      'understand_spending_patterns',
      'tax_preparation',
      'pay_off_debt',
      'build_savings',
      'track_investments',
    ]),
    interested_ai_features: z.array(z.string()).optional(),
  });

type SetupFormValues = z.infer<ReturnType<typeof setupSchema>>;

const useCaseOptions = (t: (key: string) => string) =>
  [
    {
      value: 'personal_expense_tracking',
      icon: '💰',
      label: t('flow.useCases.personal_expense_tracking.label'),
    },
    {
      value: 'business_finance_management',
      icon: '💼',
      label: t('flow.useCases.business_finance_management.label'),
    },
    {
      value: 'freelance_income_expenses',
      icon: '🎨',
      label: t('flow.useCases.freelance_income_expenses.label'),
    },
    {
      value: 'family_budget_management',
      icon: '👥',
      label: t('flow.useCases.family_budget_management.label'),
    },
    {
      value: 'investment_portfolio_tracking',
      icon: '📈',
      label: t('flow.useCases.investment_portfolio_tracking.label'),
    },
    { value: 'just_exploring', icon: '🔍', label: t('flow.useCases.just_exploring.label') },
  ] as const;

const goalOptions = (t: (key: string) => string) =>
  [
    { value: 'save_time', icon: '⏱️', label: t('flow.goals.save_time.label') },
    { value: 'better_organization', icon: '🧾', label: t('flow.goals.better_organization.label') },
    { value: 'track_cash_flow', icon: '💸', label: t('flow.goals.track_cash_flow.label') },
    {
      value: 'understand_spending_patterns',
      icon: '📊',
      label: t('flow.goals.understand_spending_patterns.label'),
    },
    { value: 'tax_preparation', icon: '📑', label: t('flow.goals.tax_preparation.label') },
    { value: 'pay_off_debt', icon: '💳', label: t('flow.goals.pay_off_debt.label') },
    { value: 'build_savings', icon: '💎', label: t('flow.goals.build_savings.label') },
    { value: 'track_investments', icon: '📈', label: t('flow.goals.track_investments.label') },
  ] as const;

const aiFeatureOptions = (t: (key: string) => string) =>
  [
    {
      id: 'email_extraction',
      icon: '✉️',
      title: t('flow.aiFeatures.email_extraction.title'),
      description: t('flow.aiFeatures.email_extraction.description'),
    },
    {
      id: 'ai_categorization',
      icon: '🤖',
      title: t('flow.aiFeatures.ai_categorization.title'),
      description: t('flow.aiFeatures.ai_categorization.description'),
    },
    {
      id: 'smart_insights',
      icon: '📊',
      title: t('flow.aiFeatures.smart_insights.title'),
      description: t('flow.aiFeatures.smart_insights.description'),
    },
    {
      id: 'payment_reminders',
      icon: '🔔',
      title: t('flow.aiFeatures.payment_reminders.title'),
      description: t('flow.aiFeatures.payment_reminders.description'),
    },
  ] as const;

const steps = (t: (key: string) => string) =>
  [
    { id: 1, label: t('flow.steps.setup') },
    { id: 2, label: t('flow.steps.personalize') },
  ] as const;

const OnboardingFlow: React.FC = () => {
  const { t } = useTranslation('auth');
  const { state: authState, refreshAuth, updateUser, loadUserSections } = useAuth();
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();
  const completeStep = useCompleteOnboardingStep();

  // Use backend as single source of truth for onboarding step
  const initialStep = useMemo(() => {
    const serverStep = authState.user?.onboarding_step;
    if (typeof serverStep === 'number') {
      return Math.min(Math.max(serverStep, 1), 2);
    }
    return 1;
  }, [authState.user?.onboarding_step]);

  const [currentStep, setCurrentStep] = useState(initialStep);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detectedLocation, setDetectedLocation] = useState<DetectedLocation | null>(null);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showGmailModal, setShowGmailModal] = useState(false);
  const [hasAddedAccount, setHasAddedAccount] = useState(false);
  const [hasConnectedGmail, setHasConnectedGmail] = useState(false);
  const [personalization, setPersonalization] = useState<UserPersonalization | null>(
    authState.user?.personalization ?? null
  );

  // Detect user's location and update form fields
  const detectAndSetLocation = async () => {
    try {
      const location = await autoDetectLocation();
      if (location) {
        setDetectedLocation(location);

        // Only update form values if they haven't been set yet
        const currentValues = getValues();
        if (!currentValues.country && location.country) {
          setValue('country', location.country, { shouldValidate: true });
        }
        if (!currentValues.default_currency && location.currency) {
          setValue('default_currency', location.currency, { shouldValidate: true });
        }
        if (!currentValues.timezone && location.timezone) {
          setValue('timezone', location.timezone, { shouldValidate: true });
        }
      }
    } catch (error) {
      safeLog.warn('Failed to detect location', error);
    }
  };

  useEffect(() => {
    // Detect location when component mounts
    detectAndSetLocation();
  }, []);

  useEffect(() => {
    if (!authState.user || personalization) {
      return;
    }

    loadUserSections(['preferences', 'profile']).catch((error) => {
      safeLog.warn('Failed to load onboarding sections', error);
    });

    apiClient
      .getPersonalization()
      .then((data) => {
        setPersonalization(data);
        if (authState.user) {
          updateUser({
            ...authState.user,
            personalization: data,
            personalization_data: data.preferences as PersonalizationData,
            has_completed_personalization: data.questionnaire_completed,
            is_onboarded: data.is_onboarded,
            onboarding_step: data.onboarding_step,
          });
        }
      })
      .catch((error) => {
        safeLog.warn('Failed to load personalization data', error);
      });
  }, [authState.user, personalization, loadUserSections, updateUser]);

  // Use backend data as default values with fallback to detected location
  const defaultValues = useMemo<SetupFormValues>(() => {
    const personalizationPrefs =
      personalization?.preferences ?? authState.user?.personalization_data;

    // Use detected location as fallback if no user data is available
    const country = authState.user?.country ?? authState.user?.location ?? '';
    const defaultCurrency = authState.user?.default_currency ?? detectedLocation?.currency ?? 'USD';
    const defaultTimezone = authState.user?.timezone ?? detectedLocation?.timezone ?? 'UTC';

    return {
      full_name: authState.user?.full_name ?? '',
      phone: authState.user?.phone ?? '',
      phoneCountryCode: detectedLocation?.countryCode ?? 'US',
      country: country || detectedLocation?.country || '',
      default_currency: defaultCurrency,
      timezone: defaultTimezone,
      language: authState.user?.language ?? (navigator.language.split('-')[0] || 'en'),
      theme: (authState.user?.theme as SetupFormValues['theme']) ?? 'system',
      primary_use_case:
        (personalizationPrefs?.primary_use_case as SetupFormValues['primary_use_case']) ??
        'personal_expense_tracking',
      primary_goal:
        (personalizationPrefs?.primary_goal as SetupFormValues['primary_goal']) ?? 'save_time',
      interested_ai_features: personalizationPrefs?.interested_ai_features ?? [],
    };
  }, [authState.user, personalization]);

  const {
    register,
    watch,
    setValue,
    trigger,
    getValues,
    reset,
    formState: { errors },
  } = useForm<SetupFormValues>({
    resolver: zodResolver(setupSchema(t)),
    defaultValues,
    mode: 'onTouched',
  });

  useEffect(() => {
    if (!authState.user) return;

    const personalizationPrefs =
      personalization?.preferences ?? authState.user.personalization_data;
    reset({
      full_name: authState.user.full_name ?? '',
      phone: authState.user.phone ?? '',
      phoneCountryCode: 'US',
      country: authState.user.country ?? authState.user.location ?? '',
      default_currency: authState.user.default_currency ?? 'USD',
      timezone: authState.user.timezone ?? 'UTC',
      language: authState.user.language ?? 'en',
      theme: (authState.user.theme as SetupFormValues['theme']) ?? 'system',
      primary_use_case:
        (personalizationPrefs?.primary_use_case as SetupFormValues['primary_use_case']) ??
        'personal_expense_tracking',
      primary_goal:
        (personalizationPrefs?.primary_goal as SetupFormValues['primary_goal']) ?? 'save_time',
      interested_ai_features: personalizationPrefs?.interested_ai_features ?? [],
    });
  }, [authState.user, personalization, reset]);

  useEffect(() => {
    autoDetectLocation().then((location) => {
      if (!location) {
        return;
      }
      setDetectedLocation(location);

      const currentValues = getValues();

      // Auto-fill country if not already set
      if (!currentValues.country && location.country) {
        setValue('country', location.country);
      }

      // Auto-fill phone country code if not already set
      if (
        (!currentValues.phoneCountryCode || currentValues.phoneCountryCode === 'US') &&
        location.countryCode
      ) {
        setValue('phoneCountryCode', location.countryCode);
      }

      // Auto-fill currency if not already set
      if (!currentValues.default_currency || currentValues.default_currency === 'USD') {
        if (location.currency) {
          setValue('default_currency', location.currency);
        }
      }

      // Auto-fill timezone if not already set
      if (!currentValues.timezone || currentValues.timezone === 'UTC') {
        if (location.timezone) {
          setValue('timezone', location.timezone);
        }
      }
    });
  }, [authState.user, setValue, getValues]);

  // Sync current step with backend
  useEffect(() => {
    const serverStep = authState.user?.onboarding_step;
    if (typeof serverStep === 'number') {
      const normalized = Math.min(Math.max(serverStep, 1), 2);
      setCurrentStep(normalized);
    }
  }, [authState.user?.onboarding_step]);

  // Redirect to dashboard if onboarding is complete
  useEffect(() => {
    if (authState.user?.is_onboarded && authState.user?.has_completed_personalization) {
      navigate('/dashboard', { replace: true });
    }
  }, [authState.user?.has_completed_personalization, authState.user?.is_onboarded, navigate]);

  // Get account and gmail connection status from backend
  useEffect(() => {
    const prefs = personalization?.preferences ?? authState.user?.personalization_data;
    setHasAddedAccount(!!prefs?.has_added_first_account);
    setHasConnectedGmail(!!prefs?.has_connected_gmail);
  }, [authState.user, personalization]);

  const handleStepOne = async () => {
    const isValid = await trigger([
      'full_name',
      'phone',
      'phoneCountryCode',
      'country',
      'default_currency',
      'timezone',
      'language',
      'theme',
    ]);
    if (!isValid) {
      return;
    }

    const { full_name, phone, country, default_currency, timezone, language, theme } = getValues();

    try {
      setIsSubmitting(true);
      await completeStep.mutateAsync({
        full_name,
        phone,
        country,
        default_currency,
        timezone,
        language,
        theme,
        onboarding_step: 2,
      });
      await refreshAuth();
      setCurrentStep(2);
    } catch (error: any) {
      showError(
        t('flow.errors.setup.title'),
        error?.response?.data?.error || t('flow.errors.setup.default')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinish = async () => {
    const isValid = await trigger(['primary_use_case', 'primary_goal']);
    if (!isValid) {
      return;
    }

    const values = getValues();
    const personalizationPayload: PersonalizationData = {
      primary_use_case: values.primary_use_case,
      primary_goal: values.primary_goal,
      interested_ai_features: values.interested_ai_features || [],
      has_added_first_account: hasAddedAccount,
      has_connected_gmail: hasConnectedGmail,
      detected_location: detectedLocation || undefined,
    };

    try {
      setIsSubmitting(true);

      // Update personalization and related preferences
      const updatedUser = await apiClient.updateUserPersonalization({
        personalization_data: personalizationPayload,
        has_completed_personalization: true,
        default_currency: values.default_currency,
        timezone: values.timezone,
        language: values.language,
        theme: values.theme,
        country: values.country,
        phone: values.phone,
        full_name: values.full_name,
      });

      updateUser(updatedUser);

      // Mark onboarding as complete
      await completeStep.mutateAsync({
        onboarding_step: 2,
        is_onboarded: true,
      });

      // Refresh auth state to get the latest user data from backend
      await refreshAuth();

      showSuccess(t('flow.success.title'), t('flow.success.message'));
      navigate('/dashboard');
    } catch (error: any) {
      showError(
        t('flow.errors.finish.title'),
        error?.response?.data?.error || t('flow.errors.finish.default')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleFeature = (featureId: string) => {
    const current = new Set(getValues('interested_ai_features') || []);
    if (current.has(featureId)) {
      current.delete(featureId);
    } else {
      current.add(featureId);
    }
    setValue('interested_ai_features', Array.from(current));
  };

  const selectedUseCase = watch('primary_use_case');
  const selectedGoal = watch('primary_goal');
  const selectedTheme = watch('theme');
  const selectedFeatures = watch('interested_ai_features') || [];
  const selectedCountry = watch('country');
  const selectedLanguage = watch('language');

  const stepDefinitions = steps(t);

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="w-full max-w-3xl">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-md border border-gray-100 dark:border-gray-800 p-6 md:p-8 space-y-6">
              <OnboardingHeader
                selectedCountry={selectedCountry}
                selectedLanguage={selectedLanguage}
                selectedTheme={selectedTheme}
                onCountryChange={(country) => {
                  setValue('country', country);
                  const countryData = getCountryByName(country);
                  if (countryData) {
                    setValue('phoneCountryCode', countryData.code);
                  }
                }}
                onLanguageChange={(language) => setValue('language', language)}
                onThemeChange={(theme) => setValue('theme', theme)}
              />

              <ProfileForm register={register} errors={errors} />

              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleStepOne}
                  disabled={isSubmitting}
                  className="w-full md:w-auto"
                >
                  {isSubmitting ? t('common:form.submitting') : t('common:actions.continue')}
                </Button>
              </div>
            </div>
          </div>
        );

      case 2:
      default:
        return (
          <PersonalizeStep
            useCaseOptions={useCaseOptions(t)}
            goalOptions={goalOptions(t)}
            aiFeatureOptions={aiFeatureOptions(t)}
            selectedUseCase={selectedUseCase}
            selectedGoal={selectedGoal}
            selectedFeatures={selectedFeatures}
            hasAddedAccount={hasAddedAccount}
            hasConnectedGmail={hasConnectedGmail}
            isSubmitting={isSubmitting}
            onUseCaseSelect={(value) =>
              setValue('primary_use_case', value as PersonalizationData['primary_use_case'])
            }
            onGoalSelect={(value) =>
              setValue('primary_goal', value as PersonalizationData['primary_goal'])
            }
            onFeatureToggle={toggleFeature}
            onAddAccount={() => setShowAccountModal(true)}
            onConnectGmail={() => setShowGmailModal(true)}
            onBack={() => setCurrentStep(1)}
            onFinish={handleFinish}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex justify-center">
          <div className="flex items-center gap-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-full px-6 py-3 shadow-sm">
            {stepDefinitions.map((step, index) => (
              <div key={step.id} className="flex items-center gap-2">
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                    step.id === currentStep
                      ? 'bg-blue-600 text-white'
                      : step.id < currentStep
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-700/40 dark:text-blue-200'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                  }`}
                >
                  {step.id}
                </div>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                  {step.label}
                </span>
                {index < stepDefinitions.length - 1 && (
                  <div className="w-6 h-px bg-gray-200 dark:bg-gray-700" />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-center">{renderStep()}</div>
      </div>

      <Modal isOpen={showAccountModal} onClose={() => setShowAccountModal(false)} size="lg">
        <AddFirstAccount
          defaultCurrency={getValues('default_currency')}
          onAccountCreated={() => {
            setHasAddedAccount(true);
            setShowAccountModal(false);
          }}
          onSkip={() => setShowAccountModal(false)}
        />
      </Modal>

      <Modal isOpen={showGmailModal} onClose={() => setShowGmailModal(false)} size="lg">
        <GmailConnectionStep
          onConnected={() => {
            setHasConnectedGmail(true);
            setShowGmailModal(false);
          }}
          onSkip={() => setShowGmailModal(false)}
        />
      </Modal>
    </div>
  );
};

export default OnboardingFlow;

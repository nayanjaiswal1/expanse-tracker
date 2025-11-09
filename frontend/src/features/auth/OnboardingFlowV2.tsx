import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Modal } from '../../components/ui/Modal';
import { AddFirstAccount } from '../onboarding/AddFirstAccount';
import { GmailConnectionStep } from '../onboarding/GmailConnectionStep';
import { OnboardingHeader } from './components/OnboardingHeader';
import { ProfileForm } from './components/ProfileForm';
import { PersonalizeStep } from './components/PersonalizeStep';
import { useOnboardingForm } from './hooks/useOnboardingForm';
import { getCountryByName } from '../../utils/countries';
import { safeLog } from '../../utils/logger';

const OnboardingFlowV2: React.FC = () => {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const { state: authState } = useAuth();
  const { showSuccess } = useToast();

  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showGmailModal, setShowGmailModal] = useState(false);
  const [hasAddedAccount, setHasAddedAccount] = useState(false);
  const [hasConnectedGmail, setHasConnectedGmail] = useState(false);

  const {
    form,
    isSubmitting,
    detectedLocation,
    toggleFeature,
    handleStepOne,
    handleFinish,
    steps,
    currentStep,
    setCurrentStep,
    watch,
  } = useOnboardingForm({
    onSuccess: () => {
      showSuccess(t('flow.success.title'), t('flow.success.message'));
      navigate('/dashboard');
    },
  });

  const {
    register,
    setValue,
    formState: { errors },
  } = form;
  const selectedUseCase = watch('primary_use_case');
  const selectedGoal = watch('primary_goal');
  const selectedTheme = watch('theme');
  const selectedFeatures = watch('interested_ai_features') || [];
  const selectedCountry = watch('country');
  const selectedLanguage = watch('language');

  // Set initial account and Gmail connection status
  useEffect(() => {
    const prefs = authState.user?.personalization_data;
    setHasAddedAccount(!!prefs?.has_added_first_account);
    setHasConnectedGmail(!!prefs?.has_connected_gmail);
  }, [authState.user]);

  // Redirect to dashboard if onboarding is complete
  useEffect(() => {
    if (authState.user?.is_onboarded && authState.user?.has_completed_personalization) {
      navigate('/dashboard', { replace: true });
    }
  }, [authState.user, navigate]);

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
            onUseCaseSelect={(value) => setValue('primary_use_case', value)}
            onGoalSelect={(value) => setValue('primary_goal', value)}
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
            {steps.map((step) => (
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
                  {t(`flow.steps.${step.key}`)}
                </span>
                {step.id < steps.length && (
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
          defaultCurrency={watch('default_currency')}
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

// Helper functions for options
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
    {
      value: 'just_exploring',
      icon: '🔍',
      label: t('flow.useCases.just_exploring.label'),
    },
  ] as const;

const goalOptions = (t: (key: string) => string) =>
  [
    {
      value: 'save_time',
      icon: '⏱️',
      label: t('flow.goals.save_time.label'),
    },
    {
      value: 'better_organization',
      icon: '🧾',
      label: t('flow.goals.better_organization.label'),
    },
    {
      value: 'track_cash_flow',
      icon: '💸',
      label: t('flow.goals.track_cash_flow.label'),
    },
    {
      value: 'understand_spending_patterns',
      icon: '📊',
      label: t('flow.goals.understand_spending_patterns.label'),
    },
    {
      value: 'tax_preparation',
      icon: '📑',
      label: t('flow.goals.tax_preparation.label'),
    },
    {
      value: 'pay_off_debt',
      icon: '💳',
      label: t('flow.goals.pay_off_debt.label'),
    },
    {
      value: 'build_savings',
      icon: '💎',
      label: t('flow.goals.build_savings.label'),
    },
    {
      value: 'track_investments',
      icon: '📈',
      label: t('flow.goals.track_investments.label'),
    },
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

export default OnboardingFlowV2;

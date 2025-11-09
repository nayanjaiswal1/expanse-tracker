import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '../../../components/ui/Button';
import { UseCaseSelection } from './UseCaseSelection';
import { GoalSelection } from './GoalSelection';
import { AIFeaturesSelection } from './AIFeaturesSelection';
import { QuickStartActions } from './QuickStartActions';

interface UseCaseOption {
  value: string;
  icon: string;
  label: string;
}

interface GoalOption {
  value: string;
  icon: string;
  label: string;
}

interface AIFeature {
  id: string;
  icon: string;
  title: string;
  description: string;
}

interface PersonalizeStepProps {
  useCaseOptions: readonly UseCaseOption[];
  goalOptions: readonly GoalOption[];
  aiFeatureOptions: readonly AIFeature[];
  selectedUseCase: string;
  selectedGoal: string;
  selectedFeatures: string[];
  hasAddedAccount: boolean;
  hasConnectedGmail: boolean;
  isSubmitting: boolean;
  onUseCaseSelect: (value: string) => void;
  onGoalSelect: (value: string) => void;
  onFeatureToggle: (featureId: string) => void;
  onAddAccount: () => void;
  onConnectGmail: () => void;
  onBack: () => void;
  onFinish: () => void;
}

export const PersonalizeStep: React.FC<PersonalizeStepProps> = ({
  useCaseOptions,
  goalOptions,
  aiFeatureOptions,
  selectedUseCase,
  selectedGoal,
  selectedFeatures,
  hasAddedAccount,
  hasConnectedGmail,
  isSubmitting,
  onUseCaseSelect,
  onGoalSelect,
  onFeatureToggle,
  onAddAccount,
  onConnectGmail,
  onBack,
  onFinish,
}) => {
  return (
    <motion.div
      key="personalize-step"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="w-full max-w-3xl"
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-md border border-gray-100 dark:border-gray-800 p-6 md:p-7 space-y-6">
        {/* Header */}
        <header>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Personalize your experience
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Help us tailor the app to your needs
          </p>
        </header>

        {/* Use Case Section */}
        <UseCaseSelection
          options={useCaseOptions}
          selectedValue={selectedUseCase}
          onSelect={onUseCaseSelect}
        />

        {/* Goal Section */}
        <GoalSelection options={goalOptions} selectedValue={selectedGoal} onSelect={onGoalSelect} />

        {/* AI Features Section */}
        <AIFeaturesSelection
          features={aiFeatureOptions}
          selectedFeatures={selectedFeatures}
          onToggle={onFeatureToggle}
        />

        {/* Quick Actions Section */}
        <QuickStartActions
          hasAddedAccount={hasAddedAccount}
          hasConnectedGmail={hasConnectedGmail}
          onAddAccount={onAddAccount}
          onConnectGmail={onConnectGmail}
        />

        {/* Footer Buttons */}
        <div className="flex flex-col md:flex-row justify-between gap-2.5 pt-2">
          <Button
            variant="secondary"
            onClick={onBack}
            disabled={isSubmitting}
            className="w-full md:w-auto"
          >
            Back
          </Button>
          <Button
            onClick={onFinish}
            disabled={isSubmitting || !selectedUseCase || !selectedGoal}
            className="w-full md:w-auto"
          >
            {isSubmitting ? 'Finishing...' : 'Complete setup'}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

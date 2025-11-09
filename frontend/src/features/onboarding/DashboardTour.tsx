import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../components/ui/Button';

interface TourStep {
  title: string;
  description: string;
  icon: string;
  target?: string;
  highlight?: string;
}

const tourSteps: TourStep[] = [
  {
    title: 'Welcome to Your Dashboard!',
    description: 'This is your financial command center. Let us show you around!',
    icon: '🎉',
  },
  {
    title: 'View Your Accounts',
    description:
      'See all your accounts at a glance. Click on any account to view detailed transactions and balance history.',
    icon: '🏦',
    target: 'accounts-section',
  },
  {
    title: 'Add Transactions',
    description: 'Quickly add income or expenses manually. Or let our AI import them from emails!',
    icon: '➕',
    target: 'add-transaction-button',
  },
  {
    title: 'Track Your Spending',
    description:
      'View beautiful charts and insights about your spending patterns, categories, and trends.',
    icon: '📊',
    target: 'analytics-section',
  },
  {
    title: 'Gmail Sync Status',
    description:
      'If you connected Gmail, check the sync status here. New transactions appear automatically!',
    icon: '✉️',
    target: 'gmail-status',
  },
  {
    title: 'Settings & Preferences',
    description:
      'Customize your experience, manage integrations, and update your preferences anytime.',
    icon: '⚙️',
    target: 'settings-menu',
  },
  {
    title: "You're All Set!",
    description: 'Start exploring! Remember, you can access help anytime from the top menu.',
    icon: '🚀',
  },
];

interface DashboardTourProps {
  onComplete: () => void;
  onSkip: () => void;
}

export const DashboardTour: React.FC<DashboardTourProps> = ({ onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkipTour = () => {
    onSkip();
  };

  const step = tourSteps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === tourSteps.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -20 }}
          transition={{ duration: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="text-5xl text-center mb-3"
            >
              {step.icon}
            </motion.div>
            <h2 className="text-2xl font-bold text-center">{step.title}</h2>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-gray-700 dark:text-gray-300 text-center mb-6 leading-relaxed">
              {step.description}
            </p>

            {/* Progress Dots */}
            <div className="flex justify-center gap-2 mb-6">
              {tourSteps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  className={`
                    h-2 rounded-full transition-all duration-300
                    ${
                      index === currentStep
                        ? 'w-8 bg-blue-500'
                        : index < currentStep
                          ? 'w-2 bg-blue-300'
                          : 'w-2 bg-gray-300 dark:bg-gray-600'
                    }
                  `}
                  aria-label={`Go to step ${index + 1}`}
                />
              ))}
            </div>

            <div className="text-center text-sm text-gray-500 dark:text-gray-400 mb-6">
              Step {currentStep + 1} of {tourSteps.length}
            </div>

            {/* Navigation Buttons */}
            <div className="flex gap-3">
              {!isFirstStep && (
                <Button variant="secondary" onClick={handlePrevious} className="flex-1">
                  Previous
                </Button>
              )}

              <Button variant="primary" onClick={handleNext} className="flex-1">
                {isLastStep ? 'Get Started' : 'Next'}
              </Button>
            </div>

            {/* Skip Button */}
            {!isLastStep && (
              <Button
                onClick={handleSkipTour}
                variant="ghost-inline"
                size="none"
                className="mt-4 w-full text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                Skip Tour
              </Button>
            )}
          </div>

          {/* Feature Highlights for specific steps */}
          {currentStep === 1 && (
            <div className="px-6 pb-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  💡 <strong>Tip:</strong> Click on any account to see transactions, balance
                  history, and detailed analytics!
                </p>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="px-6 pb-6">
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <p className="text-sm text-green-800 dark:text-green-200">
                  ✨ <strong>Pro Tip:</strong> New transactions from emails appear here
                  automatically - no manual entry needed!
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default DashboardTour;

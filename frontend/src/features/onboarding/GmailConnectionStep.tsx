import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '../../components/ui/Button';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '../../components/ui/Toast';
import { apiClient } from '../../api/client';

interface GmailConnectionStepProps {
  onConnected: () => void;
  onSkip: () => void;
}

const quickFacts = [
  { icon: '📬', text: 'We only read finance emails (banks, cards, wallets).' },
  { icon: '🔒', text: 'No personal conversations, ever.' },
  { icon: '⏱️', text: 'Imports usually start within a few minutes.' },
];

const miniBenefits = [
  { icon: '⚡', title: 'Auto-import', caption: 'Bank alerts become transactions automatically.' },
  {
    icon: '💸',
    title: 'Real-time balances',
    caption: 'Keep accounts up to date without manual entry.',
  },
  { icon: '🔔', title: 'Smart reminders', caption: 'We nudge you before bills or renewals hit.' },
];

export const GmailConnectionStep: React.FC<GmailConnectionStepProps> = ({
  onConnected,
  onSkip,
}) => {
  const { showSuccess, showError, showInfo } = useToast();

  const connectGmailMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.connectGmail();
      return response;
    },
    onSuccess: (data) => {
      onConnected();
      if (data.authorization_url) {
        showInfo('Redirecting…', 'Opening Google to finish the connection.');
        window.location.href = data.authorization_url;
      } else {
        showSuccess('Gmail connected', 'We’ll start syncing financial emails right away.');
      }
    },
    onError: (error: any) => {
      showError('Gmail connection failed', error?.response?.data?.error || 'Please try again.');
    },
  });

  const handleConnect = () => {
    connectGmailMutation.mutate();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <header className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/40 mb-3">
          <svg
            className="w-6 h-6 text-red-600 dark:text-red-400"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L12 9.545l8.073-6.052C21.69 2.28 24 3.434 24 5.457z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Connect Gmail</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Auto-import transactions from financial emails
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {miniBenefits.map((benefit) => (
          <div
            key={benefit.title}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 p-3"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
              <span>{benefit.icon}</span>
              {benefit.title}
            </div>
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{benefit.caption}</p>
          </div>
        ))}
      </section>

      <div className="rounded-lg border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-900/20 p-3">
        <div className="flex items-start gap-2">
          <span className="text-lg">🔒</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">Privacy first</p>
            <ul className="mt-1.5 space-y-1 text-xs text-blue-800 dark:text-blue-200">
              {quickFacts.map((fact) => (
                <li key={fact.text} className="flex items-start gap-1.5">
                  <span>{fact.icon}</span>
                  <span>{fact.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <Button type="button" variant="outline-neutral-lg" onClick={onSkip} className="flex-1">
          Skip
        </Button>
        <Button
          type="button"
          variant="primary-elevated-lg"
          onClick={handleConnect}
          disabled={connectGmailMutation.isPending}
          className="flex-1"
        >
          {connectGmailMutation.isPending ? 'Connecting…' : 'Connect Gmail'}
        </Button>
      </div>
    </motion.div>
  );
};

export default GmailConnectionStep;

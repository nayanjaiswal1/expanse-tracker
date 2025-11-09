import React from 'react';
import AutomationRules from './AutomationRules';
import MerchantPatterns from '../finance/MerchantPatterns';
import { Zap, Target, ShoppingBag, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SettingsLayout, SettingsSection, HelperText } from './components';

const AutomationSettings: React.FC = () => {
  const { t } = useTranslation('settings');

  return (
    <SettingsLayout
      title={t('automation.title')}
      description={t('automation.description')}
      maxWidth="5xl"
    >
      {/* Transaction Processing Rules Section */}
      <SettingsSection delay={0.1}>
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 p-2 text-purple-600 dark:bg-purple-900/60 dark:text-purple-300">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('automation.sections.transactionAutomations.title')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('automation.sections.transactionAutomations.description')}
              </p>
            </div>
          </div>
          <div className="hidden text-sm text-gray-500 dark:text-gray-400 sm:flex sm:items-center sm:gap-2">
            <Target className="h-4 w-4" />
            <HelperText>{t('automation.sections.transactionAutomations.badge')}</HelperText>
          </div>
        </div>

        <AutomationRules />
      </SettingsSection>

      {/* Merchant Categorization Patterns Section */}
      <SettingsSection delay={0.2}>
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-600 dark:bg-emerald-900/60 dark:text-emerald-300">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('automation.sections.merchantPatterns.title')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('automation.sections.merchantPatterns.description')}
              </p>
            </div>
          </div>
          <div className="hidden text-sm text-gray-500 dark:text-gray-400 sm:flex sm:items-center sm:gap-2">
            <Settings className="h-4 w-4" />
            <HelperText>{t('automation.sections.merchantPatterns.badge')}</HelperText>
          </div>
        </div>

        <MerchantPatterns />
      </SettingsSection>
    </SettingsLayout>
  );
};

export default AutomationSettings;

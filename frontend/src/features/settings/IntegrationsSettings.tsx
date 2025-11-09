import React from 'react';
import GmailAccounts from '../finance/GmailAccounts';
import SplitwiseIntegration from './SplitwiseIntegration';
import { Mail, Puzzle, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  SettingsLayout,
  SettingsSection,
  SettingsSectionHeader,
  SettingsGrid,
  SettingsCard,
  SettingsBadge,
} from './components';

const IntegrationsSettings: React.FC = () => {
  const { t } = useTranslation('settings');

  const upcomingIntegrations = [
    { name: t('integrations.upcomingIntegrations.bankAPIs'), icon: '🏦' },
    { name: t('integrations.upcomingIntegrations.slack'), icon: '💬' },
    { name: t('integrations.upcomingIntegrations.telegram'), icon: '📱' },
    { name: t('integrations.upcomingIntegrations.webhooks'), icon: '🔗' },
    { name: t('integrations.upcomingIntegrations.csvImport'), icon: '📊' },
    { name: t('integrations.upcomingIntegrations.apiAccess'), icon: '🔌' },
  ];

  return (
    <SettingsLayout title={t('integrations.title')} description={t('integrations.description')}>
      {/* Gmail Integration */}
      <SettingsSection delay={0.1}>
        <SettingsSectionHeader
          icon={Mail}
          iconColor="red"
          title={t('integrations.sections.gmail.title')}
          description={t('integrations.sections.gmail.description')}
        />
        <GmailAccounts />
      </SettingsSection>

      {/* Splitwise Integration */}
      <SettingsSection delay={0.2}>
        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-gradient-to-r from-teal-400 to-cyan-500 rounded-lg p-2">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('integrations.sections.splitwise.title')}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {t('integrations.sections.splitwise.description')}
            </p>
          </div>
        </div>
        <SplitwiseIntegration />
      </SettingsSection>

      {/* Coming Soon */}
      <SettingsSection delay={0.3}>
        <SettingsSectionHeader
          icon={Puzzle}
          iconColor="blue"
          title={t('integrations.sections.comingSoon.title')}
          description={t('integrations.sections.comingSoon.description')}
        />

        <SettingsGrid cols={3} gap="sm">
          {upcomingIntegrations.map((integration) => (
            <SettingsCard key={integration.name} title={integration.name} variant="outlined">
              <div className="flex flex-col items-center justify-center py-2">
                <div className="text-3xl mb-2">{integration.icon}</div>
                <SettingsBadge variant="default" size="sm">
                  {t('integrations.sections.comingSoon.badge')}
                </SettingsBadge>
              </div>
            </SettingsCard>
          ))}
        </SettingsGrid>
      </SettingsSection>
    </SettingsLayout>
  );
};

export default IntegrationsSettings;

import { useLocation } from 'react-router-dom';
import ProfileSettings from './ProfileSettings';
import PreferencesSettings from './PreferencesSettings';
import AutomationSettings from './AutomationSettings';
import IntegrationsSettings from './IntegrationsSettings';
import DataSettings from './DataSettings';
import AISettings from '../ai/AISettings';
import TelegramIntegration from './TelegramIntegration';
import PlanCustomization from '../../pages/PlanCustomization';
import RecurringInvestments from '../finance/RecurringInvestments';
import { SubscriptionPlans } from '../../pages/SubscriptionPlans';
import { useAuth } from '../../contexts/AuthContext';

export const Settings = () => {
  const location = useLocation();
  const { state: authState } = useAuth();
  const isAdmin = authState.user?.is_staff || authState.user?.is_superuser;

  const renderSettingsOverview = () => (
    <div>
      <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">All Settings</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Profile</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
            Manage your personal information, profile picture, and security settings.
          </p>
          <a href="/settings/profile" className="text-blue-600 dark:text-blue-400 hover:underline">
            Configure →
          </a>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Preferences</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
            Customize your app experience, theme, language, and notification settings.
          </p>
          <a
            href="/settings/preferences"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Configure →
          </a>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Integrations</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
            Connect external services and manage your third-party integrations.
          </p>
          <a
            href="/settings/integrations"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Configure →
          </a>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Data & Privacy
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
            Control your data export, privacy settings, and account deletion.
          </p>
          <a href="/settings/data" className="text-blue-600 dark:text-blue-400 hover:underline">
            Configure →
          </a>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">AI Settings</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
            Configure AI services, API keys, and intelligent features.
          </p>
          <a
            href="/settings/ai-settings"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Configure →
          </a>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Automation</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
            Set up automated rules and workflows for your financial data.
          </p>
          <a
            href="/settings/automation"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Configure →
          </a>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    const path = location.pathname;

    if (path.endsWith('/profile')) return <ProfileSettings />;
    if (path.endsWith('/appearance')) return <ProfileSettings />; // Appearance opens Profile page
    if (path.endsWith('/security')) return <ProfileSettings />; // Security is now part of Profile page
    if (path.endsWith('/preferences')) return <PreferencesSettings />;
    if (path.endsWith('/notifications')) return <PreferencesSettings />; // Notifications moved to Preferences
    if (path.endsWith('/all')) return renderSettingsOverview(); // All configuration overview
    if (path.endsWith('/ai-settings')) return <AISettings />;
    if (path.endsWith('/subscriptions')) return <SubscriptionPlans />;
    if (path.endsWith('/plan-customization')) return <PlanCustomization />;
    if (path.endsWith('/recurring-investments')) return <RecurringInvestments />;
    if (path.endsWith('/automation')) return <AutomationSettings />;
    if (path.endsWith('/integrations')) return <IntegrationsSettings />;
    if (path.endsWith('/data')) return <DataSettings />;
    if (path.endsWith('/telegram-admin') && isAdmin) return <TelegramIntegration />;

    return <ProfileSettings />;
  };

  return <div>{renderContent()}</div>;
};

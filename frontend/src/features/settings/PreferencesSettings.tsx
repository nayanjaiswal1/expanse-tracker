import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../components/ui/Toast';
import { apiClient } from '../../api/client';
import { useObjectForm } from '../../hooks/useObjectForm';
import { FormField } from '../../components/forms/FormField';
import { createPreferencesFormConfig } from './forms';
import { PreferencesFormData } from './schemas/forms';
import { Globe, Bell, Clock, Coins, Mail, Paintbrush } from 'lucide-react';
import { useCurrency } from '../finance/hooks/queries/useCurrency';
import { useTranslation } from 'react-i18next';
import {
  SettingsLayout,
  SettingsSection,
  SettingsSectionHeader,
  SettingsSubsection,
  SettingsGrid,
  SettingsActionButton,
  ThemeSelector,
  FormLabel,
  HelperText,
} from './components';

const PreferencesSettings: React.FC = () => {
  const { t } = useTranslation('settings');
  const { state: authState, updateUser } = useAuth();
  const { setTheme } = useTheme();
  const { showSuccess, showError } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const { currencies } = useCurrency();

  const handlePreferencesUpdate = async (data: PreferencesFormData) => {
    setIsLoading(true);

    try {
      const updatedUser = await apiClient.updateUserPreferences(data);
      updateUser(updatedUser);

      // Update theme context if theme was changed
      if (data.theme) {
        setTheme(data.theme);
      }

      showSuccess('Preferences Updated', 'Your preferences have been saved successfully.');
    } catch (error) {
      console.error('Preferences update failed:', error);
      const apiMessage = (error as { response?: { data?: { error?: string; detail?: string } } })
        ?.response?.data;
      const message =
        apiMessage?.error ||
        apiMessage?.detail ||
        (error instanceof Error ? error.message : undefined) ||
        'Unable to update your preferences. Please try again.';
      showError('Update Failed', message);
    } finally {
      setIsLoading(false);
    }
  };

  const formConfig = createPreferencesFormConfig(
    handlePreferencesUpdate,
    isLoading,
    {
      preferred_currency: authState.user?.preferred_currency || 'USD',
      preferred_date_format: (authState.user?.preferred_date_format ??
        'YYYY-MM-DD') as PreferencesFormData['preferred_date_format'],
      timezone: authState.user?.timezone || 'America/New_York',
      language: (authState.user?.language ?? 'en') as PreferencesFormData['language'],
      theme: (authState.user?.theme ?? 'system') as PreferencesFormData['theme'],
      notifications_enabled: authState.user?.notifications_enabled ?? true,
      email_notifications: authState.user?.email_notifications ?? true,
      push_notifications: authState.user?.push_notifications ?? false,
    },
    currencies
  );

  const { form, submit, isFieldVisible } = useObjectForm(formConfig);
  const { control } = form;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submit();
  };

  const getFieldsBySection = () => {
    const regionalFields = ['preferred_currency', 'preferred_date_format', 'timezone', 'language'];
    const appearanceFields = ['theme'];
    const notificationFields = [
      'notifications_enabled',
      'email_notifications',
      'push_notifications',
    ];

    return {
      regional: formConfig.fields.filter((field) => regionalFields.includes(field.name)),
      appearance: formConfig.fields.filter((field) => appearanceFields.includes(field.name)),
      notifications: formConfig.fields.filter((field) => notificationFields.includes(field.name)),
    };
  };

  const fieldsBySection = getFieldsBySection();

  return (
    <SettingsLayout title={t('preferences.title')} description={t('preferences.description')}>
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Regional Settings Section */}
        <SettingsSection delay={0.1}>
          <SettingsSectionHeader
            icon={Globe}
            iconColor="blue"
            title={t('preferences.sections.regional.title')}
            description={t('preferences.sections.regional.description')}
          />

          <div className="space-y-8">
            <SettingsSubsection
              icon={Coins}
              title={t('preferences.sections.regional.subsections.currencyFormatting.title')}
            >
              <SettingsGrid cols={2} gap="md">
                {fieldsBySection.regional
                  .filter((field) =>
                    ['preferred_currency', 'preferred_date_format'].includes(field.name)
                  )
                  .filter((field) => isFieldVisible(field))
                  .map((fieldConfig) => (
                    <FormField
                      key={fieldConfig.name}
                      name={fieldConfig.name as any}
                      control={control}
                      error={
                        form.getFieldState(fieldConfig.name as keyof PreferencesFormData).error
                      }
                      config={fieldConfig}
                      disabled={isLoading}
                    />
                  ))}
              </SettingsGrid>
            </SettingsSubsection>

            <SettingsSubsection
              icon={Clock}
              title={t('preferences.sections.regional.subsections.timeLanguage.title')}
            >
              <SettingsGrid cols={2} gap="md">
                {fieldsBySection.regional
                  .filter((field) => ['timezone', 'language'].includes(field.name))
                  .filter((field) => isFieldVisible(field))
                  .map((fieldConfig) => (
                    <FormField
                      key={fieldConfig.name}
                      name={fieldConfig.name as any}
                      control={control}
                      error={
                        form.getFieldState(fieldConfig.name as keyof PreferencesFormData).error
                      }
                      config={fieldConfig}
                      disabled={isLoading}
                    />
                  ))}
              </SettingsGrid>
            </SettingsSubsection>
          </div>
        </SettingsSection>

        {/* Appearance Section */}
        <SettingsSection delay={0.2}>
          <SettingsSectionHeader
            icon={Paintbrush}
            iconColor="purple"
            title={t('preferences.sections.display.title')}
            description={t('preferences.sections.display.description')}
          />

          <div>
            <FormLabel htmlFor="theme">Theme Preference</FormLabel>
            <HelperText className="mt-1 mb-3">Choose your preferred color scheme</HelperText>
            <ThemeSelector
              value={form.watch('theme') || 'system'}
              onChange={(value) => form.setValue('theme', value)}
              disabled={isLoading}
            />
          </div>
        </SettingsSection>

        {/* Notifications Section */}
        <SettingsSection delay={0.3} compact>
          <SettingsSectionHeader
            icon={Bell}
            iconColor="green"
            title={t('preferences.sections.notifications.title')}
            description={t('preferences.sections.notifications.description')}
          />

          <SettingsSubsection
            icon={Mail}
            title={t('preferences.sections.notifications.subsections.emailPush.title')}
          >
            <div className="space-y-4">
              {fieldsBySection.notifications
                .filter((field) => isFieldVisible(field))
                .map((fieldConfig) => (
                  <FormField
                    key={fieldConfig.name}
                    name={fieldConfig.name as any}
                    control={control}
                    error={form.getFieldState(fieldConfig.name as keyof PreferencesFormData).error}
                    config={fieldConfig}
                    disabled={isLoading}
                  />
                ))}
            </div>
          </SettingsSubsection>
        </SettingsSection>

        {/* Form Actions */}
        <div className="flex justify-end">
          <SettingsActionButton type="submit" variant="primary" loading={isLoading}>
            {t('preferences.actions.savePreferences')}
          </SettingsActionButton>
        </div>
      </form>
    </SettingsLayout>
  );
};

export default PreferencesSettings;

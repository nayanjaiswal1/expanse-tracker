import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { apiClient } from '../../api/client';
import { Bell } from 'lucide-react';
import { Checkbox } from '../../components/ui/Checkbox';
import {
  SettingsLayout,
  SettingsSection,
  SettingsSectionHeader,
  SettingsActionButton,
  BodyText,
} from './components';

const NotificationsSettings: React.FC = () => {
  const { state: authState, updateUser } = useAuth();
  const { showSuccess, showError } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const [profileData, setProfileData] = useState({
    notifications_enabled: authState.user?.notifications_enabled ?? true,
  });

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const updatedUser = await apiClient.updateUserPreferences(profileData);
      updateUser(updatedUser);
      showSuccess(
        'Notification Settings Updated',
        'Your notification preferences have been saved successfully.'
      );
    } catch (error) {
      console.error('Notification settings update failed:', error);
      showError('Update Failed', 'Unable to update your notification settings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SettingsLayout
      title="Notification Preferences"
      description="Manage how and when you receive notifications"
    >
      <form onSubmit={handleProfileUpdate} className="space-y-8">
        <SettingsSection delay={0.1}>
          <SettingsSectionHeader
            icon={Bell}
            iconColor="green"
            title="Email Notifications"
            description="Control email notification preferences for your account"
          />

          <div className="space-y-4">
            <Checkbox
              label="Enable Email Notifications"
              checked={profileData.notifications_enabled}
              onChange={(e) =>
                setProfileData((prev) => ({ ...prev, notifications_enabled: e.target.checked }))
              }
            />

            <BodyText className="ml-9">
              Receive notifications about account activity, transaction updates, and important
              alerts directly to your email.
            </BodyText>
          </div>
        </SettingsSection>

        <div className="flex justify-end">
          <SettingsActionButton type="submit" variant="primary" loading={isLoading}>
            Save Changes
          </SettingsActionButton>
        </div>
      </form>
    </SettingsLayout>
  );
};

export default NotificationsSettings;

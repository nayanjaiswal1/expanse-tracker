import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../api';
import { Camera, Lock, Shield, Edit3 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { ObjectForm } from '../../components/forms';
import { createProfileFormConfig, createPasswordChangeFormConfig } from './forms';
import { ProfileFormData } from './schemas/forms';
import { useToast } from '../../components/ui/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import ProfilePhotoUpload from '../../components/profile/ProfilePhotoUpload';
import {
  SettingsLayout,
  SettingsSection,
  SettingsSectionHeader,
  SmallHeading,
  BodyText,
  SettingsBadge,
} from './components';
import { useTranslation } from 'react-i18next';
import { safeLog } from '../../utils/logger';
import { FlexBetween, HStack } from '../../components/ui/Layout';

const ProfileSettings: React.FC = () => {
  const { t } = useTranslation('settings');
  const { state: authState, updateUser, loadUserSections } = useAuth();
  const { showSuccess, showError } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    if (authState.user) {
      loadUserSections(['profile']).catch((err) => {
        safeLog.warn('Failed to load profile section', err);
      });
    }
  }, [authState.user, loadUserSections]);

  const handleProfileUpdate = async (data: ProfileFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const { email: _ignoredEmail, ...profileData } = data;
      const updatedUser = await apiClient.updateUserProfile(profileData);
      updateUser(updatedUser);
      showSuccess('Profile Updated', 'Your profile information has been saved successfully.');
    } catch (err: any) {
      console.error('Profile update failed:', err);
      const errorMessage =
        err.message ||
        err.response?.data?.detail ||
        'Unable to update your profile. Please try again.';
      setError(errorMessage);
      showError('Update Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfilePhotoUpdate = (photoData: {
    profile_photo_url?: string;
    profile_photo_thumbnail_url?: string;
    has_custom_photo: boolean;
  }) => {
    // Update the user state with new photo URLs
    updateUser({
      ...authState.user!,
      profile_photo_url: photoData.profile_photo_url,
      profile_photo_thumbnail_url: photoData.profile_photo_thumbnail_url,
      has_custom_photo: photoData.has_custom_photo,
      profile: {
        ...(authState.user?.profile ?? {}),
        profile_photo_url: photoData.profile_photo_url,
        profile_photo_thumbnail_url: photoData.profile_photo_thumbnail_url,
      },
    });
  };

  const handlePasswordChange = async (data: {
    current_password: string;
    new_password: string;
    confirm_password: string;
  }) => {
    setPasswordLoading(true);

    try {
      await apiClient.changePassword({
        current_password: data.current_password,
        new_password: data.new_password,
      });

      showSuccess('Password changed successfully!');
      setShowPasswordChange(false);
    } catch (error: any) {
      console.error('Password change failed:', error);
      showError(
        error.message || 'Unable to change your password. Please check your current password.'
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <SettingsLayout title={t('profile.title')} description={t('profile.description')}>
      {/* Error Alert */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6"
          >
            <Alert variant="error" title="Error" dismissible onDismiss={() => setError(null)}>
              {error}
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Profile Picture Section */}
      <SettingsSection delay={0.1}>
        <SettingsSectionHeader
          icon={Camera}
          iconColor="blue"
          title={t('profile.sections.picture.title')}
          description={t('profile.sections.picture.description')}
        />

        <ProfilePhotoUpload
          currentPhotoUrl={authState.user?.profile_photo_url}
          currentThumbnailUrl={authState.user?.profile_photo_thumbnail_url}
          hasCustomPhoto={authState.user?.has_custom_photo || false}
          onPhotoUpdated={handleProfilePhotoUpdate}
          onError={(error) => {
            setError(error);
            showError('Photo Upload Error', error);
          }}
        />
      </SettingsSection>

      {/* Profile Information Section */}
      <SettingsSection delay={0.2}>
        <SettingsSectionHeader
          icon={Edit3}
          iconColor="blue"
          title={t('profile.sections.personalInfo.title')}
          description={t('profile.sections.personalInfo.description')}
        />

        <ObjectForm
          config={createProfileFormConfig(handleProfileUpdate, isLoading, {
            full_name: authState.user?.full_name || '',
            email: authState.user?.email || '',
          })}
        />
      </SettingsSection>

      {/* Security Section */}
      <SettingsSection delay={0.3}>
        <SettingsSectionHeader
          icon={Shield}
          iconColor="green"
          title={t('profile.sections.security.title')}
          description={t('profile.sections.security.description')}
        />

        <div className="space-y-6">
          {/* Password Section */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <FlexBetween className="mb-4">
              <HStack gap={3}>
                <Lock className="h-5 w-5 text-gray-400" />
                <div>
                  <SmallHeading>{t('profile.sections.security.password.title')}</SmallHeading>
                  <BodyText>{t('profile.sections.security.password.description')}</BodyText>
                </div>
              </HStack>
              <Button
                onClick={() => setShowPasswordChange(!showPasswordChange)}
                variant={showPasswordChange ? 'ghost' : 'primary'}
                size="sm"
                className="min-w-[120px] h-10"
              >
                {showPasswordChange
                  ? t('profile.sections.security.password.cancelButton')
                  : t('profile.sections.security.password.changeButton')}
              </Button>
            </FlexBetween>

            <AnimatePresence>
              {showPasswordChange && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4"
                >
                  <ObjectForm
                    config={createPasswordChangeFormConfig(handlePasswordChange, passwordLoading)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Two-Factor Authentication */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <FlexBetween>
              <HStack gap={3}>
                <Shield className="h-5 w-5 text-gray-400" />
                <div>
                  <SmallHeading>{t('profile.sections.security.twoFactor.title')}</SmallHeading>
                  <BodyText>{t('profile.sections.security.twoFactor.description')}</BodyText>
                </div>
              </HStack>
              <SettingsBadge variant="default">
                {t('profile.sections.security.twoFactor.comingSoon')}
              </SettingsBadge>
            </FlexBetween>
          </div>
        </div>
      </SettingsSection>
    </SettingsLayout>
  );
};

export default ProfileSettings;

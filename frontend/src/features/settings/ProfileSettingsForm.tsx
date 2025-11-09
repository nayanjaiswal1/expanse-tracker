import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../api/client';
import { User, Camera } from 'lucide-react';
import { ObjectForm } from '../../components/forms';
import { createProfileFormConfig } from './forms';
import { ProfileFormData } from './schemas/forms';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';

const ProfileSettingsForm: React.FC = () => {
  const { state: authState, updateUser } = useAuth();
  const { showSuccess, showError } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [profilePictureLoading, setProfilePictureLoading] = useState(false);

  const handleProfileUpdate = async (data: ProfileFormData) => {
    setIsLoading(true);

    try {
      const { email: _ignoredEmail, ...profileData } = data;
      const updatedUser = await apiClient.updateUserProfile(profileData);
      updateUser(updatedUser);
      showSuccess('Profile updated successfully!');
    } catch (err: any) {
      showError(err.message || 'Unable to update your profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfilePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showError('Profile picture must be smaller than 5MB.');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showError('Please upload an image file.');
      return;
    }

    setProfilePictureLoading(true);

    try {
      const formData = new FormData();
      formData.append('profile_picture', file);

      const photoData = await apiClient.uploadProfilePhoto(formData);
      updateUser({
        ...authState.user!,
        ...photoData,
        profile: {
          ...(authState.user?.profile ?? {}),
          profile_photo_url: photoData.profile_photo_url,
          profile_photo_thumbnail_url: photoData.profile_photo_thumbnail_url,
        },
      });
      showSuccess('Profile picture updated successfully!');
    } catch (err: any) {
      showError(err.message || 'Unable to update profile picture. Please try again.');
    } finally {
      setProfilePictureLoading(false);
    }
  };

  const profileConfig = createProfileFormConfig(handleProfileUpdate, isLoading, {
    full_name: authState.user?.full_name || '',
    email: authState.user?.email || '',
    phone: authState.user?.phone || '',
    bio: authState.user?.bio || '',
    website: authState.user?.website || '',
    location: authState.user?.location || '',
  });

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Profile Picture Section */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="flex items-center space-x-6">
          <div className="relative">
            <div className="w-24 h-24 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center overflow-hidden">
              {authState.user?.profile_picture ? (
                <img
                  src={authState.user.profile_picture}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-12 h-12 text-gray-500 dark:text-gray-400" />
              )}
            </div>
            {profilePictureLoading && (
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
              </div>
            )}
          </div>

          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Profile Picture</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Upload a photo to personalize your account.
            </p>
            <div className="mt-3">
              <label htmlFor="profile-picture-upload" className="inline-flex">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="cursor-pointer"
                  disabled={profilePictureLoading}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  {authState.user?.profile_picture ? 'Change Photo' : 'Upload Photo'}
                </Button>
              </label>
              <input
                id="profile-picture-upload"
                type="file"
                accept="image/*"
                onChange={handleProfilePictureUpload}
                className="hidden"
                disabled={profilePictureLoading}
              />
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              JPG, PNG or GIF. Max file size 5MB.
            </p>
          </div>
        </div>
      </div>

      {/* Profile Information Form */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <ObjectForm config={profileConfig} />
      </div>

      {/* Account Information */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Account Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Account ID:</span>
            <span className="ml-2 text-gray-900 dark:text-white">{authState.user?.id}</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Member Since:</span>
            <span className="ml-2 text-gray-900 dark:text-white">
              {authState.user?.date_joined
                ? new Date(authState.user.date_joined).toLocaleDateString()
                : 'Unknown'}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Last Login:</span>
            <span className="ml-2 text-gray-900 dark:text-white">
              {authState.user?.last_login
                ? new Date(authState.user.last_login).toLocaleDateString()
                : 'Unknown'}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Account Status:</span>
            <span className="ml-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                Active
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettingsForm;

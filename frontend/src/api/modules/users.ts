import type {
  PersonalizationData,
  User,
  UserPersonalization,
  UserPreferences,
  UserProfile,
} from '../../types';
import type { HttpClient } from './http';

type UserProfileUpdatePayload = {
  full_name?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  bio?: string;
  website?: string;
  location?: string;
  country?: string;
};

type UserPreferencesUpdatePayload = {
  preferred_currency?: string;
  preferred_date_format?: string;
  timezone?: string;
  language?: string;
  theme?: string;
  notifications_enabled?: boolean;
  email_notifications?: boolean;
  push_notifications?: boolean;
  table_column_preferences?: Record<string, unknown>;
  ui_preferences?: Record<string, unknown>;
};

type UserPersonalizationUpdatePayload = {
  full_name?: string;
  phone?: string;
  country?: string;
  default_currency?: string;
  timezone?: string;
  language?: string;
  theme?: string;
  personalization_data?: PersonalizationData;
  has_completed_personalization?: boolean;
  is_onboarded?: boolean;
  onboarding_step?: number;
};

export type UserDataSection =
  | 'base'
  | 'profile'
  | 'preferences'
  | 'subscription'
  | 'ai_settings'
  | 'personalization';

export function createUsersApi(http: HttpClient) {
  return {
    async getCurrentUser(options?: { include?: UserDataSection[] | string[] }): Promise<User> {
      const normalizedIncludes =
        options?.include?.map((section) => section.replace(/-/g, '_').toLowerCase()) ?? [];

      const includeParam = normalizedIncludes
        .filter((section) => section !== 'base')
        .filter((section, index, array) => array.indexOf(section) === index)
        .join(',');

      const response = await http.client.get('/users/me/', {
        params: includeParam ? { include: includeParam } : undefined,
      });

      // Handle both new and old response formats
      return response.data?.data || response.data;
    },

    async getUserProfile(): Promise<Partial<User>> {
      const response = await http.client.get('/users/profile/');
      return response.data?.data || response.data || {};
    },

    async getUserPreferences(): Promise<Partial<User>> {
      const response = await http.client.get('/users/preferences/');
      const data = response.data?.data || response.data || {};

      // Map the preferences to match the User interface
      return {
        ...data,
        preferences: {
          preferred_currency: data.preferred_currency || data.preferences?.preferred_currency,
          preferred_date_format:
            data.preferred_date_format || data.preferences?.preferred_date_format,
          timezone: data.timezone || data.preferences?.timezone,
          language: data.language || data.preferences?.language,
          theme: data.theme || data.preferences?.theme,
          notifications_enabled:
            data.enable_notifications ?? data.preferences?.notifications_enabled,
          email_notifications: data.email_notifications ?? data.preferences?.email_notifications,
          push_notifications: data.push_notifications ?? data.preferences?.push_notifications,
          table_column_preferences: data.preferences?.table_column_preferences,
          ui_preferences: data.ui_preferences || data.preferences?.ui_preferences,
        },
      };
    },

    async getUserSubscription(): Promise<Partial<User>> {
      const response = await http.client.get('/users/subscription/');
      const data = response.data?.data || response.data || {};

      return {
        ...data,
        subscription: {
          ...data.subscription,
          ai_credits_remaining:
            data.ai_credits_remaining ?? data.subscription?.ai_credits_remaining,
          ai_credits_used_this_month:
            data.ai_credits_used_this_month ?? data.subscription?.ai_credits_used_this_month,
        },
        ai_credits_remaining: data.ai_credits_remaining ?? data.subscription?.ai_credits_remaining,
        ai_credits_used_this_month:
          data.ai_credits_used_this_month ?? data.subscription?.ai_credits_used_this_month,
      };
    },

    async getUserAiSettings(): Promise<Partial<User>> {
      const response = await http.client.get('/users/ai-settings/');
      const data = response.data?.data || response.data || {};

      return {
        ...data,
        ai_settings: data.ai_settings || data,
      };
    },

    async getPersonalization(): Promise<UserPersonalization> {
      const response = await http.client.get('/users/personalization/');
      const data = response.data?.data || response.data || {};

      return {
        ...data.personalization,
        ...data,
        preferences: data.personalization_data || data.preferences,
      } as UserPersonalization;
    },

    async searchUsers(query: string): Promise<User[]> {
      const response = await http.client.get(`/users/search/?q=${encodeURIComponent(query)}`);
      // Handle both array response and data-wrapped array
      return Array.isArray(response.data) ? response.data : response.data?.data || [];
    },

    async updateUserProfile(profile: UserProfileUpdatePayload): Promise<User> {
      const payload = { ...profile } as Record<string, unknown>;
      if (payload.full_name && !payload.first_name && !payload.last_name) {
        const parts = String(payload.full_name).trim().split(/\s+/).filter(Boolean);
        if (parts.length > 1) {
          payload.last_name = parts.pop();
          payload.first_name = parts.join(' ');
        } else {
          payload.first_name = parts[0];
        }
        delete payload.full_name;
      }

      const response = await http.client.patch('/users/profile/', payload);
      // Handle both new and old response formats
      return response.data?.data || response.data;
    },

    async updateUserPreferences(
      preferences: UserPreferencesUpdatePayload
    ): Promise<UserPreferences> {
      const response = await http.client.patch('/users/preferences/', preferences);
      const data = response.data?.data || response.data || {};

      // Map the response to match UserPreferences interface
      return {
        preferred_currency: data.preferred_currency || data.preferences?.preferred_currency,
        preferred_date_format:
          data.preferred_date_format || data.preferences?.preferred_date_format,
        timezone: data.timezone || data.preferences?.timezone,
        language: data.language || data.preferences?.language,
        theme: data.theme || data.preferences?.theme,
        notifications_enabled: data.enable_notifications ?? data.preferences?.notifications_enabled,
        email_notifications: data.email_notifications ?? data.preferences?.email_notifications,
        push_notifications: data.push_notifications ?? data.preferences?.push_notifications,
        table_column_preferences: data.preferences?.table_column_preferences,
        ui_preferences: data.ui_preferences || data.preferences?.ui_preferences,
      };
    },

    async updateUserPersonalization(
      personalization: UserPersonalizationUpdatePayload
    ): Promise<UserPersonalization> {
      const response = await http.client.patch('/users/personalization/', personalization);
      const data = response.data?.data || response.data || {};

      return {
        ...data.personalization,
        ...data,
        preferences: data.personalization_data || data.preferences,
      } as UserPersonalization;
    },

    async uploadProfilePhoto(file: File): Promise<{ url: string }> {
      const formData = new FormData();
      formData.append('profile_photo', file);

      const response = await http.client.post('/users/upload-profile-photo/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Handle both new and old response formats
      const data = response.data?.data || response.data || {};
      return {
        url: data.profile_photo_url || data.url,
        ...data,
      };
    },

    async deleteProfilePhoto(): Promise<void> {
      await http.client.delete('/users/delete-profile-photo/');
    },

    async getProfilePhotoInfo(): Promise<{
      profile_photo_url?: string;
      profile_photo_thumbnail_url?: string;
      has_custom_photo: boolean;
    }> {
      const response = await http.client.get('/users/profile-photo-info/');
      const data = response.data?.data || response.data || {};

      return {
        profile_photo_url: data.profile_photo_url || data.profile_picture,
        profile_photo_thumbnail_url: data.profile_photo_thumbnail_url,
        has_custom_photo: data.has_custom_photo || false,
      };
    },
  };
}

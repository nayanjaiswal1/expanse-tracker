"""
Serializers for the new clean model structure.
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone

from users.models import (
    UserProfile,
    UserSubscription,
    UserPreferences,
    AISettings,
    UserPersonalization,
    Plan,
    UserPlanAssignment,
    UserAddon,
    ActivityLog,
)

User = get_user_model()


# ================================
# PROFILE SERIALIZERS
# ================================

class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for core user profile information"""

    profile_photo_url = serializers.ReadOnlyField()

    class Meta:
        model = UserProfile
        fields = [
            'phone',
            'bio',
            'website',
            'location',
            'profile_photo',
            'profile_photo_url',
            'onboarding_step',
            'onboarding_completed_at',
            'is_verified',
            'is_onboarded',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['is_onboarded', 'created_at', 'updated_at']


# ================================
# SUBSCRIPTION SERIALIZERS
# ================================

class UserSubscriptionSerializer(serializers.ModelSerializer):
    """Serializer for user subscription and usage tracking"""

    current_plan_name = serializers.CharField(source='current_plan.name', read_only=True)
    is_active = serializers.ReadOnlyField()

    class Meta:
        model = UserSubscription
        fields = [
            'current_plan',
            'current_plan_name',
            'status',
            'start_date',
            'end_date',
            'is_auto_renew',
            'ai_credits_remaining',
            'ai_credits_used_this_month',
            'transactions_this_month',
            'last_reset_date',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'ai_credits_remaining',
            'ai_credits_used_this_month',
            'transactions_this_month',
            'last_reset_date',
            'is_active',
            'created_at',
            'updated_at',
        ]


# ================================
# PREFERENCES SERIALIZERS
# ================================

class UserPreferencesSerializer(serializers.ModelSerializer):
    """Serializer for user UI and display preferences"""

    class Meta:
        model = UserPreferences
        fields = [
            'preferred_currency',
            'preferred_date_format',
            'timezone',
            'language',
            'theme',
            'notifications_enabled',
            'email_notifications',
            'push_notifications',
            'table_column_preferences',
            'ui_preferences',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']


class AISettingsSerializer(serializers.ModelSerializer):
    """Serializer for AI provider settings"""

    # Don't expose encrypted API keys in serialization
    has_openai_key = serializers.SerializerMethodField()
    has_anthropic_key = serializers.SerializerMethodField()

    class Meta:
        model = AISettings
        fields = [
            'preferred_provider',
            'has_openai_key',
            'openai_model',
            'has_anthropic_key',
            'anthropic_model',
            'ollama_endpoint',
            'ollama_model',
            'enable_ai_suggestions',
            'enable_ai_categorization',
            'enable_ai_invoice_generation',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['has_openai_key', 'has_anthropic_key', 'created_at', 'updated_at']

    def get_has_openai_key(self, obj):
        return bool(obj.openai_api_key)

    def get_has_anthropic_key(self, obj):
        return bool(obj.anthropic_api_key)


class AISettingsUpdateSerializer(serializers.Serializer):
    """Serializer for updating AI API keys separately"""

    provider = serializers.ChoiceField(choices=['openai', 'anthropic'])
    api_key = serializers.CharField(write_only=True, required=True)

    def update(self, instance, validated_data):
        provider = validated_data['provider']
        api_key = validated_data['api_key']
        instance.set_api_key(provider, api_key)
        return instance


# ================================
# PERSONALIZATION SERIALIZERS
# ================================

class UserPersonalizationSerializer(serializers.ModelSerializer):
    """Serializer for user personalization questionnaire"""

    class Meta:
        model = UserPersonalization
        fields = [
            'is_completed',
            'completed_at',
            'preferences',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['completed_at', 'created_at', 'updated_at']

    def update(self, instance, validated_data):
        # Auto-mark as completed when preferences are saved
        if validated_data.get('preferences') and not instance.is_completed:
            instance.mark_completed()
        return super().update(instance, validated_data)


# ================================
# COMBINED USER SERIALIZER
# ================================

class CompleteUserSerializer(serializers.ModelSerializer):
    """Complete user information with all related data"""

    profile = UserProfileSerializer(read_only=True)
    subscription = UserSubscriptionSerializer(read_only=True)
    preferences = UserPreferencesSerializer(read_only=True)
    ai_settings = AISettingsSerializer(read_only=True)
    personalization = UserPersonalizationSerializer(read_only=True)
    plan_assignment = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'date_joined',
            'profile',
            'subscription',
            'preferences',
            'ai_settings',
            'personalization',
            'plan_assignment',
        ]
        read_only_fields = ['id', 'username', 'email', 'date_joined']

    def get_plan_assignment(self, obj):
        if hasattr(obj, 'plan_assignment'):
            from users.serializers import UserPlanAssignmentSerializer
            return UserPlanAssignmentSerializer(obj.plan_assignment).data
        return None


# ================================
# UPDATE SERIALIZERS
# ================================

class UserProfileUpdateSerializer(serializers.Serializer):
    """Serializer for updating user profile fields"""

    # User fields
    first_name = serializers.CharField(required=False)
    last_name = serializers.CharField(required=False)

    # Profile fields
    phone = serializers.CharField(required=False, allow_blank=True)
    bio = serializers.CharField(required=False, allow_blank=True)
    website = serializers.URLField(required=False, allow_blank=True)
    location = serializers.CharField(required=False, allow_blank=True)

    def update(self, instance, validated_data):
        # Update User model fields
        user = instance
        if 'first_name' in validated_data:
            user.first_name = validated_data['first_name']
        if 'last_name' in validated_data:
            user.last_name = validated_data['last_name']
        user.save()

        # Update Profile fields
        profile, created = UserProfile.objects.get_or_create(user=user)
        profile_fields = ['phone', 'bio', 'website', 'location']
        profile_updated = False

        for field in profile_fields:
            if field in validated_data:
                setattr(profile, field, validated_data[field])
                profile_updated = True

        if profile_updated:
            profile.save()

        return user


class UserPreferencesUpdateSerializer(serializers.Serializer):
    """Serializer for bulk updating user preferences"""

    preferred_currency = serializers.CharField(required=False)
    preferred_date_format = serializers.CharField(required=False)
    timezone = serializers.CharField(required=False)
    language = serializers.CharField(required=False)
    theme = serializers.ChoiceField(choices=['light', 'dark', 'system'], required=False)
    notifications_enabled = serializers.BooleanField(required=False)
    email_notifications = serializers.BooleanField(required=False)
    push_notifications = serializers.BooleanField(required=False)
    table_column_preferences = serializers.JSONField(required=False)
    ui_preferences = serializers.JSONField(required=False)

    def update(self, instance, validated_data):
        preferences, created = UserPreferences.objects.get_or_create(user=instance)

        for field, value in validated_data.items():
            setattr(preferences, field, value)

        preferences.save()
        return instance

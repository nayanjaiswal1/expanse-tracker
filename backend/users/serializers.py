"""
User-related serializers for the users app.
Updated to use clean model structure.
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from decimal import Decimal
from django.utils import timezone

# Import models
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


class BaseSerializer(serializers.Serializer):
    def get_profile_photo_url(self, obj):
        """Get profile photo URL with absolute path"""
        url = obj.profile_photo_url
        if url and not url.startswith('http'):
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(url)
        return url


# ================================
# USER SUMMARY SERIALIZER
# ================================

class UserSummarySerializer(serializers.ModelSerializer):
    """Lightweight serializer that flattens commonly used user fields."""

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'date_joined',
            'last_login',
            'is_staff',
            'is_superuser',
        ]
        read_only_fields = fields

    def to_representation(self, instance):
        data = super().to_representation(instance)

        full_name = f"{instance.first_name} {instance.last_name}".strip()
        data['full_name'] = full_name or instance.username
        data['role'] = (
            'admin'
            if instance.is_superuser
            else 'staff'
            if instance.is_staff
            else getattr(instance, 'role', 'user') or 'user'
        )

        personalization = getattr(instance, 'personalization', None)
        data['onboarding_step'] = getattr(personalization, 'onboarding_step', None)
        data['is_onboarded'] = bool(getattr(personalization, 'is_onboarded', False))
        data['has_completed_personalization'] = bool(
            getattr(personalization, 'questionnaire_completed', False)
        )
        data['personalization_data'] = (
            getattr(personalization, 'preferences', None) if personalization else None
        )

        return data


# ================================
# PROFILE SERIALIZERS
# ================================

class UserProfileSerializer(BaseSerializer, serializers.ModelSerializer):
    """Serializer for core user profile information"""

    profile_photo_url = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = [
            'phone',
            'bio',
            'website',
            'location',
            'profile_photo',
            'profile_photo_url',
            'is_verified',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at', 'profile_photo_url']


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
            'current_plan_name',
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


# ================================
# PERSONALIZATION SERIALIZERS
# ================================

class UserPersonalizationSerializer(serializers.ModelSerializer):
    """Serializer for user personalization questionnaire"""

    is_onboarded = serializers.ReadOnlyField()

    class Meta:
        model = UserPersonalization
        fields = [
            'onboarding_step',
            'onboarding_completed_at',
            'is_onboarded',
            'questionnaire_completed',
            'questionnaire_completed_at',
            'preferences',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'onboarding_completed_at',
            'questionnaire_completed_at',
            'is_onboarded',
            'created_at',
            'updated_at'
        ]


# ================================
# COMBINED USER SERIALIZER
# ================================

class UserSerializer(serializers.ModelSerializer):
    """
    Simplified user serializer with essential data.
    Includes nested profile and preferences for the current user.
    """
    full_name = serializers.SerializerMethodField()
    profile = UserProfileSerializer(read_only=True)
    preferences = UserPreferencesSerializer(read_only=True)
    subscription = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'full_name',
            'date_joined',
            'last_login',
            'profile',
            'preferences',
            'subscription',
        ]
        read_only_fields = fields
        
    def get_full_name(self, obj):
        """Return user's full name or username if not available"""
        name = f"{obj.first_name or ''} {obj.last_name or ''}".strip()
        return name or obj.username
        
    def get_subscription(self, obj):
        """Get simplified subscription info"""
        subscription = getattr(obj, 'subscription', None)
        if not subscription:
            return None
            
        return {
            'status': subscription.status,
            'is_active': subscription.is_active,
            'plan_name': getattr(subscription.current_plan, 'name', None) if hasattr(subscription, 'current_plan') else None,
            'ai_credits_remaining': getattr(subscription, 'ai_credits_remaining', 0),
        }


# ================================
# UPDATE SERIALIZERS
# ================================

class ProfileUpdateSerializer(serializers.Serializer):
    """Serializer for updating profile fields"""

    # User fields
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)

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

        # Return serializable data instead of the User instance
        return {
            'user_id': user.id,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'phone': profile.phone,
            'bio': profile.bio,
            'website': profile.website,
            'location': profile.location
        }


class PreferencesUpdateSerializer(serializers.Serializer):
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
        
        # Return serializable data instead of the User instance
        return {
            'user_id': instance.id,
            'preferences': {field: getattr(preferences, field) for field in validated_data.keys()}
        }


class OnboardingSerializer(serializers.Serializer):
    """Serializer for onboarding step updates"""

    onboarding_step = serializers.IntegerField(required=False)
    preferences = serializers.JSONField(required=False)
    is_onboarded = serializers.BooleanField(required=False)

    def update(self, instance, validated_data):
        personalization, created = UserPersonalization.objects.get_or_create(user=instance)

        if 'onboarding_step' in validated_data:
            personalization.onboarding_step = validated_data['onboarding_step']

        if 'preferences' in validated_data:
            personalization.preferences.update(validated_data['preferences'])

        # Mark onboarding as complete if requested
        if validated_data.get('is_onboarded') and not personalization.onboarding_completed_at:
            personalization.mark_onboarding_completed()
        # Auto-complete onboarding if all steps done
        elif personalization.onboarding_step >= 2 and not personalization.onboarding_completed_at:
            personalization.mark_onboarding_completed()
        else:
            personalization.save()

        # Return serializable data instead of the User instance
        return {
            'onboarding_step': personalization.onboarding_step,
            'preferences': personalization.preferences,
            'is_completed': bool(personalization.onboarding_completed_at),
            'user_id': instance.id
        }


class CompleteOnboardingSerializer(serializers.Serializer):
    """Serializer for complete onboarding data including all profile, preferences, and personalization"""

    # Profile fields
    full_name = serializers.CharField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True)
    country = serializers.CharField(required=False, allow_blank=True)

    # Preference fields
    default_currency = serializers.CharField(required=False)
    timezone = serializers.CharField(required=False)
    language = serializers.CharField(required=False)
    theme = serializers.ChoiceField(choices=['light', 'dark', 'system'], required=False)

    # Personalization fields
    personalization_data = serializers.JSONField(required=False)
    has_completed_personalization = serializers.BooleanField(required=False)

    # Onboarding tracking
    onboarding_step = serializers.IntegerField(required=False)
    is_onboarded = serializers.BooleanField(required=False)

    def update(self, instance, validated_data):
        from users.models import UserProfile, UserPreferences, UserPersonalization

        user = instance

        # Update User model fields (full_name -> first_name + last_name)
        if 'full_name' in validated_data:
            parts = validated_data['full_name'].strip().split(' ', 1)
            user.first_name = parts[0] if len(parts) > 0 else ''
            user.last_name = parts[1] if len(parts) > 1 else ''
            user.save()

        # Update Profile fields
        profile_data = {}
        if 'phone' in validated_data:
            profile_data['phone'] = validated_data['phone']
        if 'country' in validated_data:
            profile_data['location'] = validated_data['country']

        if profile_data:
            profile, _ = UserProfile.objects.get_or_create(user=user)
            for key, value in profile_data.items():
                setattr(profile, key, value)
            profile.save()

        # Update Preferences fields
        prefs_data = {}
        if 'default_currency' in validated_data:
            prefs_data['preferred_currency'] = validated_data['default_currency']
        if 'timezone' in validated_data:
            prefs_data['timezone'] = validated_data['timezone']
        if 'language' in validated_data:
            prefs_data['language'] = validated_data['language']
        if 'theme' in validated_data:
            prefs_data['theme'] = validated_data['theme']

        if prefs_data:
            prefs, _ = UserPreferences.objects.get_or_create(user=user)
            for key, value in prefs_data.items():
                setattr(prefs, key, value)
            prefs.save()

        # Update Personalization fields
        personalization, _ = UserPersonalization.objects.get_or_create(user=user)

        if 'onboarding_step' in validated_data:
            personalization.onboarding_step = validated_data['onboarding_step']

        if 'personalization_data' in validated_data:
            personalization.preferences.update(validated_data['personalization_data'])

        if validated_data.get('has_completed_personalization'):
            personalization.mark_questionnaire_completed()

        if validated_data.get('is_onboarded') and not personalization.onboarding_completed_at:
            personalization.mark_onboarding_completed()
        elif personalization.onboarding_step >= 2 and not personalization.onboarding_completed_at:
            personalization.mark_onboarding_completed()
        else:
            personalization.save()

        # Return the updated user data
        return UserSummarySerializer(user, context=self.context).data


class ProfilePhotoSerializer(serializers.Serializer):
    """Serializer for profile photo info"""

    profile_photo_url = serializers.SerializerMethodField()
    has_custom_photo = serializers.SerializerMethodField()

    def get_profile_photo_url(self, obj):
        """Get profile photo URL"""
        url = obj.profile_photo_url
        if url and not url.startswith('http'):
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(url)
        return url

    def get_has_custom_photo(self, obj):
        """Check if user has uploaded custom photo"""
        return bool(obj.profile_photo)


# ================================
# PLAN SERIALIZERS
# ================================

class PlanSerializer(serializers.ModelSerializer):
    """Serializer for subscription plans"""

    class Meta:
        model = Plan
        fields = [
            'id',
            'name',
            'plan_type',
            'description',
            'price',
            'billing_cycle',
            'ai_credits_per_month',
            'max_transactions_per_month',
            'max_accounts',
            'storage_gb',
            'features',
            'is_active',
            'is_featured',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class UserPlanAssignmentSerializer(serializers.ModelSerializer):
    """Serializer for user plan assignments"""

    base_plan_details = PlanSerializer(source='base_plan', read_only=True)

    class Meta:
        model = UserPlanAssignment
        fields = [
            'base_plan',
            'base_plan_details',
            'total_monthly_cost',
            'effective_limits',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['total_monthly_cost', 'effective_limits', 'created_at', 'updated_at']


# ================================
# ACTIVITY LOG SERIALIZERS
# ================================

class ActivityLogSerializer(serializers.ModelSerializer):
    """Serializer for activity logs"""

    user_email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = ActivityLog
        fields = [
            'id',
            'user',
            'user_email',
            'activity_type',
            'object_type',
            'object_id',
            'status',
            'details',
            'metadata',
            'ip_address',
            'user_agent',
            'created_at',
        ]
        read_only_fields = ['id', 'user_email', 'created_at']

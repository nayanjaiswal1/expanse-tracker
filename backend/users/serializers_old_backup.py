"""
User-related serializers for the users app.
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from decimal import Decimal
from django.utils import timezone

# Import models from users app
from users.models import UserProfile, Plan, UserPlanAssignment, UserAddon, ActivityLog

User = get_user_model()


# ================================
# USER AND PROFILE SERIALIZERS
# ================================


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(write_only=True, required=False)

    # Profile fields
    phone = serializers.CharField(write_only=True, required=False, allow_blank=True)
    bio = serializers.CharField(write_only=True, required=False, allow_blank=True)
    website = serializers.URLField(write_only=True, required=False, allow_blank=True)
    location = serializers.CharField(write_only=True, required=False, allow_blank=True)
    country = serializers.CharField(write_only=True, required=False, allow_blank=True)

    # Preference fields
    preferred_currency = serializers.CharField(write_only=True, required=False)
    preferred_date_format = serializers.CharField(write_only=True, required=False)
    default_currency = serializers.CharField(write_only=True, required=False)
    timezone = serializers.CharField(write_only=True, required=False)
    language = serializers.CharField(write_only=True, required=False)
    theme = serializers.CharField(write_only=True, required=False)

    # Notification fields
    notifications_enabled = serializers.BooleanField(write_only=True, required=False)
    email_notifications = serializers.BooleanField(write_only=True, required=False)
    push_notifications = serializers.BooleanField(write_only=True, required=False)

    # Table column preferences
    table_column_preferences = serializers.JSONField(required=False)

    # UI layout preferences
    ui_preferences = serializers.JSONField(required=False)

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "first_name", "last_name", "date_joined", "full_name",
            "phone", "bio", "website", "location", "country", "preferred_currency", "preferred_date_format",
            "default_currency", "timezone", "language", "theme", "notifications_enabled",
            "email_notifications", "push_notifications", "table_column_preferences", "ui_preferences"
        ]
        read_only_fields = ["id", "date_joined"]

    @staticmethod
    def _normalize_table_preferences(prefs):
        if not isinstance(prefs, dict):
            return prefs

        normalized = {}
        for table, config in prefs.items():
            if isinstance(config, dict) and ("visibility" in config or "sizing" in config):
                normalized[table] = {
                    "visibility": config.get("visibility", {}) if isinstance(config.get("visibility"), dict) else {},
                    "sizing": config.get("sizing", {}) if isinstance(config.get("sizing"), dict) else {},
                }
            elif isinstance(config, dict):
                # Legacy format: boolean map
                normalized[table] = {
                    "visibility": config,
                    "sizing": {},
                }
            else:
                normalized[table] = {
                    "visibility": {},
                    "sizing": {},
                }
        return normalized

    def update(self, instance, validated_data):
        # Handle full_name field if provided
        full_name = validated_data.pop('full_name', None)
        if full_name:
            name_parts = full_name.split(' ', 1)
            validated_data['first_name'] = name_parts[0]
            validated_data['last_name'] = name_parts[1] if len(name_parts) > 1 else ''

        # Extract profile fields
        profile_fields = {
            'phone': validated_data.pop('phone', None),
            'bio': validated_data.pop('bio', None),
            'website': validated_data.pop('website', None),
            'location': validated_data.pop('location', None),
            'country': validated_data.pop('country', None),
            'preferred_currency': validated_data.pop('preferred_currency', None),
            'preferred_date_format': validated_data.pop('preferred_date_format', None),
            'default_currency': validated_data.pop('default_currency', None),
            'timezone': validated_data.pop('timezone', None),
            'language': validated_data.pop('language', None),
            'theme': validated_data.pop('theme', None),
            'notifications_enabled': validated_data.pop('notifications_enabled', None),
            'email_notifications': validated_data.pop('email_notifications', None),
            'push_notifications': validated_data.pop('push_notifications', None),
            'table_column_preferences': validated_data.pop('table_column_preferences', None),
            'ui_preferences': validated_data.pop('ui_preferences', None),
        }

        # Update User model fields
        user = super().update(instance, validated_data)

        # Update UserProfile fields if they were provided
        profile, created = UserProfile.objects.get_or_create(user=user)
        profile_updated = False

        for field, value in profile_fields.items():
            if value is not None:
                if field == 'table_column_preferences':
                    value = self._normalize_table_preferences(value)
                setattr(profile, field, value)
                profile_updated = True

        if profile_updated:
            profile.save()

        return user

    def to_representation(self, instance):
        # Include full_name and profile fields in the response
        data = super().to_representation(instance)
        data['full_name'] = f"{instance.first_name} {instance.last_name}".strip()

        # Include profile data
        if hasattr(instance, 'profile'):
            profile = instance.profile
            request = self.context.get('request')

            profile_photo_url = profile.profile_photo_url
            if profile_photo_url and request and not profile_photo_url.startswith('http'):
                profile_photo_url = request.build_absolute_uri(profile_photo_url)

            data.update({
                'phone': profile.phone,
                'bio': profile.bio,
                'website': profile.website,
                'location': profile.location,
                'is_verified': profile.is_verified,
                'profile_photo_url': profile_photo_url,
                'profile_photo_url': profile_photo_url,
                'profile_photo_thumbnail_url': profile_photo_thumbnail_url,
                'has_custom_photo': bool(profile.profile_photo),
                'has_completed_personalization': profile.has_completed_personalization,
                'personalization_data': profile.personalization_data,
            })

        return data


class UserProfileSerializer(serializers.ModelSerializer):
    """Consolidated user profile with subscription and settings"""

    user = UserSerializer(read_only=True)
    current_plan_name = serializers.CharField(
        source="current_plan.name", read_only=True
    )
    subscription_days_remaining = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = [
            "user",
            "is_verified",
            "current_plan",
            "current_plan_name",
            "subscription_status",
            "subscription_start_date",
            "subscription_end_date",
            "is_auto_renew",
            "ai_credits_remaining",
            "ai_credits_used_this_month",
            "transactions_this_month",
            "last_reset_date",
            "preferred_ai_provider",
            "openai_model",
            "ollama_endpoint",
            "ollama_model",
            "enable_ai_suggestions",
            "enable_ai_categorization",
            "enable_ai_invoice_generation",
            "total_ai_credits",
            "total_transactions_limit",
            "total_accounts_limit",
            "total_storage_gb",
            "custom_features",
            "total_monthly_cost",
            "default_currency",
            "timezone",
            "language",
            "subscription_days_remaining",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["user", "created_at", "updated_at", "last_reset_date"]
        extra_kwargs = {"openai_api_key": {"write_only": True}}

    def get_subscription_days_remaining(self, obj):
        """Calculate days remaining in subscription"""
        if not obj.subscription_end_date:
            return None

        remaining = obj.subscription_end_date.date() - timezone.now().date()
        return max(0, remaining.days)

    def to_representation(self, instance):
        """Don't return the encrypted API key"""
        data = super().to_representation(instance)
        data["has_openai_key"] = bool(instance.openai_api_key)
        return data


class ProfilePhotoSerializer(serializers.ModelSerializer):
    """Serializer for profile photo upload"""

    profile_photo = serializers.ImageField(write_only=True)
    profile_photo_url = serializers.SerializerMethodField(read_only=True)
    profile_photo_thumbnail_url = serializers.SerializerMethodField(read_only=True)
    has_custom_photo = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = UserProfile
        fields = [
            'profile_photo',
            'profile_photo_url',
            'profile_photo_thumbnail_url',
            'has_custom_photo'
        ]

    def get_profile_photo_url(self, obj):
        return obj.profile_photo_url

    def get_profile_photo_thumbnail_url(self, obj):
        return obj.profile_photo_thumbnail_url

    def get_has_custom_photo(self, obj):
        return bool(obj.profile_photo)


class OnboardingSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = UserProfile
        fields = [
            "default_currency",
            "timezone",
            "language",
            "theme",
            "phone",
            "country",
            "full_name",
            "onboarding_step",
            "is_onboarded",
        ]
        extra_kwargs = {
            "onboarding_step": {"read_only": False, "required": False},
            "is_onboarded": {"read_only": False, "required": False},
        }

    def update(self, instance, validated_data):
        # Update full name on the related User instance if provided
        full_name = validated_data.pop('full_name', '').strip()
        if full_name:
            first_name, last_name = (full_name.split(' ', 1) + [''])[:2]
            user = instance.user
            user.first_name = first_name
            user.last_name = last_name
            user.save(update_fields=["first_name", "last_name"])

        # Auto-set is_onboarded when onboarding_step reaches 3 or higher
        onboarding_step = validated_data.get('onboarding_step', instance.onboarding_step)
        if onboarding_step >= 3:
            validated_data['is_onboarded'] = True

        return super().update(instance, validated_data)


# ================================
# PLAN SERIALIZERS
# ================================


class PlanSerializer(serializers.ModelSerializer):
    """Unified plan serializer for base plans, addons, and templates"""

    # For templates
    base_plan_name = serializers.CharField(source="base_plan.name", read_only=True)
    included_addons_count = serializers.SerializerMethodField()
    savings_amount = serializers.SerializerMethodField()

    # For addons
    compatible_plans = serializers.SerializerMethodField()

    class Meta:
        model = Plan
        fields = [
            "id",
            "name",
            "plan_type",
            "description",
            "price",
            "billing_cycle",
            "ai_credits_per_month",
            "max_transactions_per_month",
            "max_accounts",
            "storage_gb",
            "features",
            "base_plan",
            "base_plan_name",
            "included_addons_count",
            "discount_percentage",
            "savings_amount",
            "is_stackable",
            "max_quantity",
            "compatible_plans",
            "is_active",
            "is_featured",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_included_addons_count(self, obj):
        if obj.plan_type == "template":
            return obj.included_addons.count()
        return 0

    def get_savings_amount(self, obj):
        """Calculate savings for templates"""
        if obj.plan_type != "template" or not obj.base_plan:
            return Decimal("0")

        individual_total = obj.base_plan.price
        for addon in obj.included_addons.all():
            individual_total += addon.price

        savings = individual_total - obj.price
        return max(Decimal("0"), savings)

    def get_compatible_plans(self, obj):
        """Get compatible plans for addons"""
        if obj.plan_type == "addon":
            return [{"id": p.id, "name": p.name} for p in obj.compatible_with.all()]
        return []


class UserAddonSerializer(serializers.ModelSerializer):
    addon = PlanSerializer(read_only=True)
    addon_id = serializers.IntegerField(write_only=True)
    monthly_cost = serializers.SerializerMethodField()

    class Meta:
        model = UserAddon
        fields = [
            "id",
            "addon",
            "addon_id",
            "quantity",
            "is_active",
            "monthly_cost",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_monthly_cost(self, obj):
        """Calculate monthly cost for this addon instance"""
        if obj.addon.billing_cycle == "monthly":
            return obj.addon.price * obj.quantity
        elif obj.addon.billing_cycle == "yearly":
            return (obj.addon.price * obj.quantity) / 12
        return obj.addon.price * obj.quantity


class UserPlanAssignmentSerializer(serializers.ModelSerializer):
    """User's plan assignment with addons"""

    base_plan = PlanSerializer(read_only=True)
    user_addons = UserAddonSerializer(many=True, read_only=True)
    effective_limits_display = serializers.SerializerMethodField()

    class Meta:
        model = UserPlanAssignment
        fields = [
            "id",
            "base_plan",
            "user_addons",
            "total_monthly_cost",
            "effective_limits",
            "effective_limits_display",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_effective_limits_display(self, obj):
        """Format effective limits for display"""
        limits = obj.effective_limits
        return {
            "ai_credits": f"{limits.get('ai_credits', 0):,} credits/month",
            "transactions": f"{limits.get('transactions', 0):,} transactions/month",
            "accounts": f"{limits.get('accounts', 0)} accounts",
            "storage": f"{limits.get('storage_gb', 0)} GB storage",
            "features": list(limits.get("features", {}).keys()),
        }


# ================================
# ACTIVITY LOG SERIALIZERS
# ================================


class ActivityLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.username", read_only=True)
    details_display = serializers.SerializerMethodField()

    class Meta:
        model = ActivityLog
        fields = [
            "id",
            "user",
            "user_name",
            "activity_type",
            "object_type",
            "object_id",
            "status",
            "details",
            "details_display",
            "metadata",
            "ip_address",
            "user_agent",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_details_display(self, obj):
        """Format details for human reading"""
        activity_type = obj.activity_type
        details = obj.details

        if activity_type == "transaction_execution":
            if obj.status == "completed":
                return f"Successfully executed recurring transaction for {details.get('amount', 'unknown amount')}"
            else:
                return f"Failed to execute recurring transaction: {details.get('error_message', 'Unknown error')}"

        elif activity_type == "ai_usage":
            return f"Used {details.get('provider', 'AI')} for {details.get('usage_type', 'unknown task')}"

        elif activity_type == "plan_change":
            return f"Changed plan: {details.get('change_reason', 'No reason provided')}"

        return f"{activity_type.replace('_', ' ').title()}"

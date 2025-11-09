from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth import get_user_model
from .models import (
    Plan,
    UserPlanAssignment,
    UserAddon,
    ActivityLog,
    UserProfile,
    UserSubscription,
    UserPreferences,
    AISettings,
    UserPersonalization,
)

User = get_user_model()


@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "plan_type",
        "price",
        "billing_cycle",
        "is_active",
        "is_featured",
    ]
    list_filter = ["plan_type", "is_active", "billing_cycle"]
    search_fields = ["name"]


@admin.register(UserPlanAssignment)
class UserPlanAssignmentAdmin(admin.ModelAdmin):
    list_display = [
        "user",
        "base_plan",
        "total_monthly_cost",
    ]
    search_fields = ["user__username", "user__email", "base_plan__name"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(UserAddon)
class UserAddonAdmin(admin.ModelAdmin):
    list_display = ["user_plan", "addon", "quantity", "is_active"]
    list_filter = ["is_active"]
    search_fields = ["user_plan__user__username", "addon__name"]


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = [
        "user",
        "activity_type",
        "object_type",
        "object_id",
        "status",
        "created_at",
    ]
    list_filter = ["activity_type", "status", "created_at"]
    search_fields = [
        "user__username",
        "user__email",
        "object_type",
        "object_id",
    ]
    readonly_fields = ["created_at"]


# Unregister the default User admin and register our custom one
admin.site.unregister(User)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Custom User Admin that shows email prominently and allows email-based search"""

    list_display = (
        "email",
        "username",
        "first_name",
        "last_name",
        "is_staff",
        "date_joined",
    )
    list_filter = ("is_staff", "is_superuser", "is_active", "date_joined")
    search_fields = ("email", "username", "first_name", "last_name")
    ordering = ("email",)

    fieldsets = (
        ("Authentication", {"fields": ("email", "username", "password")}),
        ("Personal info", {"fields": ("first_name", "last_name")}),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            "Important dates",
            {"fields": ("last_login", "date_joined"), "classes": ("collapse",)},
        ),
    )

    add_fieldsets = (
        (
            "Authentication",
            {
                "classes": ("wide",),
                "fields": ("email", "username", "password1", "password2"),
            },
        ),
        (
            "Personal info",
            {
                "classes": ("wide",),
                "fields": ("first_name", "last_name"),
            },
        ),
        (
            "Permissions",
            {
                "classes": ("wide", "collapse"),
                "fields": ("is_active", "is_staff", "is_superuser"),
            },
        ),
    )


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = [
        "user",
        "is_verified",
        "created_at",
    ]
    list_filter = ["is_verified", "created_at"]
    search_fields = ["user__email", "user__username"]
    readonly_fields = ["created_at", "updated_at"]

    fieldsets = (
        ("User", {"fields": ("user",)}),
        ("Profile", {"fields": ("phone", "bio", "website", "location")}),
        ("Photo", {"fields": ("profile_photo",)}),
        ("Status", {"fields": ("is_verified",)}),
        ("Timestamps", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )


@admin.register(UserSubscription)
class UserSubscriptionAdmin(admin.ModelAdmin):
    list_display = [
        "user",
        "current_plan",
        "status",
        "ai_credits_remaining",
        "created_at",
    ]
    list_filter = ["status", "current_plan", "created_at"]
    search_fields = ["user__email", "user__username"]
    readonly_fields = ["created_at", "updated_at", "last_reset_date"]

    fieldsets = (
        ("User", {"fields": ("user",)}),
        ("Subscription", {"fields": ("current_plan", "status", "start_date", "end_date", "is_auto_renew")}),
        ("Usage", {"fields": ("ai_credits_remaining", "ai_credits_used_this_month", "transactions_this_month", "last_reset_date")}),
        ("Timestamps", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )


@admin.register(UserPreferences)
class UserPreferencesAdmin(admin.ModelAdmin):
    list_display = [
        "user",
        "preferred_currency",
        "timezone",
        "theme",
        "language",
    ]
    search_fields = ["user__email", "user__username"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(AISettings)
class AISettingsAdmin(admin.ModelAdmin):
    list_display = [
        "user",
        "preferred_provider",
        "created_at",
    ]
    list_filter = ["preferred_provider"]
    search_fields = ["user__email", "user__username"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(UserPersonalization)
class UserPersonalizationAdmin(admin.ModelAdmin):
    list_display = [
        "user",
        "onboarding_step",
        "is_onboarded",
        "questionnaire_completed",
    ]
    list_filter = ["questionnaire_completed", "onboarding_step"]
    search_fields = ["user__email", "user__username"]
    readonly_fields = ["created_at", "updated_at", "is_onboarded"]

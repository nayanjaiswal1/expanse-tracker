"""
User models package.

This package organizes user-related models into domain-specific modules:
- profile: Core user profile information
- subscription: Subscription and usage tracking
- preferences: UI settings and AI configuration
- plans: Subscription plans and user plan assignments
- activity: Activity logging and audit trails
- personalization: Onboarding questionnaire data

All models are re-exported here to maintain backwards compatibility with
existing imports like `from users.models import UserProfile`.
"""

# Profile models
from .profile import UserProfile

# Subscription models
from .subscription import UserSubscription

# Preferences models
from .preferences import UserPreferences, AISettings

# Plan models
from .plans import Plan, UserPlanAssignment, UserAddon

# Activity models
from .activity import ActivityLog

# Personalization models
from .personalization import UserPersonalization


__all__ = [
    # Profile
    'UserProfile',

    # Subscription
    'UserSubscription',

    # Preferences
    'UserPreferences',
    'AISettings',

    # Plans
    'Plan',
    'UserPlanAssignment',
    'UserAddon',

    # Activity
    'ActivityLog',

    # Personalization
    'UserPersonalization',
]

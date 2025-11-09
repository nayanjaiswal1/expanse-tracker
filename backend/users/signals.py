"""
Signals for automatic creation of related user models.
"""

from django.contrib.auth import get_user_model
from django.db import connection
from django.db.models.signals import post_save
from django.db.utils import OperationalError, ProgrammingError
from django.dispatch import receiver

from users.models import (
    AISettings,
    UserPersonalization,
    UserPreferences,
    UserProfile,
    UserSubscription,
)


User = get_user_model()


def _model_table_exists(model) -> bool:
    """Check if the model's database table exists before touching it."""
    return model._meta.db_table in connection.introspection.table_names()


def _safe_get_or_create(model, *, defaults=None, **lookup):
    """
    Attempt to get or create the related model, but quietly skip when migrations
    are not present yet (e.g., during isolated test runs).
    """
    if not _model_table_exists(model):
        return
    try:
        if defaults is None:
            model.objects.get_or_create(**lookup)
        else:
            model.objects.get_or_create(defaults=defaults, **lookup)
    except (OperationalError, ProgrammingError):
        # Tables exist but migrations may still be mid-application; ignore
        return


@receiver(post_save, sender=User)
def create_user_related_models(sender, instance, created, **kwargs):
    """
    Automatically create all related user models when a new user is created.
    """
    if created:
        _safe_get_or_create(UserProfile, user=instance)
        _safe_get_or_create(
            UserSubscription,
            user=instance,
            defaults={"status": "trial"},
        )
        _safe_get_or_create(UserPreferences, user=instance)
        _safe_get_or_create(AISettings, user=instance)
        _safe_get_or_create(UserPersonalization, user=instance)


@receiver(post_save, sender=User)
def save_user_related_models(sender, instance, **kwargs):
    """
    Ensure all related models exist when user is saved.
    This handles cases where models might be missing.
    """
    _safe_get_or_create(UserProfile, user=instance)
    _safe_get_or_create(
        UserSubscription,
        user=instance,
        defaults={"status": "trial"},
    )
    _safe_get_or_create(UserPreferences, user=instance)
    _safe_get_or_create(AISettings, user=instance)
    _safe_get_or_create(UserPersonalization, user=instance)

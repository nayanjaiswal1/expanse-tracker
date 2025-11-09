"""
Base models and mixins for the finance tracker application.
These models provide common functionality that can be reused across all domain models.
"""

from django.db import models
from django.contrib.auth import get_user_model
from django.conf import settings


class TimestampedModel(models.Model):
    """Abstract base model with timestamp fields"""

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class UserOwnedModel(TimestampedModel):
    """Abstract base model for user-owned entities"""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )

    class Meta:
        abstract = True


class StatusMixin(models.Model):
    """Mixin for entities with status tracking"""

    STATUS_CHOICES = [
        ("active", "Active"),
        ("cancelled", "Cancelled"),
        ("pending", "Pending"),
        ("failed", "Failed"),
    ]

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")

    class Meta:
        abstract = True


class MetadataMixin(models.Model):
    """Mixin for entities with metadata JSON field"""

    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        abstract = True

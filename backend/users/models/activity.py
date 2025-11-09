"""
Activity logging and audit trail models.
"""

from django.conf import settings
from django.db import models

from users.base_models import TimestampedModel


class ActivityLog(TimestampedModel):
    """Unified activity and audit logging"""

    ACTIVITY_TYPES = [
        ("transaction_execution", "Transaction Execution"),
        ("plan_change", "Plan Change"),
        ("ai_usage", "AI Usage"),
        ("investment_update", "Investment Update"),
        ("login", "User Login"),
        ("password_change", "Password Change"),
        ("data_export", "Data Export"),
        ("api_access", "API Access"),
    ]

    STATUS_CHOICES = [
        ("completed", "Completed"),
        ("failed", "Failed"),
        ("pending", "Pending"),
        ("cancelled", "Cancelled"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="activity_logs"
    )
    activity_type = models.CharField(max_length=30, choices=ACTIVITY_TYPES)

    # Generic reference to related objects
    object_type = models.CharField(
        max_length=50,
        blank=True
    )  # 'transaction', 'plan', etc.
    object_id = models.CharField(max_length=50, blank=True)

    # Activity details
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="completed"
    )
    details = models.JSONField(default=dict)
    metadata = models.JSONField(default=dict)

    # Request context (for API access)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "activity_type"]),
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["object_type", "object_id"]),
            models.Index(fields=["status"]),
            models.Index(fields=["created_at"]),  # For time-based queries and archival
        ]

    def __str__(self):
        return f"{self.user.username} - {self.activity_type} ({self.status})"

    @staticmethod
    def log_activity(
        user,
        activity_type,
        object_type="",
        object_id="",
        status="completed",
        details=None,
        metadata=None,
        ip_address=None,
        user_agent=None,
    ):
        """Helper to log various user activities."""
        if details is None:
            details = {}
        if metadata is None:
            metadata = {}

        return ActivityLog.objects.create(
            user=user,
            activity_type=activity_type,
            object_type=object_type,
            object_id=object_id,
            status=status,
            details=details,
            metadata=metadata,
            ip_address=ip_address,
            user_agent=user_agent,
        )

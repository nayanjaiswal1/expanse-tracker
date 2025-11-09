"""
Subscription-related models.
"""

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models, transaction
from django.db.models import F
from django.utils import timezone

from users.base_models import TimestampedModel


class UserSubscription(TimestampedModel):
    """User subscription information"""

    SUBSCRIPTION_STATUS_CHOICES = [
        ("trial", "Trial"),
        ("active", "Active"),
        ("cancelled", "Cancelled"),
        ("expired", "Expired"),
        ("suspended", "Suspended"),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="subscription"
    )

    # Current plan
    current_plan = models.ForeignKey(
        "Plan",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="subscriptions"
    )

    # Subscription status
    status = models.CharField(
        max_length=20,
        choices=SUBSCRIPTION_STATUS_CHOICES,
        default="trial",
        db_index=True
    )
    start_date = models.DateTimeField(auto_now_add=True)
    end_date = models.DateTimeField(null=True, blank=True)
    is_auto_renew = models.BooleanField(default=True)

    # Usage tracking
    ai_credits_remaining = models.IntegerField(
        default=100,
        validators=[MinValueValidator(0)]
    )
    ai_credits_used_this_month = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)]
    )
    transactions_this_month = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)]
    )
    last_reset_date = models.DateField(default=timezone.now)

    class Meta:
        verbose_name = "User Subscription"
        verbose_name_plural = "User Subscriptions"
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["end_date"]),
            models.Index(fields=["current_plan", "status"]),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.get_status_display()}"

    @transaction.atomic
    def reset_monthly_usage(self):
        """Reset monthly usage counters (thread-safe)"""
        subscription = UserSubscription.objects.select_for_update().get(pk=self.pk)
        subscription.ai_credits_used_this_month = 0
        subscription.transactions_this_month = 0
        subscription.last_reset_date = timezone.now().date()

        # Restore credits from plan
        if subscription.current_plan and hasattr(subscription.user, 'plan_assignment'):
            limits = subscription.user.plan_assignment.effective_limits
            subscription.ai_credits_remaining = limits.get('ai_credits', 100)

        subscription.save(update_fields=[
            'ai_credits_used_this_month',
            'transactions_this_month',
            'last_reset_date',
            'ai_credits_remaining',
            'updated_at'
        ])

    @transaction.atomic
    def consume_ai_credits(self, credits: int) -> bool:
        """
        Consume AI credits and return success (thread-safe).

        Args:
            credits: Number of credits to consume

        Returns:
            bool: True if credits were consumed, False if insufficient credits
        """
        updated = UserSubscription.objects.filter(
            pk=self.pk,
            ai_credits_remaining__gte=credits
        ).update(
            ai_credits_remaining=F('ai_credits_remaining') - credits,
            ai_credits_used_this_month=F('ai_credits_used_this_month') + credits,
            updated_at=timezone.now()
        )

        if updated:
            self.refresh_from_db(fields=['ai_credits_remaining', 'ai_credits_used_this_month'])
            return True
        return False

    @property
    def is_active(self):
        """Check if subscription is currently active"""
        return self.status == 'active' or (
            self.status == 'trial' and (
                not self.end_date or self.end_date > timezone.now()
            )
        )

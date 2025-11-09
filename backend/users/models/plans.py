"""
Plan and subscription-related models.
"""

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models, transaction
from django.db.models import F

from users.base_models import TimestampedModel


class Plan(TimestampedModel):
    """Unified plan model supporting base plans and addons"""

    PLAN_TYPES = [
        ("base", "Base Plan"),
        ("addon", "Add-on"),
        ("template", "Template Bundle"),
    ]

    BILLING_CYCLES = [
        ("monthly", "Monthly"),
        ("yearly", "Yearly"),
        ("one_time", "One Time"),
    ]

    name = models.CharField(max_length=100)
    plan_type = models.CharField(max_length=20, choices=PLAN_TYPES)
    description = models.TextField(blank=True)
    price = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    billing_cycle = models.CharField(
        max_length=20,
        choices=BILLING_CYCLES,
        default="monthly"
    )

    # Plan limits and features
    ai_credits_per_month = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)]
    )
    max_transactions_per_month = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)]
    )
    max_accounts = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)]
    )
    storage_gb = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)]
    )
    features = models.JSONField(default=dict)

    # Template/Bundle support
    base_plan = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="bundle_plans",
    )
    included_addons = models.ManyToManyField(
        "self",
        blank=True,
        symmetrical=False,
        related_name="parent_templates"
    )
    discount_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)]
    )

    # Addon-specific fields
    is_stackable = models.BooleanField(default=True)
    max_quantity = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1)]
    )
    compatible_with = models.ManyToManyField(
        "self",
        blank=True,
        symmetrical=False
    )

    # Status
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)

    class Meta:
        indexes = [
            models.Index(fields=["plan_type", "is_active"]),
            models.Index(fields=["price"]),
            models.Index(fields=["is_active", "is_featured"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.plan_type})"


class UserPlanAssignment(TimestampedModel):
    """User's current plan assignment with customizations"""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="plan_assignment"
    )
    base_plan = models.ForeignKey(
        Plan,
        on_delete=models.CASCADE,
        related_name="user_assignments"
    )
    active_addons = models.ManyToManyField(
        Plan,
        blank=True,
        through="UserAddon"
    )

    # Calculated totals (denormalized for performance)
    total_monthly_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)]
    )
    effective_limits = models.JSONField(
        default=dict
    )  # Combined limits from base + addons

    @transaction.atomic
    def calculate_totals(self):
        """Recalculate total cost and limits (thread-safe)"""
        total_cost = self.base_plan.price
        combined_limits = {
            "ai_credits": self.base_plan.ai_credits_per_month,
            "transactions": self.base_plan.max_transactions_per_month,
            "accounts": self.base_plan.max_accounts,
            "storage_gb": float(self.base_plan.storage_gb),
            "features": self.base_plan.features.copy(),
        }

        # Prefetch related addons for efficiency
        active_user_addons = self.user_addons.filter(
            is_active=True
        ).select_related('addon')

        # Add addon contributions
        for user_addon in active_user_addons:
            addon = user_addon.addon
            quantity = user_addon.quantity

            # Add to cost
            if addon.billing_cycle == "monthly":
                total_cost += addon.price * quantity
            elif addon.billing_cycle == "yearly":
                total_cost += (addon.price * quantity) / 12

            # Add to limits
            combined_limits["ai_credits"] += addon.ai_credits_per_month * quantity
            combined_limits["transactions"] += (
                addon.max_transactions_per_month * quantity
            )
            combined_limits["accounts"] += addon.max_accounts * quantity
            combined_limits["storage_gb"] += float(addon.storage_gb) * quantity

            # Merge features
            for feature, value in addon.features.items():
                combined_limits["features"][feature] = value

        # Update only changed fields
        self.total_monthly_cost = total_cost
        self.effective_limits = combined_limits
        self.save(update_fields=[
            'total_monthly_cost',
            'effective_limits',
            'updated_at'
        ])


class UserAddon(TimestampedModel):
    """Through model for user's active addons"""

    user_plan = models.ForeignKey(
        UserPlanAssignment,
        on_delete=models.CASCADE,
        related_name="user_addons"
    )
    addon = models.ForeignKey(Plan, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1)]
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ["user_plan", "addon"]
        indexes = [
            models.Index(fields=["user_plan", "is_active"]),
        ]

    def __str__(self):
        return f"{self.user_plan.user.username} - {self.addon.name} (x{self.quantity})"

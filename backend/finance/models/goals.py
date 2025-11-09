"""
Goals and group expense models for the finance tracker.
"""

from django.db import models
from django.conf import settings
from .base import UserOwnedModel, TimestampedModel
from .expense_groups import ExpenseGroup


class Goal(UserOwnedModel):
    """Financial goals"""

    GOAL_TYPES = [
        ("savings", "Savings Goal"),
        ("spending", "Spending Goal"),
        ("debt_payoff", "Debt Payoff"),
        ("investment", "Investment Goal"),
    ]

    STATUS_CHOICES = [
        ("active", "Active"),
        ("completed", "Completed"),
        ("paused", "Paused"),
        ("cancelled", "Cancelled"),
    ]

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    goal_type = models.CharField(max_length=20, choices=GOAL_TYPES, null=True, blank=True)
    target_amount = models.DecimalField(max_digits=12, decimal_places=2)
    current_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    target_date = models.DateField(null=True, blank=True)
    start_date = models.DateField(null=True, blank=True)
    currency = models.CharField(max_length=3, default='USD')
    color = models.CharField(max_length=7, null=True, blank=True)  # Hex color code
    thumbnail_image = models.URLField(max_length=500, null=True, blank=True)  # Primary thumbnail image
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")

    class Meta:
        app_label = "finance"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "status"]),
            models.Index(fields=["goal_type"]),
        ]

    @property
    def progress_percentage(self):
        if self.target_amount <= 0:
            return 0
        return min(100, float(self.current_amount / self.target_amount) * 100)

    @property
    def remaining_amount(self):
        return max(0, self.target_amount - self.current_amount)

    @property
    def is_completed(self):
        return self.status == 'completed' or self.current_amount >= self.target_amount

    def __str__(self):
        return self.name


class GoalImage(TimestampedModel):
    """Images associated with goals"""

    goal = models.ForeignKey(Goal, on_delete=models.CASCADE, related_name='images')
    image_url = models.URLField(max_length=500)
    thumbnail_url = models.URLField(max_length=500, null=True, blank=True)
    caption = models.TextField(blank=True)
    is_primary = models.BooleanField(default=False)

    class Meta:
        app_label = "finance"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["goal", "is_primary"]),
        ]

    def __str__(self):
        return f"Image for {self.goal.name}"


class GroupExpense(TimestampedModel):
    """Group expenses for splitting bills"""

    SPLIT_METHODS = [
        ("equal", "Split Equally"),
        ("percentage", "Split by Percentage"),
        ("amount", "Split by Amount"),
        ("shares", "Split by Shares"),
    ]

    STATUS_CHOICES = [
        ("active", "Active"),
        ("settled", "Settled"),
        ("cancelled", "Cancelled"),
    ]

    group = models.ForeignKey(
        ExpenseGroup, on_delete=models.CASCADE, related_name="expenses", db_index=True
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="created_expenses",
        db_index=True
    )
    paid_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="paid_expenses",
        help_text="User who paid for this expense",
        null=True,
        blank=True,
        db_index=True
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default="USD")
    split_method = models.CharField(
        max_length=20, choices=SPLIT_METHODS, default="equal"
    )
    date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")

    class Meta:
        app_label = "finance"
        ordering = ['-date', '-created_at']
        indexes = [
            models.Index(fields=["group", "status"]),
            models.Index(fields=["date"]),
            models.Index(fields=["created_by", "date"]),
            models.Index(fields=["paid_by", "status"]),
        ]

    def __str__(self):
        return self.title


class GroupExpenseShare(TimestampedModel):
    """Individual shares in group expenses"""

    group_expense = models.ForeignKey(
        GroupExpense, on_delete=models.CASCADE, related_name="shares", db_index=True
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="expense_shares",
        db_index=True
    )
    share_amount = models.DecimalField(max_digits=12, decimal_places=2)
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    payment_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        app_label = "finance"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=["group_expense", "user"]),
            models.Index(fields=["user", "payment_date"]),
        ]

    @property
    def is_settled(self):
        return self.paid_amount >= self.share_amount

    @property
    def remaining_amount(self):
        return max(0, self.share_amount - self.paid_amount)

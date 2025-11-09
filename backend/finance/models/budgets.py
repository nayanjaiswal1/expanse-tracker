from django.db import models
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.utils import timezone
from decimal import Decimal

User = get_user_model()


class Budget(models.Model):
    """User's budget for a specific period."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="budgets")
    name = models.CharField(max_length=200)
    start_date = models.DateField()
    end_date = models.DateField()
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-start_date"]
        indexes = [
            models.Index(fields=["user", "is_active"]),
            models.Index(fields=["start_date", "end_date"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.start_date} → {self.end_date})"

    def clean(self):
        if self.start_date >= self.end_date:
            raise ValidationError("Start date must be before end date.")

        overlapping = Budget.objects.filter(
            user=self.user,
            is_active=True,
            start_date__lt=self.end_date,
            end_date__gt=self.start_date,
        ).exclude(pk=self.pk)

        if overlapping.exists():
            raise ValidationError("Cannot have overlapping active budgets.")

    @property
    def is_current(self):
        today = timezone.now().date()
        return self.start_date <= today <= self.end_date


class BudgetCategory(models.Model):
    """Allocation per category for a budget."""

    budget = models.ForeignKey(Budget, on_delete=models.CASCADE, related_name="categories")
    category = models.ForeignKey("Category", on_delete=models.CASCADE)
    allocated_amount = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        unique_together = ["budget", "category"]
        indexes = [models.Index(fields=["budget", "category"])]

    def __str__(self):
        return f"{self.category.name}: {self.allocated_amount}"

    def clean(self):
        if self.allocated_amount <= 0:
            raise ValidationError("Allocated amount must be positive.")

    @property
    def spent_amount(self):
        """Calculate total spent in this category for the budget period."""
        from .models import Transaction  # optional, to avoid circular import

        qs = Transaction.objects.filter(
            user=self.budget.user,
            category=self.category,
            date__range=(self.budget.start_date, self.budget.end_date),
            transaction_type="expense",
        )
        return abs(sum(t.amount for t in qs)) or Decimal("0.00")

    @property
    def remaining_amount(self):
        return max(Decimal("0.00"), self.allocated_amount - self.spent_amount)

    @property
    def spent_percentage(self):
        if self.allocated_amount == 0:
            return 0
        return round((self.spent_amount / self.allocated_amount) * 100, 1)

    @property
    def is_over_budget(self):
        return self.spent_amount > self.allocated_amount


class BudgetTemplate(models.Model):
    """Reusable or AI-generated budget template."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="budget_templates")
    name = models.CharField(max_length=200)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    is_ai_generated = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.name} ({'AI' if self.is_ai_generated else 'Manual'})"


class BudgetTemplateCategory(models.Model):
    """Category allocations for a budget template."""

    template = models.ForeignKey(BudgetTemplate, on_delete=models.CASCADE, related_name="categories")
    category = models.ForeignKey("Category", on_delete=models.CASCADE)
    allocated_amount = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        unique_together = ["template", "category"]

    def __str__(self):
        return f"{self.category.name}: {self.allocated_amount}"

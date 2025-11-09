"""
Account-related models for the finance tracker.
"""
from django.db import models
from django.utils import timezone
from django.db.models import Q
from django.utils.translation import gettext_lazy as _
from .tagging import TaggableMixin
from .base import UserOwnedModel
from .currency import Currency
from finance_v2.models import SoftDeleteModel


class AccountQuerySet(models.QuerySet):
    """Custom QuerySet for Account model with soft delete support."""
    
    def active(self):
        """Return only non-deleted accounts."""
        return self.filter(is_deleted=False)
    
    def deleted(self):
        """Return only deleted accounts."""
        return self.filter(is_deleted=True)
    
    def with_deleted(self):
        """Return all accounts including deleted ones."""
        return self.all()
    
    def delete(self):
        """Soft delete all accounts in the queryset."""
        return self.update(
            is_deleted=True,
            status='closed',
            deleted_at=timezone.now()
        )


class AccountManager(models.Manager):
    """Custom manager for Account model with soft delete support."""
    
    def get_queryset(self):
        return AccountQuerySet(self.model, using=self._db).filter(is_deleted=False)
    
    def all_with_deleted(self):
        """Return all accounts including deleted ones."""
        return AccountQuerySet(self.model, using=self._db)
    
    def deleted(self):
        """Return only deleted accounts."""
        return self.all_with_deleted().filter(is_deleted=True)
    
    def active(self):
        """Return only active (non-deleted) accounts."""
        return self.get_queryset()


class Account(TaggableMixin, UserOwnedModel, SoftDeleteModel):
    """Financial accounts"""

    ACCOUNT_TYPES = [
        ("checking", "Checking"),
        ("savings", "Savings"),
        ("credit", "Credit Card"),
        ("investment", "Investment"),
        ("loan", "Loan"),
        ("cash", "Cash"),
        ("other", "Other"),
    ]

    STATUS_CHOICES = [
        ("active", "Active"),
        ("inactive", "Inactive"),
        ("closed", "Closed"),
        ("frozen", "Frozen"),
        ("pending", "Pending"),
    ]

    # Core Fields
    name = models.CharField(
        max_length=255,
        help_text=_("Name of the account (e.g., 'Chase Checking', 'Amazon Credit Card')")
    )
    description = models.TextField(
        blank=True,
        help_text=_("Optional description or notes about the account")
    )
    account_type = models.CharField(
        max_length=20,
        choices=ACCOUNT_TYPES,
        help_text=_("Type of the account")
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="active",
        help_text=_("Current status of the account")
    )
    balance = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0,
        help_text=_("Current balance of the account")
    )
    currency = models.ForeignKey(
        Currency,
        on_delete=models.PROTECT,
        related_name='accounts',
        help_text=_("Currency used by this account")
    )
    balance_limit = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=_("Credit limit for credit cards or minimum balance for other accounts")
    )
    account_number = models.CharField(
        max_length=100,
        blank=True,
        help_text=_("Last 4 digits of the account number")
    )
    last_sync_date = models.DateTimeField(
        null=True,
        blank=True,
        help_text=_("When the account was last synchronized with the bank")
    )
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text=_("Additional metadata for the account")
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(
        null=True,
        blank=True,
        editable=False,
        help_text=_("When the account was soft-deleted")
    )

    objects = AccountManager()
    
    class Meta(UserOwnedModel.Meta):
        app_label = "finance"
        ordering = ["name"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["account_type"]),
            models.Index(fields=["is_deleted"]),  # Index for soft delete
        ]

    def get_balance_limit_display(self):
        """Get a human-readable representation of the balance limit."""
        if self.balance_limit is None:
            return "Not set"
        
        if self.account_type == 'credit':
            return f"Credit Limit: {self.currency.format_amount(self.balance_limit)}"
        elif self.account_type in ['checking', 'savings', 'loan']:
            return f"Min. Balance: {self.currency.format_amount(self.balance_limit)}"
        return f"Limit: {self.currency.format_amount(self.balance_limit)}"

    def __str__(self):
        return f"{self.name} ({self.get_account_type_display()}) - {self.currency.code} {self.currency.format_amount(self.balance)}"

    def delete(self, using=None, keep_parents=False):
        """Override delete to perform soft delete."""
        self.status = 'closed'  # Update status to closed when soft deleting
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save(update_fields=['status', 'is_deleted', 'deleted_at'])
        
    def hard_delete(self, *args, **kwargs):
        """Permanently delete the record."""
        super().delete(*args, **kwargs)


class AccountPdfPassword(UserOwnedModel):
    """Store PDF passwords for accounts to auto-unlock statement uploads"""

    account = models.ForeignKey(
        Account,
        on_delete=models.CASCADE,
        related_name='pdf_passwords'
    )

    # Encrypted password storage
    password_encrypted = models.BinaryField(
        help_text="Encrypted PDF password"
    )

    # Metadata
    label = models.CharField(
        max_length=100,
        blank=True,
        help_text="Optional label for this password (e.g., 'Main password', 'Old password')"
    )
    last_used = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Last time this password was successfully used"
    )
    usage_count = models.PositiveIntegerField(
        default=0,
        help_text="Number of times this password was successfully used"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether to try this password during upload"
    )

    class Meta:
        app_label = "finance"
        ordering = ['-usage_count', '-last_used']
        indexes = [
            models.Index(fields=['account', 'is_active']),
            models.Index(fields=['usage_count']),
        ]

    def __str__(self):
        label_str = f" ({self.label})" if self.label else ""
        return f"Password for {self.account.name}{label_str}"

    def increment_usage(self):
        """Increment usage count and update last used timestamp"""
        from django.utils import timezone
        self.usage_count += 1
        self.last_used = timezone.now()
        self.save(update_fields=['usage_count', 'last_used'])


class BalanceRecord(UserOwnedModel):
    """Unified balance tracking for comprehensive account monitoring"""

    ENTRY_TYPES = [
        ("daily", "Daily Balance"),
        ("monthly", "Monthly Statement"),
        ("weekly", "Weekly Check"),
        ("manual", "Manual Entry"),
        ("reconciliation", "Reconciliation"),
    ]

    RECONCILIATION_STATUS = [
        ("pending", "Pending"),
        ("reconciled", "Reconciled"),
        ("discrepancy", "Has Discrepancy"),
        ("investigation", "Under Investigation"),
    ]

    # Core Information
    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name="balance_records")
    balance = models.DecimalField(max_digits=12, decimal_places=2, help_text="Account balance at this point")
    date = models.DateField(help_text="Date of the balance record")
    entry_type = models.CharField(max_length=20, choices=ENTRY_TYPES, default="manual")

    # Statement/Reconciliation Fields
    statement_balance = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        help_text="Official statement balance for comparison"
    )
    reconciliation_status = models.CharField(
        max_length=20, choices=RECONCILIATION_STATUS, default="pending"
    )
    difference = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        help_text="Difference between tracked and statement balance"
    )

    # Transaction Analysis
    total_income = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        help_text="Total income transactions for the period"
    )
    total_expenses = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        help_text="Total expense transactions for the period"
    )
    calculated_change = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        help_text="Calculated balance change based on transactions"
    )
    actual_change = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        help_text="Actual balance change from previous record"
    )
    missing_transactions = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        help_text="Estimated missing transaction amount"
    )

    # Period Information
    period_start = models.DateField(null=True, blank=True, help_text="Start of the tracking period")
    period_end = models.DateField(null=True, blank=True, help_text="End of the tracking period")
    is_month_end = models.BooleanField(default=False, help_text="Is this a month-end balance")
    year = models.IntegerField(null=True, blank=True, help_text="Year for easier filtering")
    month = models.IntegerField(null=True, blank=True, help_text="Month for easier filtering")

    # Additional Information
    notes = models.TextField(blank=True, help_text="Additional notes or observations")
    source = models.CharField(
        max_length=100, blank=True,
        help_text="Source of the balance (e.g., mobile app, website, manual)"
    )
    confidence_score = models.DecimalField(
        max_digits=3, decimal_places=2, null=True, blank=True,
        help_text="Confidence in the balance accuracy (0.00-1.00)"
    )
    metadata = models.JSONField(default=dict, blank=True, help_text="Additional metadata")

    class Meta:
        app_label = "finance"
        ordering = ["-date", "account__name"]
        unique_together = [["account", "date", "entry_type"]]
        indexes = [
            models.Index(fields=["user", "date"]),
            models.Index(fields=["account", "date"]),
            models.Index(fields=["entry_type", "date"]),
            models.Index(fields=["reconciliation_status"]),
            models.Index(fields=["is_month_end", "date"]),
            models.Index(fields=["year", "month"]),
            models.Index(fields=["user", "entry_type", "date"]),
            models.Index(fields=["account", "entry_type", "date"]),
        ]

    def save(self, *args, **kwargs):
        """Auto-populate year and month from date"""
        if self.date:
            # Convert string to date if needed
            if isinstance(self.date, str):
                from datetime import datetime
                self.date = datetime.strptime(self.date, '%Y-%m-%d').date()

            self.year = self.date.year
            self.month = self.date.month

            # Calculate actual change if we have a previous record
            if self.pk is None:  # Only for new records
                previous_record = BalanceRecord.objects.filter(
                    account=self.account,
                    date__lt=self.date
                ).order_by('-date').first()

                if previous_record:
                    self.actual_change = self.balance - previous_record.balance

                    # Calculate missing transactions if we have transaction data
                    if self.calculated_change != 0:
                        self.missing_transactions = self.actual_change - self.calculated_change

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.account.name} - {self.date} ({self.entry_type}): {self.balance}"

    @property
    def month_name(self):
        """Get month name for display"""
        if self.month:
            import calendar
            return calendar.month_name[self.month]
        return ""

    @property
    def date_display(self):
        """Get formatted date for display"""
        return self.date.strftime("%Y-%m-%d") if self.date else ""

    @property
    def has_discrepancy(self):
        """Check if there's a discrepancy between statement and tracked balance"""
        return abs(self.difference) > 0.01 or abs(self.missing_transactions) > 0.01

    @property
    def balance_status(self):
        """Get balance status for analysis"""
        if self.has_discrepancy:
            return "discrepancy"
        elif self.reconciliation_status == "reconciled":
            return "reconciled"
        else:
            return "normal"





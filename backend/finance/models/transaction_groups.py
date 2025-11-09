"""
Transaction Group models - Unified entity management for merchants, brokers, groups, etc.
"""

from django.db import models
from django.db.models import Sum, Count, Q
from decimal import Decimal
from .base import UserOwnedModel


class TransactionGroup(UserOwnedModel):
    """
    Unified entity model for all transaction-related groups.
    Replaces scattered entity references (merchant_name strings, etc.)
    with a proper normalized entity management system.

    Examples:
    - Merchants: Amazon, Walmart, Local Coffee Shop
    - Banks/Brokers: Chase, Vanguard, Coinbase
    - People: Family members, friends (for lending/borrowing)
    - Expense Groups: Paris Trip 2024, Roommate Expenses
    - Investment Entities: Stock brokers, crypto exchanges
    """

    GROUP_TYPE_CHOICES = [
        ('merchant', 'Merchant'),
        ('bank', 'Bank/Financial Institution'),
        ('broker', 'Investment Broker'),
        ('person', 'Person'),
        ('expense_group', 'Expense Group'),
        ('employer', 'Employer'),
        ('government', 'Government Entity'),
        ('charity', 'Charity/Non-Profit'),
        ('other', 'Other'),
    ]

    # Core fields
    name = models.CharField(max_length=255, db_index=True)
    group_type = models.CharField(
        max_length=20,
        choices=GROUP_TYPE_CHOICES,
        default='merchant',
        db_index=True
    )
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True, db_index=True)

    # Cached statistics (updated via signals for performance)
    total_transactions = models.IntegerField(default=0, db_index=True)
    total_spent = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00')
    )
    total_received = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00')
    )
    last_transaction_date = models.DateField(null=True, blank=True)

    # Flexible data storage for type-specific information
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Store type-specific data like website URL, tax ID, contact info, etc."
    )

    # Visual identification
    logo_url = models.URLField(max_length=500, blank=True)
    color = models.CharField(max_length=7, default='#0066CC')  # Hex color

    class Meta:
        app_label = 'finance'
        verbose_name = 'Transaction Group'
        verbose_name_plural = 'Transaction Groups'
        ordering = ['-last_transaction_date', 'name']
        indexes = [
            models.Index(fields=['user', 'group_type', 'is_active']),
            models.Index(fields=['user', 'is_active', 'total_transactions']),
            models.Index(fields=['user', 'name']),
            models.Index(fields=['user', 'last_transaction_date']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'name', 'group_type'],
                name='unique_group_per_user_name_type'
            )
        ]

    def __str__(self):
        return f"{self.name} ({self.get_group_type_display()})"

    def update_statistics(self):
        """
        Update cached statistics from related transactions.
        Called via signals when transactions are created/updated/deleted.
        """
        from .transactions import Transaction

        stats = Transaction.objects.filter(
            transaction_group=self,
            status='active'
        ).aggregate(
            total_count=Count('id'),
            total_expenses=Sum('amount', filter=Q(is_credit=False)),  # Debit = expenses
            total_income=Sum('amount', filter=Q(is_credit=True)),     # Credit = income
            last_date=models.Max('date')
        )

        self.total_transactions = stats['total_count'] or 0
        self.total_spent = Decimal(str(stats['total_expenses'] or 0))
        self.total_received = Decimal(str(stats['total_income'] or 0))
        self.last_transaction_date = stats['last_date']

        self.save(update_fields=[
            'total_transactions',
            'total_spent',
            'total_received',
            'last_transaction_date'
        ])

    def get_transaction_summary(self, start_date=None, end_date=None):
        """
        Get transaction summary for this group within a date range.

        Returns:
            dict: Summary with totals, counts, and breakdowns
        """
        from .transactions import Transaction

        queryset = Transaction.objects.filter(
            transaction_group=self,
            status='active'
        )

        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)

        summary = queryset.aggregate(
            total_transactions=Count('id'),
            total_expenses=Sum('amount', filter=Q(is_credit=False)),  # Debit = expenses
            total_income=Sum('amount', filter=Q(is_credit=True)),     # Credit = income
            avg_transaction=models.Avg('amount')
        )

        return {
            'total_transactions': summary['total_transactions'] or 0,
            'total_expenses': Decimal(str(summary['total_expenses'] or 0)),
            'total_income': Decimal(str(summary['total_income'] or 0)),
            'avg_transaction': Decimal(str(summary['avg_transaction'] or 0)),
            'net_flow': Decimal(str(summary['total_income'] or 0)) - Decimal(str(summary['total_expenses'] or 0))
        }

    @classmethod
    def get_or_create_from_name(cls, user, name, group_type='merchant'):
        """
        Helper method to get or create a TransactionGroup from a name.
        Useful for importing transactions with merchant names.

        Args:
            user: User instance
            name: Group name (e.g., "Amazon", "Walmart")
            group_type: Type of group (default: 'merchant')

        Returns:
            tuple: (TransactionGroup instance, created boolean)
        """
        if not name or not name.strip():
            return None, False

        name = name.strip()
        group, created = cls.objects.get_or_create(
            user=user,
            name=name,
            group_type=group_type,
            defaults={
                'is_active': True
            }
        )

        return group, created

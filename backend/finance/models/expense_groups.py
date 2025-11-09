from decimal import Decimal
from django.db import models
from django.conf import settings
from django.utils import timezone
from users.base_models import TimestampedModel


class ExpenseGroup(TimestampedModel):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="owned_expense_groups",
        db_index=True
    )
    GROUP_TYPE_CHOICES = [
        ("one-to-one", "One-to-One"),
        ("multi-person", "Multi-Person"),
    ]

    # Link to unified TransactionGroup entity
    transaction_group = models.OneToOneField(
        'TransactionGroup',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='expense_group_link',
        help_text="Link to the unified transaction group entity"
    ) 

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    group_type = models.CharField(
        max_length=20, choices=GROUP_TYPE_CHOICES, default="one-to-one", db_index=True
    )

    # Enhanced fields for better tracking
    is_active = models.BooleanField(default=True, db_index=True)
    purpose = models.CharField(max_length=255, blank=True)

    # Budget tracking fields
    budget_limit = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Maximum spending limit for this group (e.g., trip budget)"
    )
    budget_warning_threshold = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('80.00'),
        help_text="Percentage threshold for budget warnings (default 80%)"
    )
    budget_per_person_limit = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Maximum spending per person (optional)"
    )

    # Track group evolution for transaction isolation
    member_history = models.JSONField(default=list, blank=True)

    class Meta:
        verbose_name = "Expense Group"
        verbose_name_plural = "Expense Groups"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["owner", "is_active"]),
            models.Index(fields=["group_type", "is_active"]),
        ]

    def __str__(self):
        return self.name

    def update_group_type(self):
        """Automatically update group type based on membership count"""
        active_member_count = self.memberships.filter(is_active=True).count()
        # Owner + 0 members = one-to-one, Owner + 1+ members = multi-person
        new_type = "multi-person" if active_member_count > 0 else "one-to-one"

        if self.group_type != new_type:
            self.group_type = new_type
            self.save(update_fields=['group_type'])

    def get_active_members(self):
        """Get all active members including owner"""
        members = list(self.memberships.filter(is_active=True).select_related('user'))
        return members

    def get_total_contributions(self):
        """Calculate total contributions to this group"""
        from .goals import GroupExpense
        return GroupExpense.objects.filter(
            group=self,
            status='confirmed'
        ).aggregate(total=models.Sum('total_amount'))['total'] or 0

    def get_total_expenses(self):
        """Calculate total expenses for this group"""
        from .goals import GroupExpense
        total = GroupExpense.objects.filter(
            group=self,
            status='confirmed'
        ).aggregate(total=models.Sum('total_amount'))['total']
        return Decimal(str(total)) if total else Decimal('0.00')

    def get_budget_status(self):
        """
        Get budget status with percentage used and warnings
        Returns: dict with budget info
        """
        total_spent = self.get_total_expenses()

        if not self.budget_limit:
            return {
                'has_budget': False,
                'total_spent': total_spent,
                'budget_limit': None,
                'remaining': None,
                'percentage_used': None,
                'is_over_budget': False,
                'is_warning': False
            }

        budget_limit = Decimal(str(self.budget_limit))
        remaining = budget_limit - total_spent
        percentage_used = (total_spent / budget_limit * 100) if budget_limit > 0 else Decimal('0.00')

        warning_threshold = Decimal(str(self.budget_warning_threshold))
        is_warning = percentage_used >= warning_threshold
        is_over_budget = total_spent > budget_limit

        return {
            'has_budget': True,
            'total_spent': total_spent,
            'budget_limit': budget_limit,
            'remaining': remaining,
            'percentage_used': round(percentage_used, 2),
            'is_over_budget': is_over_budget,
            'is_warning': is_warning and not is_over_budget,
            'warning_threshold': warning_threshold
        }

    def get_per_person_spending(self):
        """
        Calculate spending per active member
        Returns: dict with per-person spending info
        """
        from .goals import GroupExpense, GroupExpenseShare

        active_members = self.get_active_members()
        member_count = len(active_members) + 1  # +1 for owner

        if member_count == 0:
            return {}

        # Get spending by each person (who paid for expenses)
        expenses = GroupExpense.objects.filter(
            group=self,
            status='confirmed'
        ).select_related('paid_by')

        per_person_data = {}

        # Include owner
        per_person_data[self.owner.id] = {
            'user': self.owner,
            'total_paid': Decimal('0.00'),
            'is_over_limit': False,
            'percentage_of_limit': None
        }

        # Include all members
        for membership in active_members:
            per_person_data[membership.user.id] = {
                'user': membership.user,
                'total_paid': Decimal('0.00'),
                'is_over_limit': False,
                'percentage_of_limit': None
            }

        # Calculate totals
        for expense in expenses:
            user_id = expense.paid_by.id
            if user_id in per_person_data:
                per_person_data[user_id]['total_paid'] += Decimal(str(expense.total_amount))

        # Check against per-person limit
        if self.budget_per_person_limit:
            limit = Decimal(str(self.budget_per_person_limit))
            for user_id, data in per_person_data.items():
                data['is_over_limit'] = data['total_paid'] > limit
                if limit > 0:
                    data['percentage_of_limit'] = round(
                        (data['total_paid'] / limit * 100), 2
                    )

        return per_person_data


class ExpenseGroupMembership(TimestampedModel):
    ROLE_CHOICES = [
        ("member", "Member"),
        ("admin", "Admin"),
    ]

    group = models.ForeignKey(
        ExpenseGroup, on_delete=models.CASCADE, related_name="memberships", db_index=True
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="expense_group_memberships",
        db_index=True
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="member", db_index=True)

    # Enhanced membership tracking
    is_active = models.BooleanField(default=True, db_index=True)
    joined_at = models.DateTimeField(default=timezone.now)
    left_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("group", "user")
        verbose_name = "Expense Group Membership"
        verbose_name_plural = "Expense Group Memberships"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["group", "is_active"]),
            models.Index(fields=["user", "is_active"]),
            models.Index(fields=["role", "is_active"]),
        ]

    def __str__(self):
        return f"{self.user.username} in {self.group.name}"

    def deactivate(self):
        """Safely deactivate membership without deleting history"""
        self.is_active = False
        self.left_at = timezone.now()
        self.save()

        # Update group type after member leaves
        self.group.update_group_type()

        # Record in group history
        self.group.member_history.append({
            "user_id": self.user.id,
            "username": self.user.username,
            "action": "left",
            "timestamp": timezone.now().isoformat(),
            "member_count_after": self.group.memberships.filter(is_active=True).count()
        })
        self.group.save(update_fields=['member_history'])
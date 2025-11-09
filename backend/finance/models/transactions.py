"""
Optimized Transaction models - Clean, lightweight, and performant.
"""

from django.db import models
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.utils.functional import cached_property
from decimal import Decimal, InvalidOperation
from .base import UserOwnedModel
from .tagging import TaggableMixin


class BaseTransaction(UserOwnedModel):
    """Abstract base for all transaction types"""

    # Core fields
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.TextField()
    date = models.DateField(db_index=True)
    currency = models.CharField(max_length=3, default="INR")
    notes = models.TextField(blank=True)
    external_id = models.CharField(max_length=255, null=True, blank=True, db_index=True)

    # Status tracking
    STATUS_CHOICES = [
        ("active", "Active"),
        ("cancelled", "Cancelled"),
        ("pending", "Pending"),
        ("failed", "Failed"),
    ]
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="active",
        db_index=True
    )

    class Meta:
        abstract = True


class HierarchicalModelMixin(models.Model):
    """
    A mixin for models that require hierarchical relationships with parent-child structure.
    Provides methods for managing hierarchy, including circular reference prevention.
    """
    parent = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='children'
    )
    
    class Meta:
        abstract = True

    def clean(self):
        """Validate the hierarchy to prevent circular references"""
        super().clean()
        self._validate_hierarchy()

    def _validate_hierarchy(self):
        """Check for circular references in the hierarchy"""
        if not self.parent_id:
            return
            
        if self.parent_id == self.pk:
            raise ValidationError("A category cannot be a parent of itself.")
            
        visited = {self.pk}
        current = self.parent
        while current and current.pk:
            if current.pk in visited:
                raise ValidationError("Circular reference detected in category hierarchy.")
            visited.add(current.pk)
            current = current.parent

    @cached_property
    def ancestors(self):
        """Get all ancestors of this instance"""
        if not self.parent_id:
            return []
        return [self.parent] + self.parent.ancestors

    @cached_property
    def descendants(self):
        """Get all descendants of this instance"""
        result = []
        children = list(self.children.all())
        result.extend(children)
        for child in children:
            result.extend(child.descendants)
        return result

    def get_inherited_value(self, field_name, default=None):
        """
        Get a field's value, inheriting from parent if not set
        Returns (value, inherited_from)
        """
        if not hasattr(self, field_name):
            raise AttributeError(f"'{self.__class__.__name__}' has no attribute '{field_name}'")
            
        value = getattr(self, field_name)
        if value or not self.parent_id:
            return value, None
            
        return self.parent.get_inherited_value(field_name, default)

    def save(self, *args, **kwargs):
        """Save the instance and update any denormalized fields"""
        self.full_clean()
        super().save(*args, **kwargs)


class Category(HierarchicalModelMixin, UserOwnedModel):
    """Transaction categories with hierarchical support"""
    name = models.CharField(max_length=100)
    icon = models.CharField(max_length=50, blank=True)
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        app_label = "finance"
        verbose_name_plural = "Categories"
        ordering = ["name"]
        indexes = [
            models.Index(fields=["user", "is_active"]),
            models.Index(fields=["parent"]),
        ]

    def __str__(self):
        return self.name

    @property
    def display_icon(self):
        """Get the icon, inheriting from parent if not set"""
        icon, _ = self.get_inherited_value('icon', 'default_icon')
        return icon


class Transaction(TaggableMixin, BaseTransaction):
    """
    ⭐ ULTRA-OPTIMIZED Transaction Model - Absolute Minimal Core

    Core Philosophy:
    - Only 5 ESSENTIAL fields (vs 30+ in old model) = 83% smaller table!
    - Everything else in metadata JSON = infinite flexibility
    - Single transaction_group FK for ALL entities = unified architecture
    - Just track credit/debit - everything else is context

    What's in the database (ONLY core fields + inherited):
    1. account (FK) - Required - which account this affects
    2. transaction_group (FK) - Optional - universal entity reference
    3. category (FK) - Optional - primary transaction category
    4. is_credit (boolean) - True = money IN, False = money OUT
    5. metadata (JSON) - ALL flexible data lives here
    6. external_id (string) - For external system integration (inherited from BaseTransaction)
    7. is_deleted (boolean) - Soft delete support
    8. deleted_at (datetime) - Soft delete timestamp

    What's in metadata (accessed via properties):
    - suggested_category_id: AI suggestions
    - original_description: Pre-AI processing text
    - transfer_account_id: For transfers
    - gmail_message_id: Email imports
    - verified: Manual verification flag
    - confidence_score: AI confidence
    - source: Import source (gmail, csv, manual, etc.)
    - supporting_documents: Receipt/invoice files
    - transaction_subtype: 'income', 'expense', 'transfer', 'investment', etc.
    - And any custom fields!

    Why this is genius:
    - ✅ category stored via ForeignKey (normalized data)
    - ✅ Only track debit/credit (accounting basics)
    - ✅ All context in metadata & transaction_group
    - ✅ Can add new fields without migrations
    - ✅ Smallest possible table = fastest queries
    """

    # Transaction type - BOOLEAN! True = Credit (money in), False = Debit (money out)
    # This is the most minimal way to track transaction direction
    is_credit = models.BooleanField(
        default=False,
        db_index=True,
        help_text="True = Credit (money IN), False = Debit (money OUT)"
    )

    # Essential relationships
    account = models.ForeignKey(
        "Account",
        on_delete=models.CASCADE,
        related_name="transactions",
        db_index=True
    )

    # Unified entity reference for ALL groups
    # This handles: merchants, expense groups, banks, people, categories, etc.
    transaction_group = models.ForeignKey(
        "TransactionGroup",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transactions",
        db_index=True,
        help_text="Universal entity: merchant, expense group, bank, person, category, etc."
    )

    category = models.ForeignKey(
        "Category",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transactions",
        db_index=True,
        help_text="Primary transaction category (replaces metadata['category_id'])"
    )

    # Soft delete support (for audit trail and data recovery)
    is_deleted = models.BooleanField(default=False, db_index=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    # Flexible metadata (for additional data without schema changes)
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="""Flexible storage for ALL transaction context:
        - suggested_category_id: AI-suggested category ID
        - original_description: Original description before AI processing
        - transfer_account_id: For transfers (account ID)
        - transaction_subtype: 'income', 'expense', 'transfer', 'investment', 'lending'
        - gmail_message_id: Gmail message ID if imported from email
        - external_source_id: ID from external source (Splitwise, bank, etc.)
        - supporting_documents: List of file paths/URLs for receipts, invoices
        - verified: Boolean - manual verification flag
        - confidence_score: AI categorization confidence (0-100)
        - source: Import source (gmail, csv, manual, splitwise, etc.)
        - tags: List of custom tags
        - location: Transaction location data
        - custom_fields: Any other custom data
        """
    )

    class Meta:
        app_label = "finance"
        verbose_name = "Transaction"
        verbose_name_plural = "Transactions"
        ordering = ["-date", "-created_at"]
        indexes = [
            # Core query patterns
            models.Index(fields=["user", "date"]),
            models.Index(fields=["user", "status", "date"]),
            models.Index(fields=["user", "is_credit", "date"]),  # Filter by credit/debit

            # Relationship indexes
            models.Index(fields=["user", "account", "date"]),
            models.Index(fields=["user", "transaction_group", "date"]),
            models.Index(fields=["user", "category", "date"]),

            # Soft delete support
            models.Index(fields=["user", "is_deleted", "date"]),

            # External integrations
            models.Index(fields=["external_id"]),
        ]

    def __str__(self):
        return f"{self.description} - {self.amount} ({self.date})"

    def clean(self):
        """Validate transaction data"""
        super().clean()

        # Validate transfer transactions
        if self.metadata.get('transaction_subtype') == 'transfer':
            transfer_account_id = self.metadata.get('transfer_account_id')
            if not transfer_account_id:
                raise ValidationError({
                    'metadata': 'Transfer transactions require transfer_account_id in metadata'
                })
            if self.account_id == transfer_account_id:
                raise ValidationError({
                    'metadata': 'Cannot transfer to the same account'
                })

        # Validate amount is positive
        if self.amount < 0:
            raise ValidationError({
                'amount': 'Amount must be positive'
            })

        if self.category_id and not Category.objects.filter(
            id=self.category_id,
            user_id=self.user_id,
        ).exists():
            raise ValidationError({
                'category': 'Category must belong to the same user'
            })

    def save(self, *args, **kwargs):
        """Override save to run validation"""
        self.full_clean()
        super().save(*args, **kwargs)

    def delete(self, soft=True, *args, **kwargs):
        """
        Soft delete by default to maintain audit trail.
        Use delete(soft=False) for hard delete.
        """
        if soft:
            self.is_deleted = True
            from django.utils import timezone
            self.deleted_at = timezone.now()
            self.save()
        else:
            super().delete(*args, **kwargs)

    # Helper properties for metadata fields
    @property
    def suggested_category_id(self):
        """Get AI-suggested category ID from metadata"""
        return self.metadata.get('suggested_category_id')

    @suggested_category_id.setter
    def suggested_category_id(self, value):
        """Set AI-suggested category ID in metadata"""
        self.metadata['suggested_category_id'] = value

    @property
    def original_description(self):
        """Get original description from metadata"""
        return self.metadata.get('original_description')

    @original_description.setter
    def original_description(self, value):
        """Set original description in metadata"""
        self.metadata['original_description'] = value

    @property
    def transaction_subtype(self):
        """Get transaction subtype from metadata ('income', 'expense', 'transfer', etc.)"""
        return self.metadata.get('transaction_subtype')

    @transaction_subtype.setter
    def transaction_subtype(self, value):
        """Set transaction subtype in metadata"""
        if value is None:
            self.metadata.pop('transaction_subtype', None)
        else:
            self.metadata['transaction_subtype'] = value

    @property
    def transaction_category(self):
        """Get high-level transaction category from metadata (lending, group_expense, etc.)"""
        return self.metadata.get('transaction_category')

    @transaction_category.setter
    def transaction_category(self, value):
        """Set transaction category in metadata"""
        if value is None:
            self.metadata.pop('transaction_category', None)
        else:
            self.metadata['transaction_category'] = value

    @property
    def investment_id(self):
        """Get associated investment ID from metadata"""
        investment_id = self.metadata.get('investment_id')
        if investment_id in (None, '', 0):
            return None
        try:
            return int(investment_id)
        except (TypeError, ValueError):
            return investment_id

    @investment_id.setter
    def investment_id(self, value):
        """Set associated investment ID in metadata"""
        if value in (None, '', 0):
            self.metadata.pop('investment_id', None)
        else:
            self.metadata['investment_id'] = value

    @property
    def investment(self):
        """Return associated Investment if available"""
        investment_id = self.investment_id
        if not investment_id:
            return None
        try:
            from finance.models.investments import Investment  # Avoid circular import
        except Exception:
            return None
        return Investment.objects.filter(id=investment_id, user_id=self.user_id).first()

    def _get_decimal_metadata(self, key):
        value = self.metadata.get(key)
        if value in (None, ''):
            return None
        try:
            return Decimal(str(value))
        except (InvalidOperation, TypeError, ValueError):
            return None

    def _set_decimal_metadata(self, key, value):
        if value in (None, ''):
            self.metadata.pop(key, None)
        else:
            self.metadata[key] = str(value)

    @property
    def quantity(self):
        """Get quantity value from metadata"""
        return self._get_decimal_metadata('quantity')

    @quantity.setter
    def quantity(self, value):
        """Set quantity value in metadata"""
        self._set_decimal_metadata('quantity', value)

    @property
    def price_per_unit(self):
        """Get unit price from metadata"""
        return self._get_decimal_metadata('price_per_unit')

    @price_per_unit.setter
    def price_per_unit(self, value):
        """Set unit price in metadata"""
        self._set_decimal_metadata('price_per_unit', value)

    @property
    def fees(self):
        """Get fees from metadata"""
        return self._get_decimal_metadata('fees')

    @fees.setter
    def fees(self, value):
        """Set fees in metadata"""
        self._set_decimal_metadata('fees', value)

    @property
    def investment_symbol(self):
        """Get investment symbol from metadata"""
        return self.metadata.get('investment_symbol')

    @investment_symbol.setter
    def investment_symbol(self, value):
        """Set investment symbol in metadata"""
        if value in (None, ''):
            self.metadata.pop('investment_symbol', None)
        else:
            self.metadata['investment_symbol'] = value

    @property
    def transaction_type(self):
        """
        Backward-compatible accessor for legacy code.
        Returns metadata subtype when available, otherwise derives from is_credit.
        """
        subtype = self.transaction_subtype
        if subtype:
            return subtype
        return "income" if self.is_credit else "expense"

    @transaction_type.setter
    def transaction_type(self, value):
        """
        Setter to maintain compatibility with legacy callers.
        Updates subtype metadata and aligns is_credit for income/expense.
        """
        if value in (None, ""):
            self.metadata.pop('transaction_subtype', None)
            return

        normalized = str(value).lower()
        self.metadata['transaction_subtype'] = normalized
        if normalized == "income":
            self.is_credit = True
        elif normalized == "expense":
            self.is_credit = False

    @property
    def transfer_account_id(self):
        """Get transfer account ID from metadata"""
        return self.metadata.get('transfer_account_id')

    @transfer_account_id.setter
    def transfer_account_id(self, value):
        """Set transfer account ID in metadata"""
        self.metadata['transfer_account_id'] = value

    @property
    def gmail_message_id(self):
        """Get Gmail message ID from metadata"""
        return self.metadata.get('gmail_message_id')

    @gmail_message_id.setter
    def gmail_message_id(self, value):
        """Set Gmail message ID in metadata"""
        self.metadata['gmail_message_id'] = value

    @property
    def verified(self):
        """Get verified status from metadata"""
        return self.metadata.get('verified', False)

    @verified.setter
    def verified(self, value):
        """Set verified status in metadata"""
        self.metadata['verified'] = bool(value)

    @property
    def confidence_score(self):
        """Get AI confidence score from metadata"""
        return self.metadata.get('confidence_score')

    @confidence_score.setter
    def confidence_score(self, value):
        """Set AI confidence score in metadata"""
        self.metadata['confidence_score'] = value

    @property
    def source(self):
        """Get transaction source from metadata"""
        return self.metadata.get('source', 'manual')

    @source.setter
    def source(self, value):
        """Set transaction source in metadata"""
        self.metadata['source'] = value

    # Lending-specific properties
    @property
    def contact_user_id(self):
        """Get contact user ID from metadata (for lending/borrowing)"""
        contact_id = self.metadata.get('contact_user_id')
        if contact_id in (None, '', 0):
            return None
        try:
            return int(contact_id)
        except (TypeError, ValueError):
            return contact_id

    @contact_user_id.setter
    def contact_user_id(self, value):
        """Set contact user ID in metadata"""
        if value in (None, '', 0):
            self.metadata.pop('contact_user_id', None)
        else:
            self.metadata['contact_user_id'] = value
        if hasattr(self, "_contact_user_cache"):
            self._contact_user_cache = None

    @property
    def contact_user(self):
        """Return the User instance referenced in metadata, if available"""
        contact_user_id = self.contact_user_id
        if not contact_user_id:
            return None

        cached = getattr(self, "_contact_user_cache", None)
        if cached and cached.id == contact_user_id:
            return cached

        # Lazy load to avoid hard FK relationship
        User = get_user_model()
        contact_user = User.objects.filter(id=contact_user_id).first()
        self._contact_user_cache = contact_user
        return contact_user

    @contact_user.setter
    def contact_user(self, value):
        """Allow assigning a User instance or ID"""
        if value is None:
            self.contact_user_id = None
            return

        if hasattr(value, 'id'):  # User instance
            self._contact_user_cache = value
            self.contact_user_id = value.id
        else:
            self.contact_user_id = value
            if hasattr(self, "_contact_user_cache"):
                self._contact_user_cache = None

    @property
    def due_date(self):
        """Get due date from metadata (for lending/borrowing)"""
        due_date_str = self.metadata.get('due_date')
        if not due_date_str:
            return None
        try:
            from datetime import datetime
            return datetime.fromisoformat(str(due_date_str)).date()
        except (ValueError, TypeError, AttributeError):
            return None

    @due_date.setter
    def due_date(self, value):
        """Set due date in metadata"""
        if value is None:
            self.metadata.pop('due_date', None)
        else:
            if hasattr(value, 'isoformat'):
                self.metadata['due_date'] = value.isoformat()
            else:
                self.metadata['due_date'] = str(value)

    @property
    def interest_rate(self):
        """Get interest rate from metadata (for lending/borrowing)"""
        return self._get_decimal_metadata('interest_rate')

    @interest_rate.setter
    def interest_rate(self, value):
        """Set interest rate in metadata"""
        self._set_decimal_metadata('interest_rate', value)

    @property
    def display_description(self):
        """Get display description with merchant name if available"""
        if self.transaction_group:
            return f"{self.transaction_group.name} - {self.description}"
        return self.description

    @property
    def has_details(self):
        """Check if transaction has detail records"""
        return self.details.exists()

    @property
    def total_details_amount(self):
        """Calculate total amount from all details"""
        from django.db.models import Sum
        total = self.details.aggregate(total=Sum('amount'))['total']
        return Decimal(str(total)) if total else Decimal('0.00')

    def get_merchant_name(self):
        """Get merchant name for backward compatibility"""
        return self.transaction_group.name if self.transaction_group else None

    @classmethod
    def get_active_queryset(cls):
        """Get queryset excluding soft-deleted transactions"""
        return cls.objects.filter(is_deleted=False)

    @classmethod
    def get_credit_total(cls, user, start_date=None, end_date=None):
        """Calculate total credits (money in) for a user within a date range"""
        from django.db.models import Sum
        queryset = cls.get_active_queryset().filter(
            user=user,
            is_credit=True,
            status='active'
        )

        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)

        total = queryset.aggregate(total=Sum('amount'))['total']
        return Decimal(str(total)) if total else Decimal('0.00')

    @classmethod
    def get_debit_total(cls, user, start_date=None, end_date=None):
        """Calculate total debits (money out) for a user within a date range"""
        from django.db.models import Sum
        queryset = cls.get_active_queryset().filter(
            user=user,
            is_credit=False,
            status='active'
        )

        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)

        total = queryset.aggregate(total=Sum('amount'))['total']
        return Decimal(str(total)) if total else Decimal('0.00')

    # Backward compatibility aliases
    @classmethod
    def get_income_total(cls, *args, **kwargs):
        """Alias for get_credit_total (backward compatibility)"""
        return cls.get_credit_total(*args, **kwargs)

    @classmethod
    def get_expense_total(cls, *args, **kwargs):
        """Alias for get_debit_total (backward compatibility)"""
        return cls.get_debit_total(*args, **kwargs)


# Custom manager for active transactions
class ActiveTransactionManager(models.Manager):
    """Manager that returns only non-deleted transactions"""

    def get_queryset(self):
        return super().get_queryset().filter(is_deleted=False)


# Add custom manager to Transaction
Transaction.add_to_class('active_objects', ActiveTransactionManager())

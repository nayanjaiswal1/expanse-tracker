from decimal import Decimal

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


User = get_user_model()



class Entity(models.Model):
    """Universal entity that can represent merchants, people, or companies."""

    ENTITY_TYPES = [
        ("merchant", "Merchant"),
        ("person", "Person"),
        ("company", "Company"),
        ("bank", "Bank"),
        ("government", "Government"),
        ("other", "Other"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="entities_v2",
    )
    name = models.CharField(max_length=200)
    entity_type = models.CharField(max_length=20, choices=ENTITY_TYPES, default="merchant")
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Entities"
        indexes = [
            models.Index(fields=["user", "entity_type"]),
            models.Index(fields=["user", "is_active"]),
        ]
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Group(models.Model):
    """Shared expense groups such as trips or roommates."""

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="created_groups_v2",
    )
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    currency = models.CharField(max_length=3)  # No default - get from creator's preferences
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["created_by", "is_active"]),
        ]
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class GroupMember(models.Model):
    """Membership within a group with running balance tracking."""

    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name="members")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="group_memberships_v2")

    total_paid = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_owed = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    is_admin = models.BooleanField(default=False)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [["group", "user"]]
        indexes = [
            models.Index(fields=["group"]),
        ]
        ordering = ["group", "user"]

    def __str__(self) -> str:
        return f"{self.user} in {self.group}"

    @property
    def balance(self) -> models.DecimalField:
        """Positive balance means others owe them money."""
        return self.total_paid - self.total_owed


class SoftDeleteQuerySet(models.QuerySet):
    """Queryset mixin for soft-deletable models."""

    def delete(self):
        return super().update(is_deleted=True, updated_at=timezone.now())

    def hard_delete(self):
        return super().delete()

    def alive(self):
        return self.filter(is_deleted=False)

    def deleted(self):
        return self.filter(is_deleted=True)


class SoftDeleteManager(models.Manager):
    """Manager that hides soft-deleted records by default."""

    def __init__(self, include_deleted: bool = False, *args, **kwargs):
        self.include_deleted = include_deleted
        super().__init__(*args, **kwargs)

    def get_queryset(self):
        queryset = SoftDeleteQuerySet(self.model, using=self._db)
        if not self.include_deleted:
            return queryset.filter(is_deleted=False)
        return queryset

    def hard_delete(self):
        return self.get_queryset().hard_delete()


class SoftDeleteModel(models.Model):
    """Abstract base model with soft delete + timestamps."""

    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = SoftDeleteManager()
    all_objects = SoftDeleteManager(include_deleted=True)

    class Meta:
        abstract = True

    def delete(self, using=None, keep_parents=False):  # noqa: D401
        """Soft delete the record."""
        self.is_deleted = True
        self.save(update_fields=["is_deleted", "updated_at"])

    def hard_delete(self, using=None, keep_parents=False):
        super().delete(using=using, keep_parents=keep_parents)


class Transaction(SoftDeleteModel):
    """Core financial transaction representing money in or out."""

    CLASSIFICATION_CHOICES = [
        ('regular', 'Regular'),
        ('charity', 'Charity'),
        ('family', 'Family Support'),
        ('reimbursable', 'Reimbursable'),
        ('one_time', 'One-time'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="transactions_v2")
    account = models.ForeignKey(
        'finance.Account',  # Using string reference to avoid circular import
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transactions_v2",  # Updated to avoid conflict with main finance app
    )

    amount = models.DecimalField(max_digits=15, decimal_places=2)
    is_expense = models.BooleanField()

    description = models.CharField(max_length=500, blank=True)
    date = models.DateField()

    entity = models.ForeignKey(
        Entity,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transactions",
    )
    group = models.ForeignKey(
        Group,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transactions",
    )

    # New fields for enhanced expense tracking
    expense_classification = models.CharField(
        max_length=20,
        choices=CLASSIFICATION_CHOICES,
        default='regular',
    )
    exclude_from_totals = models.BooleanField(default=False)
    chat_metadata = models.JSONField(default=dict, blank=True)

    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "date", "-created_at"]),
            models.Index(fields=["user", "is_expense", "date"]),
            models.Index(fields=["user", "is_deleted"]),
            models.Index(fields=["group"]),
        ]
        ordering = ["-date", "-created_at"]

    def __str__(self) -> str:
        direction = "expense" if self.is_expense else "income"
        return f"{self.description or self.amount} ({direction})"

    @property
    def currency(self) -> str:
        """Get currency from account or group or user preferences."""
        if self.account:
            return self.account.currency
        if self.group:
            return self.group.currency
        # Fallback to user preferences
        if hasattr(self.user, 'preferences') and self.user.preferences:
            return self.user.preferences.preferred_currency
        return "USD"  # Final fallback


class TransactionItem(models.Model):
    """Line items belonging to a transaction. Categories live here."""

    transaction = models.ForeignKey(Transaction, on_delete=models.CASCADE, related_name="items")
    name = models.CharField(max_length=300)
    quantity = models.DecimalField(max_digits=10, decimal_places=3, default=1)
    unit_price = models.DecimalField(max_digits=15, decimal_places=2)
    amount = models.DecimalField(max_digits=15, decimal_places=2, editable=False)
    metadata = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["transaction"]),
        ]
        ordering = ["transaction", "name"]

    def __str__(self) -> str:
        return f"{self.name} x{self.quantity}"

    def save(self, *args, **kwargs):
        quantity = self.quantity or Decimal("0")
        unit_price = self.unit_price or Decimal("0")
        self.amount = quantity * unit_price
        super().save(*args, **kwargs)


class TransactionSplit(models.Model):
    """Recorded splits for group transactions."""

    SPLIT_METHOD_CHOICES = [
        ('equal', 'Equal'),
        ('percentage', 'Percentage'),
        ('amount', 'Amount'),
        ('shares', 'Shares'),
    ]

    transaction = models.ForeignKey(
        Transaction, on_delete=models.CASCADE, related_name="splits"
    )
    member = models.ForeignKey(
        GroupMember, on_delete=models.CASCADE, related_name="splits"
    )
    amount = models.DecimalField(max_digits=15, decimal_places=2)

    # New fields for flexible splits
    split_method = models.CharField(
        max_length=20,
        choices=SPLIT_METHOD_CHOICES,
        default='equal',
    )
    split_value = models.DecimalField(
        max_digits=12,
        decimal_places=4,
        default=0,
        help_text="Percentage (e.g., 33.33) or shares (e.g., 2)"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [["transaction", "member"]]
        indexes = [
            models.Index(fields=["transaction"]),
        ]
        ordering = ["transaction", "member"]

    def __str__(self) -> str:
        return f"{self.member.user}: {self.amount}"


# Old models removed - replaced by UploadedFile and PendingTransaction
# Document → UploadedFile (file_type='receipt', 'invoice', 'bill', 'document')
# Statement → UploadedFile (file_type='statement', account required)
# StatementTransaction → PendingTransaction (source='file')


# Budget and BudgetCategoryPreference models have been moved to finance.models.budgets


class PendingTransaction(SoftDeleteModel):
    """Transactions awaiting user review before committing to the ledger."""

    SOURCE_CHOICES = [
        ('email', 'Email'),
        ('file', 'Uploaded File'),  # Statements, receipts, invoices, etc.
        ('manual', 'Manual Entry'),
        ('api', 'API Import'),
    ]

    STATUS_CHOICES = [
        ("pending", "Pending Review"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
        ("merged", "Merged with Another"),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="pending_transactions_v2")
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES)
    source_id = models.CharField(max_length=255, blank=True)

    # Core transaction data
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    is_expense = models.BooleanField()
    description = models.CharField(max_length=500, blank=True)
    date = models.DateField()

    # Relationships
    entity = models.ForeignKey(Entity, on_delete=models.SET_NULL, null=True, blank=True, related_name="pending_transactions")
    group = models.ForeignKey(Group, on_delete=models.SET_NULL, null=True, blank=True, related_name="pending_transactions")

    metadata = models.JSONField(default=dict, blank=True)
    items = models.JSONField(default=list, blank=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    imported_transaction = models.ForeignKey(
        Transaction,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pending_sources",
    )

    class Meta:
        indexes = [
            models.Index(fields=["user", "status"]),
            models.Index(fields=["source", "source_id"]),
            models.Index(fields=["date"]),
        ]
        ordering = ["-date", "-created_at"]

    def __str__(self) -> str:
        return f"{self.description or 'Pending transaction'} - {self.amount}"


def uploaded_file_path(instance: "UploadedFile", filename: str) -> str:
    """Generate upload path for files."""
    return f"uploads/{instance.user_id}/{timezone.now():%Y/%m}/{filename}"


class UploadedFile(models.Model):
    """Universal file storage - statements, receipts, invoices, bills, documents.

    Replaces the old Statement and Document models.
    """

    FILE_TYPE_CHOICES = [
        ('statement', 'Bank Statement'),
        ('receipt', 'Receipt'),
        ('invoice', 'Invoice'),
        ('bill', 'Bill'),
        ('document', 'Other Document'),
    ]
    PROCESSING_MODE_CHOICES = [
        ('parser', 'Deterministic Parser'),
        ('ai', 'AI Parser'),
    ]

    # Owner
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='uploaded_files_v2'
    )
    # Account reference removed

    # File info
    file = models.FileField(upload_to=uploaded_file_path)
    file_name = models.CharField(max_length=255)
    file_type = models.CharField(max_length=20, choices=FILE_TYPE_CHOICES)
    processing_mode = models.CharField(
        max_length=20,
        choices=PROCESSING_MODE_CHOICES,
        default='parser',
        help_text='Select AI-driven parsing or the deterministic parser',
    )
    file_hash = models.CharField(max_length=64, unique=True, db_index=True)
    mime_type = models.CharField(max_length=100)

    # Polymorphic link - can link to Transaction, Group, or nothing
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    object_id = models.PositiveIntegerField(null=True, blank=True)
    content_object = GenericForeignKey('content_type', 'object_id')

    # OCR results (for images/PDFs)
    ocr_text = models.TextField(blank=True)

    # New fields for enhanced statement management
    is_password_protected = models.BooleanField(default=False)
    raw_text = models.TextField(blank=True, help_text="Raw extracted text for comparison")
    parsed_data = models.JSONField(blank=True, null=True, help_text="Structured parsed data")
    used_password = models.ForeignKey(
        'StatementPassword',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='unlocked_files'
    )

    # Metadata - stores everything:
    # - Processing status: {'processing_status': 'completed', 'celery_task_id': 'abc-123'}
    # - Statement data: {'period_start': '2024-01-01', 'transactions_created': 50}
    # - OCR data: {'ocr_confidence': 0.95, 'extracted_amount': 500}
    # - Errors: {'error': 'OCR failed', 'failed_at': '...'}
    metadata = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['file_type']),
            models.Index(fields=['file_hash']),
            models.Index(fields=['content_type', 'object_id']),
            models.Index(fields=['created_at']),
        ]
        ordering = ['-created_at']

    def __str__(self) -> str:
        return f"{self.get_file_type_display()}: {self.file_name}"

    @property
    def is_statement(self) -> bool:
        """Check if this is a statement file."""
        return self.file_type == 'statement'

    @property
    def linked_to(self):
        """Get what this file is linked to (Transaction, Group, or None)."""
        return self.content_object

    @property
    def is_linked(self) -> bool:
        """Check if file is linked to anything."""
        return self.content_type is not None and self.object_id is not None

    @property
    def processing_status(self) -> str:
        """Get processing status from metadata or Celery.

        Returns: 'not_processed', 'pending', 'processing', 'completed', 'failed'
        """
        # Check cached status in metadata
        if 'processing_status' in self.metadata:
            return self.metadata['processing_status']

        # If no cached status, check Celery
        task_id = self.metadata.get('celery_task_id')
        if task_id:
            try:
                from celery.result import AsyncResult
                result = AsyncResult(task_id)
                # Map Celery states to our statuses
                state_mapping = {
                    'PENDING': 'pending',
                    'STARTED': 'processing',
                    'SUCCESS': 'completed',
                    'FAILURE': 'failed',
                    'RETRY': 'processing',
                }
                return state_mapping.get(result.state, 'not_processed')
            except Exception:
                pass

        return 'not_processed'

    @property
    def is_processed(self) -> bool:
        """Check if file has been processed successfully."""
        return self.metadata.get('processing_status') == 'completed'


class ChatMessage(models.Model):
    """WhatsApp-style chat messages for quick transaction entry."""

    MESSAGE_TYPE_CHOICES = [
        ('user', 'User'),
        ('system', 'System'),
        ('suggestion', 'Suggestion'),
    ]
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='chat_messages'
    )
    conversation_id = models.CharField(
        max_length=255,
        default='main',
        db_index=True,
        help_text="Group messages by conversation"
    )
    message_type = models.CharField(
        max_length=20,
        choices=MESSAGE_TYPE_CHOICES,
        default='user'
    )
    content = models.TextField()
    metadata = models.JSONField(
        default=dict,
        help_text="Parsed data, mentions, AI confidence, etc."
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='draft'
    )

    related_transaction = models.ForeignKey(
        Transaction,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='chat_messages'
    )
    related_file = models.ForeignKey(
        UploadedFile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='chat_messages'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'finance_chat_messages'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'conversation_id', '-created_at']),
            models.Index(fields=['user', 'status']),
        ]

    def __str__(self) -> str:
        return f"{self.user} - {self.conversation_id} - {self.created_at:%Y-%m-%d}"


class StatementPassword(models.Model):
    """Encrypted password storage for password-protected statements."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='statement_passwords'
    )
    account = models.ForeignKey(
        'finance.Account',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='statement_passwords'
    )

    encrypted_password = models.BinaryField(
        help_text="Fernet encrypted password"
    )
    password_hint = models.CharField(max_length=255, blank=True)
    is_default = models.BooleanField(
        default=False,
        help_text="Default password to try first"
    )

    last_used = models.DateTimeField(null=True, blank=True)
    success_count = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'finance_statement_passwords'
        ordering = ['-is_default', '-success_count']
        indexes = [
            models.Index(fields=['user', 'account']),
        ]

    def __str__(self) -> str:
        return f"{self.user} - {self.account or 'Global'}"

    def set_password(self, plain_password: str):
        """Encrypt and store password using Fernet."""
        from cryptography.fernet import Fernet
        from django.conf import settings
        key = getattr(settings, 'STATEMENT_PASSWORD_KEY', Fernet.generate_key())
        cipher = Fernet(key)
        self.encrypted_password = cipher.encrypt(plain_password.encode())

    def get_password(self) -> str:
        """Decrypt and return password."""
        from cryptography.fernet import Fernet
        from django.conf import settings
        key = getattr(settings, 'STATEMENT_PASSWORD_KEY', Fernet.generate_key())
        cipher = Fernet(key)
        return cipher.decrypt(self.encrypted_password).decode()

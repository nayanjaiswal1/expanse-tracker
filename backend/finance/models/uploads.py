"""
Upload session and statement tracking models for the finance app.
"""

from django.db import models
from django.contrib.auth import get_user_model
from .base import UserOwnedModel
from .accounts import Account
from .tagging import TaggableMixin

User = get_user_model()


class UploadSession(UserOwnedModel):
    """Track file upload sessions for statement processing"""

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]

    # File information
    original_filename = models.CharField(max_length=255)
    file_type = models.CharField(max_length=20)  # pdf, csv, json, excel
    file_size = models.BigIntegerField()
    file_hash = models.CharField(max_length=64, null=True, blank=True)  # For duplicate detection

    # Processing information
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    account = models.ForeignKey(
        Account,
        on_delete=models.CASCADE,
        related_name='upload_sessions',
        null=True,
        blank=True
    )

    # Results
    total_transactions = models.PositiveIntegerField(default=0)
    successful_imports = models.PositiveIntegerField(default=0)
    failed_imports = models.PositiveIntegerField(default=0)
    duplicate_imports = models.PositiveIntegerField(default=0)

    # Processing metadata
    processing_started_at = models.DateTimeField(null=True, blank=True)
    processing_completed_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    processing_log = models.JSONField(default=dict, blank=True)

    # File content (for small files or temporary storage)
    file_content = models.BinaryField(null=True, blank=True)

    # AI/ML processing flags
    requires_password = models.BooleanField(default=False)
    password_attempts = models.PositiveIntegerField(default=0)
    ai_categorization_enabled = models.BooleanField(default=True)

    # Transaction linking
    linked_transactions = models.JSONField(
        default=list,
        blank=True,
        help_text="List of transaction IDs created from this statement"
    )

    # Table extraction data
    extracted_tables = models.JSONField(
        default=list,
        blank=True,
        help_text="List of tables extracted from PDF with bounding boxes"
    )
    table_extraction_metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Metadata about table extraction (AI model used, confidence scores, etc.)"
    )

    class Meta:
        app_label = 'finance'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['user', 'account']),
            models.Index(fields=['file_hash']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.original_filename} - {self.status}"

    def mark_processing(self):
        """Mark session as processing"""
        from django.utils import timezone
        self.status = 'processing'
        self.processing_started_at = timezone.now()
        self.save()

    def mark_completed(self):
        """Mark session as completed"""
        from django.utils import timezone
        self.status = 'completed'
        self.processing_completed_at = timezone.now()
        self.save()

    def mark_failed(self, error_message: str):
        """Mark session as failed with error message"""
        from django.utils import timezone
        self.status = 'failed'
        self.error_message = error_message
        self.processing_completed_at = timezone.now()
        self.save()

    def add_log_entry(self, level: str, message: str, **kwargs):
        """Add entry to processing log"""
        from django.utils import timezone

        if not self.processing_log:
            self.processing_log = {'entries': []}
        elif 'entries' not in self.processing_log:
            self.processing_log['entries'] = []

        entry = {
            'timestamp': timezone.now().isoformat(),
            'level': level,
            'message': message,
            **kwargs
        }
        self.processing_log['entries'].append(entry)
        self.save(update_fields=['processing_log'])


class StatementImport(TaggableMixin, UserOwnedModel):
    """Individual statement file within an upload session"""

    upload_session = models.ForeignKey(
        UploadSession,
        on_delete=models.CASCADE,
        related_name='statement_imports'
    )

    # Statement metadata
    statement_period_start = models.DateField(null=True, blank=True)
    statement_period_end = models.DateField(null=True, blank=True)
    institution_name = models.CharField(max_length=255, blank=True)
    account_number_masked = models.CharField(max_length=50, blank=True)

    # Processing results
    raw_text_content = models.TextField(blank=True)  # Extracted text from PDF/files
    parsed_data = models.JSONField(default=dict, blank=True)  # Structured data
    metadata = models.JSONField(default=dict, blank=True, help_text="Statement level metadata & linked transaction ids")

    class Meta:
        app_label = 'finance'
        ordering = ['statement_period_start']


class TransactionImport(UserOwnedModel):
    """Track individual transaction imports within a statement"""

    upload_session = models.ForeignKey(
        UploadSession,
        on_delete=models.CASCADE,
        related_name='transaction_imports'
    )
    statement_import = models.ForeignKey(
        StatementImport,
        on_delete=models.CASCADE,
        related_name='transaction_imports',
        null=True,
        blank=True
    )

    # Link to created transaction (if successful)
    transaction = models.ForeignKey(
        'Transaction',
        on_delete=models.SET_NULL,
        related_name='import_records',
        null=True,
        blank=True
    )

    # Import status
    IMPORT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('imported', 'Successfully Imported'),
        ('duplicate', 'Duplicate Detected'),
        ('failed', 'Import Failed'),
        ('skipped', 'Manually Skipped'),
    ]

    import_status = models.CharField(
        max_length=20,
        choices=IMPORT_STATUS_CHOICES,
        default='pending'
    )

    # Original transaction data from file
    raw_data = models.JSONField(default=dict, blank=True)
    parsed_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    parsed_date = models.DateField(null=True, blank=True)
    parsed_description = models.TextField(blank=True)

    # Error information
    error_message = models.TextField(blank=True)

    # AI categorization results
    suggested_category_confidence = models.DecimalField(
        max_digits=5, decimal_places=4, null=True, blank=True
    )
    ai_merchant_detection = models.JSONField(default=dict, blank=True)

    class Meta:
        app_label = 'finance'
        ordering = ['parsed_date', 'created_at']
        indexes = [
            models.Index(fields=['upload_session', 'import_status']),
            models.Index(fields=['transaction']),
            models.Index(fields=['parsed_date']),
        ]


class TransactionLink(UserOwnedModel):
    """Track relationships between transactions (transfers, refunds, etc.)"""

    LINK_TYPE_CHOICES = [
        ('transfer', 'Transfer'),
        ('refund', 'Refund'),
        ('split_payment', 'Split Payment'),
        ('correction', 'Correction'),
        ('duplicate', 'Duplicate'),
    ]

    from_transaction = models.ForeignKey(
        'Transaction',
        on_delete=models.CASCADE,
        related_name='outgoing_links'
    )
    to_transaction = models.ForeignKey(
        'Transaction',
        on_delete=models.CASCADE,
        related_name='incoming_links'
    )

    link_type = models.CharField(max_length=20, choices=LINK_TYPE_CHOICES)
    confidence_score = models.DecimalField(max_digits=5, decimal_places=4, default=1.0)
    is_confirmed = models.BooleanField(default=False)

    # Additional metadata
    notes = models.TextField(blank=True)
    auto_detected = models.BooleanField(default=True)

    class Meta:
        app_label = 'finance'
        unique_together = ['from_transaction', 'to_transaction', 'link_type']
        indexes = [
            models.Index(fields=['from_transaction']),
            models.Index(fields=['to_transaction']),
            models.Index(fields=['link_type']),
            models.Index(fields=['is_confirmed']),
        ]


class MerchantPattern(UserOwnedModel):
    """Learn and store merchant/category patterns for AI categorization"""

    pattern = models.CharField(max_length=255)  # Pattern to match against descriptions
    category = models.ForeignKey(
        'Category',
        on_delete=models.CASCADE,
        related_name='merchant_patterns'
    )
    merchant_name = models.CharField(max_length=255, blank=True)

    # Learning metrics
    confidence = models.DecimalField(max_digits=5, decimal_places=4, default=0.5)
    usage_count = models.PositiveIntegerField(default=0)
    last_used = models.DateTimeField(null=True, blank=True)

    # Pattern metadata
    is_active = models.BooleanField(default=True)
    is_user_confirmed = models.BooleanField(default=False)  # User manually confirmed
    pattern_type = models.CharField(max_length=20, default='contains')  # contains, starts_with, regex
    is_deleted = models.BooleanField(default=False)  # Soft delete flag
    deleted_at = models.DateTimeField(null=True, blank=True)  # When it was deleted

    class Meta:
        app_label = 'finance'
        unique_together = ['user', 'pattern']
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['category']),
            models.Index(fields=['confidence']),
        ]

    def increment_usage(self):
        """Increment usage count and update last used"""
        from django.utils import timezone
        self.usage_count += 1
        self.last_used = timezone.now()

        # Increase confidence based on usage
        if self.usage_count > 1:
            self.confidence = min(1.0, self.confidence + 0.1)

        self.save()

    def soft_delete(self):
        """Soft delete this pattern"""
        from django.utils import timezone
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.is_active = False  # Also mark as inactive
        self.save()

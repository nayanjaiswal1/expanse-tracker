from typing import Optional

from django.conf import settings
from django.db import models
from django.utils import timezone


class RawEmail(models.Model):
    """
    Model to store raw communication payloads (email/SMS) before processing.
    This keeps ingestion decoupled from transaction models.
    """
    PROCESSING_STATUS = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('processed', 'Processed'),
        ('failed', 'Failed'),
        ('ignored', 'Ignored'),
    ]

    SOURCE_CHOICES = [
        ('gmail', 'Gmail'),
        ('sms', 'SMS'),
        ('manual', 'Manual Upload'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='raw_emails'
    )
    gmail_account = models.ForeignKey(
        'services.GmailAccount',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='raw_emails'
    )
    message_id = models.CharField(max_length=255, unique=True, db_index=True)
    source = models.CharField(
        max_length=20,
        choices=SOURCE_CHOICES,
        default='gmail',
        db_index=True,
        help_text="Origin of the raw payload"
    )
    headers = models.JSONField(default=dict)
    subject = models.CharField(max_length=1000)
    sender = models.CharField(max_length=1000)
    snippet = models.CharField(
        max_length=2048,
        blank=True,
        help_text="Short preview of the message body for quick triage"
    )
    body_text = models.TextField(blank=True)
    body_html = models.TextField(blank=True)
    gmail_payload = models.JSONField(
        default=dict,
        blank=True,
        help_text="Full Gmail payload stored for downstream training"
    )
    received_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Processing state
    processing_status = models.CharField(
        max_length=20,
        choices=PROCESSING_STATUS,
        default='pending',
        db_index=True
    )
    processed_at = models.DateTimeField(null=True, blank=True)
    processing_attempts = models.PositiveIntegerField(default=0)
    last_processing_attempt = models.DateTimeField(null=True, blank=True)
    processing_error = models.TextField(null=True, blank=True)
    processing_events = models.JSONField(
        default=list,
        blank=True,
        help_text="Timeline of processing events"
    )
    ingestion_log = models.JSONField(
        default=list,
        blank=True,
        help_text="Raw ingestion events (fetch, manual upload, etc.)"
    )

    # Transaction linkage metadata (no hard FK to keep 
    #  pluggable)
    linked_transaction_ids = models.JSONField(
        default=list,
        blank=True,
        help_text="List of transaction IDs generated from this payload"
    )

    # Parsed data (cached for performance)
    parsed_data = models.JSONField(
        default=dict,
        blank=True,
        help_text="Cached parsed data from email_parser"
    )
    is_transaction_email = models.BooleanField(
        default=False,
        help_text="Whether this email contains transaction information"
    )

    # User verification / feedback trail for training
    user_feedback = models.JSONField(
        default=list,
        blank=True,
        help_text="User confirmations or edits for downstream training"
    )
    attachments_ready = models.BooleanField(
        default=False,
        help_text="True when attachments (if any) have been persisted"
    )

    class Meta:
        ordering = ['-received_at', '-created_at']
        indexes = [
            models.Index(fields=['user', 'processing_status']),
            models.Index(fields=['user', 'received_at']),
            models.Index(fields=['gmail_account', 'processing_status']),
            models.Index(fields=['sender', 'received_at']),
            models.Index(fields=['is_transaction_email', 'processing_status']),
            models.Index(fields=['processing_status', 'created_at']),
            models.Index(fields=['user', 'source', 'processing_status']),
        ]
        verbose_name = "Raw Email"
        verbose_name_plural = "Raw Emails"

    def __str__(self):
        return f"Email from {self.sender} to {self.user.email} - {self.subject}"

    def mark_processing(self, note: str = None):
        """Mark as currently being processed"""
        self._append_processing_event('info', 'Marked for processing', note=note)
        self.processing_status = 'processing'
        self.processing_attempts += 1
        self.last_processing_attempt = timezone.now()
        self.save(
            update_fields=[
                'processing_status',
                'processing_attempts',
                'last_processing_attempt',
                'processing_events',
            ]
        )

    def mark_processed(self, transaction_id=None, reason: str = None):
        """Mark as successfully processed"""
        if transaction_id:
            self.record_transaction_link(transaction_id, reason=reason)
        self._append_processing_event('info', 'Marked as processed', transaction_id=transaction_id, reason=reason)
        self.processing_status = 'processed'
        self.processed_at = timezone.now()
        self.processing_error = None
        self.save(
            update_fields=[
                'processing_status',
                'processed_at',
                'processing_error',
                'processing_events',
                'linked_transaction_ids',
            ]
        )

    def mark_failed(self, error_message: str):
        """Mark as failed with error message"""
        self._append_processing_event('error', 'Processing failed', error=error_message)
        self.processing_status = 'failed'
        self.processing_error = error_message
        self.save(
            update_fields=['processing_status', 'processing_error', 'processing_events']
        )

    def mark_ignored(self, reason: str = None):
        """Mark as ignored (not a transaction email)"""
        self._append_processing_event('info', 'Marked as ignored', reason=reason)
        self.processing_status = 'ignored'
        self.processed_at = timezone.now()
        self.save(
            update_fields=['processing_status', 'processed_at', 'processing_events']
        )

    def retry_processing(self):
        """Reset to pending for retry"""
        self._append_processing_event('info', 'Reset to pending for retry')
        self.processing_status = 'pending'
        self.processing_error = None
        self.save(
            update_fields=['processing_status', 'processing_error', 'processing_events']
        )

    def log_ingestion(self, message: str, level: str = 'info', **kwargs):
        """Record ingestion event (fetch, manual drop, etc.)"""
        event = {
            'timestamp': timezone.now().isoformat(),
            'level': level,
            'message': message,
            **kwargs,
        }
        log_entries = list(self.ingestion_log or [])
        log_entries.append(event)
        self.ingestion_log = log_entries
        self.save(update_fields=['ingestion_log'])

    def record_transaction_link(self, transaction_id: int, reason: str = None):
        """Track created transaction IDs without enforcing a foreign key"""
        if transaction_id is None:
            return
        linked_ids = list(self.linked_transaction_ids or [])
        if transaction_id not in linked_ids:
            linked_ids.append(transaction_id)
            self.linked_transaction_ids = linked_ids
        self._append_processing_event(
            'info',
            'Linked transaction',
            transaction_id=transaction_id,
            reason=reason,
        )

    def record_user_feedback(self, action: str, data: dict):
        """Persist user feedback for downstream training"""
        feedback_entry = {
            'timestamp': timezone.now().isoformat(),
            'action': action,
            'data': data,
        }
        history = list(self.user_feedback or [])
        history.append(feedback_entry)
        self.user_feedback = history
        self.save(update_fields=['user_feedback'])

    def training_label(self) -> Optional[str]:
        """
        Derive a coarse label based on linked transactions or user feedback.

        Returns:
            'transaction' if the email resulted in a transaction.
            'non_transaction' if it was explicitly ignored or marked irrelevant.
            None when insufficient feedback is available.
        """
        if self.linked_transaction_ids:
            return 'transaction'

        if not self.user_feedback:
            return None

        lowered_actions = [entry.get('action', '').lower() for entry in self.user_feedback]
        if any(action in {'ignored', 'not_transaction', 'spam'} for action in lowered_actions):
            return 'non_transaction'
        if any(action in {'confirmed_transaction', 'transaction'} for action in lowered_actions):
            return 'transaction'

        return None

    def _append_processing_event(self, level: str, message: str, **kwargs):
        """Internal helper to append processing lifecycle events"""
        event = {
            'timestamp': timezone.now().isoformat(),
            'level': level,
            'message': message,
            **kwargs,
        }
        events = list(self.processing_events or [])
        events.append(event)
        self.processing_events = events


def raw_email_attachment_upload_to(instance: "RawEmailAttachment", filename: str) -> str:
    """Upload path grouping attachments by message id."""
    message_id = instance.raw_email.message_id or str(instance.raw_email_id)
    return f"raw_emails/{message_id}/{filename}"


class RawEmailAttachment(models.Model):
    """Stores binary attachments (e.g. statements) fetched with a RawEmail."""

    raw_email = models.ForeignKey(
        RawEmail,
        on_delete=models.CASCADE,
        related_name="attachments",
    )
    filename = models.CharField(max_length=512)
    mime_type = models.CharField(max_length=255, blank=True)
    size = models.PositiveIntegerField(default=0)
    file = models.FileField(upload_to=raw_email_attachment_upload_to)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["raw_email", "filename"]),
        ]

    def __str__(self) -> str:
        return f"{self.filename} ({self.mime_type})"


class AILabel(models.Model):
    """
    Stores AI-generated labels and extracted data from raw emails.
    This model acts as an intermediate layer between raw email ingestion
    and structured transaction creation.
    """

    LABEL_CHOICES = [
        ('TRANSACTION', 'Transaction'),
        ('OFFER', 'Offer/Promotion'),
        ('ALERT', 'Alert/Notification'),
        ('STATEMENT', 'Statement'),
        ('SPAM', 'Spam'),
        ('OTHER', 'Other'),
    ]

    TRANSACTION_TYPE_CHOICES = [
        ('DEBIT', 'Debit'),
        ('CREDIT', 'Credit'),
        ('PAYMENT', 'Payment'),
        ('REFUND', 'Refund'),
    ]

    SOURCE_CHOICES = [
        ('GMAIL', 'Gmail'),
        ('BANK_STATEMENT', 'Bank Statement'),
        ('SMS', 'SMS'),
    ]

    raw_email = models.OneToOneField(
        RawEmail,
        on_delete=models.CASCADE,
        related_name='ai_label',
        help_text="Reference to the raw email being labeled"
    )

    # Primary classification
    label = models.CharField(
        max_length=20,
        choices=LABEL_CHOICES,
        db_index=True,
        help_text="Primary classification of the email"
    )
    label_confidence = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        default=0.0,
        help_text="Confidence score for the label (0.0 - 1.0)"
    )

    # Transaction-specific fields (populated only if label == TRANSACTION)
    transaction_type = models.CharField(
        max_length=20,
        choices=TRANSACTION_TYPE_CHOICES,
        null=True,
        blank=True,
        db_index=True,
        help_text="Type of transaction"
    )
    amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Transaction amount"
    )
    currency = models.CharField(
        max_length=3,
        default='INR',
        help_text="Currency code (ISO 4217)"
    )
    account_number = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        help_text="Masked account number if available"
    )
    merchant = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        db_index=True,
        help_text="Merchant or payee name"
    )
    transaction_date = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        help_text="Actual transaction date from email"
    )
    reference_id = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        db_index=True,
        help_text="Transaction reference ID, UTR, or order ID"
    )
    source = models.CharField(
        max_length=20,
        choices=SOURCE_CHOICES,
        default='GMAIL',
        help_text="Source of the transaction notification"
    )

    # Extraction metadata
    extraction_model = models.CharField(
        max_length=100,
        help_text="Model used for extraction (e.g., llama3.2, gpt-4)"
    )
    extraction_prompt_version = models.CharField(
        max_length=50,
        default='v1',
        help_text="Version of the extraction prompt used"
    )
    raw_llm_response = models.JSONField(
        default=dict,
        blank=True,
        help_text="Raw response from LLM for debugging"
    )
    extracted_data = models.JSONField(
        default=dict,
        blank=True,
        help_text="Complete extracted structured data"
    )

    # Processing metadata
    processing_time_ms = models.IntegerField(
        null=True,
        blank=True,
        help_text="Time taken for AI processing in milliseconds"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # User feedback for retraining
    user_verified = models.BooleanField(
        default=False,
        help_text="Whether user has verified this label"
    )
    user_corrected_label = models.CharField(
        max_length=20,
        choices=LABEL_CHOICES,
        null=True,
        blank=True,
        help_text="User-corrected label if AI was wrong"
    )
    user_corrected_data = models.JSONField(
        default=dict,
        blank=True,
        help_text="User-corrected transaction data"
    )

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['label', 'label_confidence']),
            models.Index(fields=['transaction_type', 'transaction_date']),
            models.Index(fields=['merchant', 'amount']),
            models.Index(fields=['reference_id']),
            models.Index(fields=['transaction_date', 'amount']),
            models.Index(fields=['user_verified']),
        ]
        verbose_name = "AI Label"
        verbose_name_plural = "AI Labels"

    def __str__(self):
        return f"{self.label} - {self.raw_email.subject[:50]}"

    def is_transaction(self):
        """Check if this is labeled as a transaction"""
        return self.label == 'TRANSACTION'

    def get_effective_label(self):
        """Get the effective label (user-corrected if available, otherwise AI label)"""
        return self.user_corrected_label or self.label

    def get_effective_data(self):
        """Get effective transaction data (user-corrected if available)"""
        if self.user_corrected_data:
            return self.user_corrected_data
        return {
            'transaction_type': self.transaction_type,
            'amount': str(self.amount) if self.amount else None,
            'currency': self.currency,
            'account_number': self.account_number,
            'merchant': self.merchant,
            'transaction_date': self.transaction_date.isoformat() if self.transaction_date else None,
            'reference_id': self.reference_id,
            'source': self.source,
        }


class UnifiedTransaction(models.Model):
    """
    Unified transaction record that merges related emails/sources.

    Example: A bank debit notification and a merchant confirmation email
    for the same purchase will be merged into one UnifiedTransaction.
    """

    TRANSACTION_TYPE_CHOICES = [
        ('DEBIT', 'Debit'),
        ('CREDIT', 'Credit'),
        ('PAYMENT', 'Payment'),
        ('REFUND', 'Refund'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='unified_transactions'
    )

    # Core transaction fields
    transaction_type = models.CharField(
        max_length=20,
        choices=TRANSACTION_TYPE_CHOICES,
        db_index=True
    )
    amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        help_text="Primary transaction amount"
    )
    currency = models.CharField(max_length=3, default='INR')

    # Merchant and account info
    merchant = models.CharField(
        max_length=255,
        db_index=True,
        help_text="Normalized merchant name"
    )
    merchant_variants = models.JSONField(
        default=list,
        blank=True,
        help_text="Different merchant name variations found across sources"
    )
    account_number = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        help_text="Account number (masked)"
    )

    # Transaction identifiers
    reference_ids = models.JSONField(
        default=list,
        blank=True,
        help_text="All reference IDs from merged sources"
    )
    transaction_date = models.DateTimeField(
        db_index=True,
        help_text="Primary transaction date"
    )

    # Source tracking
    source_ai_labels = models.ManyToManyField(
        AILabel,
        related_name='unified_transactions',
        help_text="All AI labels that contributed to this unified transaction"
    )
    primary_source = models.CharField(
        max_length=20,
        choices=AILabel.SOURCE_CHOICES,
        help_text="Primary source of this transaction"
    )

    # Merge metadata
    merge_confidence = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        default=1.0,
        help_text="Confidence in the merge decision (0.0 - 1.0)"
    )
    merge_reason = models.TextField(
        blank=True,
        help_text="Explanation of why sources were merged"
    )
    merge_metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Detailed merge algorithm output"
    )

    # Additional extracted fields
    description = models.TextField(
        blank=True,
        help_text="Transaction description from sources"
    )
    category = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text="Auto-categorized transaction category"
    )

    # User interaction
    user_verified = models.BooleanField(
        default=False,
        help_text="Whether user has verified this transaction"
    )
    user_edited = models.BooleanField(
        default=False,
        help_text="Whether user has edited any fields"
    )
    is_duplicate = models.BooleanField(
        default=False,
        help_text="Marked as duplicate by user or system"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-transaction_date', '-created_at']
        indexes = [
            models.Index(fields=['user', 'transaction_date']),
            models.Index(fields=['user', 'merchant']),
            models.Index(fields=['user', 'transaction_type']),
            models.Index(fields=['transaction_date', 'amount']),
            models.Index(fields=['merchant', 'transaction_date']),
            models.Index(fields=['user', 'is_duplicate']),
            models.Index(fields=['merge_confidence']),
        ]
        verbose_name = "Unified Transaction"
        verbose_name_plural = "Unified Transactions"

    def __str__(self):
        return f"{self.transaction_type} - {self.merchant} - {self.amount} {self.currency}"

    def get_all_reference_ids(self):
        """Get all reference IDs as a list"""
        return list(self.reference_ids) if self.reference_ids else []

    def get_all_merchant_variants(self):
        """Get all merchant name variations"""
        variants = list(self.merchant_variants) if self.merchant_variants else []
        if self.merchant and self.merchant not in variants:
            variants.insert(0, self.merchant)
        return variants

    def add_source(self, ai_label):
        """Add a new AI label as a source for this unified transaction"""
        self.source_ai_labels.add(ai_label)

        # Update merchant variants
        if ai_label.merchant and ai_label.merchant not in self.get_all_merchant_variants():
            variants = list(self.merchant_variants) if self.merchant_variants else []
            variants.append(ai_label.merchant)
            self.merchant_variants = variants

        # Add reference ID if not present
        if ai_label.reference_id:
            ref_ids = self.get_all_reference_ids()
            if ai_label.reference_id not in ref_ids:
                ref_ids.append(ai_label.reference_id)
                self.reference_ids = ref_ids

        self.save()


class TrainingDataset(models.Model):
    """
    Versioned training dataset for retraining the labeling model.
    Contains labeled examples for supervised learning.
    """

    name = models.CharField(
        max_length=255,
        help_text="Dataset name/version"
    )
    version = models.CharField(
        max_length=50,
        unique=True,
        help_text="Semantic version (e.g., v1.0.0)"
    )
    description = models.TextField(
        blank=True,
        help_text="Description of this dataset version"
    )

    # Dataset composition
    total_samples = models.IntegerField(default=0)
    transaction_samples = models.IntegerField(default=0)
    non_transaction_samples = models.IntegerField(default=0)

    # Quality metrics
    user_verified_count = models.IntegerField(
        default=0,
        help_text="Number of user-verified samples"
    )
    user_corrected_count = models.IntegerField(
        default=0,
        help_text="Number of user-corrected samples"
    )

    # Dataset file references
    training_file_path = models.CharField(
        max_length=500,
        blank=True,
        help_text="Path to training data file"
    )
    validation_file_path = models.CharField(
        max_length=500,
        blank=True,
        help_text="Path to validation data file"
    )

    # Metadata
    dataset_metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional dataset statistics and info"
    )

    is_active = models.BooleanField(
        default=False,
        help_text="Whether this is the active training dataset"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_datasets'
    )

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Training Dataset"
        verbose_name_plural = "Training Datasets"

    def __str__(self):
        return f"{self.name} ({self.version})"

    def activate(self):
        """Make this dataset the active one"""
        TrainingDataset.objects.filter(is_active=True).update(is_active=False)
        self.is_active = True
        self.save(update_fields=['is_active'])

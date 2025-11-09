"""
Transaction document models for storing receipts, invoices, and other attachments.
Supports both S3 and local storage via storage service abstraction.
"""

from django.db import models
from users.base_models import UserOwnedModel


class TransactionDocument(UserOwnedModel):
    """
    Documents (receipts, invoices, bills) attached to transactions.
    Supports automatic OCR and item extraction.
    """

    DOCUMENT_TYPE_CHOICES = [
        ('receipt', 'Receipt'),
        ('invoice', 'Invoice'),
        ('bill', 'Bill'),
        ('statement', 'Bank Statement'),
        ('contract', 'Contract'),
        ('warranty', 'Warranty'),
        ('other', 'Other'),
    ]

    PROCESSING_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    # Relationships
    transaction = models.ForeignKey(
        'finance.Transaction',
        on_delete=models.CASCADE,
        related_name='documents',
        null=True,
        blank=True,
        help_text='Transaction this document is attached to (optional for upload before transaction creation)'
    )

    # File information
    file_path = models.CharField(
        max_length=500,
        help_text='Storage path (S3 key or local path)'
    )
    file_url = models.URLField(
        max_length=1000,
        help_text='Public URL to access the file'
    )
    original_filename = models.CharField(max_length=255)
    file_size = models.IntegerField(help_text='File size in bytes')
    content_type = models.CharField(max_length=100)

    # Document metadata
    document_type = models.CharField(
        max_length=20,
        choices=DOCUMENT_TYPE_CHOICES,
        default='receipt'
    )

    # OCR and processing
    processing_status = models.CharField(
        max_length=20,
        choices=PROCESSING_STATUS_CHOICES,
        default='pending'
    )
    ocr_text = models.TextField(
        blank=True,
        null=True,
        help_text='Extracted text from OCR'
    )
    extracted_data = models.JSONField(
        default=dict,
        blank=True,
        help_text='Structured data extracted from document (merchant, amount, date, items, etc.)'
    )
    processing_errors = models.JSONField(
        default=list,
        blank=True,
        help_text='Any errors encountered during processing'
    )
    processed_at = models.DateTimeField(null=True, blank=True)

    # AI/ML metadata
    extraction_confidence = models.FloatField(
        default=0.0,
        help_text='Confidence score for extracted data (0-1)'
    )
    ai_model_used = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text='AI model used for extraction (e.g., gpt-4, llama3)'
    )

    # User verification
    user_verified = models.BooleanField(
        default=False,
        help_text='Whether user has verified the extracted data'
    )
    user_corrected_data = models.JSONField(
        default=dict,
        blank=True,
        help_text='User corrections to extracted data'
    )

    # Additional metadata
    notes = models.TextField(blank=True)
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text='Additional metadata (upload source, device info, etc.)'
    )

    class Meta:
        db_table = 'finance_transaction_document'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'transaction']),
            models.Index(fields=['user', 'document_type']),
            models.Index(fields=['processing_status']),
            models.Index(fields=['created_at']),
        ]
        verbose_name = 'Transaction Document'
        verbose_name_plural = 'Transaction Documents'

    def __str__(self):
        return f"{self.document_type} - {self.original_filename}"

    @property
    def is_processed(self) -> bool:
        """Check if document has been processed."""
        return self.processing_status == 'completed'

    @property
    def has_errors(self) -> bool:
        """Check if document had processing errors."""
        return self.processing_status == 'failed' or len(self.processing_errors) > 0

    @property
    def extracted_items_count(self) -> int:
        """Get count of extracted line items."""
        return len(self.extracted_data.get('items', []))

    def mark_processing_started(self):
        """Mark document as being processed."""
        self.processing_status = 'processing'
        self.save(update_fields=['processing_status'])

    def mark_processing_completed(self, extracted_data: dict, confidence: float = 0.0, model_used: str = None):
        """Mark document as processed successfully."""
        from django.utils import timezone

        self.processing_status = 'completed'
        self.extracted_data = extracted_data
        self.extraction_confidence = confidence
        self.ai_model_used = model_used
        self.processed_at = timezone.now()
        self.save(update_fields=[
            'processing_status', 'extracted_data', 'extraction_confidence',
            'ai_model_used', 'processed_at'
        ])

    def mark_processing_failed(self, error_message: str):
        """Mark document as processing failed."""
        from django.utils import timezone

        self.processing_status = 'failed'
        self.processing_errors.append({
            'timestamp': timezone.now().isoformat(),
            'error': error_message
        })
        self.processed_at = timezone.now()
        self.save(update_fields=['processing_status', 'processing_errors', 'processed_at'])

    def attach_to_transaction(self, transaction):
        """Attach this document to a transaction."""
        self.transaction = transaction
        self.save(update_fields=['transaction'])

    def get_extracted_amount(self):
        """Get the extracted total amount."""
        return self.extracted_data.get('total_amount') or self.extracted_data.get('amount')

    def get_extracted_merchant(self):
        """Get the extracted merchant name."""
        return self.extracted_data.get('merchant') or self.extracted_data.get('vendor')

    def get_extracted_date(self):
        """Get the extracted transaction date."""
        return self.extracted_data.get('date') or self.extracted_data.get('transaction_date')

    def get_extracted_items(self):
        """Get the list of extracted line items."""
        return self.extracted_data.get('items', [])

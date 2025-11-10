"""
Statement management models for bank/credit card statements.
"""

from django.db import models
from django.contrib.auth import get_user_model
from .base import UserOwnedModel

User = get_user_model()


class Statement(UserOwnedModel):
    """Uploaded bank or credit card statement."""

    account = models.ForeignKey(
        'Account',
        on_delete=models.CASCADE,
        related_name='statements'
    )

    file = models.FileField(upload_to='statements/%Y/%m/')
    filename = models.CharField(max_length=255)
    file_type = models.CharField(
        max_length=10,
        choices=[('csv', 'CSV'), ('pdf', 'PDF')]
    )
    file_size = models.BigIntegerField(help_text="File size in bytes")

    # Processing
    PARSE_METHOD_CHOICES = [
        ('system', 'System Parser'),
        ('ai', 'AI Parser'),
    ]
    parse_method = models.CharField(max_length=10, choices=PARSE_METHOD_CHOICES, default='system')

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('duplicate', 'Duplicate'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    # Results
    transactions_extracted = models.IntegerField(default=0)
    transactions_imported = models.IntegerField(default=0)
    duplicates_found = models.IntegerField(default=0)

    # Metadata
    is_password_protected = models.BooleanField(default=False)
    period_start = models.DateField(null=True, blank=True)
    period_end = models.DateField(null=True, blank=True)

    # Processing logs
    processing_logs = models.JSONField(default=list, blank=True, help_text="Complete processing history")
    error_message = models.TextField(blank=True)

    # Duplicate handling
    merged_with = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='merged_statements'
    )

    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        app_label = "finance"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'account', '-created_at']),
            models.Index(fields=['user', 'status']),
            models.Index(fields=['period_start', 'period_end']),
        ]

    def __str__(self):
        return f"{self.filename} - {self.account.name}"

    def add_log(self, message, level='info'):
        """Add a log entry to processing logs."""
        from django.utils import timezone
        log_entry = {
            'timestamp': timezone.now().isoformat(),
            'level': level,
            'message': message
        }
        if not isinstance(self.processing_logs, list):
            self.processing_logs = []
        self.processing_logs.append(log_entry)
        self.save(update_fields=['processing_logs'])

    @property
    def parsed_data_url(self):
        """URL to view parsed transaction data."""
        return f"/api/statements/{self.id}/parsed-data/"

    @property
    def raw_file_url(self):
        """URL to download raw file."""
        return self.file.url if self.file else None


class StatementComparison(UserOwnedModel):
    """Comparison between parsed data and raw file for a statement."""

    statement = models.ForeignKey(
        Statement,
        on_delete=models.CASCADE,
        related_name='comparisons'
    )

    raw_text = models.TextField(help_text="Extracted text from original file")
    parsed_json = models.JSONField(help_text="Structured parsed data")

    # Validation
    is_validated = models.BooleanField(default=False)
    validated_at = models.DateTimeField(null=True, blank=True)
    validation_notes = models.TextField(blank=True)

    class Meta:
        app_label = "finance"
        ordering = ['-created_at']

    def __str__(self):
        return f"Comparison for {self.statement.filename}"


class StatementDuplicate(UserOwnedModel):
    """Detected duplicate statements."""

    statement1 = models.ForeignKey(
        Statement,
        on_delete=models.CASCADE,
        related_name='duplicate_matches_as_first'
    )
    statement2 = models.ForeignKey(
        Statement,
        on_delete=models.CASCADE,
        related_name='duplicate_matches_as_second'
    )

    similarity_score = models.FloatField(help_text="0-100 score indicating similarity")

    RESOLUTION_CHOICES = [
        ('pending', 'Pending Review'),
        ('merged', 'Merged'),
        ('kept_both', 'Kept Both'),
        ('deleted', 'Deleted Duplicate'),
    ]
    resolution = models.CharField(max_length=20, choices=RESOLUTION_CHOICES, default='pending')
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolution_notes = models.TextField(blank=True)

    class Meta:
        app_label = "finance"
        unique_together = ['statement1', 'statement2']
        ordering = ['-similarity_score']

    def __str__(self):
        return f"Duplicate: {self.statement1.filename} <-> {self.statement2.filename} ({self.similarity_score}%)"

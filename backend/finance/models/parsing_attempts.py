"""
Multi-level parsing attempt tracking models for progressive statement parsing.
"""

from django.db import models
from django.contrib.auth import get_user_model
from .base import UserOwnedModel
from .uploads import UploadSession

User = get_user_model()


class ParsingAttempt(UserOwnedModel):
    """Track individual parsing attempts with different methods"""

    PARSING_METHOD_CHOICES = [
        ('ui_column_extraction', 'UI Column Extraction'),
        ('regex_patterns', 'Regex Pattern Matching'),
        ('ai_parsing', 'AI-Powered Parsing'),
        ('manual_correction', 'Manual User Correction'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('partial_success', 'Partial Success'),
    ]

    upload_session = models.ForeignKey(
        UploadSession,
        on_delete=models.CASCADE,
        related_name='parsing_attempts'
    )

    # Parsing method and metadata
    parsing_method = models.CharField(max_length=30, choices=PARSING_METHOD_CHOICES)
    attempt_order = models.PositiveIntegerField()  # 1 = first attempt, 2 = fallback, etc.
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    # Timing information
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    duration_seconds = models.DecimalField(max_digits=8, decimal_places=3, null=True, blank=True)

    # Results
    transactions_extracted = models.PositiveIntegerField(default=0)
    confidence_score = models.DecimalField(max_digits=5, decimal_places=4, default=0.0)
    error_message = models.TextField(blank=True)

    # Parsing configuration used
    parsing_config = models.JSONField(default=dict, blank=True)  # Stores method-specific config

    # Raw results for learning
    raw_extraction_result = models.JSONField(default=dict, blank=True)

    class Meta:
        app_label = 'finance'
        ordering = ['upload_session', 'attempt_order']
        indexes = [
            models.Index(fields=['upload_session', 'attempt_order']),
            models.Index(fields=['parsing_method', 'status']),
            models.Index(fields=['started_at']),
        ]

    def __str__(self):
        return f"{self.upload_session.original_filename} - {self.parsing_method} (Attempt {self.attempt_order})"

    def mark_completed(self, status='success', transactions_count=0, confidence=0.0, error_msg=''):
        """Mark parsing attempt as completed"""
        from django.utils import timezone

        self.completed_at = timezone.now()
        self.status = status
        self.transactions_extracted = transactions_count
        self.confidence_score = confidence
        self.error_message = error_msg

        if self.started_at:
            duration = (self.completed_at - self.started_at).total_seconds()
            self.duration_seconds = duration

        self.save()


class ColumnMapping(UserOwnedModel):
    """Store UI-detected column mappings for different file formats"""

    parsing_attempt = models.ForeignKey(
        ParsingAttempt,
        on_delete=models.CASCADE,
        related_name='column_mappings'
    )

    # Source information
    file_type = models.CharField(max_length=20)  # csv, xlsx, etc.
    source_column_name = models.CharField(max_length=255)
    source_column_index = models.PositiveIntegerField(null=True, blank=True)

    # Mapped field
    FIELD_TYPE_CHOICES = [
        ('date', 'Transaction Date'),
        ('amount', 'Transaction Amount'),
        ('description', 'Description'),
        ('debit', 'Debit Amount'),
        ('credit', 'Credit Amount'),
        ('balance', 'Account Balance'),
        ('category', 'Category'),
        ('merchant', 'Merchant Name'),
        ('reference', 'Reference Number'),
        ('account_number', 'Account Number'),
    ]

    mapped_field_type = models.CharField(max_length=20, choices=FIELD_TYPE_CHOICES)

    # Confidence and validation
    confidence_score = models.DecimalField(max_digits=5, decimal_places=4, default=1.0)
    is_user_confirmed = models.BooleanField(default=False)
    sample_values = models.JSONField(default=list, blank=True)  # Store sample values for validation

    class Meta:
        app_label = 'finance'
        unique_together = ['parsing_attempt', 'mapped_field_type']
        indexes = [
            models.Index(fields=['parsing_attempt']),
            models.Index(fields=['file_type', 'mapped_field_type']),
        ]


class RegexPattern(UserOwnedModel):
    """Store and learn regex patterns for transaction parsing"""

    # Pattern information
    pattern_name = models.CharField(max_length=100)
    regex_pattern = models.TextField()
    description = models.TextField(blank=True)

    # Pattern scope
    file_type = models.CharField(max_length=20)  # pdf, txt, csv, etc.
    institution_name = models.CharField(max_length=255, blank=True)  # Bank-specific patterns

    # Pattern groups mapping
    PATTERN_GROUP_CHOICES = [
        ('date', 'Date Group'),
        ('amount', 'Amount Group'),
        ('description', 'Description Group'),
        ('debit', 'Debit Group'),
        ('credit', 'Credit Group'),
        ('balance', 'Balance Group'),
        ('type', 'Transaction Type Group'),
    ]

    group_mappings = models.JSONField(default=dict, blank=True)  # Maps group numbers to field types

    # Learning metrics
    success_count = models.PositiveIntegerField(default=0)
    failure_count = models.PositiveIntegerField(default=0)
    confidence_score = models.DecimalField(max_digits=5, decimal_places=4, default=0.5)

    # Pattern metadata
    is_active = models.BooleanField(default=True)
    is_built_in = models.BooleanField(default=False)  # System vs user-created patterns
    priority = models.PositiveIntegerField(default=100)  # Lower = higher priority

    # Usage tracking
    last_used = models.DateTimeField(null=True, blank=True)
    created_from_parsing_attempt = models.ForeignKey(
        ParsingAttempt,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='generated_patterns'
    )

    class Meta:
        app_label = 'finance'
        ordering = ['priority', 'confidence_score']
        indexes = [
            models.Index(fields=['file_type', 'is_active']),
            models.Index(fields=['institution_name', 'is_active']),
            models.Index(fields=['confidence_score']),
            models.Index(fields=['priority']),
        ]

    def __str__(self):
        return f"{self.pattern_name} ({self.file_type})"

    def record_success(self):
        """Record a successful pattern match"""
        from django.utils import timezone

        self.success_count += 1
        self.last_used = timezone.now()

        # Update confidence based on success rate
        total_attempts = self.success_count + self.failure_count
        if total_attempts > 0:
            success_rate = self.success_count / total_attempts
            self.confidence_score = min(0.95, success_rate)

        self.save()

    def record_failure(self):
        """Record a failed pattern match"""
        from django.utils import timezone

        self.failure_count += 1
        self.last_used = timezone.now()

        # Update confidence based on success rate
        total_attempts = self.success_count + self.failure_count
        if total_attempts > 0:
            success_rate = self.success_count / total_attempts
            self.confidence_score = max(0.05, success_rate)

        self.save()


class LearningDataset(UserOwnedModel):
    """Collect and store data for training parsing models"""

    DATASET_TYPE_CHOICES = [
        ('successful_parsing', 'Successful Parsing Example'),
        ('failed_parsing', 'Failed Parsing Example'),
        ('user_correction', 'User Correction'),
        ('manual_annotation', 'Manual Annotation'),
    ]

    dataset_type = models.CharField(max_length=30, choices=DATASET_TYPE_CHOICES)

    # Source information
    upload_session = models.ForeignKey(
        UploadSession,
        on_delete=models.CASCADE,
        related_name='learning_data'
    )
    parsing_attempt = models.ForeignKey(
        ParsingAttempt,
        on_delete=models.CASCADE,
        related_name='learning_data',
        null=True,
        blank=True
    )

    # Input data
    raw_text_content = models.TextField()  # Original file content
    file_type = models.CharField(max_length=20)
    institution_name = models.CharField(max_length=255, blank=True)

    # Expected output (ground truth)
    expected_transactions = models.JSONField(default=list, blank=True)
    column_mappings = models.JSONField(default=dict, blank=True)

    # Actual parsing results (for comparison)
    actual_parsing_result = models.JSONField(default=dict, blank=True)

    # Quality metrics
    is_validated = models.BooleanField(default=False)
    validation_notes = models.TextField(blank=True)
    quality_score = models.DecimalField(max_digits=5, decimal_places=4, null=True, blank=True)

    # Learning metadata
    is_used_for_training = models.BooleanField(default=False)
    training_weight = models.DecimalField(max_digits=5, decimal_places=4, default=1.0)

    class Meta:
        app_label = 'finance'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['dataset_type', 'is_validated']),
            models.Index(fields=['file_type', 'institution_name']),
            models.Index(fields=['is_used_for_training']),
            models.Index(fields=['upload_session']),
        ]

    def __str__(self):
        return f"Learning Data: {self.dataset_type} - {self.upload_session.original_filename}"


class ParsingMetrics(UserOwnedModel):
    """Track overall parsing performance metrics"""

    # Time period for metrics
    date = models.DateField()

    # Method performance
    ui_extraction_attempts = models.PositiveIntegerField(default=0)
    ui_extraction_successes = models.PositiveIntegerField(default=0)

    regex_attempts = models.PositiveIntegerField(default=0)
    regex_successes = models.PositiveIntegerField(default=0)

    ai_attempts = models.PositiveIntegerField(default=0)
    ai_successes = models.PositiveIntegerField(default=0)

    manual_corrections = models.PositiveIntegerField(default=0)

    # Performance metrics
    avg_confidence_score = models.DecimalField(max_digits=5, decimal_places=4, default=0.0)
    avg_parsing_time = models.DecimalField(max_digits=8, decimal_places=3, default=0.0)

    # Learning metrics
    new_patterns_learned = models.PositiveIntegerField(default=0)
    dataset_entries_added = models.PositiveIntegerField(default=0)

    class Meta:
        app_label = 'finance'
        unique_together = ['user', 'date']
        ordering = ['-date']
        indexes = [
            models.Index(fields=['user', 'date']),
        ]

    def __str__(self):
        return f"Parsing Metrics: {self.user.username} - {self.date}"

    @classmethod
    def update_daily_metrics(cls, user, date=None):
        """Update daily metrics for a user"""
        from django.utils import timezone
        from django.db.models import Avg, Count

        if date is None:
            date = timezone.now().date()

        # Get or create metrics for the date
        metrics, created = cls.objects.get_or_create(
            user=user,
            date=date,
            defaults={}
        )

        # Calculate metrics from parsing attempts for the date
        attempts = ParsingAttempt.objects.filter(
            user=user,
            started_at__date=date
        )

        # Method-specific metrics
        ui_attempts = attempts.filter(parsing_method='ui_column_extraction')
        metrics.ui_extraction_attempts = ui_attempts.count()
        metrics.ui_extraction_successes = ui_attempts.filter(status='success').count()

        regex_attempts = attempts.filter(parsing_method='regex_patterns')
        metrics.regex_attempts = regex_attempts.count()
        metrics.regex_successes = regex_attempts.filter(status='success').count()

        ai_attempts = attempts.filter(parsing_method='ai_parsing')
        metrics.ai_attempts = ai_attempts.count()
        metrics.ai_successes = ai_attempts.filter(status='success').count()

        manual_attempts = attempts.filter(parsing_method='manual_correction')
        metrics.manual_corrections = manual_attempts.count()

        # Performance metrics
        completed_attempts = attempts.exclude(status='pending')
        if completed_attempts.exists():
            metrics.avg_confidence_score = completed_attempts.aggregate(
                avg=Avg('confidence_score')
            )['avg'] or 0.0

            metrics.avg_parsing_time = completed_attempts.aggregate(
                avg=Avg('duration_seconds')
            )['avg'] or 0.0

        # Learning metrics
        metrics.new_patterns_learned = RegexPattern.objects.filter(
            user=user,
            created_at__date=date
        ).count()

        metrics.dataset_entries_added = LearningDataset.objects.filter(
            user=user,
            created_at__date=date
        ).count()

        metrics.save()
        return metrics
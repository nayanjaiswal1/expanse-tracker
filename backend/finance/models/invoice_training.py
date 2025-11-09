"""
Models for storing invoice parsing data for training AI models.
"""

from django.db import models
from users.base_models import UserOwnedModel


class InvoiceParsingAttempt(UserOwnedModel):
    """
    Store every invoice parsing attempt for training data collection.
    """

    STATUS_CHOICES = [
        ('pending_review', 'Pending Review'),
        ('user_corrected', 'User Corrected'),
        ('user_approved', 'User Approved'),
        ('failed', 'Failed'),
    ]

    AI_MODEL_CHOICES = [
        ('openai_gpt4', 'OpenAI GPT-4'),
        ('openai_gpt4o', 'OpenAI GPT-4o'),
        ('openai_gpt35', 'OpenAI GPT-3.5'),
        ('anthropic_claude_opus', 'Anthropic Claude Opus'),
        ('anthropic_claude_sonnet', 'Anthropic Claude Sonnet'),
        ('anthropic_claude_haiku', 'Anthropic Claude Haiku'),
        ('ollama_llama3', 'Ollama Llama 3'),
        ('ollama_mistral', 'Ollama Mistral'),
        ('ollama_custom', 'Ollama Custom'),
    ]

    # Original file
    file_name = models.CharField(max_length=500)
    file_size = models.IntegerField()
    file_type = models.CharField(max_length=50)
    file_hash = models.CharField(max_length=64, db_index=True)
    raw_ocr_text = models.TextField(blank=True)

    # AI extraction details
    ai_model_used = models.CharField(max_length=50, choices=AI_MODEL_CHOICES)
    ai_provider = models.CharField(max_length=50)
    extraction_method = models.CharField(max_length=50, default='llm')
    processing_time_ms = models.IntegerField(null=True)

    # AI extracted data (original)
    ai_extracted_data = models.JSONField(default=dict)

    # User corrected data (if any)
    user_corrected_data = models.JSONField(default=dict, blank=True)

    # Final approved data
    final_approved_data = models.JSONField(default=dict, blank=True)

    # Status tracking
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending_review')

    # Accuracy metrics (calculated after user review)
    field_accuracy_score = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True,
        help_text="Percentage of fields correctly extracted"
    )
    line_items_accuracy_score = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True,
        help_text="Percentage of line items correctly extracted"
    )

    # Training metadata
    is_included_in_training = models.BooleanField(default=False)
    training_dataset_version = models.CharField(max_length=50, blank=True)
    quality_flags = models.JSONField(default=dict, blank=True)

    # Linked transaction (if created)
    transaction = models.ForeignKey(
        'Transaction',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invoice_parsing_attempts'
    )

    # Error tracking
    error_message = models.TextField(blank=True)
    error_type = models.CharField(max_length=100, blank=True)

    class Meta:
        app_label = 'finance'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['ai_model_used', 'status']),
            models.Index(fields=['is_included_in_training']),
            models.Index(fields=['file_hash']),
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return f"Invoice Parsing: {self.file_name} - {self.ai_model_used}"

    def calculate_accuracy(self):
        """
        Calculate accuracy by comparing AI extracted data with user corrected/approved data.
        """
        if not self.user_corrected_data and not self.final_approved_data:
            return None

        ground_truth = self.final_approved_data or self.user_corrected_data
        ai_data = self.ai_extracted_data

        # Compare top-level fields
        fields_to_check = [
            'invoice_number', 'invoice_date', 'total_amount',
            'merchant_details', 'currency', 'subtotal', 'discount'
        ]

        correct_fields = 0
        total_fields = 0

        for field in fields_to_check:
            if field in ground_truth and ground_truth[field]:
                total_fields += 1
                if field in ai_data and ai_data[field] == ground_truth[field]:
                    correct_fields += 1

        self.field_accuracy_score = (correct_fields / total_fields * 100) if total_fields > 0 else 0

        # Compare line items
        ai_items = ai_data.get('line_items', [])
        truth_items = ground_truth.get('line_items', [])

        if truth_items:
            # Simple count-based accuracy (can be enhanced)
            items_match = len(ai_items) == len(truth_items)
            self.line_items_accuracy_score = 100 if items_match else (
                min(len(ai_items), len(truth_items)) / max(len(ai_items), len(truth_items)) * 100
            )
        else:
            self.line_items_accuracy_score = None

        self.save()
        return {
            'field_accuracy': float(self.field_accuracy_score or 0),
            'line_items_accuracy': float(self.line_items_accuracy_score or 0)
        }


class InvoiceFieldCorrection(UserOwnedModel):
    """
    Detailed tracking of individual field corrections for fine-grained training.
    """

    parsing_attempt = models.ForeignKey(
        InvoiceParsingAttempt,
        on_delete=models.CASCADE,
        related_name='field_corrections'
    )

    field_name = models.CharField(max_length=100)
    field_path = models.CharField(
        max_length=255,
        help_text="JSON path to the field (e.g., 'line_items[0].description')"
    )

    ai_extracted_value = models.TextField(blank=True, null=True)
    user_corrected_value = models.TextField()

    correction_type = models.CharField(
        max_length=50,
        choices=[
            ('wrong_value', 'Wrong Value'),
            ('missing_field', 'Missing Field'),
            ('extra_field', 'Extra Field'),
            ('wrong_format', 'Wrong Format'),
        ]
    )

    confidence_score = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True,
        help_text="AI's confidence in the original extraction (if available)"
    )

    class Meta:
        app_label = 'finance'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['parsing_attempt', 'field_name']),
            models.Index(fields=['correction_type']),
        ]

    def __str__(self):
        return f"Correction: {self.field_name} for {self.parsing_attempt.file_name}"


class InvoiceTrainingDataset(models.Model):
    """
    Versioned training datasets for model fine-tuning.
    """

    version = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True)

    # Dataset composition
    total_samples = models.IntegerField(default=0)
    train_samples = models.IntegerField(default=0)
    validation_samples = models.IntegerField(default=0)
    test_samples = models.IntegerField(default=0)

    # Dataset quality metrics
    avg_field_accuracy = models.DecimalField(max_digits=5, decimal_places=2, null=True)
    avg_line_items_accuracy = models.DecimalField(max_digits=5, decimal_places=2, null=True)

    # Export status
    is_exported = models.BooleanField(default=False)
    export_format = models.CharField(max_length=50, blank=True)
    export_path = models.CharField(max_length=500, blank=True)

    # Metadata
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        app_label = 'finance'
        ordering = ['-created_at']

    def __str__(self):
        return f"Training Dataset v{self.version}: {self.name}"

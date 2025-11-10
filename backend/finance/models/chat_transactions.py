"""
Chat-based transaction models for WhatsApp-style transaction entry.
"""

from django.db import models
from django.contrib.auth import get_user_model
from .base import UserOwnedModel

User = get_user_model()


class ChatMessage(UserOwnedModel):
    """Chat message for quick transaction entry."""

    MESSAGE_TYPE_CHOICES = [
        ('user', 'User Message'),
        ('system', 'System Response'),
        ('suggestion', 'AI Suggestion'),
        ('confirmation', 'Confirmation'),
    ]

    message_type = models.CharField(max_length=20, choices=MESSAGE_TYPE_CHOICES, default='user')
    content = models.TextField()

    # Transaction association
    transaction = models.ForeignKey(
        'Transaction',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='chat_messages'
    )

    # AI processing
    is_ai_processed = models.BooleanField(default=False)
    ai_confidence = models.FloatField(null=True, blank=True, help_text="AI confidence score 0-100")
    extracted_data = models.JSONField(default=dict, blank=True, help_text="AI extracted transaction data")

    # Status
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('processing', 'Processing'),
        ('saved', 'Saved'),
        ('cancelled', 'Cancelled'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')

    # Interaction
    is_edited = models.BooleanField(default=False)
    parent_message = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='replies'
    )

    class Meta:
        app_label = "finance"
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['user', 'status']),
            models.Index(fields=['transaction']),
        ]

    def __str__(self):
        return f"{self.get_message_type_display()}: {self.content[:50]}"

    def mark_as_saved(self):
        """Mark message as saved and create transaction if data exists."""
        self.status = 'saved'
        self.save(update_fields=['status', 'updated_at'])

    def extract_transaction_data(self):
        """
        Extract transaction data from message content using AI or patterns.
        Returns dict with transaction fields.
        """
        # This will be implemented by AI service
        return self.extracted_data


class ChatAttachment(UserOwnedModel):
    """File attachment in chat message (receipt, invoice, etc.)."""

    message = models.ForeignKey(
        ChatMessage,
        on_delete=models.CASCADE,
        related_name='attachments'
    )

    file = models.FileField(upload_to='chat_attachments/%Y/%m/')
    filename = models.CharField(max_length=255)
    file_type = models.CharField(max_length=50)
    file_size = models.BigIntegerField(help_text="File size in bytes")

    # Processing
    is_processed = models.BooleanField(default=False)
    extracted_data = models.JSONField(default=dict, blank=True, help_text="Extracted data from file")

    # Associated transaction document
    transaction_document = models.ForeignKey(
        'TransactionDocument',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='chat_attachments'
    )

    class Meta:
        app_label = "finance"
        ordering = ['created_at']

    def __str__(self):
        return f"Attachment: {self.filename}"

"""
Models backing finance assistant conversations (quick add, invoice chat, etc.).
"""

from django.db import models

from .base import UserOwnedModel, MetadataMixin


class FinanceAssistantConversation(UserOwnedModel, MetadataMixin):
    """Conversation channel for finance-oriented assistants."""

    class AssistantType(models.TextChoices):
        QUICK_ADD = "quick_add", "Quick Add"
        INVOICE_UPLOAD = "invoice_upload", "Invoice Upload"

    assistant_type = models.CharField(
        max_length=40,
        choices=AssistantType.choices,
    )
    title = models.CharField(max_length=255, blank=True)
    last_summary = models.TextField(blank=True)

    class Meta:
        app_label = "finance"
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["user", "assistant_type"]),
            models.Index(fields=["updated_at"]),
        ]

    def __str__(self) -> str:
        label = self.title or dict(self.AssistantType.choices).get(
            self.assistant_type, "Conversation"
        )
        return f"{label} (#{self.pk})"


class FinanceAssistantMessage(UserOwnedModel):
    """Message exchanged within a finance assistant conversation."""

    class Role(models.TextChoices):
        USER = "user", "User"
        ASSISTANT = "assistant", "Assistant"
        SYSTEM = "system", "System"

    conversation = models.ForeignKey(
        FinanceAssistantConversation,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    role = models.CharField(max_length=20, choices=Role.choices)
    content = models.TextField(blank=True)
    payload = models.JSONField(default=dict, blank=True)
    is_error = models.BooleanField(default=False)

    class Meta:
        app_label = "finance"
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["conversation", "created_at"]),
        ]

    def __str__(self) -> str:
        preview = (self.content or "").strip()
        if len(preview) > 50:
            preview = f"{preview[:47]}..."
        return f"{self.get_role_display()} message #{self.pk}: {preview}"


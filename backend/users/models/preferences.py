"""
User preferences and settings models.
"""

from django.conf import settings
from django.db import models

from users.base_models import TimestampedModel


class UserPreferences(TimestampedModel):
    """User preferences for UI, notifications, and display settings"""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="preferences"
    )

    # Display preferences
    preferred_currency = models.CharField(
        max_length=3,
        default="USD",
        help_text="User's preferred currency for display"
    )
    preferred_date_format = models.CharField(
        max_length=20,
        default="YYYY-MM-DD"
    )
    timezone = models.CharField(max_length=50, default="UTC")
    language = models.CharField(max_length=10, default="en")
    theme = models.CharField(
        max_length=20,
        default="system",
        choices=[
            ("light", "Light"),
            ("dark", "Dark"),
            ("system", "System")
        ]
    )

    # Notification preferences
    notifications_enabled = models.BooleanField(default=True)
    email_notifications = models.BooleanField(default=True)
    push_notifications = models.BooleanField(default=False)

    # UI preferences (stored as JSON for flexibility)
    table_column_preferences = models.JSONField(
        default=dict,
        blank=True,
        help_text="Table column visibility and sizing preferences"
    )
    ui_preferences = models.JSONField(
        default=dict,
        blank=True,
        help_text="General UI layout preferences (e.g., collapsed sections)"
    )

    class Meta:
        verbose_name = "User Preferences"
        verbose_name_plural = "User Preferences"

    def __str__(self):
        return f"{self.user.username}'s Preferences"


class AISettings(TimestampedModel):
    """User AI provider settings and configurations"""

    AI_PROVIDERS = [
        ("system", "System Default"),
        ("openai", "OpenAI"),
        ("ollama", "Ollama"),
        ("anthropic", "Anthropic"),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="ai_settings"
    )

    # Provider selection
    preferred_provider = models.CharField(
        max_length=20,
        choices=AI_PROVIDERS,
        default="system"
    )

    # OpenAI settings
    openai_api_key = models.TextField(blank=True)  # Encrypted
    openai_model = models.CharField(
        max_length=50,
        default="gpt-3.5-turbo",
        blank=True
    )

    # Ollama settings
    ollama_endpoint = models.URLField(
        default="http://localhost:11434",
        blank=True
    )
    ollama_model = models.CharField(
        max_length=50,
        default="llama2",
        blank=True
    )

    # Anthropic settings
    anthropic_api_key = models.TextField(blank=True)  # Encrypted
    anthropic_model = models.CharField(
        max_length=50,
        default="claude-3-sonnet-20240229",
        blank=True
    )

    # Feature toggles
    enable_ai_suggestions = models.BooleanField(default=True)
    enable_ai_categorization = models.BooleanField(default=True)
    enable_ai_invoice_generation = models.BooleanField(default=True)

    class Meta:
        verbose_name = "AI Settings"
        verbose_name_plural = "AI Settings"
        indexes = [
            models.Index(fields=["preferred_provider"]),
        ]

    def __str__(self):
        return f"{self.user.username}'s AI Settings ({self.get_preferred_provider_display()})"

    def get_api_key(self):
        """Get the API key for the preferred provider"""
        from users.encryption import decrypt_value

        if self.preferred_provider == "openai" and self.openai_api_key:
            return decrypt_value(self.openai_api_key)
        elif self.preferred_provider == "anthropic" and self.anthropic_api_key:
            return decrypt_value(self.anthropic_api_key)
        return None

    def set_api_key(self, provider, api_key):
        """Set and encrypt the API key for a provider"""
        from users.encryption import encrypt_value

        encrypted = encrypt_value(api_key)
        if provider == "openai":
            self.openai_api_key = encrypted
        elif provider == "anthropic":
            self.anthropic_api_key = encrypted

        self.save(update_fields=[f'{provider}_api_key', 'updated_at'])

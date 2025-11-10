"""
AI Settings models for managing user API keys and AI integration preferences.
"""

from django.db import models
from django.contrib.auth import get_user_model
from cryptography.fernet import Fernet
from django.conf import settings
from .base import UserOwnedModel

User = get_user_model()


class AIProvider(UserOwnedModel):
    """User's AI provider API keys and settings."""

    PROVIDER_CHOICES = [
        ('openai', 'OpenAI'),
        ('claude', 'Anthropic Claude'),
        ('gemini', 'Google Gemini'),
    ]

    provider = models.CharField(max_length=20, choices=PROVIDER_CHOICES)
    api_key = models.TextField()  # Encrypted
    is_active = models.BooleanField(default=True)
    last_tested_at = models.DateTimeField(null=True, blank=True)
    test_status = models.CharField(max_length=20, null=True, blank=True)
    test_message = models.TextField(blank=True)

    class Meta:
        app_label = "finance"
        unique_together = ['user', 'provider']
        ordering = ['provider']

    def __str__(self):
        return f"{self.user.username} - {self.get_provider_display()}"

    def set_api_key(self, raw_key):
        """Encrypt and store API key."""
        if not hasattr(settings, 'ENCRYPTION_KEY'):
            raise ValueError("ENCRYPTION_KEY not configured")

        fernet = Fernet(settings.ENCRYPTION_KEY.encode())
        self.api_key = fernet.encrypt(raw_key.encode()).decode()

    def get_api_key(self):
        """Decrypt and return API key."""
        if not hasattr(settings, 'ENCRYPTION_KEY'):
            raise ValueError("ENCRYPTION_KEY not configured")

        fernet = Fernet(settings.ENCRYPTION_KEY.encode())
        return fernet.decrypt(self.api_key.encode()).decode()


class StatementPassword(UserOwnedModel):
    """Encrypted passwords for password-protected statement files."""

    filename_pattern = models.CharField(max_length=255, help_text="Pattern to match filenames (e.g., HDFC_*, *.pdf)")
    password = models.TextField()  # Encrypted
    is_active = models.BooleanField(default=True)
    success_count = models.IntegerField(default=0)
    last_used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        app_label = "finance"
        ordering = ['-success_count', '-last_used_at']

    def __str__(self):
        return f"{self.filename_pattern} (used {self.success_count} times)"

    def set_password(self, raw_password):
        """Encrypt and store password."""
        if not hasattr(settings, 'ENCRYPTION_KEY'):
            raise ValueError("ENCRYPTION_KEY not configured")

        fernet = Fernet(settings.ENCRYPTION_KEY.encode())
        self.password = fernet.encrypt(raw_password.encode()).decode()

    def get_password(self):
        """Decrypt and return password."""
        if not hasattr(settings, 'ENCRYPTION_KEY'):
            raise ValueError("ENCRYPTION_KEY not configured")

        fernet = Fernet(settings.ENCRYPTION_KEY.encode())
        return fernet.decrypt(self.password.encode()).decode()

    def increment_success(self):
        """Increment success counter and update last used timestamp."""
        from django.utils import timezone
        self.success_count += 1
        self.last_used_at = timezone.now()
        self.save(update_fields=['success_count', 'last_used_at'])


class UserPreferences(UserOwnedModel):
    """User preferences for the application."""

    # Regional settings
    default_currency = models.CharField(max_length=3, default='USD')
    default_country = models.CharField(max_length=2, default='US')
    timezone = models.CharField(max_length=50, default='UTC')

    # Feature preferences
    auto_categorize = models.BooleanField(default=True)
    ai_parsing_default = models.BooleanField(default=False, help_text="Use AI parser by default")
    enable_duplicate_detection = models.BooleanField(default=True)

    # Budget preferences
    budget_alert_threshold = models.IntegerField(default=80, help_text="Alert when budget reaches this percentage")

    # Display preferences
    date_format = models.CharField(max_length=20, default='YYYY-MM-DD')
    theme = models.CharField(max_length=20, default='light', choices=[('light', 'Light'), ('dark', 'Dark')])

    class Meta:
        app_label = "finance"
        verbose_name_plural = "User Preferences"

    def __str__(self):
        return f"Preferences for {self.user.username}"

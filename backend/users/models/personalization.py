"""
User personalization and preferences models.
"""

from django.conf import settings
from django.db import models
from django.utils import timezone

from users.base_models import TimestampedModel


class UserPersonalization(TimestampedModel):
    """
    User personalization questionnaire responses.
    Stores essential preferences to customize the user experience.
    """

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="personalization"
    )

    # Onboarding tracking
    onboarding_step = models.PositiveIntegerField(
        default=0,
        help_text="Current step in onboarding process (0 = not started)"
    )
    onboarding_completed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When user completed onboarding"
    )

    # Questionnaire completion status
    questionnaire_completed = models.BooleanField(default=False)
    questionnaire_completed_at = models.DateTimeField(null=True, blank=True)

    # Core preferences - stored as JSON for flexibility
    # Structure: {
    #   "primary_goal": "budgeting|saving|investing|debt_payoff|...",
    #   "experience_level": "beginner|intermediate|advanced",
    #   "features_interested": ["budgets", "goals", ...],
    #   "import_preferences": ["manual", "email", "file", "bank_sync"],
    #   ... any other questionnaire data
    # }
    preferences = models.JSONField(
        default=dict,
        blank=True,
        help_text="User preferences from personalization questionnaire"
    )

    class Meta:
        verbose_name = "User Personalization"
        verbose_name_plural = "User Personalizations"
        indexes = [
            models.Index(fields=["onboarding_step"]),
            models.Index(fields=["questionnaire_completed"]),
        ]

    def __str__(self):
        return f"{self.user.username}'s Personalization (Step {self.onboarding_step})"

    @property
    def is_onboarded(self):
        """Check if user has completed onboarding"""
        return self.onboarding_completed_at is not None

    def mark_questionnaire_completed(self):
        """Mark personalization questionnaire as completed"""
        if not self.questionnaire_completed:
            self.questionnaire_completed = True
            self.questionnaire_completed_at = timezone.now()
            self.save(update_fields=['questionnaire_completed', 'questionnaire_completed_at', 'updated_at'])

    def mark_onboarding_completed(self):
        """Mark onboarding as completed"""
        if not self.onboarding_completed_at:
            self.onboarding_completed_at = timezone.now()
            self.save(update_fields=['onboarding_completed_at', 'updated_at'])

    def get_preference(self, key, default=None):
        """Get a specific preference value"""
        return self.preferences.get(key, default)

    def set_preference(self, key, value):
        """Set a specific preference value"""
        self.preferences[key] = value
        self.save(update_fields=['preferences', 'updated_at'])

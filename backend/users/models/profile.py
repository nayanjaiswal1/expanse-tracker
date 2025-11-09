"""
User profile model - core profile information only.
"""

import logging

from django.conf import settings
from django.db import models

from users.base_models import TimestampedModel


logger = logging.getLogger(__name__)


class UserProfile(TimestampedModel):
    """Core user profile information"""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile"
    )

    # Personal information
    phone = models.CharField(max_length=20, blank=True)
    bio = models.TextField(blank=True)
    website = models.URLField(blank=True)
    location = models.CharField(max_length=100, blank=True)

    # Profile photo (user uploaded)
    profile_photo = models.ImageField(
        upload_to='profile_photos/',
        blank=True,
        null=True,
        help_text="User uploaded profile photo"
    )

    # Verification status
    is_verified = models.BooleanField(default=False, db_index=True)

    class Meta:
        verbose_name = "User Profile"
        verbose_name_plural = "User Profiles"
        indexes = [
            models.Index(fields=["is_verified"]),
        ]

    def __str__(self):
        return f"{self.user.username}'s Profile"

    @property
    def profile_photo_url(self):
        """Get profile photo URL (user uploaded or from social auth)"""
        if self.profile_photo:
            return self.profile_photo.url

        # Fallback to social auth profile picture
        try:
            from allauth.socialaccount.models import SocialAccount
            social_account = SocialAccount.objects.filter(user=self.user, provider='google').first()
            if social_account and social_account.extra_data.get('picture'):
                return social_account.extra_data['picture']
        except Exception:
            pass

        return None

    def delete_profile_photo(self):
        """Delete custom profile photo with error handling"""
        try:
            if self.profile_photo:
                self.profile_photo.delete(save=False)
                self.profile_photo = None
                self.save(update_fields=['profile_photo', 'updated_at'])
        except Exception as e:
            logger.error(f"Failed to delete profile photo: {e}")

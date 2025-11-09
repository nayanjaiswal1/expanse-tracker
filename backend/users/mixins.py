from rest_framework import status
from django.db.models import Q
from users.utils.response_utils import not_found_response, error_response

class UserMixin:
    """
    Common functionality for user-related views
    """
    def get_user_queryset(self):
        """
        Base queryset for getting the current user with related fields
        """
        return self.request.user

    def get_user_profile(self, user):
        """
        Get or create user profile
        """
        from users.models import UserProfile
        profile, _ = UserProfile.objects.get_or_create(user=user)
        return profile
        
    def handle_validation_error(self, serializer):
        """
        Standard validation error handler
        """
        return error_response(
            message="Validation error",
            errors=serializer.errors,
            status_code=status.HTTP_400_BAD_REQUEST
        )

    def get_user_by_identifier(self, identifier):
        """
        Find user by email or username
        """
        from users.models import User
        try:
            return User.objects.get(
                Q(email=identifier) | Q(username=identifier)
            )
        except User.DoesNotExist:
            return None

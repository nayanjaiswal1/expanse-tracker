from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model

User = get_user_model()


class MultiFieldBackend(ModelBackend):
    """
    Custom authentication backend that allows users to log in using their email address, username, or phone number.
    """

    def authenticate(self, request, username=None, password=None, **kwargs):
        if not username:
            return None
            
        user = None
        
        # Try to find user by different methods
        if "@" in username:
            # Definitely an email
            try:
                user = User.objects.get(email=username)
            except User.DoesNotExist:
                return None
        else:
            # Could be username or phone number
            # First try by username
            try:
                user = User.objects.get(username=username)
            except User.DoesNotExist:
                # Try by phone number through profile
                try:
                    from users.models import UserProfile
                    profile = UserProfile.objects.select_related('user').get(phone=username)
                    user = profile.user
                except UserProfile.DoesNotExist:
                    # Last attempt: try as email (in case user provided email without @)
                    try:
                        user = User.objects.get(email=username)
                    except User.DoesNotExist:
                        return None

        if user and user.check_password(password) and self.user_can_authenticate(user):
            return user

        return None

    def get_user(self, user_id):
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None

from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.contrib.auth import get_user_model

User = get_user_model()


class CookieJWTAuthentication(BaseAuthentication):
    """
    Custom DRF authentication class for httpOnly JWT cookies
    """

    def authenticate(self, request):
        # Get the raw HTTP cookie
        raw_token = request.COOKIES.get("access_token")

        if not raw_token:
            return None

        try:
            # Validate the token
            validated_token = UntypedToken(raw_token)
            user = self.get_user(validated_token)
            return (user, validated_token)

        except (InvalidToken, TokenError) as e:
            raise AuthenticationFailed(f"Invalid token: {str(e)}")

    def get_user(self, validated_token):
        """
        Get the user associated with the token
        """
        try:
            user_id = validated_token["user_id"]
        except KeyError:
            raise AuthenticationFailed(
                "Token contained no recognizable user identification"
            )

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            raise AuthenticationFailed("User not found")

        if not user.is_active:
            raise AuthenticationFailed("User inactive or deleted")

        return user

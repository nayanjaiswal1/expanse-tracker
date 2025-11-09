from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model, authenticate
from rest_framework import serializers
from utils.error_responses import create_validation_error_response

User = get_user_model()


class MultiFieldTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom token serializer that accepts username, email, or phone number
    """

    username = serializers.CharField(help_text="Username, email, or phone number")
    password = serializers.CharField()

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Update the username field label to be more descriptive
        self.fields['username'].label = 'Username, Email, or Phone'

    def validate(self, attrs):
        print(
            f"MultiFieldTokenObtainPairSerializer: validate called with attrs: {attrs}"
        )  # Debug log

        username = attrs.get("username")
        password = attrs.get("password")

        if username and password:
            # Try to authenticate with username/email/phone
            user = authenticate(
                request=self.context.get("request"), username=username, password=password
            )

            if not user:
                raise serializers.ValidationError(
                    {"non_field_errors": ["Invalid username/email/phone or password."]}
                )

            if not user.is_active:
                raise serializers.ValidationError(
                    {"non_field_errors": ["User account is disabled."]}
                )

            # Set the user for token generation
            self.user = user

            # Generate tokens
            refresh = self.get_token(user)

            return {
                "refresh": str(refresh),
                "access": str(refresh.access_token),
            }
        else:
            raise serializers.ValidationError(
                {"non_field_errors": ["Must include username/email/phone and password."]}
            )

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Add custom claims if needed
        token["email"] = user.email
        return token

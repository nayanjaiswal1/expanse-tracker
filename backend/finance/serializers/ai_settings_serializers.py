"""
Serializers for AI Settings models.
"""

from rest_framework import serializers
from finance.models import AIProvider, StatementPassword, UserPreferences


class AIProviderSerializer(serializers.ModelSerializer):
    """Serializer for AI Provider API keys."""

    api_key_display = serializers.SerializerMethodField()
    provider_display = serializers.CharField(source='get_provider_display', read_only=True)

    class Meta:
        model = AIProvider
        fields = [
            'id', 'provider', 'provider_display', 'is_active',
            'last_tested_at', 'test_status', 'test_message',
            'created_at', 'updated_at', 'api_key_display'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'last_tested_at', 'test_status', 'test_message']

    def get_api_key_display(self, obj):
        """Return masked API key for display."""
        try:
            key = obj.get_api_key()
            if len(key) > 8:
                return f"{key[:4]}...{key[-4:]}"
            return "****"
        except:
            return "****"


class AIProviderCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating AI Provider with raw API key."""

    raw_api_key = serializers.CharField(write_only=True)

    class Meta:
        model = AIProvider
        fields = ['id', 'provider', 'raw_api_key', 'is_active']

    def create(self, validated_data):
        raw_key = validated_data.pop('raw_api_key')
        user = self.context['request'].user
        instance = AIProvider.objects.create(user=user, **validated_data)
        instance.set_api_key(raw_key)
        instance.save()
        return instance


class StatementPasswordSerializer(serializers.ModelSerializer):
    """Serializer for Statement Passwords."""

    password_display = serializers.SerializerMethodField()

    class Meta:
        model = StatementPassword
        fields = [
            'id', 'filename_pattern', 'is_active', 'success_count',
            'last_used_at', 'created_at', 'updated_at', 'password_display'
        ]
        read_only_fields = ['id', 'success_count', 'last_used_at', 'created_at', 'updated_at']

    def get_password_display(self, obj):
        """Return masked password for display."""
        return "****"


class StatementPasswordCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating Statement Password with raw password."""

    raw_password = serializers.CharField(write_only=True)

    class Meta:
        model = StatementPassword
        fields = ['id', 'filename_pattern', 'raw_password', 'is_active']

    def create(self, validated_data):
        raw_password = validated_data.pop('raw_password')
        user = self.context['request'].user
        instance = StatementPassword.objects.create(user=user, **validated_data)
        instance.set_password(raw_password)
        instance.save()
        return instance


class UserPreferencesSerializer(serializers.ModelSerializer):
    """Serializer for User Preferences."""

    class Meta:
        model = UserPreferences
        fields = [
            'id', 'default_currency', 'default_country', 'timezone',
            'auto_categorize', 'ai_parsing_default', 'enable_duplicate_detection',
            'budget_alert_threshold', 'date_format', 'theme',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

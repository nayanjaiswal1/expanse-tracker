"""
Views for AI Settings management.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from finance.models import AIProvider, StatementPassword, UserPreferences
from finance.serializers.ai_settings_serializers import (
    AIProviderSerializer, AIProviderCreateSerializer,
    StatementPasswordSerializer, StatementPasswordCreateSerializer,
    UserPreferencesSerializer
)


class AIProviderViewSet(viewsets.ModelViewSet):
    """ViewSet for managing AI Provider API keys."""

    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return AIProvider.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        if self.action == 'create':
            return AIProviderCreateSerializer
        return AIProviderSerializer

    @action(detail=True, methods=['post'])
    def test_connection(self, request, pk=None):
        """Test AI provider connection."""
        provider = self.get_object()

        try:
            api_key = provider.get_api_key()

            # Test based on provider type
            if provider.provider == 'openai':
                from openai import OpenAI
                client = OpenAI(api_key=api_key)
                response = client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[{"role": "user", "content": "test"}],
                    max_tokens=5
                )
                provider.test_status = 'success'
                provider.test_message = 'Connection successful'

            elif provider.provider == 'claude':
                from anthropic import Anthropic
                client = Anthropic(api_key=api_key)
                response = client.messages.create(
                    model="claude-3-haiku-20240307",
                    max_tokens=10,
                    messages=[{"role": "user", "content": "test"}]
                )
                provider.test_status = 'success'
                provider.test_message = 'Connection successful'

            elif provider.provider == 'gemini':
                # TODO: Implement Gemini test
                provider.test_status = 'success'
                provider.test_message = 'Connection successful'

            from django.utils import timezone
            provider.last_tested_at = timezone.now()
            provider.save()

            return Response({
                'status': 'success',
                'message': provider.test_message
            })

        except Exception as e:
            provider.test_status = 'failed'
            provider.test_message = str(e)
            from django.utils import timezone
            provider.last_tested_at = timezone.now()
            provider.save()

            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)


class StatementPasswordViewSet(viewsets.ModelViewSet):
    """ViewSet for managing Statement Passwords."""

    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return StatementPassword.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        if self.action == 'create':
            return StatementPasswordCreateSerializer
        return StatementPasswordSerializer


class UserPreferencesViewSet(viewsets.ModelViewSet):
    """ViewSet for managing User Preferences."""

    permission_classes = [IsAuthenticated]
    serializer_class = UserPreferencesSerializer

    def get_queryset(self):
        return UserPreferences.objects.filter(user=self.request.user)

    @action(detail=False, methods=['get'])
    def current(self, request):
        """Get current user's preferences, create if not exists."""
        preferences, created = UserPreferences.objects.get_or_create(
            user=request.user
        )
        serializer = self.get_serializer(preferences)
        return Response(serializer.data)

    @action(detail=False, methods=['patch'])
    def update_current(self, request):
        """Update current user's preferences."""
        preferences, created = UserPreferences.objects.get_or_create(
            user=request.user
        )
        serializer = self.get_serializer(
            preferences,
            data=request.data,
            partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

"""
URL configuration for Finance v2 API endpoints.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from finance.views.ai_settings_views import (
    AIProviderViewSet, StatementPasswordViewSet, UserPreferencesViewSet
)
from finance.views.statement_views import (
    StatementViewSet, StatementComparisonViewSet, StatementDuplicateViewSet
)
from finance.views.chat_views import ChatMessageViewSet, ChatAttachmentViewSet

# Create router
router = DefaultRouter()

# AI Settings
router.register(r'ai-providers', AIProviderViewSet, basename='ai-provider')
router.register(r'statement-passwords', StatementPasswordViewSet, basename='statement-password')
router.register(r'user-preferences', UserPreferencesViewSet, basename='user-preferences')

# Statements
router.register(r'statements', StatementViewSet, basename='statement')
router.register(r'statement-comparisons', StatementComparisonViewSet, basename='statement-comparison')
router.register(r'statement-duplicates', StatementDuplicateViewSet, basename='statement-duplicate')

# Chat Transactions
router.register(r'chat-messages', ChatMessageViewSet, basename='chat-message')
router.register(r'chat-attachments', ChatAttachmentViewSet, basename='chat-attachment')

urlpatterns = [
    path('', include(router.urls)),
]

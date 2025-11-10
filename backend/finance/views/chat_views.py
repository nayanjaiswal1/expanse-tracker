"""
Views for Chat-based transaction entry.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from finance.models import ChatMessage, ChatAttachment, Transaction
from finance.serializers.chat_serializers import (
    ChatMessageSerializer, ChatMessageCreateSerializer,
    ChatMessageQuickAddSerializer, ChatTransactionSuggestionSerializer,
    ChatAttachmentSerializer
)


class ChatMessageViewSet(viewsets.ModelViewSet):
    """ViewSet for Chat Messages."""

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        return ChatMessage.objects.filter(
            user=self.request.user
        ).prefetch_related('attachments').order_by('-created_at')

    def get_serializer_class(self):
        if self.action == 'create':
            return ChatMessageCreateSerializer
        elif self.action == 'quick_add':
            return ChatMessageQuickAddSerializer
        return ChatMessageSerializer

    @action(detail=False, methods=['post'])
    def quick_add(self, request):
        """Quick add transaction via chat message."""
        serializer = ChatMessageQuickAddSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        message = serializer.save()

        # Return created message
        response_serializer = ChatMessageSerializer(message)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def save_transaction(self, request, pk=None):
        """Save chat message as transaction."""
        message = self.get_object()

        # Get transaction data from message
        transaction_data = message.extracted_data

        if not transaction_data:
            return Response({
                'detail': 'No transaction data extracted from message'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Create transaction
        # TODO: Implement transaction creation from extracted data
        message.status = 'saved'
        message.save()

        return Response({
            'detail': 'Transaction saved successfully',
            'transaction_id': message.transaction_id if message.transaction else None
        })

    @action(detail=True, methods=['post'])
    def extract_data(self, request, pk=None):
        """Extract transaction data from chat message using AI."""
        message = self.get_object()

        # TODO: Implement AI extraction
        # For now, return mock suggestion
        suggestion = {
            'amount': 100.00,
            'description': message.content,
            'date': str(request.user.date_joined.date()),
            'confidence': 85.0
        }

        message.extracted_data = suggestion
        message.is_ai_processed = True
        message.ai_confidence = suggestion['confidence']
        message.save()

        return Response(suggestion)

    @action(detail=True, methods=['patch'])
    def edit_message(self, request, pk=None):
        """Edit a chat message."""
        message = self.get_object()

        content = request.data.get('content')
        if not content:
            return Response({
                'detail': 'content is required'
            }, status=status.HTTP_400_BAD_REQUEST)

        message.content = content
        message.is_edited = True
        message.save()

        serializer = self.get_serializer(message)
        return Response(serializer.data)


class ChatAttachmentViewSet(viewsets.ModelViewSet):
    """ViewSet for Chat Attachments."""

    permission_classes = [IsAuthenticated]
    serializer_class = ChatAttachmentSerializer

    def get_queryset(self):
        return ChatAttachment.objects.filter(
            user=self.request.user
        ).select_related('message')

    @action(detail=True, methods=['post'])
    def process(self, request, pk=None):
        """Process attachment to extract data."""
        attachment = self.get_object()

        # TODO: Implement file processing (OCR, PDF parsing, etc.)
        attachment.is_processed = True
        attachment.save()

        return Response({
            'detail': 'Attachment processed successfully',
            'extracted_data': attachment.extracted_data
        })

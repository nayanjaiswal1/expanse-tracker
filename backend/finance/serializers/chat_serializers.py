"""
Serializers for Chat Transaction models.
"""

from rest_framework import serializers
from finance.models import ChatMessage, ChatAttachment, Transaction


class ChatAttachmentSerializer(serializers.ModelSerializer):
    """Serializer for Chat Attachments."""

    file_url = serializers.SerializerMethodField()

    class Meta:
        model = ChatAttachment
        fields = [
            'id', 'filename', 'file', 'file_url', 'file_type', 'file_size',
            'is_processed', 'extracted_data', 'transaction_document',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'file_size', 'is_processed', 'extracted_data', 'created_at', 'updated_at']

    def get_file_url(self, obj):
        """Get file URL."""
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


class ChatMessageSerializer(serializers.ModelSerializer):
    """Serializer for Chat Messages."""

    attachments = ChatAttachmentSerializer(many=True, read_only=True)
    message_type_display = serializers.CharField(source='get_message_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = ChatMessage
        fields = [
            'id', 'message_type', 'message_type_display', 'content', 'transaction',
            'is_ai_processed', 'ai_confidence', 'extracted_data', 'status',
            'status_display', 'is_edited', 'parent_message', 'attachments',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'is_ai_processed', 'ai_confidence', 'extracted_data',
            'created_at', 'updated_at'
        ]


class ChatMessageCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating chat messages."""

    attachments = serializers.ListField(
        child=serializers.FileField(),
        write_only=True,
        required=False
    )

    class Meta:
        model = ChatMessage
        fields = ['id', 'content', 'message_type', 'parent_message', 'attachments']

    def create(self, validated_data):
        user = self.context['request'].user
        attachments_data = validated_data.pop('attachments', [])

        # Create chat message
        message = ChatMessage.objects.create(user=user, **validated_data)

        # Create attachments
        for file in attachments_data:
            ChatAttachment.objects.create(
                user=user,
                message=message,
                file=file,
                filename=file.name,
                file_type=file.content_type,
                file_size=file.size
            )

        return message


class ChatMessageQuickAddSerializer(serializers.Serializer):
    """Serializer for quick transaction add via chat."""

    content = serializers.CharField()
    attachments = serializers.ListField(
        child=serializers.FileField(),
        required=False
    )
    use_ai = serializers.BooleanField(default=True)

    def create(self, validated_data):
        """Process quick add and create transaction if possible."""
        user = self.context['request'].user
        content = validated_data['content']
        use_ai = validated_data.get('use_ai', True)

        # Create chat message
        message = ChatMessage.objects.create(
            user=user,
            message_type='user',
            content=content,
            status='processing'
        )

        # Handle attachments
        for file in validated_data.get('attachments', []):
            ChatAttachment.objects.create(
                user=user,
                message=message,
                file=file,
                filename=file.name,
                file_type=file.content_type,
                file_size=file.size
            )

        # TODO: Implement AI processing
        # For now, just return the message
        return message


class ChatTransactionSuggestionSerializer(serializers.Serializer):
    """Serializer for AI-suggested transaction from chat."""

    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    description = serializers.CharField()
    date = serializers.DateField()
    category_id = serializers.IntegerField(required=False, allow_null=True)
    is_credit = serializers.BooleanField(default=False)
    confidence = serializers.FloatField(read_only=True)

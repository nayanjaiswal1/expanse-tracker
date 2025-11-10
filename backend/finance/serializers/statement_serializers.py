"""
Serializers for Statement models.
"""

from rest_framework import serializers
from finance.models import Statement, StatementComparison, StatementDuplicate, Account


class StatementSerializer(serializers.ModelSerializer):
    """Serializer for Statement model."""

    account_name = serializers.CharField(source='account.name', read_only=True)
    file_url = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    parse_method_display = serializers.CharField(source='get_parse_method_display', read_only=True)

    class Meta:
        model = Statement
        fields = [
            'id', 'account', 'account_name', 'file', 'file_url', 'filename',
            'file_type', 'file_size', 'parse_method', 'parse_method_display',
            'status', 'status_display', 'transactions_extracted',
            'transactions_imported', 'duplicates_found', 'is_password_protected',
            'period_start', 'period_end', 'processing_logs', 'error_message',
            'merged_with', 'processed_at', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'file_size', 'status', 'transactions_extracted',
            'transactions_imported', 'duplicates_found', 'processing_logs',
            'error_message', 'processed_at', 'created_at', 'updated_at'
        ]

    def get_file_url(self, obj):
        """Get file URL."""
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


class StatementUploadSerializer(serializers.ModelSerializer):
    """Serializer for uploading statements."""

    file = serializers.FileField()

    class Meta:
        model = Statement
        fields = ['id', 'account', 'file', 'parse_method', 'filename']

    def create(self, validated_data):
        user = self.context['request'].user
        file = validated_data['file']

        # Auto-detect file type
        filename = file.name
        file_type = 'pdf' if filename.lower().endswith('.pdf') else 'csv'

        # Create statement
        statement = Statement.objects.create(
            user=user,
            account=validated_data['account'],
            file=file,
            filename=filename,
            file_type=file_type,
            file_size=file.size,
            parse_method=validated_data.get('parse_method', 'system')
        )

        return statement


class StatementComparisonSerializer(serializers.ModelSerializer):
    """Serializer for Statement Comparison."""

    statement_filename = serializers.CharField(source='statement.filename', read_only=True)

    class Meta:
        model = StatementComparison
        fields = [
            'id', 'statement', 'statement_filename', 'raw_text', 'parsed_json',
            'is_validated', 'validated_at', 'validation_notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class StatementDuplicateSerializer(serializers.ModelSerializer):
    """Serializer for Statement Duplicates."""

    statement1_filename = serializers.CharField(source='statement1.filename', read_only=True)
    statement2_filename = serializers.CharField(source='statement2.filename', read_only=True)
    resolution_display = serializers.CharField(source='get_resolution_display', read_only=True)

    class Meta:
        model = StatementDuplicate
        fields = [
            'id', 'statement1', 'statement1_filename', 'statement2', 'statement2_filename',
            'similarity_score', 'resolution', 'resolution_display', 'resolved_at',
            'resolution_notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'similarity_score', 'created_at', 'updated_at']


class StatementListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for statement lists."""

    account_name = serializers.CharField(source='account.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Statement
        fields = [
            'id', 'account', 'account_name', 'filename', 'file_type',
            'status', 'status_display', 'parse_method', 'transactions_extracted',
            'transactions_imported', 'period_start', 'period_end', 'created_at'
        ]

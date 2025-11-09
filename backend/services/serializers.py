"""
Serializers for services app.
"""

from rest_framework import serializers
from .models import (
    GmailAccount,
    EmailAccountPattern,
    SplitwiseIntegration,
    SplitwiseGroupMapping,
    SplitwiseExpenseMapping,
    SplitwiseSyncLog
)
from finance.models import Account


class GmailAccountSerializer(serializers.ModelSerializer):
    """Serializer for GmailAccount model"""

    class Meta:
        model = GmailAccount
        fields = [
            "id",
            "name",
            "email",
            "is_active",
            "transaction_tag",
            "sender_filters",
            "keyword_filters",
            "last_sync_at",
            "created_at",
            "updated_at",
            "connected",
        ]
        read_only_fields = ["id", "email", "last_sync_at", "created_at", "updated_at"]

    def get_connected(self, obj):
        return True  # If object exists, it's connected

    connected = serializers.SerializerMethodField()


# Keep old serializer for backward compatibility
class GoogleAccountSerializer(GmailAccountSerializer):
    """DEPRECATED: Use GmailAccountSerializer instead"""
    pass


class SplitwiseIntegrationSerializer(serializers.ModelSerializer):
    """Serializer for SplitwiseIntegration model"""

    is_connected = serializers.SerializerMethodField()
    splitwise_display_name = serializers.SerializerMethodField()

    class Meta:
        model = SplitwiseIntegration
        fields = [
            'id',
            'is_connected',
            'splitwise_user_id',
            'splitwise_email',
            'splitwise_display_name',
            'is_active',
            'auto_sync_enabled',
            'sync_interval_minutes',
            'last_sync_at',
            'last_successful_sync_at',
            'sync_status',
            'last_sync_error',
            'import_existing_groups',
            'import_existing_expenses',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'splitwise_user_id',
            'splitwise_email',
            'last_sync_at',
            'last_successful_sync_at',
            'sync_status',
            'last_sync_error',
            'created_at',
            'updated_at',
        ]

    def get_is_connected(self, obj):
        """Check if integration is connected"""
        return bool(obj.access_token)

    def get_splitwise_display_name(self, obj):
        """Get display name for Splitwise user"""
        if obj.splitwise_first_name or obj.splitwise_last_name:
            return f"{obj.splitwise_first_name or ''} {obj.splitwise_last_name or ''}".strip()
        return obj.splitwise_email or 'Splitwise User'


class SplitwiseIntegrationCreateSerializer(serializers.Serializer):
    """Serializer for creating/updating Splitwise integration with access token"""

    access_token = serializers.CharField(required=True, write_only=True)
    auto_sync_enabled = serializers.BooleanField(default=True)
    sync_interval_minutes = serializers.IntegerField(default=30, min_value=5, max_value=1440)
    import_existing_groups = serializers.BooleanField(default=True)
    import_existing_expenses = serializers.BooleanField(default=True)


class SplitwiseGroupMappingSerializer(serializers.ModelSerializer):
    """Serializer for SplitwiseGroupMapping model"""

    local_group_name = serializers.CharField(source='local_group.name', read_only=True)
    local_group_id = serializers.IntegerField(source='local_group.id', read_only=True)

    class Meta:
        model = SplitwiseGroupMapping
        fields = [
            'id',
            'local_group_id',
            'local_group_name',
            'splitwise_group_id',
            'splitwise_group_name',
            'sync_enabled',
            'sync_direction',
            'last_synced_at',
            'last_splitwise_updated_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'splitwise_group_id',
            'splitwise_group_name',
            'last_synced_at',
            'last_splitwise_updated_at',
            'created_at',
            'updated_at',
        ]


class SplitwiseExpenseMappingSerializer(serializers.ModelSerializer):
    """Serializer for SplitwiseExpenseMapping model"""

    local_expense_title = serializers.CharField(source='local_expense.title', read_only=True)
    local_expense_amount = serializers.DecimalField(
        source='local_expense.total_amount',
        max_digits=12,
        decimal_places=2,
        read_only=True
    )

    class Meta:
        model = SplitwiseExpenseMapping
        fields = [
            'id',
            'local_expense_title',
            'local_expense_amount',
            'splitwise_expense_id',
            'sync_status',
            'last_sync_error',
            'last_synced_at',
            'last_splitwise_updated_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'splitwise_expense_id',
            'last_synced_at',
            'last_splitwise_updated_at',
            'created_at',
            'updated_at',
        ]


class SplitwiseSyncLogSerializer(serializers.ModelSerializer):
    """Serializer for SplitwiseSyncLog model"""

    duration_seconds = serializers.SerializerMethodField()

    class Meta:
        model = SplitwiseSyncLog
        fields = [
            'id',
            'sync_type',
            'status',
            'groups_synced',
            'expenses_synced',
            'groups_created',
            'expenses_created',
            'groups_updated',
            'expenses_updated',
            'errors_count',
            'error_message',
            'details',
            'started_at',
            'completed_at',
            'duration_seconds',
        ]
        read_only_fields = [
            'id',
            'sync_type',
            'status',
            'groups_synced',
            'expenses_synced',
            'groups_created',
            'expenses_created',
            'groups_updated',
            'expenses_updated',
            'errors_count',
            'error_message',
            'details',
            'started_at',
            'completed_at',
        ]

    def get_duration_seconds(self, obj):
        """Calculate sync duration in seconds"""
        if obj.completed_at and obj.started_at:
            delta = obj.completed_at - obj.started_at
            return delta.total_seconds()
        return None


class SplitwiseSyncRequestSerializer(serializers.Serializer):
    """Serializer for sync request parameters"""

    sync_type = serializers.ChoiceField(
        choices=['full_import', 'incremental'],
        default='incremental'
    )
    force = serializers.BooleanField(default=False)


class EmailAccountPatternSerializer(serializers.ModelSerializer):
    """Serializer for EmailAccountPattern model"""

    account_name = serializers.CharField(source='account.name', read_only=True)
    account_type = serializers.CharField(source='account.account_type', read_only=True)
    account_masked = serializers.CharField(source='account.account_number_masked', read_only=True)

    class Meta:
        model = EmailAccountPattern
        fields = [
            'id',
            'account',
            'account_name',
            'account_type',
            'account_masked',
            'sender_email',
            'sender_domain',
            'merchant_name',
            'institution_name',
            'last_digits',
            'upi_id',
            'wallet_name',
            'confidence_score',
            'usage_count',
            'last_used_at',
            'pattern_data',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'confidence_score',
            'usage_count',
            'last_used_at',
            'created_at',
            'updated_at',
        ]


class LearnPatternSerializer(serializers.Serializer):
    """Serializer for learning pattern from transaction"""

    transaction_id = serializers.IntegerField(required=True)
    account_id = serializers.IntegerField(required=True)

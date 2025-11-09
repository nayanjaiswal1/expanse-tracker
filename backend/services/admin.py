from django.contrib import admin
from .models import (
    GmailAccount,
    EmailAccountPattern,
    SplitwiseIntegration,
    SplitwiseGroupMapping,
    SplitwiseExpenseMapping,
    SplitwiseSyncLog,
)


@admin.register(EmailAccountPattern)
class EmailAccountPatternAdmin(admin.ModelAdmin):
    list_display = [
        'user',
        'account',
        'sender_domain',
        'merchant_name',
        'institution_name',
        'confidence_score',
        'usage_count',
    ]
    list_filter = ['confidence_score']
    search_fields = [
        'user__username',
        'account__name',
        'sender_email',
        'merchant_name',
        'institution_name',
    ]
    raw_id_fields = ['user', 'account']


@admin.register(GmailAccount)
class GmailAccountAdmin(admin.ModelAdmin):
    list_display = [
        'user',
        'email',
        'is_active',
        'last_sync_at',
    ]
    list_filter = ['is_active']
    search_fields = ['user__username', 'email', 'name']
    raw_id_fields = ['user']


@admin.register(SplitwiseIntegration)
class SplitwiseIntegrationAdmin(admin.ModelAdmin):
    list_display = [
        'user',
        'is_active',
        'auto_sync_enabled',
        'last_successful_sync_at',
        'sync_status',
    ]
    list_filter = ['is_active', 'auto_sync_enabled', 'sync_status']
    search_fields = ['user__username', 'splitwise_email']
    raw_id_fields = ['user']


@admin.register(SplitwiseGroupMapping)
class SplitwiseGroupMappingAdmin(admin.ModelAdmin):
    list_display = [
        'integration',
        'local_group',
        'splitwise_group_name',
        'sync_enabled',
        'sync_direction',
        'last_synced_at',
    ]
    list_filter = ['sync_enabled', 'sync_direction']
    search_fields = [
        'integration__user__username',
        'local_group__name',
        'splitwise_group_name',
    ]
    raw_id_fields = ['integration', 'local_group']


@admin.register(SplitwiseExpenseMapping)
class SplitwiseExpenseMappingAdmin(admin.ModelAdmin):
    list_display = [
        'group_mapping',
        'local_expense',
        'splitwise_expense_id',
        'sync_status',
        'last_synced_at',
    ]
    list_filter = ['sync_status']
    search_fields = [
        'group_mapping__local_group__name',
        'local_expense__description',
    ]
    raw_id_fields = ['group_mapping', 'local_expense']


@admin.register(SplitwiseSyncLog)
class SplitwiseSyncLogAdmin(admin.ModelAdmin):
    list_display = [
        'integration',
        'sync_type',
        'status',
        'started_at',
        'completed_at',
        'groups_synced',
        'expenses_synced',
    ]
    list_filter = ['sync_type', 'status']
    search_fields = ['integration__user__username']
    readonly_fields = ['started_at', 'completed_at']
    raw_id_fields = ['integration']
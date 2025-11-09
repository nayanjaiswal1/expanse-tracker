from django.contrib import admin
from .models import (
    Account,
    Category,
    Tag,
    Investment,
    Goal,
    GroupExpense,
    GroupExpenseShare,
    Transaction,
    TransactionDocument,
    Currency,
)
from .models.budgets import (
    Budget,
    BudgetCategory,
    BudgetTemplate,
    BudgetTemplateCategory,
)


@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = ["name", "user", "account_type", "balance", "currency", "status"]
    list_filter = ["account_type", "status"]
    search_fields = ["name", "user__username", "institution", "account_number"]


from django.utils.html import format_html
from django.urls import reverse

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "user", "display_icon_column", "parent_link", "is_active"]
    list_filter = ["is_active", "user"]
    search_fields = ["name", "user__username"]
    list_select_related = ["parent", "user"]
    readonly_fields = ["display_icon", "hierarchy_path"]
    fields = ["user", "name", "parent", "icon", "display_icon", "is_active", "hierarchy_path"]
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('parent')
    
    def display_icon_column(self, obj):
        return format_html(
            '<span class="icon" style="font-family: monospace; font-size: 1.2em">{}</span>',
            obj.display_icon or "—"
        )
    display_icon_column.short_description = "Icon"
    display_icon_column.admin_order_field = "icon"
    
    def parent_link(self, obj):
        if obj.parent:
            url = reverse('admin:finance_category_change', args=[obj.parent.id])
            return format_html('<a href="{}">{}</a>', url, obj.parent)
        return "—"
    parent_link.short_description = "Parent"
    parent_link.admin_order_field = "parent__name"
    
    def hierarchy_path(self, obj):
        if not obj.ancestors:
            return "—"
        links = []
        for ancestor in reversed(obj.ancestors):
            url = reverse('admin:finance_category_change', args=[ancestor.id])
            links.append(f'<a href="{url}">{ancestor.name}</a>')
        return format_html(" → ".join(links))
    hierarchy_path.short_description = "Hierarchy Path"
    hierarchy_path.allow_tags = True


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ["name", "user", "color"]
    list_filter = ["color"]
    search_fields = ["name", "user__username"]


@admin.register(Investment)
class InvestmentAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "user",
        "symbol",
        "investment_type",
        "current_price",
        "currency",
        "is_active",
        "last_price_update",
    ]
    list_filter = ["investment_type", "is_active"]
    search_fields = ["name", "symbol", "user__username"]


@admin.register(Goal)
class GoalAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "user",
        "goal_type",
        "target_amount",
        "current_amount",
        "status",
    ]
    list_filter = ["goal_type", "status"]
    search_fields = ["name", "user__username"]


@admin.register(GroupExpense)
class GroupExpenseAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "created_by",
        "total_amount",
        "currency",
        "split_method",
        "status",
        "date",
    ]
    list_filter = ["status", "split_method", "date"]
    search_fields = ["title", "created_by__username"]


@admin.register(GroupExpenseShare)
class GroupExpenseShareAdmin(admin.ModelAdmin):
    list_display = [
        "group_expense",
        "user",
        "share_amount",
        "paid_amount",
        "is_settled",
    ]
    # 'is_settled' is a @property, not a model field; cannot be used in list_filter
    list_filter = []
    search_fields = ["group_expense__title", "user__username"]



@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = [
        "description",
        "user",
        "is_credit",
        "amount",
        "date",
        "status",
        "account",
        "transaction_group",
    ]
    list_filter = ["is_credit", "status", "date", "is_deleted"]
    search_fields = ["description", "user__email", "user__username", "transaction_group__name"]
    readonly_fields = ["created_at", "updated_at", "deleted_at"]


# # Budget Admin Classes
# @admin.register(Budget)
# class BudgetAdmin(admin.ModelAdmin):
#     list_display = [
#         "name",
#         "user",
#         "period_type",
#         "start_date",
#         "end_date",
#         "total_amount",
#         "is_active",
#         "is_current",
#     ]
#     list_filter = ["period_type", "is_active", "start_date", "end_date"]
#     search_fields = ["name", "user__username", "description"]
#     readonly_fields = ["created_at", "updated_at", "total_spent", "total_remaining", "spent_percentage", "progress_percentage"]

#     fieldsets = (
#         (None, {
#             'fields': ('user', 'name', 'description')
#         }),
#         ('Budget Period', {
#             'fields': ('period_type', 'start_date', 'end_date')
#         }),
#         ('Budget Amount', {
#             'fields': ('total_amount', 'is_active', 'auto_rollover')
#         }),
#         ('Calculated Fields', {
#             'fields': ('total_spent', 'total_remaining', 'spent_percentage', 'progress_percentage'),
#             'classes': ('collapse',)
#         }),
#         ('Timestamps', {
#             'fields': ('created_at', 'updated_at'),
#             'classes': ('collapse',)
#         }),
#     )


# @admin.register(BudgetCategory)
# class BudgetCategoryAdmin(admin.ModelAdmin):
#     list_display = [
#         "budget",
#         "category",
#         "allocated_amount",
#         "spent_amount",
#         "spent_percentage",
#         "is_essential",
#         "is_over_budget",
#     ]
#     list_filter = ["is_essential", "budget__period_type"]
#     search_fields = ["budget__name", "category__name", "notes"]
#     readonly_fields = ["created_at", "updated_at", "spent_amount", "remaining_amount", "spent_percentage"]

#     fieldsets = (
#         (None, {
#             'fields': ('budget', 'category')
#         }),
#         ('Allocation', {
#             'fields': ('allocated_amount', 'alert_threshold', 'is_essential')
#         }),
#         ('Spending Tracking', {
#             'fields': ('spent_amount', 'remaining_amount', 'spent_percentage'),
#             'classes': ('collapse',)
#         }),
#         ('Additional Info', {
#             'fields': ('notes', 'created_at', 'updated_at'),
#             'classes': ('collapse',)
#         }),
#     )


# @admin.register(BudgetAlert)
# class BudgetAlertAdmin(admin.ModelAdmin):
#     list_display = [
#         "budget_category",
#         "alert_type",
#         "spent_percentage",
#         "triggered_at",
#         "is_acknowledged",
#         "acknowledged_at",
#     ]
#     list_filter = ["alert_type", "is_acknowledged", "triggered_at"]
#     search_fields = ["budget_category__budget__name", "budget_category__category__name", "message"]
#     readonly_fields = ["triggered_at"]

#     actions = ['mark_acknowledged']

#     def mark_acknowledged(self, request, queryset):
#         from django.utils import timezone
#         updated = queryset.update(is_acknowledged=True, acknowledged_at=timezone.now())
#         self.message_user(request, f'{updated} alerts marked as acknowledged.')
#     mark_acknowledged.short_description = "Mark selected alerts as acknowledged"


# @admin.register(BudgetTemplate)
# class BudgetTemplateAdmin(admin.ModelAdmin):
#     list_display = [
#         "name",
#         "created_by",
#         "period_type",
#         "is_public",
#         "usage_count",
#         "category_allocations_count",
#         "created_at",
#     ]
#     list_filter = ["period_type", "is_public", "created_at"]
#     search_fields = ["name", "created_by__username", "description"]
#     readonly_fields = ["created_at", "updated_at", "usage_count", "category_allocations_count", "total_percentage"]

#     fieldsets = (
#         (None, {
#             'fields': ('created_by', 'name', 'description')
#         }),
#         ('Template Settings', {
#             'fields': ('period_type', 'total_amount', 'is_public')
#         }),
#         ('Statistics', {
#             'fields': ('usage_count', 'category_allocations_count', 'total_percentage'),
#             'classes': ('collapse',)
#         }),
#         ('Timestamps', {
#             'fields': ('created_at', 'updated_at'),
#             'classes': ('collapse',)
#         }),
#     )


# @admin.register(BudgetTemplateCategory)
# class BudgetTemplateCategoryAdmin(admin.ModelAdmin):
#     list_display = [
#         "template",
#         "category",
#         "allocation_type",
#         "allocation_value",
#         "alert_threshold",
#         "is_essential",
#     ]
#     list_filter = ["allocation_type", "is_essential", "template__period_type"]
#     search_fields = ["template__name", "category__name", "notes"]

#     fieldsets = (
#         (None, {
#             'fields': ('template', 'category')
#         }),
#         ('Allocation', {
#             'fields': ('allocation_type', 'allocation_value', 'alert_threshold', 'is_essential')
#         }),
#         ('Additional Info', {
#             'fields': ('notes',)
#         }),
#     )


@admin.register(Currency)
class CurrencyAdmin(admin.ModelAdmin):
    list_display = [
        'code', 
        'name', 
        'symbol', 
        'is_active', 
        'is_base_currency',
        'exchange_rate',
        'last_updated'
    ]
    list_filter = ['is_active', 'is_base_currency']
    search_fields = ['code', 'name', 'symbol']
    list_editable = ['is_active', 'is_base_currency', 'exchange_rate']
    ordering = ['code']
    readonly_fields = ['created_at', 'updated_at', 'last_updated']
    fieldsets = (
        ('Basic Information', {
            'fields': ('code', 'name', 'symbol', 'is_active', 'is_base_currency')
        }),
        ('Formatting', {
            'fields': (
                'symbol_position', 
                'decimal_places',
                'decimal_separator',
                'thousands_separator'
            )
        }),
        ('Exchange Rate', {
            'fields': ('exchange_rate', 'last_updated')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(TransactionDocument)
class TransactionDocumentAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "user",
        "transaction",
        "document_type",
        "original_filename",
        "processing_status",
        "extraction_confidence",
        "user_verified",
        "created_at",
    ]
    list_filter = ["document_type", "processing_status", "user_verified", "created_at"]
    search_fields = ["original_filename", "user__username", "transaction__description", "ocr_text"]
    readonly_fields = [
        "file_path",
        "file_url",
        "file_size",
        "processing_status",
        "ocr_text",
        "extracted_data",
        "processing_errors",
        "processed_at",
        "extraction_confidence",
        "ai_model_used",
        "created_at",
        "updated_at",
    ]
    fieldsets = (
        (None, {
            'fields': ('user', 'transaction', 'document_type', 'notes')
        }),
        ('File Information', {
            'fields': ('original_filename', 'file_path', 'file_url', 'file_size', 'content_type')
        }),
        ('Processing', {
            'fields': (
                'processing_status', 'ocr_text', 'extracted_data',
                'processing_errors', 'processed_at',
                'extraction_confidence', 'ai_model_used'
            )
        }),
        ('User Verification', {
            'fields': ('user_verified', 'user_corrected_data')
        }),
        ('Metadata', {
            'fields': ('metadata', 'created_at', 'updated_at')
        }),
    )

from django.contrib import admin
from django.core.exceptions import ValidationError

from . import models





@admin.register(models.Entity)
class EntityAdmin(admin.ModelAdmin):
    list_display = ("name", "entity_type", "user", "is_active")
    list_filter = ("entity_type", "is_active")
    search_fields = ("name", "user__username", "user__email")


class GroupMemberInline(admin.TabularInline):
    model = models.GroupMember
    extra = 0
    autocomplete_fields = ("user",)


@admin.register(models.Group)
class GroupAdmin(admin.ModelAdmin):
    list_display = ("name", "created_by", "currency", "is_active", "created_at")
    list_filter = ("currency", "is_active")
    search_fields = ("name", "created_by__username", "created_by__email")
    inlines = [GroupMemberInline]


@admin.register(models.GroupMember)
class GroupMemberAdmin(admin.ModelAdmin):
    list_display = ("group", "user", "total_paid", "total_owed", "is_admin")
    list_filter = ("is_admin",)
    search_fields = ("group__name", "user__username", "user__email")
    autocomplete_fields = ("group", "user")


class TransactionItemInline(admin.TabularInline):
    model = models.TransactionItem
    extra = 0
    autocomplete_fields = ()


class TransactionSplitInline(admin.TabularInline):
    model = models.TransactionSplit
    extra = 0
    autocomplete_fields = ("member",)


@admin.register(models.PendingTransaction)
class PendingTransactionAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "description", "amount", "status", "source", "date", "created_at")
    list_filter = ("status", "source", "is_expense")
    search_fields = ("description", "source_id")
    autocomplete_fields = ("user", "entity")
    date_hierarchy = "date"
    readonly_fields = ("source", "source_id", "metadata", "items", "created_at")


@admin.register(models.Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "amount", "currency", "is_expense", "date", "entity", "group", "is_deleted")
    list_filter = ("is_expense", "is_deleted", "date")
    search_fields = ("description", "metadata")
    autocomplete_fields = ("user", "entity", "group")
    inlines = [TransactionItemInline, TransactionSplitInline]
    date_hierarchy = "date"

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        """Limit account and entity choices to the selected user's items."""
        if db_field.name == "account":
            # Get user from the form if editing, otherwise no filtering
            user_id = request.resolver_match.kwargs.get('object_id')
            if user_id:
                try:
                    transaction = models.Transaction.all_objects.get(pk=user_id)
                    kwargs["queryset"] = models.Account.objects.filter(user=transaction.user)
                except models.Transaction.DoesNotExist:
                    pass
        elif db_field.name == "entity":
            user_id = request.resolver_match.kwargs.get('object_id')
            if user_id:
                try:
                    transaction = models.Transaction.all_objects.get(pk=user_id)
                    kwargs["queryset"] = models.Entity.objects.filter(user=transaction.user)
                except models.Transaction.DoesNotExist:
                    pass
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

    def save_model(self, request, obj, form, change):
        """Validate that account and entity belong to the same user as the transaction."""
        if obj.account and obj.account.user != obj.user:
            raise ValidationError(f"Account '{obj.account.name}' does not belong to user '{obj.user.username}'")
        if obj.entity and obj.entity.user and obj.entity.user != obj.user:
            raise ValidationError(f"Entity '{obj.entity.name}' does not belong to user '{obj.user.username}'")
        super().save_model(request, obj, form, change)


@admin.register(models.TransactionItem)
class TransactionItemAdmin(admin.ModelAdmin):
    list_display = ("transaction", "name", "quantity", "unit_price", "amount")
    search_fields = ("name", "transaction__description")
    autocomplete_fields = ("transaction",)


@admin.register(models.TransactionSplit)
class TransactionSplitAdmin(admin.ModelAdmin):
    list_display = ("transaction", "member", "amount", "created_at")
    autocomplete_fields = ("transaction", "member")


@admin.register(models.UploadedFile)
class UploadedFileAdmin(admin.ModelAdmin):
    list_display = ("file_name", "file_type", "user", "processing_status_display", "is_linked", "created_at")
    search_fields = ("file_name", "user__username", "user__email", "file_hash")
    autocomplete_fields = ("user",)
    list_filter = ("file_type", "created_at")
    readonly_fields = ("file_hash", "processing_status_display", "linked_to_display", "ocr_text", "metadata", "created_at")

    def processing_status_display(self, obj):
        """Display processing status."""
        return obj.processing_status
    processing_status_display.short_description = "Status"

    def linked_to_display(self, obj):
        """Display what this file is linked to."""
        if obj.content_object:
            return f"{obj.content_type.model.title()}: {obj.content_object}"
        return "Not linked"
    linked_to_display.short_description = "Linked To"


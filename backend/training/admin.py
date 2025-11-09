from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse

from .models import AILabel, RawEmail, RawEmailAttachment, UnifiedTransaction


@admin.register(RawEmail)
class RawEmailAdmin(admin.ModelAdmin):
    list_display = ("subject", "sender", "source", "received_at", "processing_status")
    search_fields = ("subject", "sender", "message_id")
    list_filter = ("source", "processing_status", "is_transaction_email")
    list_select_related = ("user", "gmail_account")


@admin.register(AILabel)
class AILabelAdmin(admin.ModelAdmin):
    list_display = (
        "label",
        "raw_email_subject",
        "transaction_type",
        "amount",
        "user_verified",
        "created_at",
    )
    search_fields = (
        "raw_email__subject",
        "raw_email__sender",
        "raw_email__message_id",
        "reference_id",
        "merchant",
    )
    list_filter = ("label", "transaction_type", "source", "user_verified")
    list_select_related = ("raw_email", "raw_email__user")
    autocomplete_fields = ("raw_email",)
    readonly_fields = ("created_at", "updated_at", "raw_email_link")
    fieldsets = (
        ("Email context", {"fields": ("raw_email_link", "raw_email", "source")}),
        (
            "Classification",
            {
                "fields": (
                    ("label", "label_confidence"),
                    "transaction_type",
                    ("amount", "currency"),
                    "merchant",
                    "transaction_date",
                    "reference_id",
                    "account_number",
                )
            },
        ),
        (
            "Extraction metadata",
            {
                "classes": ("collapse",),
                "fields": (
                    "extraction_model",
                    "extraction_prompt_version",
                    "processing_time_ms",
                    "extracted_data",
                    "raw_llm_response",
                ),
            },
        ),
        (
            "User feedback",
            {
                "classes": ("collapse",),
                "fields": ("user_verified", "user_corrected_label", "user_corrected_data"),
            },
        ),
        ("Timestamps", {"fields": ("created_at", "updated_at")}),
    )

    @admin.display(description="Email subject")
    def raw_email_subject(self, obj):
        if obj.raw_email_id:
            return obj.raw_email.subject
        return "-"

    @admin.display(description="Raw email")
    def raw_email_link(self, obj):
        if not obj or not obj.raw_email_id:
            return "-"
        url = reverse("admin:training_rawemail_change", args=[obj.raw_email_id])
        subject = obj.raw_email.subject[:80] if obj.raw_email.subject else obj.raw_email_id
        return format_html('<a href="{}">{}</a>', url, subject)


@admin.register(UnifiedTransaction)
class UnifiedTransactionAdmin(admin.ModelAdmin):
    list_display = (
        "transaction_type",
        "merchant",
        "amount",
        "user",
        "primary_source",
        "user_verified",
        "transaction_date",
    )
    search_fields = (
        "merchant",
        "reference_ids",
        "description",
        "account_number",
        "user__email",
        "user__username",
    )
    list_filter = (
        "transaction_type",
        "primary_source",
        "user_verified",
        "user_edited",
        "is_duplicate",
    )
    list_select_related = ("user",)
    autocomplete_fields = ("user", "source_ai_labels")
    readonly_fields = ("created_at", "updated_at")
    fieldsets = (
        (
            "Transaction details",
            {
                "fields": (
                    "user",
                    "transaction_type",
                    ("amount", "currency"),
                    "merchant",
                    "transaction_date",
                    "primary_source",
                )
            },
        ),
        (
            "Identifiers",
            {"classes": ("collapse",), "fields": ("reference_ids", "account_number")},
        ),
        (
            "Source labels",
            {"classes": ("collapse",), "fields": ("source_ai_labels", "merge_reason", "merge_metadata")},
        ),
        (
            "User feedback",
            {"fields": ("user_verified", "user_edited", "is_duplicate", "description", "category")},
        ),
        ("Timestamps", {"fields": ("created_at", "updated_at")}),
    )


@admin.register(RawEmailAttachment)
class RawEmailAttachmentAdmin(admin.ModelAdmin):
    list_display = ("filename", "mime_type", "size", "raw_email")
    search_fields = ("filename", "raw_email__message_id")
    list_select_related = ("raw_email",)

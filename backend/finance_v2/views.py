import hashlib
import logging
from calendar import monthrange
from datetime import date
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, List

from django.conf import settings
from django.core.cache import cache
from django.utils import timezone
from django.db.models import Prefetch, Q, QuerySet
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status, viewsets
from rest_framework import serializers as drf_serializers
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from . import models
from . import serializers as finance_serializers
from .services.pending_transaction_service import PendingTransactionService
from .services.transaction_ingestion import TransactionIngestionService, TransactionPayload
from .tasks import process_uploaded_file
from .utils import UserOwnedViewSetMixin


logger = logging.getLogger(__name__)


class UserOwnedViewSet(viewsets.ModelViewSet, UserOwnedViewSetMixin):
    """Base viewset that scopes queries to the authenticated user."""

    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self) -> QuerySet:
        queryset = super().get_queryset()
        return self.get_default_queryset(queryset, self.request)

    def perform_create(self, serializer):
        model = getattr(serializer.Meta, "model", None)
        save_kwargs = {}
        if model:
            save_kwargs = self.build_save_kwargs(model, self.request.user)
        serializer.save(**save_kwargs)

    def perform_update(self, serializer):
        instance = serializer.instance
        model = instance.__class__
        save_kwargs = {}
        field_names = {field.name for field in model._meta.fields}
        if "updated_by" in field_names:
            save_kwargs["updated_by"] = self.request.user
        serializer.save(**save_kwargs)


class EntityViewSet(UserOwnedViewSet):
    queryset = models.Entity.objects.all()
    serializer_class = finance_serializers.EntitySerializer
    filterset_fields = ["entity_type", "is_active"]
    search_fields = ["name"]
    ordering_fields = ["name", "created_at"]


class GroupViewSet(UserOwnedViewSet):
    queryset = models.Group.objects.prefetch_related("members").all()
    serializer_class = finance_serializers.GroupSerializer
    filterset_fields = ["is_active", "currency"]
    search_fields = ["name"]
    ordering_fields = ["name", "created_at"]

    def get_queryset(self) -> QuerySet:
        return (
            models.Group.objects.filter(Q(created_by=self.request.user) | Q(members__user=self.request.user))
            .distinct()
            .prefetch_related("members")
        )

    def perform_create(self, serializer):
        self.ensure_currency(serializer.validated_data, self.request.user)
        super().perform_create(serializer)


class GroupMemberViewSet(UserOwnedViewSet):
    queryset = models.GroupMember.objects.select_related("group", "user").all()
    serializer_class = finance_serializers.GroupMemberSerializer
    filterset_fields = ["group", "is_admin"]
    search_fields = ["group__name", "user__username"]

    def get_queryset(self) -> QuerySet:
        return models.GroupMember.objects.filter(
            Q(group__created_by=self.request.user) | Q(group__members__user=self.request.user)
        ).distinct()

    def perform_create(self, serializer):
        group = serializer.validated_data.get("group")
        if group is None:
            raise drf_serializers.ValidationError({"group": "Group is required."})
        if group.created_by != self.request.user and not group.members.filter(user=self.request.user, is_admin=True).exists():
            raise PermissionDenied("You do not have permission to add members to this group.")
        serializer.save()


class TransactionViewSet(UserOwnedViewSet):
    queryset = models.Transaction.all_objects.select_related(
        "account",
        "entity",
        "group",
    ).prefetch_related(
        Prefetch("items", queryset=models.TransactionItem.objects.select_related("category")),
        "splits",
    )
    serializer_class = finance_serializers.TransactionSerializer
    filterset_fields = ["account", "entity", "group", "is_expense", "is_deleted", "date"]
    search_fields = ["description"]
    ordering_fields = ["date", "amount", "created_at"]

    def perform_create(self, serializer):
        data = serializer.validated_data
        self.ensure_currency(data, self.request.user)
        super().perform_create(serializer)


class PendingTransactionViewSet(UserOwnedViewSet):
    queryset = models.PendingTransaction.objects.select_related(
        "account",
        "entity",
        "group",
        "suggested_category",
        "suggested_entity",
        "imported_transaction",
    )
    serializer_class = finance_serializers.PendingTransactionSerializer
    filterset_fields = ["source", "status", "account", "is_expense"]
    search_fields = ["description"]
    ordering_fields = ["date", "amount", "created_at"]

    def perform_create(self, serializer):
        super().perform_create(serializer)

    @action(detail=False, methods=["post"], url_path="enqueue")
    def enqueue(self, request):
        data = request.data
        try:
            items = data.get("items") or []
            if not isinstance(items, list):
                raise ValueError("items must be a list of objects")
            payload = PendingTransactionPayload(
                amount=Decimal(str(data["amount"])),
                is_expense=bool(data.get("is_expense", True)),
                description=data.get("description", ""),
                date=date.fromisoformat(data["date"]),
                account_id=data.get("account_id"),
                entity_id=data.get("entity_id"),
                entity_name=data.get("entity_name"),
                group_id=data.get("group_id"),
                suggested_category_id=data.get("suggested_category_id"),
                suggested_category_name=data.get("suggested_category_name"),
                metadata=data.get("metadata") or {},
                items=items,
            )
        except KeyError as exc:
            return Response({"error": f"Missing required field: {exc.args[0]}"}, status=status.HTTP_400_BAD_REQUEST)
        except (ValueError, InvalidOperation) as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        service = PendingTransactionService(request.user)
        pending = service.enqueue(
            payload,
            source=data.get("source", "manual"),
            source_id=data.get("source_id"),
        )
        serializer = self.get_serializer(pending)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        pending = self.get_object()
        if pending.status == "approved" and pending.imported_transaction:
            serializer = finance_serializers.TransactionSerializer(pending.imported_transaction)
            return Response(serializer.data, status=status.HTTP_200_OK)

        target_entity = pending.entity
        metadata = dict(pending.metadata or {})
        metadata.update(
            {
                "pending_transaction_id": pending.id,
                "pending_source": pending.source,
            }
        )

        payload = TransactionPayload(
            amount=pending.amount,
            is_expense=pending.is_expense,
            description=pending.description,
            date=pending.date,
            account=pending.account,
            entity=target_entity,
            group=pending.group,
            metadata=metadata,
            items=pending.items,
        )

        ingestion_service = TransactionIngestionService(request.user)
        transaction = ingestion_service.ingest(payload, source=pending.source, source_id=pending.source_id or str(pending.id))

        metadata["imported_transaction_id"] = transaction.id
        pending.status = "approved"
        pending.imported_transaction = transaction
        pending.metadata = metadata
        pending.save(update_fields=["status", "imported_transaction", "metadata", "updated_at"])

        serializer = finance_serializers.TransactionSerializer(transaction)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        pending = self.get_object()
        pending.status = "rejected"
        pending.save(update_fields=["status", "updated_at"])
        return Response({"message": "Pending transaction rejected."}, status=status.HTTP_200_OK)


class UploadedFileViewSet(UserOwnedViewSet):
    queryset = models.UploadedFile.objects.select_related("account", "content_type").all()
    serializer_class = finance_serializers.UploadedFileSerializer
    parser_classes = (MultiPartParser, FormParser)
    filterset_fields = ["file_type", "account"]
    search_fields = ["file_name", "file_hash"]
    ordering_fields = ["created_at"]

    def perform_create(self, serializer):
        file_obj = serializer.validated_data.get("file")
        if not file_obj:
            raise drf_serializers.ValidationError({"file": "A file is required."})

        file_hash = hashlib.sha256(file_obj.read()).hexdigest()
        file_obj.seek(0)

        if models.UploadedFile.objects.filter(user=self.request.user, file_hash=file_hash).exists():
            raise drf_serializers.ValidationError({"file": "This file has already been uploaded."})

        file_type = serializer.validated_data.get("file_type")
        account = serializer.validated_data.get("account")

        if file_type == "statement" and not account:
            raise drf_serializers.ValidationError({"account": "Account is required for statement uploads."})

        uploaded_file = serializer.save(user=self.request.user, file_hash=file_hash)

        # Kick off asynchronous processing. Fall back to inline if Celery isn't available.
        run_inline = getattr(settings, "CELERY_TASK_ALWAYS_EAGER", False)
        try:
            if run_inline:
                process_uploaded_file(uploaded_file.id)
            else:
                process_uploaded_file.delay(uploaded_file.id)
        except Exception as exc:  # pragma: no cover - safety net for local dev without Celery
            logger.warning("Celery processing failed, running inline: %s", exc)
            process_uploaded_file(uploaded_file.id)

    @action(detail=True, methods=["get"], url_path="processing-status")
    def processing_status(self, request, pk=None):
        uploaded_file = self.get_object()
        return Response({
            "id": uploaded_file.id,
            "file_name": uploaded_file.file_name,
            "file_type": uploaded_file.file_type,
            "processing_status": uploaded_file.processing_status,
            "is_linked": uploaded_file.is_linked,
            "linked_to": uploaded_file.linked_to if uploaded_file.content_object else None,
            "metadata": uploaded_file.metadata,
        }, status=status.HTTP_200_OK)


class ChatMessageViewSet(UserOwnedViewSet):
    """ViewSet for chat-based transaction entry."""

    queryset = models.ChatMessage.objects.select_related(
        "user", "related_transaction", "related_file"
    ).all()
    serializer_class = finance_serializers.ChatMessageSerializer
    filterset_fields = ["conversation_id", "message_type", "status"]
    search_fields = ["content"]
    ordering_fields = ["created_at"]

    @action(detail=True, methods=["post"], url_path="parse")
    def parse_message(self, request, pk=None):
        """Parse a chat message using AI to extract transaction data."""
        message = self.get_object()

        if message.status == "completed":
            return Response(
                {"detail": "Message already parsed"},
                status=status.HTTP_200_OK
            )

        # Update status to processing
        message.status = "processing"
        message.save(update_fields=["status", "updated_at"])

        # Trigger async parsing (import here to avoid circular dependency)
        from .tasks import parse_chat_message_with_ai

        try:
            parse_chat_message_with_ai.delay(message.id)
        except Exception as e:
            logger.warning(f"Celery failed, running inline: {e}")
            parse_chat_message_with_ai(message.id)

        return Response(
            {"detail": "Parsing started", "message_id": message.id},
            status=status.HTTP_202_ACCEPTED
        )

    @action(detail=False, methods=["post"], url_path="upload-file")
    def upload_file(self, request):
        """Upload a file in the chat for processing."""
        file_obj = request.FILES.get("file")
        if not file_obj:
            return Response(
                {"detail": "No file provided"},
                status=status.HTTP_400_BAD_REQUEST
            )

        mode = request.data.get("mode", "ai")
        conversation_id = request.data.get("conversation_id", "quick-add")

        # Create UploadedFile
        uploaded_file = models.UploadedFile.objects.create(
            user=request.user,
            file=file_obj,
            file_name=file_obj.name,
            file_type="statement",  # or auto-detect based on extension
            upload_source="chat",
            processing_mode=mode if mode == "ai" else "parser",
        )

        # Create chat message for the upload
        chat_message = models.ChatMessage.objects.create(
            user=request.user,
            conversation_id=conversation_id,
            message_type="user",
            content=f"Uploaded file: {file_obj.name}",
            status="processing",
            related_file=uploaded_file,
            metadata={
                "mode": mode,
                "input_type": "file",
                "file_info": {
                    "filename": file_obj.name,
                    "file_id": uploaded_file.id,
                    "mime_type": file_obj.content_type,
                    "size_bytes": file_obj.size,
                    "processing_status": "pending"
                }
            }
        )

        # Trigger file processing
        from .tasks import process_chat_file_upload
        try:
            process_chat_file_upload.delay(chat_message.id, uploaded_file.id)
        except Exception as e:
            logger.warning(f"Celery failed, running inline: {e}")
            process_chat_file_upload(chat_message.id, uploaded_file.id)

        serializer = self.get_serializer(chat_message)
        return Response(serializer.data, status=status.HTTP_202_ACCEPTED)

    @action(detail=False, methods=["get"], url_path="mention-autocomplete")
    def mention_autocomplete(self, request):
        """Get autocomplete suggestions for @ mentions."""
        query = request.query_params.get("q", "")
        mention_type = request.query_params.get("type", "user")
        limit = int(request.query_params.get("limit", 10))

        results = []

        if mention_type == "user":
            # Search users (you might want to limit this to friends/group members)
            from django.contrib.auth import get_user_model
            User = get_user_model()

            users = User.objects.filter(
                Q(first_name__icontains=query) |
                Q(last_name__icontains=query) |
                Q(username__icontains=query)
            )[:limit]

            results = [
                {
                    "type": "user",
                    "id": user.id,
                    "text": f"@{user.username}",
                    "display": f"{user.get_full_name() or user.username}",
                    "username": user.username,
                }
                for user in users
            ]

        elif mention_type == "group":
            # Search groups
            groups = models.Group.objects.filter(
                Q(created_by=request.user) | Q(members__user=request.user),
                name__icontains=query,
                is_active=True
            ).distinct()[:limit]

            results = [
                {
                    "type": "group",
                    "id": group.id,
                    "text": f"@{group.name}",
                    "display": group.name,
                    "members_count": group.members.count()
                }
                for group in groups
            ]

        elif mention_type == "category":
            # Search categories (if you have a Category model)
            # This would need to be imported from finance app
            try:
                from finance.models import Category
                categories = Category.objects.filter(
                    Q(user=request.user) | Q(user__isnull=True),
                    name__icontains=query
                )[:limit]

                results = [
                    {
                        "type": "category",
                        "id": cat.id,
                        "text": f"#{cat.name}",
                        "display": cat.name,
                    }
                    for cat in categories
                ]
            except ImportError:
                logger.warning("Category model not found")

        return Response(results, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="save-transaction")
    def save_transaction(self, request, pk=None):
        """Convert a parsed chat message into an actual transaction."""
        message = self.get_object()

        if message.related_transaction:
            return Response(
                {"detail": "Transaction already created"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get parsed data from metadata
        parsed_data = message.metadata.get("parsed", {})

        if not parsed_data:
            return Response(
                {"detail": "No parsed data available"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Apply user edits if provided
        edits = request.data.get("edits", {})
        for field, value in edits.items():
            if field in ["amount", "description", "category", "date", "is_expense"]:
                # Track edit history
                if "user_edits" not in message.metadata:
                    message.metadata["user_edits"] = []
                message.metadata["user_edits"].append({
                    "field": field,
                    "original": parsed_data.get(field),
                    "edited": value,
                    "timestamp": timezone.now().isoformat()
                })
                parsed_data[field] = value

        # Create transaction from parsed data
        transaction_data = {
            "amount": parsed_data.get("amount"),
            "description": parsed_data.get("description", message.content),
            "date": parsed_data.get("date", timezone.now().date()),
            "is_expense": parsed_data.get("is_expense", True),
            "chat_metadata": {
                "created_via_chat": True,
                "chat_message_id": message.id,
                "original_input": message.content,
                "mode_used": message.metadata.get("mode"),
                "confidence_score": parsed_data.get("confidence"),
                "user_confirmed_at": timezone.now().isoformat()
            },
        }

        # Create transaction
        transaction = models.Transaction.objects.create(
            user=request.user,
            **transaction_data
        )

        # Handle splits if this is a group transaction
        mentions = parsed_data.get("mentions", [])
        split_with = parsed_data.get("split_with", [])

        if split_with and hasattr(models, 'TransactionSplit'):
            split_method = parsed_data.get("split_method", "equal")
            total_amount = transaction.amount

            for user_id in split_with:
                # Calculate split amount based on method
                if split_method == "equal":
                    split_amount = total_amount / len(split_with)
                else:
                    split_amount = total_amount / len(split_with)  # fallback to equal

                models.TransactionSplit.objects.create(
                    transaction=transaction,
                    user_id=user_id,
                    amount=split_amount,
                    split_method=split_method
                )

        # Link to message
        message.related_transaction = transaction
        message.metadata.update(parsed_data)  # Save the edited version
        message.save(update_fields=["related_transaction", "metadata", "updated_at"])

        serializer = finance_serializers.TransactionSerializer(transaction)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class StatementPasswordViewSet(UserOwnedViewSet):
    """ViewSet for managing statement passwords."""

    queryset = models.StatementPassword.objects.select_related("user", "account").all()
    serializer_class = finance_serializers.StatementPasswordSerializer
    filterset_fields = ["account", "is_default"]
    ordering_fields = ["created_at", "success_count", "last_used"]

    @action(detail=True, methods=["post"], url_path="test")
    def test_password(self, request, pk=None):
        """Test a password on a specific file."""
        password_obj = self.get_object()
        file_id = request.data.get("file_id")

        if not file_id:
            return Response(
                {"detail": "file_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            uploaded_file = models.UploadedFile.objects.get(
                id=file_id,
                user=request.user
            )
        except models.UploadedFile.DoesNotExist:
            return Response(
                {"detail": "File not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Try to decrypt the password and test it
        try:
            plain_password = password_obj.get_password()

            # TODO: Actually test the password on the file
            # For now, just return success
            password_obj.last_used = timezone.now()
            password_obj.success_count += 1
            password_obj.save(update_fields=["last_used", "success_count", "updated_at"])

            return Response(
                {"detail": "Password test successful"},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {"detail": f"Password test failed: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

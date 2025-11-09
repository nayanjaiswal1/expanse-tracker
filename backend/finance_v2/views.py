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

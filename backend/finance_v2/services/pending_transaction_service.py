"""
Pending transaction queue helpers.

Every external ingestion source (email, sms, statements, manual imports)
should use this service to append entries to the user's review queue.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Dict, List, Optional

from django.db import transaction as db_transaction
from django.db.models import Q

from .. import models
from .currency_helper import get_user_currency


@dataclass
class PendingTransactionPayload:
    """Normalized payload for creating/updating a pending transaction."""

    amount: Decimal
    is_expense: bool
    description: str
    date: date
    account_id: Optional[int] = None
    entity_id: Optional[int] = None
    entity_name: Optional[str] = None
    group_id: Optional[int] = None
    suggested_category_id: Optional[int] = None
    suggested_category_name: Optional[str] = None
    metadata: Optional[Dict] = None
    items: Optional[List[Dict]] = None


class PendingTransactionService:
    """Service to enqueue and manage pending transactions."""

    def __init__(self, user):
        self.user = user

    def enqueue(
        self,
        payload: PendingTransactionPayload,
        source: str,
        source_id: Optional[str] = None,
    ) -> models.PendingTransaction:
        """
        Create or update a pending transaction for review.

        Deduplicates using (source, source_id). If `source_id` is empty we always
        create a new entry, allowing manual duplicates that the user can merge later.
        """
        metadata = payload.metadata.copy() if payload.metadata else {}
        metadata.setdefault("source", source)
        if source_id:
            metadata.setdefault("source_id", source_id)

        with db_transaction.atomic():
            pending = None
            if source_id:
                pending = models.PendingTransaction.all_objects.filter(
                    user=self.user,
                    source=source,
                    source_id=source_id,
                ).first()

            if pending is None:
                pending = models.PendingTransaction(
                    user=self.user,
                    source=source,
                    source_id=source_id or "",
                )

            self._apply_payload(pending, payload, metadata)
            pending.status = "pending"
            pending.is_deleted = False
            pending.save()
        return pending

    # ------------------------------------------------------------------ #
    # Helpers
    # ------------------------------------------------------------------ #
    def _apply_payload(
        self,
        pending: models.PendingTransaction,
        payload: PendingTransactionPayload,
        metadata: Dict,
    ) -> None:
        pending.amount = payload.amount
        pending.is_expense = payload.is_expense
        pending.description = payload.description[:500]
        pending.date = payload.date

        pending.account = self._resolve_account(payload.account_id)
        pending.group = self._resolve_group(payload.group_id)
        pending.entity = self._resolve_entity(payload.entity_id, payload.entity_name)
        pending.suggested_category = self._resolve_category(payload.suggested_category_id, payload.suggested_category_name)

        pending.metadata = metadata
        pending.items = payload.items or []

    def _resolve_account(self, account_id: Optional[int]):
        if not account_id:
            return None
        return models.Account.objects.filter(user=self.user, id=account_id).first()

    def _resolve_group(self, group_id: Optional[int]):
        if not group_id:
            return None
        return (
            models.Group.objects.filter(Q(created_by=self.user) | Q(members__user=self.user), id=group_id)
            .distinct()
            .first()
        )

    def _resolve_entity(self, entity_id: Optional[int], entity_name: Optional[str]):
        if entity_id:
            return models.Entity.objects.filter(user=self.user, id=entity_id).first()
        if entity_name:
            entity, _ = models.Entity.objects.get_or_create(
                user=self.user,
                name=entity_name,
                defaults={"entity_type": "merchant"},
            )
            return entity
        return None

    def _resolve_category(self, category_id: Optional[int], category_name: Optional[str]):
        if category_id:
            return models.Category.objects.filter(Q(user=self.user, id=category_id) | Q(user__isnull=True, id=category_id)).first()
        if category_name:
            category, _ = models.Category.objects.get_or_create(
                user=self.user,
                name=category_name,
            )
            return category
        return None

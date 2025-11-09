"""
Reusable ingestion service that normalizes transactions from multiple sources.

All external pipelines (Gmail, SMS, statements, manual imports) should pass a
lightweight payload into this service so we always create/update the same
`Transaction` records with consistent metadata.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal, InvalidOperation
from typing import Dict, Iterable, Optional

from django.db import transaction as db_transaction
from django.db.models import Q

from .. import models
from finance.models.accounts import Account
from .currency_helper import get_user_currency


@dataclass
class TransactionPayload:
    """Canonical payload accepted by the ingestion service."""

    amount: Decimal
    is_expense: bool
    description: str
    date: date
    account: Optional[Account] = None
    account_id: Optional[int] = None
    entity_name: Optional[str] = None
    entity: Optional[models.Entity] = None
    group: Optional[models.Group] = None
    metadata: Optional[Dict] = None
    items: Optional[Iterable[Dict]] = None


class TransactionIngestionService:
    """Create or update transactions from normalized payloads."""

    def __init__(self, user):
        self.user = user

    def ingest(self, payload: TransactionPayload, source: str, source_id: Optional[str] = None) -> models.Transaction:
        """
        Upsert a transaction using the provided payload.

        Deduplication strategy:
        - If source_id is provided, we look for metadata match.
        - Otherwise, we look for same user/account/date/amount/sign.
        """
        metadata = payload.metadata.copy() if payload.metadata else {}
        metadata.update({"source": source})
        if source_id:
            metadata["source_id"] = source_id

        with db_transaction.atomic():
            txn = self._find_existing_transaction(payload, source, source_id)
            account = self._resolve_account(payload)
            entity = self._resolve_entity(payload)

            if txn:
                self._update_transaction(txn, payload, account, entity, metadata)
            else:
                txn = self._create_transaction(payload, account, entity, metadata)

            self._sync_items(txn, payload.items or [])
        return txn

    def _find_existing_transaction(
        self,
        payload: TransactionPayload,
        source: str,
        source_id: Optional[str],
    ) -> Optional[models.Transaction]:
        qs = models.Transaction.all_objects.filter(user=self.user)
        if source_id:
            match = qs.filter(metadata__source=source, metadata__source_id=source_id).first()
            if match:
                return match

        reference_account = payload.account or (
            models.Account.objects.filter(user=self.user, pk=payload.account_id).first()
            if payload.account_id
            else None
        )
        filters = Q(date=payload.date, amount=payload.amount, is_expense=payload.is_expense)
        if reference_account:
            filters &= Q(account=reference_account)
        return qs.filter(filters).order_by("-updated_at").first()

    def _resolve_account(self, payload: TransactionPayload) -> Optional[Account]:
        if payload.account:
            return payload.account
        if payload.account_id:
            return Account.objects.filter(user=self.user, id=payload.account_id).first()
        # Return first active account (currency determined by account)
        return Account.objects.filter(user=self.user, is_active=True).first()

    def _resolve_entity(self, payload: TransactionPayload) -> Optional[models.Entity]:
        if payload.entity:
            return payload.entity
        if payload.entity_name:
            entity, _ = models.Entity.objects.get_or_create(
                user=self.user,
                name=payload.entity_name,
                defaults={"entity_type": "merchant"},
            )
            return entity
        return None

    def _create_transaction(
        self,
        payload: TransactionPayload,
        account: Optional[Account],
        entity: Optional[models.Entity],
        metadata: Dict,
    ) -> models.Transaction:
        return models.Transaction.objects.create(
            user=self.user,
            account=account,
            amount=payload.amount,
            is_expense=payload.is_expense,
            description=payload.description[:500],
            date=payload.date,
            entity=entity,
            group=payload.group,
            metadata=metadata,
        )

    def _update_transaction(
        self,
        txn: models.Transaction,
        payload: TransactionPayload,
        account: Optional[Account],
        entity: Optional[models.Entity],
        metadata: Dict,
    ) -> None:
        txn.account = account or txn.account
        txn.amount = payload.amount
        txn.is_expense = payload.is_expense
        txn.description = payload.description[:500]
        txn.date = payload.date
        txn.entity = entity or txn.entity
        txn.group = payload.group or txn.group
        txn.metadata.update(metadata)
        txn.save(
            update_fields=[
                "account",
                "amount",
                "is_expense",
                "description",
                "date",
                "entity",
                "group",
                "metadata",
                "updated_at",
            ]
        )

    def _sync_items(self, txn: models.Transaction, items: Iterable[Dict]) -> None:
        txn.items.all().delete()
        for item in items:
            models.TransactionItem.objects.create(
                transaction=txn,
                name=item.get("name", "")[:300],
                quantity=self._to_decimal(item.get("quantity"), default=Decimal("1")),
                unit_price=self._to_decimal(item.get("unit_price"), fallback=item.get("amount"), default=Decimal("0")),
                metadata=item.get("metadata", {}),
            )

    def _to_decimal(self, value, fallback=None, default=Decimal("0")):
        candidate = value if value is not None else fallback
        if candidate is None:
            return default
        try:
            return Decimal(str(candidate))
        except (InvalidOperation, TypeError, ValueError):
            return default

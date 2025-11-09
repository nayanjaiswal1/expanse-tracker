from __future__ import annotations

import logging
from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Any, Dict, Iterator, List, Optional, Sequence

from django.db.models import QuerySet

from training.models import RawEmail

try:
    from finance.models import Transaction
except Exception:  # pragma: no cover - finance app might be disabled in tests
    Transaction = None  # type: ignore

logger = logging.getLogger(__name__)


@dataclass
class EmailExample:
    message_id: str
    subject: str
    sender: str
    snippet: str
    received_at: datetime
    body_text: str
    body_html: str
    is_transaction: bool
    parsed_data: Dict[str, Any] = field(default_factory=dict)
    labels: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_record(self, include_html: bool = True) -> Dict[str, Any]:
        """Return a JSON-serializable representation."""
        record = asdict(self)
        record["received_at"] = self.received_at.isoformat()
        if not include_html:
            record.pop("body_html", None)
        return record


class EmailDatasetBuilder:
    """
    Build structured datasets from stored raw emails for ML training.

    This builder keeps ingestion logic decoupled by consuming RawEmail records
    produced by services.services.email_sync_service.EmailSyncService.
    """

    def __init__(
        self,
        queryset: Optional[QuerySet] = None,
        include_non_transactional: bool = False,
        include_failed: bool = False,
        use_cached_parsed_data: bool = True,
    ) -> None:
        self.queryset = queryset or RawEmail.objects.all()
        self.include_non_transactional = include_non_transactional
        self.include_failed = include_failed
        self.use_cached_parsed_data = use_cached_parsed_data

    def build(self, limit: Optional[int] = None) -> List[EmailExample]:
        """Return a list of EmailExample objects."""
        return list(self.iter_examples(limit=limit))

    def iter_examples(self, limit: Optional[int] = None) -> Iterator[EmailExample]:
        """
        Yield EmailExample objects.

        Args:
            limit: Optional maximum number of examples to emit.
        """
        emails = self._get_queryset(limit=limit)
        transactions = self._load_transactions(emails)

        for raw_email in emails:
            if not self.include_failed and raw_email.processing_status == "failed":
                continue

            if not self.include_non_transactional and not raw_email.is_transaction_email:
                linked_ids = raw_email.linked_transaction_ids or []
                if not linked_ids:
                    continue

            labels = self._build_labels(raw_email, transactions)
            metadata = self._build_metadata(raw_email, labels)

            yield EmailExample(
                message_id=raw_email.message_id,
                subject=raw_email.subject,
                sender=raw_email.sender,
                snippet=raw_email.snippet or (raw_email.body_text or "")[:200],
                received_at=raw_email.received_at,
                body_text=raw_email.body_text or "",
                body_html=raw_email.body_html or "",
                is_transaction=raw_email.is_transaction_email,
                parsed_data=raw_email.parsed_data if self.use_cached_parsed_data else {},
                labels=labels,
                metadata=metadata,
            )

    def as_records(
        self,
        limit: Optional[int] = None,
        include_html: bool = True,
    ) -> List[Dict[str, Any]]:
        """Return dataset as list of dictionaries."""
        return [
            example.to_record(include_html=include_html)
            for example in self.iter_examples(limit=limit)
        ]

    def _get_queryset(self, limit: Optional[int]) -> Sequence[RawEmail]:
        """Fetch RawEmail objects in a batching-friendly way."""
        qs = self.queryset.order_by("-received_at")

        # Keep dataset focused on emails that were at least attempted
        status_filter = ["processed", "ignored", "failed"] if self.include_failed else ["processed", "ignored"]
        qs = qs.filter(processing_status__in=status_filter).prefetch_related("attachments")

        if limit:
            qs = qs[:limit]

        return list(qs)

    def _load_transactions(
        self,
        raw_emails: Sequence[RawEmail],
    ) -> Dict[int, Any]:
        """Preload Transaction objects referenced by RawEmail.linked_transaction_ids."""
        if not raw_emails or Transaction is None:
            return {}

        unique_ids = set()
        for raw_email in raw_emails:
            unique_ids.update(raw_email.linked_transaction_ids or [])

        if not unique_ids:
            return {}

        try:
            return Transaction.objects.in_bulk(unique_ids)
        except Exception as exc:  # pragma: no cover - defensive
            logger.warning("Failed to preload transactions: %s", exc)
            return {}

    def _build_labels(
        self,
        raw_email: RawEmail,
        transactions: Dict[int, Any],
    ) -> Dict[str, Any]:
        """Create label payload for downstream ML training."""
        transaction_payloads = []
        for tx_id in raw_email.linked_transaction_ids or []:
            transaction = transactions.get(tx_id)
            if not transaction:
                continue
            transaction_payloads.append(
                {
                    "id": transaction.id,
                    "amount": float(transaction.amount),
                    "currency": transaction.currency,
                    "description": transaction.description,
                    "date": transaction.date.isoformat(),
                    "transaction_type": transaction.transaction_type,
                    "status": transaction.status,
                    "account_id": transaction.account_id,
                    "category_id": transaction.category_id,
                }
            )

        user_label = raw_email.training_label()
        label_source: Optional[str] = None
        if raw_email.linked_transaction_ids:
            label_source = "transaction_link"
        elif user_label:
            label_source = "user_feedback"

        return {
            "transactions": transaction_payloads,
            "label_count": len(transaction_payloads),
            "was_ignored": raw_email.processing_status == "ignored",
            "had_processing_error": bool(raw_email.processing_error),
            "user_label": user_label,
            "label_source": label_source,
        }

    def _build_metadata(self, raw_email: RawEmail, labels: Dict[str, Any]) -> Dict[str, Any]:
        """Assemble metadata needed for experiment tracking."""
        metadata = {
            "user_id": raw_email.user_id,
            "gmail_account_id": raw_email.gmail_account_id,
            "source": raw_email.source,
            "processing_status": raw_email.processing_status,
            "processing_attempts": raw_email.processing_attempts,
            "has_cached_parsed_data": bool(raw_email.parsed_data),
            "linked_transaction_count": labels.get("label_count", 0),
            "user_label": labels.get("user_label"),
            "label_source": labels.get("label_source"),
            "snippet_length": len(raw_email.snippet or ""),
            "payload_stored": bool(raw_email.gmail_payload),
            "attachment_count": len(raw_email.attachments.all()),
        }

        if raw_email.user_feedback:
            metadata["user_feedback"] = raw_email.user_feedback

        if raw_email.ingestion_log:
            metadata["ingestion_events"] = raw_email.ingestion_log

        return metadata

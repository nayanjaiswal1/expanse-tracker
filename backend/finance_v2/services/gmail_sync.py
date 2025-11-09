"""
Gmail sync service for finance_v2.
Fetches emails, extracts likely transactions, and enqueues them for review.
"""

import logging
from datetime import datetime, timezone as dt_timezone
from decimal import Decimal
from typing import Dict, Optional

from django.contrib.auth import get_user_model

from finance_v2 import models
from services.services.gmail_service import GmailService
from .ai_transaction_extractor import get_extractor
from .pending_transaction_service import PendingTransactionPayload, PendingTransactionService

User = get_user_model()
logger = logging.getLogger(__name__)


class GmailSyncServiceV2:
    """Sync Gmail emails and queue normalized pending transactions."""

    def __init__(self, user: User):
        self.user = user
        self.gmail_service = GmailService(user)
        self.ai_extractor = get_extractor()
        self.pending_service = PendingTransactionService(user)

    def sync_emails(self, limit: int = 100) -> Dict[str, int]:
        """
        Fetch emails, extract transaction candidates, and queue them.

        Returns:
            {"emails_fetched": int, "pending_created": int, "errors": int}
        """
        stats = {"emails_fetched": 0, "pending_created": 0, "errors": 0}

        try:
            emails = self.gmail_service.fetch_emails(max_results=limit)
            stats["emails_fetched"] = len(emails)

            for email_data in emails:
                try:
                    if self._process_email(email_data):
                        stats["pending_created"] += 1
                except Exception as exc:  # pragma: no cover - defensive logging
                    logger.exception("Error processing email %s: %s", email_data.get("id"), exc)
                    stats["errors"] += 1
        except Exception as exc:  # pragma: no cover - defensive logging
            logger.exception("Error syncing emails: %s", exc)
            stats["errors"] += 1

        return stats

    # ------------------------------------------------------------------ #
    # Internal helpers
    # ------------------------------------------------------------------ #
    def _process_email(self, email_data: Dict) -> bool:
        """Process a single email and enqueue it if it looks like a transaction."""
        subject = email_data.get("subject", "")
        body = email_data.get("body_plain") or email_data.get("body_html") or ""
        message_id = email_data.get("message_id")
        received_at = email_data.get("date")

        if not message_id:
            return False

        if models.PendingTransaction.objects.filter(user=self.user, source="gmail", source_id=message_id).exists():
            return False
        if models.Transaction.objects.filter(
            user=self.user, metadata__source="gmail", metadata__source_id=message_id
        ).exists():
            return False

        extracted = self.ai_extractor.extract_from_email(email_text=body, email_subject=subject)
        if not extracted.get("is_transaction"):
            return False

        payload = self._build_pending_payload(extracted, email_data, message_id, received_at)
        self.pending_service.enqueue(payload, source="gmail", source_id=message_id)
        return True

    def _build_pending_payload(
        self,
        extracted: Dict,
        email_data: Dict,
        message_id: str,
        received_at: Optional[str],
    ) -> PendingTransactionPayload:
        amount = Decimal(str(extracted.get("amount") or "0"))
        currency = extracted.get("currency")
        txn_date = (
            self._parse_date(extracted.get("date"))
            or self._parse_date(received_at)
            or datetime.now(dt_timezone.utc).date()
        )

        metadata = {
            "gmail_message_id": message_id,
            "gmail_subject": email_data.get("subject", ""),
            "gmail_thread_id": email_data.get("thread_id"),
            "extraction_confidence": extracted.get("confidence"),
            "raw_headers": {
                "from": email_data.get("from"),
                "to": email_data.get("to"),
                "snippet": email_data.get("snippet"),
            },
            **(extracted.get("metadata") or {}),
        }

        items = extracted.get("items") or []

        return PendingTransactionPayload(
            amount=amount,
            currency=currency,
            is_expense=extracted.get("transaction_type", "purchase") in {"purchase", "payment", "bill"},
            description=extracted.get("description") or email_data.get("subject", "Email transaction"),
            date=txn_date,
            notes=f"Source: Gmail\nSubject: {email_data.get('subject', '')}",
            entity_name=extracted.get("merchant"),
            metadata=metadata,
            items=items,
            suggested_category_name=extracted.get("category"),
        )

    def _parse_date(self, value: Optional[str]):
        if not value:
            return None

        for fmt in ("%Y-%m-%d", "%d %b %Y", "%d/%m/%Y", "%d-%m-%Y"):
            try:
                return datetime.strptime(value, fmt).date()
            except ValueError:
                continue
        return None


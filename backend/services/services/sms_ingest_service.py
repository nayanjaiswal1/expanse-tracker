"""
Service to ingest SMS messages into the raw payload store.
"""

import logging
from typing import Dict, Iterable, Optional
from django.utils import timezone
from django.db import transaction
from training.models import RawEmail

logger = logging.getLogger(__name__)


class SMSIngestService:
    """Persist SMS payloads into the RawEmail model for unified processing."""

    def __init__(self, user):
        self.user = user

    def store_messages(self, messages: Iterable[Dict]) -> Dict:
        """
        Persist SMS messages to RawEmail storage.

        Each message dict should include:
            - id / message_id (optional, auto-generated if missing)
            - sender (phone number)
            - body (message text)
            - received_at (datetime or iso-string, optional -> defaults to now)
        """
        stored = 0
        skipped = 0
        errors = []
        to_create = []
        now = timezone.now()

        for raw in messages:
            try:
                message_id = self._resolve_message_id(raw, now, stored + skipped)

                if RawEmail.objects.filter(message_id=message_id).exists():
                    skipped += 1
                    continue

                received_at = self._resolve_received_at(raw, now)
                ingestion_entry = {
                    'timestamp': now.isoformat(),
                    'level': 'info',
                    'message': 'Stored via SMS ingest',
                }

                # Normalize headers payload for SMS
                headers = {
                    'Source': 'SMS',
                    'Sender': raw.get('sender'),
                    'PhoneNumber': raw.get('sender'),
                }

                to_create.append(
                    RawEmail(
                        user=self.user,
                        gmail_account=None,
                        message_id=message_id,
                        source='sms',
                        headers=headers,
                        subject=raw.get('subject') or raw.get('sender') or 'SMS Notification',
                        sender=raw.get('sender', 'unknown'),
                        snippet=(raw.get('body') or '')[:2048],
                        body_text=raw.get('body', ''),
                        body_html='',
                        gmail_payload=raw,
                        received_at=received_at,
                        processing_status='pending',
                        ingestion_log=[ingestion_entry],
                    )
                )
                stored += 1
            except Exception as exc:
                logger.exception("Failed to ingest SMS payload: %s", exc)
                errors.append(str(exc))

        if to_create:
            with transaction.atomic():
                RawEmail.objects.bulk_create(to_create, ignore_conflicts=True)

        logger.info(
            "SMS ingest summary for user %s: stored=%s skipped=%s errors=%s",
            self.user.id,
            stored,
            skipped,
            len(errors),
        )

        return {
            'stored': stored,
            'skipped': skipped,
            'errors': errors,
        }

    def _resolve_message_id(self, raw: Dict, now, counter: int) -> str:
        if raw.get('message_id'):
            return str(raw['message_id'])
        if raw.get('id'):
            return str(raw['id'])
        # Fallback deterministic id based on timestamp and counter
        return f"sms-{self.user.id}-{int(now.timestamp())}-{counter}"

    def _resolve_received_at(self, raw: Dict, default_ts):
        received_at = raw.get('received_at') or raw.get('timestamp')
        if received_at is None:
            return default_ts
        if hasattr(received_at, 'isoformat'):
            return received_at
        try:
            from dateutil import parser  # Optional dependency in requirements

            return parser.isoparse(received_at)
        except Exception:
            return default_ts

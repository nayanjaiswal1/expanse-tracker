import base64
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Set

from django.core.files.base import ContentFile
from django.utils import timezone

from .gmail_service import GmailService
from .retry_utils import ServiceUnavailableError, CircuitBreaker
from .html_cleaner import html_to_clean_text, get_text_from_email_body
from ..models import GmailAccount
from training.models import RawEmail, RawEmailAttachment


logger = logging.getLogger(__name__)


class EmailSyncService:
    """Service to sync emails from Gmail - STAGE 1 (Store raw emails only)"""

    # Circuit breaker configuration
    CIRCUIT_BREAKER_THRESHOLD = 5  # failures before opening circuit
    CIRCUIT_BREAKER_TIMEOUT = 300  # 5 minutes recovery timeout

    def __init__(self):
        # Circuit breaker per account to isolate failures
        self._circuit_breakers = {}

    def _get_circuit_breaker(self, account_id: int) -> CircuitBreaker:
        """Get or create circuit breaker for an account"""
        if account_id not in self._circuit_breakers:
            self._circuit_breakers[account_id] = CircuitBreaker(
                failure_threshold=self.CIRCUIT_BREAKER_THRESHOLD,
                recovery_timeout=self.CIRCUIT_BREAKER_TIMEOUT,
                expected_exception=Exception,
            )
        return self._circuit_breakers[account_id]

    def _find_html_part(self, parts):
        for part in parts:
            if part['mimeType'] == 'text/html':
                return part.get('body', {}).get('data')
            if 'parts' in part:
                html_part = self._find_html_part(part['parts'])
                if html_part:
                    return html_part
        return None

    def _find_text_part(self, parts):
        for part in parts:
            if part.get('mimeType') == 'text/plain':
                return part.get('body', {}).get('data')
            if 'parts' in part:
                text_part = self._find_text_part(part['parts'])
                if text_part:
                    return text_part
        return None

    def _collect_attachments(self, payload: Dict, message_id: str, gmail_service: GmailService) -> List[Dict]:
        attachments: List[Dict] = []

        filename = payload.get('filename')
        mime_type = payload.get('mimeType', '')
        body = payload.get('body', {}) or {}
        attachment_id = body.get('attachmentId')
        inline_disposition = next(
            (
                header.get('value', '')
                for header in payload.get('headers', [])
                if header.get('name', '').lower() == 'content-disposition'
            ),
            ''
        )

        if filename and attachment_id and 'inline' not in inline_disposition.lower():
            if not filename.lower().endswith(('.pdf', '.csv', '.xls', '.xlsx')):
                data = None
            else:
                try:
                    attachment_payload = gmail_service.get_attachment(message_id, attachment_id)
                    data = attachment_payload.get('data')
                except Exception as exc:
                    logger.warning("Could not fetch attachment %s for message %s: %s", filename, message_id, exc)
                    data = None

            if data:
                try:
                    decoded = base64.urlsafe_b64decode(data.encode('ASCII'))
                    attachments.append({
                        'filename': filename,
                        'mime_type': mime_type,
                        'data': decoded,
                        'size': len(decoded),
                    })
                except Exception as decode_err:
                    logger.warning("Could not decode attachment %s for message %s: %s", filename, message_id, decode_err)

        for part in payload.get('parts', []) or []:
            attachments.extend(self._collect_attachments(part, message_id, gmail_service))

        return attachments

    BATCH_INSERT_SIZE = 50

    def sync_account_emails(self, gmail_account: GmailAccount, limit: int = 100) -> dict:
        """
        Sync emails for a specific Gmail account - STAGE 1 (Store raw emails only).
        Does NOT process emails into transactions immediately.
        Use process_pending_emails task to convert raw emails to transactions.
        """
        if not gmail_account.is_active:
            logger.warning("Attempted to sync inactive Gmail account %s", gmail_account.id)
            return {"error": "Account is not active", "stored": 0}

        # Check circuit breaker before attempting sync
        circuit_breaker = self._get_circuit_breaker(gmail_account.id)
        if circuit_breaker.state == 'OPEN':
            error_msg = (
                f"Circuit breaker is OPEN for account {gmail_account.id}. "
                f"Too many recent failures. Will retry after recovery timeout."
            )
            logger.warning(error_msg)
            return {
                "error": error_msg,
                "stored": 0,
                "circuit_breaker_state": "OPEN",
            }

        results: Dict[str, object] = {
            "total_fetched": 0,
            "stored": 0,
            "skipped": 0,
            "attachments_saved": 0,
            "errors": [],
        }

        try:
            gmail_service = GmailService(gmail_account=gmail_account)
            query = self._build_query(gmail_account)
            logger.info(
                "Starting Gmail sync for account %s (%s) with limit=%s query='%s'",
                gmail_account.id,
                gmail_account.email,
                limit,
                query or "[none]",
            )

            pending_raw_emails: List[RawEmail] = []
            pending_attachments: List[Tuple[str, List[Dict]]] = []
            processed_new = 0

            page_token = None
            fetched_so_far = 0
            while True:
                remaining = (limit - fetched_so_far) if limit else 100
                if limit and remaining <= 0:
                    break
                page_size = min(100, remaining) if limit else 100

                try:
                    # Wrap list_messages in circuit breaker
                    messages, next_page_token = circuit_breaker.call(
                        gmail_service.list_messages,
                        query=query,
                        max_results=page_size,
                        page_token=page_token,
                    )
                except ServiceUnavailableError as exc:
                    error_msg = f"Gmail service unavailable after retries: {exc}"
                    logger.error(error_msg)
                    results["errors"].append(error_msg)
                    # Mark partial success - we stored what we could
                    results["partial_sync"] = True
                    break

                if not messages:
                    break

                fetched_so_far += len(messages)
                results["total_fetched"] = int(results["total_fetched"]) + len(messages)

                message_ids = [msg["id"] for msg in messages]
                existing_ids = self._fetch_existing_message_ids(message_ids)

                for message in messages:
                    msg_id = message["id"]
                    if msg_id in existing_ids:
                        results["skipped"] = int(results["skipped"]) + 1
                        continue

                    try:
                        # Wrap get_message in circuit breaker
                        full_message = circuit_breaker.call(
                            gmail_service.get_message,
                            msg_id
                        )
                        raw_email, attachments = self._build_raw_email_record(
                            gmail_account,
                            full_message,
                            gmail_service,
                        )

                        pending_raw_emails.append(raw_email)
                        if attachments:
                            logger.info(
                                "Queued %s attachment(s) for message %s (%s)",
                                len(attachments),
                                msg_id,
                                gmail_account.email,
                            )
                            pending_attachments.append((msg_id, attachments))

                        processed_new += 1
                        if processed_new % 100 == 0:
                            logger.info(
                                "Prepared %s new raw emails for account %s (page progress)",
                                processed_new,
                                gmail_account.id,
                            )

                        if len(pending_raw_emails) >= self.BATCH_INSERT_SIZE:
                            self._flush_batch(pending_raw_emails, pending_attachments, results)

                    except ServiceUnavailableError as exc:
                        # Service unavailable for this message - log and continue with others
                        logger.error(
                            "Service unavailable for message %s on account %s: %s",
                            msg_id,
                            gmail_account.id,
                            exc
                        )
                        results["errors"].append(f"Message {msg_id}: Service unavailable")
                        # Don't break the loop - try next message
                    except Exception as exc:
                        logger.exception(
                            "Failed to prepare message %s for account %s", msg_id, gmail_account.id
                        )
                        results["errors"].append(f"Message {msg_id}: {exc}")

                if not next_page_token:
                    break
                page_token = next_page_token

            # Flush any remaining records that were below the batch size
            self._flush_batch(pending_raw_emails, pending_attachments, results)

            gmail_account.last_sync_at = timezone.now()
            gmail_account.save(update_fields=["last_sync_at"])

            # Add circuit breaker state to results
            results["circuit_breaker_state"] = circuit_breaker.state

            logger.info("Email sync completed for account %s: %s", gmail_account.id, results)
            return results

        except ServiceUnavailableError as exc:
            # Service is down - this is expected, don't crash
            logger.error(
                "Gmail service unavailable for account %s: %s",
                gmail_account.id,
                exc
            )
            return {
                "error": f"Service temporarily unavailable: {exc}",
                "stored": int(results.get("stored", 0)),
                "total_fetched": int(results.get("total_fetched", 0)),
                "service_status": "unavailable",
                "circuit_breaker_state": circuit_breaker.state,
            }
        except Exception as exc:
            # Unexpected error - still don't crash but log thoroughly
            logger.exception("Unexpected error syncing emails for account %s", gmail_account.id)
            return {
                "error": str(exc),
                "stored": int(results.get("stored", 0)),
                "total_fetched": int(results.get("total_fetched", 0)),
                "service_status": "error",
                "circuit_breaker_state": circuit_breaker.state,
            }

    def _build_raw_email_record(
        self,
        gmail_account: GmailAccount,
        full_message: Dict,
        gmail_service: GmailService,
    ) -> Tuple[RawEmail, List[Dict]]:
        payload = full_message.get("payload", {}) or {}
        headers_list = payload.get("headers", []) or []
        headers = {h.get("name"): h.get("value") for h in headers_list if h.get("name")}

        body_text, body_html = self._decode_bodies(
            payload,
            snippet=full_message.get("snippet", ""),
            message_id=full_message.get("id"),
        )

        internal_date = full_message.get("internalDate")
        received_at = (
            datetime.fromtimestamp(int(internal_date) / 1000, tz=timezone.utc)
            if internal_date
            else timezone.now()
        )

        ingestion_entry = {
            "timestamp": timezone.now().isoformat(),
            "level": "info",
            "message": "Stored via Gmail sync",
            "account_id": gmail_account.id,
        }

        raw_email = RawEmail(
            user=gmail_account.user,
            gmail_account=gmail_account,
            message_id=full_message.get("id"),
            source="gmail",
            headers=headers,
            subject=headers.get("Subject", ""),
            sender=headers.get("From", ""),
            snippet=full_message.get("snippet", ""),
            body_text=body_text,
            body_html=body_html,
            gmail_payload=full_message,
            received_at=received_at,
            processing_status="pending",
            ingestion_log=[ingestion_entry],
        )

        attachments = self._collect_attachments(
            payload,
            full_message.get("id"),
            gmail_service,
        )
        return raw_email, attachments

    def _decode_bodies(
        self,
        payload: Dict,
        snippet: str,
        message_id: str,
    ) -> Tuple[str, str]:
        """
        Decode email bodies and convert HTML to clean text.
        Returns (body_text, body_html) where body_html contains CLEAN TEXT (not HTML tags).
        """
        # Decode plain text part
        body_text_data = None
        if "parts" in payload:
            body_text_data = self._find_text_part(payload.get("parts", []))
        elif payload.get("mimeType") == "text/plain":
            body_text_data = payload.get("body", {}).get("data")

        body_text = snippet or ""
        if body_text_data:
            try:
                body_text = base64.urlsafe_b64decode(body_text_data.encode("ASCII")).decode("utf-8")
            except Exception as decode_err:
                logger.warning("Could not decode text body for message %s: %s", message_id, decode_err)

        # Decode HTML part
        html_body_data = None
        if "parts" in payload:
            html_body_data = self._find_html_part(payload.get("parts", []))
        elif payload.get("mimeType") == "text/html":
            html_body_data = payload.get("body", {}).get("data")

        body_html_raw = ""
        if html_body_data:
            try:
                body_html_raw = base64.urlsafe_b64decode(html_body_data.encode("ASCII")).decode("utf-8")
            except Exception as decode_err:
                logger.warning("Could not decode HTML body for message %s: %s", message_id, decode_err)

        # Convert HTML to clean text (IMPORTANT: removes all HTML tags)
        body_html_clean = ""
        if body_html_raw:
            try:
                body_html_clean = html_to_clean_text(body_html_raw)
                logger.debug(
                    "Converted HTML to text for message %s: %d chars -> %d chars (%.1f%% reduction)",
                    message_id,
                    len(body_html_raw),
                    len(body_html_clean),
                    (1 - len(body_html_clean) / len(body_html_raw)) * 100 if body_html_raw else 0
                )
            except Exception as clean_err:
                logger.warning("Could not clean HTML for message %s: %s", message_id, clean_err)
                # Fallback: use raw HTML if cleaning fails
                body_html_clean = body_html_raw

        # Use the best available text content
        # Note: body_html field now stores CLEAN TEXT, not HTML
        final_text = get_text_from_email_body(body_text, body_html_clean, snippet)

        return final_text, ""  # Return clean text in body_text, empty body_html to save space

    def _flush_batch(
        self,
        raw_email_batch: List[RawEmail],
        attachment_batch: List[Tuple[str, List[Dict]]],
        results: Dict[str, object],
    ) -> None:
        if not raw_email_batch:
            return

        message_ids = [email.message_id for email in raw_email_batch]
        RawEmail.objects.bulk_create(raw_email_batch, ignore_conflicts=True)

        persisted_emails = {
            email.message_id: email
            for email in RawEmail.objects.filter(message_id__in=message_ids)
        }

        attachments_to_create: List[RawEmailAttachment] = []
        attached_email_ids = set()

        for msg_id, attachments in attachment_batch:
            raw_email = persisted_emails.get(msg_id)
            if not raw_email:
                continue
            for attachment in attachments:
                attachment_obj = RawEmailAttachment(
                    raw_email=raw_email,
                    filename=attachment["filename"],
                    mime_type=attachment["mime_type"],
                    size=attachment["size"],
                )
                attachment_obj.file.save(
                    attachment["filename"],
                    ContentFile(attachment["data"]),
                    save=False,
                )
                attachments_to_create.append(attachment_obj)
            attached_email_ids.add(raw_email.id)

        if attachments_to_create:
            RawEmailAttachment.objects.bulk_create(attachments_to_create)
            RawEmail.objects.filter(id__in=attached_email_ids).update(attachments_ready=True)
            results["attachments_saved"] = int(results["attachments_saved"]) + len(attachments_to_create)

        stored_now = len([msg_id for msg_id in message_ids if msg_id in persisted_emails])
        results["stored"] = int(results["stored"]) + stored_now

        logger.info(
            "Flushed %s raw emails (total stored=%s, attachments=%s)",
            stored_now,
            results["stored"],
            results["attachments_saved"],
        )

        raw_email_batch.clear()
        attachment_batch.clear()

    def _fetch_existing_message_ids(self, message_ids: List[str]) -> Set[str]:
        if not message_ids:
            return set()
        existing = RawEmail.objects.filter(message_id__in=message_ids).values_list(
            "message_id", flat=True
        )
        return set(existing)

    def sync_all_active_accounts(self) -> dict:
        """
        Sync emails for all active Gmail accounts - stores raw emails only.
        Continues processing accounts even if some fail.
        """
        active_accounts = GmailAccount.objects.filter(is_active=True)

        results = {
            "accounts_processed": 0,
            "accounts_failed": 0,
            "accounts_partial": 0,
            "total_stored": 0,
            "account_results": {}
        }

        for account in active_accounts:
            try:
                account_result = self.sync_account_emails(account)
                results["account_results"][account.id] = account_result
                results["accounts_processed"] += 1
                results["total_stored"] += account_result.get("stored", 0)

                # Track different types of completion
                if account_result.get("error"):
                    if account_result.get("stored", 0) > 0:
                        results["accounts_partial"] += 1
                        logger.warning(
                            "Partial sync for account %s: %s emails stored, error: %s",
                            account.id,
                            account_result.get("stored", 0),
                            account_result.get("error")
                        )
                    else:
                        results["accounts_failed"] += 1
                        logger.error(
                            "Failed sync for account %s: %s",
                            account.id,
                            account_result.get("error")
                        )
            except Exception as e:
                # This should rarely happen since sync_account_emails handles its own errors
                logger.exception("Unexpected error syncing account %s", account.id)
                results["account_results"][account.id] = {
                    "error": f"Unexpected error: {str(e)}",
                    "stored": 0,
                }
                results["accounts_failed"] += 1

        logger.info(
            "Sync all accounts completed: %s processed, %s failed, %s partial, %s total stored",
            results["accounts_processed"],
            results["accounts_failed"],
            results["accounts_partial"],
            results["total_stored"],
        )

        return results

    def _build_query(self, gmail_account: GmailAccount) -> str:
        """Build Gmail search query based on account filters"""
        query_parts = []

        # # Add sender filters
        # if gmail_account.sender_filters:
        #     sender_query = " OR ".join([f"from:{sender}" for sender in gmail_account.sender_filters])
        #     query_parts.append(f"({sender_query})")

        # # Add keyword filters
        # if gmail_account.keyword_filters:
        #     keyword_query = " OR ".join(gmail_account.keyword_filters)
        #     query_parts.append(f"({keyword_query})")

        # # Add date filter (default to last 30 days to avoid overwhelming initial sync)
        # from datetime import datetime, timedelta
        # thirty_days_ago = datetime.now() - timedelta(days=30)
        # date_str = thirty_days_ago.strftime("%Y/%m/%d")
        # query_parts.append(f"after:{date_str}")

        # # Default query if no filters
        # if not query_parts:
        #     # Look for emails that might contain transactions
        #     default_keywords = [
        #         "payment", "transaction", "receipt", "invoice", "bill",
        #         "purchase", "order", "charged", "paid"
        #     ]
        #     keyword_query = " OR ".join(default_keywords)
        #     query_parts.append(f"({keyword_query})")

        return " ".join(query_parts)

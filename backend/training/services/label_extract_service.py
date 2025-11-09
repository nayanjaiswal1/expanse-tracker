"""
Service for labeling emails and extracting transaction data using LLM.
"""

import logging
import re
from datetime import datetime
from typing import Optional
from decimal import Decimal
from dateutil import parser as date_parser
from django.conf import settings
from django.utils import timezone

from training.models import RawEmail, AILabel
from training.services.llm_service import LLMService
from training.services.prompts import get_prompts

logger = logging.getLogger(__name__)


class LabelAndExtractService:
    """
    Service to label emails and extract structured transaction data using LLM.
    """

    TRANSACTION_KEYWORDS = (
        'debited', 'credited', 'credit', 'debit', 'payment', 'purchase', 'spent',
        'transaction', 'txn', 'utr', 'upi', 'bill', 'invoice', 'merchant',
        'order id', 'reference', 'ref no', 'charged', 'refunded', 'account',
        'card ending', 'balance', 'paid', 'received', 'transfer', 'salary',
        'emi', 'loan'
    )
    STATEMENT_KEYWORDS = (
        'statement', 'account statement', 'account summary', 'closing balance',
        'available balance', 'minimum due', 'total due', 'due date', 'billing statement',
        'bill summary', 'monthly statement', 'periodic statement', 'statement for'
    )
    INVOICE_KEYWORDS = (
        'invoice', 'tax invoice', 'gst invoice', 'invoice number', 'invoice no',
        'billing', 'bill for', 'bill dated', 'amount due', 'payment due', 'due amount',
        'due on', 'subscription invoice', 'proforma invoice'
    )
    AMOUNT_PATTERN = re.compile(r'(?i)(?:rs\.?|inr|rupees|₹|\$|usd|amount|amt)\s*[\d,]+(?:\.\d+)?')
    GENERIC_AMOUNT_PATTERN = re.compile(r'(?<!\d)(\d{3,})(?:\.\d+)?')

    def __init__(self, prompt_version: str = None):
        self.llm_service = LLMService()
        self.prompt_version = prompt_version or getattr(
            settings, 'AI_PROMPT_VERSION', 'v2'
        )
        self.prompts = get_prompts(self.prompt_version)

    def process_email(self, raw_email: RawEmail, force: bool = False) -> Optional[AILabel]:
        """
        Process a raw email: classify and extract transaction data.

        Args:
            raw_email: RawEmail instance to process
            force: Force reprocessing even if already labeled

        Returns:
            AILabel instance or None if processing fails
        """
        # Check if already processed
        if hasattr(raw_email, 'ai_label') and not force:
            logger.info(f"Email {raw_email.id} already labeled, skipping")
            return raw_email.ai_label

        try:
            # Mark email as processing
            raw_email.mark_processing(note="Starting AI labeling")

            # Prepare email content
            body_text = self._prepare_body_text(raw_email)

            # Build prompt
            system_prompt = self.prompts['system_prompt']
            user_prompt_fn = self.prompts['user_prompt_fn']

            # Call appropriate prompt function based on version
            if self.prompt_version == 'v1':
                user_prompt = user_prompt_fn(
                    subject=raw_email.subject,
                    body=body_text,
                    sender=raw_email.sender
                )
            else:  # v2 and beyond
                user_prompt = user_prompt_fn(
                    subject=raw_email.subject,
                    body=body_text,
                    sender=raw_email.sender,
                    received_at=raw_email.received_at.isoformat()
                )

            # Call LLM
            logger.info(f"Calling LLM for email {raw_email.id}")
            llm_response = self.llm_service.call_llm(
                prompt=user_prompt,
                system_prompt=system_prompt,
                temperature=0.1,
                max_tokens=2000
            )

            # Parse response
            parsed = self.llm_service.parse_extraction_response(
                llm_response['response']
            )

            parsed = self._normalize_financial_fields(parsed)

            # Retry with focused prompt if classification looks wrong
            if parsed.get('label') == 'OTHER' and self._has_financial_cues(raw_email):
                logger.info(
                    "Email %s appears financial but was labeled OTHER. Retrying with focused prompt.",
                    raw_email.id,
                )
                retry_prompt = (
                    f"{user_prompt}\n\n"
                    "IMPORTANT: The message content includes financial cues (amounts, invoices, balance statements, transaction or payment terms). "
                    "Re-evaluate carefully and choose the most appropriate financial category. "
                    "Do not return \"OTHER\" if any transaction, payment, debit, credit, refund, statement, or invoice indicators exist. "
                    "Respond with JSON only as previously instructed."
                )

                retry_response = self.llm_service.call_llm(
                    prompt=retry_prompt,
                    system_prompt=system_prompt,
                    temperature=0.0,
                    max_tokens=2000
                )
                parsed_retry = self.llm_service.parse_extraction_response(
                    retry_response['response']
                )

                if parsed_retry and (
                    parsed_retry.get('label') != 'OTHER'
                    or parsed_retry.get('transaction_data')
                ):
                    logger.info(
                        "Retry succeeded for email %s with label %s",
                        raw_email.id,
                        parsed_retry.get('label'),
                    )
                    parsed = parsed_retry
                    parsed = self._normalize_financial_fields(parsed)
                    llm_response = retry_response
                else:
                    logger.debug(
                        "Retry did not change classification for email %s. Keeping original result.",
                        raw_email.id,
                    )

            # Create or update AILabel
            ai_label = self._create_ai_label(
                raw_email=raw_email,
                parsed_data=parsed,
                llm_response=llm_response
            )

            # Mark email as processed
            if ai_label.label in {'TRANSACTION', 'PAYMENT'}:
                raw_email.is_transaction_email = True
                raw_email.save(update_fields=['is_transaction_email'])
                raw_email.mark_processed(reason=f"Labeled as {ai_label.label} by AI")
            elif ai_label.label == 'STATEMENT':
                raw_email.mark_processed(reason="Labeled as STATEMENT by AI")
            else:
                raw_email.mark_ignored(reason=f"Labeled as {ai_label.label} by AI")

            logger.info(
                f"Successfully labeled email {raw_email.id} as {ai_label.label} "
                f"(confidence: {ai_label.label_confidence})"
            )

            return ai_label

        except Exception as e:
            error_msg = f"Failed to process email {raw_email.id}: {str(e)}"
            logger.error(error_msg, exc_info=True)
            raw_email.mark_failed(error_msg)
            return None

    def _has_financial_cues(self, raw_email: RawEmail) -> bool:
        """
        Heuristically detect whether an email likely describes a financial transaction or statement.

        Args:
            raw_email: Email to inspect

        Returns:
            True if the content contains financial cues, False otherwise.
        """
        parts = []
        if raw_email.subject:
            parts.append(raw_email.subject)
        if raw_email.snippet:
            parts.append(raw_email.snippet)
        if raw_email.body_text:
            parts.append(raw_email.body_text)

        if not parts:
            return False

        combined = " ".join(parts)
        lowered = combined.lower()

        has_transaction_keyword = any(keyword in lowered for keyword in self.TRANSACTION_KEYWORDS)
        has_statement_keyword = any(keyword in lowered for keyword in self.STATEMENT_KEYWORDS)
        has_invoice_keyword = any(keyword in lowered for keyword in self.INVOICE_KEYWORDS)

        if has_statement_keyword:
            return True

        if has_invoice_keyword and any(token in lowered for token in ('due', 'invoice', 'amount', 'pay', 'bill')):
            return True

        if not has_transaction_keyword and not has_invoice_keyword:
            return False

        has_amount = bool(self.AMOUNT_PATTERN.search(combined))

        if not has_amount:
            # Look for large numbers (>= 3 digits) near currency keywords
            generic_amount_match = self.GENERIC_AMOUNT_PATTERN.search(combined)
            if generic_amount_match:
                window_start = max(generic_amount_match.start() - 15, 0)
                window = lowered[window_start:generic_amount_match.end() + 15]
                if any(token in window for token in ('rs', 'inr', 'amount', 'amt', 'rs.', 'balance', 'paid', 'payment', 'debit', 'credit', 'due', 'bill', 'invoice')):
                    has_amount = True

        return has_amount

    def _normalize_financial_fields(self, parsed: dict) -> dict:
        """
        Ensure parsed data contains consistent transaction information for invoices/statements.
        """
        if not parsed:
            return parsed

        invoice_data = parsed.get('invoice_data') or {}
        if invoice_data:
            txn = parsed.setdefault('transaction_data', {})

            if not parsed.get('label') or parsed.get('label') == 'OTHER':
                parsed['label'] = 'PAYMENT'

            if not txn.get('transaction_type'):
                txn['transaction_type'] = 'PAYMENT'

            if invoice_data.get('amount_due') is not None and not txn.get('amount'):
                txn['amount'] = invoice_data['amount_due']

            if invoice_data.get('currency') and not txn.get('currency'):
                txn['currency'] = invoice_data['currency']

            if invoice_data.get('vendor') and not txn.get('merchant'):
                txn['merchant'] = invoice_data['vendor']

            if invoice_data.get('invoice_number') and not txn.get('reference_id'):
                txn['reference_id'] = invoice_data['invoice_number']

            due_dt = self._coerce_datetime(invoice_data.get('due_date'))
            if due_dt and not txn.get('transaction_date'):
                txn['transaction_date'] = due_dt

            if not txn.get('transaction_date'):
                invoice_date_dt = self._coerce_datetime(invoice_data.get('invoice_date'))
                if invoice_date_dt:
                    txn['transaction_date'] = invoice_date_dt

        return parsed

    @staticmethod
    def _coerce_datetime(value):
        """
        Convert various date-like inputs into a timezone-aware datetime when possible.
        """
        if value is None:
            return None

        if isinstance(value, datetime):
            return value

        if hasattr(value, 'isoformat') and not isinstance(value, str):
            try:
                return date_parser.parse(value.isoformat())
            except (ValueError, TypeError):
                return None

        try:
            return date_parser.parse(str(value))
        except (ValueError, TypeError):
            return None

    def _prepare_body_text(self, raw_email: RawEmail) -> str:
        """
        Prepare email body text for LLM processing.

        Prioritizes body_text, falls back to snippet, or uses cleaned HTML.

        Args:
            raw_email: RawEmail instance

        Returns:
            Cleaned body text
        """
        if raw_email.body_text and len(raw_email.body_text.strip()) > 50:
            return raw_email.body_text.strip()

        if raw_email.snippet:
            return raw_email.snippet.strip()

        # Fallback to HTML (would need HTML cleaner utility)
        if raw_email.body_html:
            # Simple HTML stripping - can be enhanced
            from html import unescape
            from html.parser import HTMLParser

            class HTMLStripper(HTMLParser):
                def __init__(self):
                    super().__init__()
                    self.text = []

                def handle_data(self, data):
                    self.text.append(data)

                def get_text(self):
                    return ''.join(self.text)

            stripper = HTMLStripper()
            stripper.feed(raw_email.body_html)
            return stripper.get_text().strip()

        return ""

    def _create_ai_label(
        self,
        raw_email: RawEmail,
        parsed_data: dict,
        llm_response: dict
    ) -> AILabel:
        """
        Create AILabel instance from parsed LLM response.

        Args:
            raw_email: RawEmail instance
            parsed_data: Parsed extraction data
            llm_response: Raw LLM response

        Returns:
            Created AILabel instance
        """
        # Prepare base fields
        ai_label_data = {
            'raw_email': raw_email,
            'label': parsed_data.get('label', 'OTHER'),
            'label_confidence': Decimal(str(parsed_data.get('confidence', 0.0))),
            'extraction_model': llm_response['model'],
            'extraction_prompt_version': self.prompt_version,
            'raw_llm_response': llm_response.get('raw_response', {}),
            'extracted_data': parsed_data,
            'processing_time_ms': llm_response.get('processing_time_ms'),
        }

        # Add transaction-specific fields if present
        tx_data = parsed_data.get('transaction_data', {})
        if tx_data:
            if 'transaction_type' in tx_data:
                ai_label_data['transaction_type'] = tx_data['transaction_type']

            if 'amount' in tx_data:
                ai_label_data['amount'] = tx_data['amount']

            if 'currency' in tx_data:
                ai_label_data['currency'] = tx_data['currency']

            if 'merchant' in tx_data:
                ai_label_data['merchant'] = tx_data['merchant']

            if 'account_number' in tx_data:
                ai_label_data['account_number'] = tx_data['account_number']

            if 'transaction_date' in tx_data:
                ai_label_data['transaction_date'] = tx_data['transaction_date']

            if 'reference_id' in tx_data:
                ai_label_data['reference_id'] = tx_data['reference_id']

            if 'source' in tx_data:
                ai_label_data['source'] = tx_data['source']

        statement_data = parsed_data.get('statement_data', {})
        if statement_data:
            account_number = statement_data.get('account_number')
            if account_number and not ai_label_data.get('account_number'):
                ai_label_data['account_number'] = account_number

            bank_name = statement_data.get('bank_name')
            if bank_name and not ai_label_data.get('merchant'):
                ai_label_data['merchant'] = bank_name

            currency = statement_data.get('currency')
            if currency and not ai_label_data.get('currency'):
                ai_label_data['currency'] = currency

            closing_balance = statement_data.get('closing_balance')
            if closing_balance is not None and not ai_label_data.get('amount'):
                ai_label_data['amount'] = closing_balance

            period_end_dt = self._coerce_datetime(statement_data.get('statement_period_end'))
            if period_end_dt and not ai_label_data.get('transaction_date'):
                ai_label_data['transaction_date'] = period_end_dt

            due_dt = self._coerce_datetime(statement_data.get('due_date'))
            if due_dt and not ai_label_data.get('reference_id'):
                due_str = due_dt.isoformat()
                ai_label_data['reference_id'] = f"STATEMENT-DUE-{due_str}"

        invoice_data = parsed_data.get('invoice_data', {})
        if invoice_data:
            vendor = invoice_data.get('vendor')
            if vendor and not ai_label_data.get('merchant'):
                ai_label_data['merchant'] = vendor

            amount_due = invoice_data.get('amount_due')
            if amount_due is not None and not ai_label_data.get('amount'):
                ai_label_data['amount'] = amount_due

            currency = invoice_data.get('currency')
            if currency and not ai_label_data.get('currency'):
                ai_label_data['currency'] = currency

            due_dt = self._coerce_datetime(invoice_data.get('due_date'))
            if due_dt and not ai_label_data.get('transaction_date'):
                ai_label_data['transaction_date'] = due_dt

            if not ai_label_data.get('transaction_date'):
                invoice_date_dt = self._coerce_datetime(invoice_data.get('invoice_date'))
                if invoice_date_dt:
                    ai_label_data['transaction_date'] = invoice_date_dt

            invoice_number = invoice_data.get('invoice_number')
            if invoice_number and not ai_label_data.get('reference_id'):
                ai_label_data['reference_id'] = invoice_number

            if not ai_label_data.get('transaction_type'):
                ai_label_data['transaction_type'] = 'PAYMENT'

            if not ai_label_data.get('source'):
                ai_label_data['source'] = 'EMAIL'

        # Create or update
        ai_label, created = AILabel.objects.update_or_create(
            raw_email=raw_email,
            defaults=ai_label_data
        )

        action = "Created" if created else "Updated"
        logger.debug(f"{action} AILabel {ai_label.id} for email {raw_email.id}")

        return ai_label

    def batch_process_emails(
        self,
        queryset=None,
        limit: int = None,
        skip_processed: bool = True
    ) -> dict:
        """
        Batch process multiple emails.

        Args:
            queryset: Optional queryset of RawEmail objects
            limit: Maximum number of emails to process
            skip_processed: Skip emails that already have AILabel

        Returns:
            Dict with processing statistics
        """
        if queryset is None:
            queryset = RawEmail.objects.filter(processing_status='pending')

        if skip_processed:
            queryset = queryset.filter(ai_label__isnull=True)

        queryset = queryset.order_by('-received_at')

        if limit:
            queryset = queryset[:limit]

        stats = {
            'total': 0,
            'processed': 0,
            'failed': 0,
            'skipped': 0,
            'labels': {}
        }

        for raw_email in queryset:
            stats['total'] += 1

            ai_label = self.process_email(raw_email)

            if ai_label:
                stats['processed'] += 1
                label = ai_label.label
                stats['labels'][label] = stats['labels'].get(label, 0) + 1
            else:
                stats['failed'] += 1

        logger.info(f"Batch processing complete: {stats}")
        return stats

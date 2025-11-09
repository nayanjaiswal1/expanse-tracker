"""
Service for processing stored raw emails into transactions
This is stage 2 of the two-stage email processing pipeline
"""

from decimal import Decimal
from typing import Dict, Optional

from django.db import transaction as db_transaction
from django.utils import timezone

from finance.models import Transaction, Account
from training.models import RawEmail
from .account_matcher_service import AccountMatcherService
from .email_parser import EmailParser
from .email_transaction_service import EmailTransactionService


class EmailProcessorService:
    """
    Process stored raw emails and convert them to transactions.
    This is separated from email ingestion to allow for:
    - Batch processing
    - Retry logic
    - Manual review before processing
    """

    def __init__(self, user):
        self.user = user
        self.email_parser = EmailParser()
        self.account_matcher = AccountMatcherService(user)

    def process_raw_email(self, raw_email: RawEmail) -> Dict:
        """
        Process a single raw email and create a pending transaction.
        Returns dict with processing results.
        """
        # Mark as processing
        raw_email.mark_processing()

        try:
            # Reconstruct Gmail message format from stored data
            gmail_message = self._reconstruct_gmail_message(raw_email)

            # Parse the email
            parsed_data = self.email_parser.parse_gmail_message(gmail_message)

            # Cache the parsed data
            raw_email.parsed_data = parsed_data
            raw_email.is_transaction_email = parsed_data.get('is_transaction', False)
            raw_email.save(update_fields=['parsed_data', 'is_transaction_email'])

            # If not a transaction email, mark as ignored
            if not parsed_data.get('is_transaction'):
                raw_email.mark_ignored()
                return {
                    'success': True,
                    'action': 'ignored',
                    'message': 'Email does not contain transaction information',
                    'raw_email_id': raw_email.id
                }

            # Extract account information
            account_info = self._build_account_info(parsed_data, raw_email.sender)

            # Find or create account
            account, account_suggestions, match_reason = self.account_matcher.find_account(
                account_info,
                sender=raw_email.sender,
                merchant_name=parsed_data.get('merchant_name')
            )

            # Create new account if needed and we have enough info
            if not account and account_info.get('type'):
                account = self._create_account_from_info(account_info)

            source_tag = "gmail" if raw_email.source == "gmail" else raw_email.source

            # Check for duplicate transaction
            existing_transaction = Transaction.objects.filter(
                user=self.user,
                gmail_message_id=raw_email.message_id
            ).first()

            if existing_transaction:
                existing_transaction.add_tags_by_names([source_tag])
                raw_email.mark_processed(transaction_id=existing_transaction.id)
                return {
                    'success': True,
                    'action': 'duplicate',
                    'message': 'Transaction already exists for this email',
                    'transaction_id': existing_transaction.id,
                    'raw_email_id': raw_email.id
                }

            # Create pending transaction
            with db_transaction.atomic():
                transaction_obj = self._create_pending_transaction(
                    raw_email,
                    parsed_data,
                    account,
                    account_info
                )

                # Link raw email to transaction
                raw_email.mark_processed(transaction_id=transaction_obj.id)

                return {
                    'success': True,
                    'action': 'created',
                    'message': 'Pending transaction created successfully',
                    'transaction': {
                        'id': transaction_obj.id,
                        'amount': str(transaction_obj.amount),
                        'description': transaction_obj.description,
                        'date': transaction_obj.date.isoformat(),
                        'transaction_type': transaction_obj.transaction_type,
                        'status': transaction_obj.status,
                    },
                    'account': {
                        'id': account.id if account else None,
                        'name': account.name if account else None,
                    } if account else None,
                    'account_suggestions': account_suggestions,
                    'account_info': account_info,
                    'raw_email_id': raw_email.id,
                    'needs_review': True
                }

        except Exception as e:
            # Mark as failed
            error_message = str(e)
            raw_email.mark_failed(error_message)

            return {
                'success': False,
                'action': 'failed',
                'message': f'Failed to process email: {error_message}',
                'error': error_message,
                'raw_email_id': raw_email.id
            }

    def process_pending_emails(self, limit: Optional[int] = None, max_attempts: int = 3) -> Dict:
        """
        Process all pending raw emails in batch.
        Returns summary of processing results.
        """
        # Get pending emails (not yet processed and under max attempts)
        query = RawEmail.objects.filter(
            user=self.user,
            processing_status='pending',
            processing_attempts__lt=max_attempts
        ).order_by('created_at')

        if limit:
            query = query[:limit]

        raw_emails = list(query)

        results = {
            'total': len(raw_emails),
            'created': 0,
            'ignored': 0,
            'duplicate': 0,
            'failed': 0,
            'errors': []
        }

        for raw_email in raw_emails:
            result = self.process_raw_email(raw_email)

            if result['success']:
                action = result['action']
                if action == 'created':
                    results['created'] += 1
                elif action == 'ignored':
                    results['ignored'] += 1
                elif action == 'duplicate':
                    results['duplicate'] += 1
            else:
                results['failed'] += 1
                results['errors'].append({
                    'raw_email_id': raw_email.id,
                    'subject': raw_email.subject,
                    'error': result.get('error', 'Unknown error')
                })

        return results

    def retry_failed_emails(self, limit: Optional[int] = None) -> Dict:
        """
        Retry processing of failed emails.
        Returns summary of retry results.
        """
        # Reset failed emails to pending
        query = RawEmail.objects.filter(
            user=self.user,
            processing_status='failed'
        ).order_by('-last_processing_attempt')

        if limit:
            query = query[:limit]

        raw_emails = list(query)

        for raw_email in raw_emails:
            raw_email.retry_processing()

        # Now process them
        return self.process_pending_emails(limit=limit)

    def _reconstruct_gmail_message(self, raw_email: RawEmail) -> Dict:
        """Reconstruct Gmail API message format from stored RawEmail data."""
        if raw_email.gmail_payload:
            return raw_email.gmail_payload

        headers = [{'name': key, 'value': value} for key, value in raw_email.headers.items()]

        return {
            'id': raw_email.message_id,
            'snippet': raw_email.snippet,
            'payload': {
                'headers': headers,
                'body': {
                    'data': raw_email.body_text
                }
            },
            'internalDate': str(int(raw_email.received_at.timestamp() * 1000)) if raw_email.received_at else None
        }

    def _build_account_info(self, parsed_data: Dict, sender: str) -> Dict:
        details = parsed_data.get('account_details') or {}
        account_info: Dict[str, Optional[str]] = {
            'type': details.get('type'),
            'last_digits': details.get('last_digits'),
            'wallet_name': None,
            'upi_id': None,
            'institution_name': None,
            'raw_matches': [],
        }

        merchant = parsed_data.get('merchant_name')
        if merchant:
            account_info['institution_name'] = merchant

        domain = self._extract_domain(sender)
        if domain and not account_info['institution_name']:
            account_info['institution_name'] = domain.title()

        if account_info.get('type') == 'unknown':
            account_info['type'] = None

        return account_info

    def _extract_domain(self, sender: str) -> Optional[str]:
        sender = sender or ''
        if '<' in sender and '>' in sender:
            sender = sender[sender.find('<') + 1:sender.find('>')]

        parts = sender.split('@')
        if len(parts) != 2:
            return None

        domain = parts[1].strip().lower()
        for suffix in ('.com', '.co', '.in', '.org', '.net'):
            if domain.endswith(suffix):
                domain = domain[: -len(suffix)]
        return domain or None

    def _create_account_from_info(self, account_info: Dict) -> Account:
        service = EmailTransactionService(self.user)
        return service.create_account_from_info(account_info)

    def _create_pending_transaction(
        self,
        raw_email: RawEmail,
        parsed_data: Dict,
        account: Optional[Account],
        account_info: Dict
    ) -> Transaction:
        """Create a pending transaction from processed email data"""

        # Parse date
        date = raw_email.received_at.date() if raw_email.received_at else timezone.now().date()

        source_tag = "gmail" if raw_email.source == "gmail" else raw_email.source
        metadata = {
            'source': 'email_import',
            'ingest_source': raw_email.source,
            'raw_email_id': raw_email.id,
            'confidence_score': parsed_data.get('confidence_score', 0.0),
            'account_info': account_info,
            'sender': raw_email.sender,
            'email_date': raw_email.received_at.isoformat() if raw_email.received_at else None,
            'merchant_details': parsed_data.get('merchant_details'),
            'pay_to': parsed_data.get('pay_to'),
            'recipient_details': parsed_data.get('recipient_details'),
            'account_details': parsed_data.get('account_details'),
            'body_preview': raw_email.body_text[:200] if raw_email.body_text else '',
            'tags': [source_tag],
        }

        transaction_obj = Transaction.objects.create(
            user=self.user,
            amount=parsed_data.get('parsed_amount') or Decimal('0.00'),
            description=parsed_data.get('parsed_description') or 'Email Transaction',
            date=date,
            currency=parsed_data.get('parsed_currency') or 'USD',
            status='pending',
            transaction_type=parsed_data.get('transaction_type') or 'expense',
            account=account,
            merchant_name=parsed_data.get('merchant_name'),
            original_description=raw_email.subject,
            gmail_message_id=raw_email.message_id,
            verified=False,
            metadata=metadata,
        )

        transaction_obj.add_tags_by_names(metadata["tags"])

        return transaction_obj

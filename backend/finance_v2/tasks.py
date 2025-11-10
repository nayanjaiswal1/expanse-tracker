"""
Celery tasks for background processing of transactions.

Tasks:
- Email sync and processing
- Statement parsing
- Document OCR processing
- Periodic deduplication cleanup
"""

import logging
from datetime import timedelta
from decimal import Decimal, InvalidOperation
from typing import List, Optional

from celery import shared_task
from django.utils import timezone
from django.contrib.auth import get_user_model

from training.models import RawEmail
from .models import PendingTransaction, UploadedFile
from .services.pending_transaction_processor import get_processor
from .services.statement_parser import get_parser
from .services.ocr_service import get_ocr_service
from services.ai_unified_parser_service import UnifiedParserService


User = get_user_model()
logger = logging.getLogger(__name__)


# ============================================================================
# EMAIL PROCESSING TASKS
# ============================================================================

@shared_task(name='finance_v2.process_pending_emails')
def process_pending_emails(limit: int = 50):
    """
    Process pending emails and create transactions.

    Runs every 10 minutes (configured in Celery beat schedule).

    Args:
        limit: Maximum number of emails to process in one batch
    """
    logger.info("Starting pending email processing task")

    # Get pending emails
    pending_emails = RawEmail.objects.filter(
        processing_status='pending'
    ).order_by('received_date')[:limit]

    if not pending_emails.exists():
        logger.info("No pending emails to process")
        return {
            'processed': 0,
            'success': 0,
            'failed': 0,
            'ignored': 0
        }

    processor = get_processor()
    stats = {
        'processed': 0,
        'success': 0,
        'failed': 0,
        'ignored': 0
    }

    for raw_email in pending_emails:
        try:
            # Mark as processing
            raw_email.processing_status = 'processing'
            raw_email.save(update_fields=['processing_status'])

            # Create pending transaction
            pending = processor.create_from_email(
                raw_email_data={
                    'message_id': raw_email.message_id,
                    'subject': raw_email.subject,
                    'body_plain': raw_email.body_plain,
                    'body_html': raw_email.body_html,
                    'sender_email': raw_email.sender_email,
                    'sender_name': raw_email.sender_name,
                    'received_date': raw_email.received_date
                },
                user=raw_email.email_account.user
            )

            stats['processed'] += 1

            if pending:
                # Transaction email
                raw_email.processing_status = 'processed'
                raw_email.is_transaction_email = True
                stats['success'] += 1

                # Link to pending transaction if it's the primary (not merged)
                if pending.status != 'merged':
                    raw_email.metadata = raw_email.metadata or {}
                    raw_email.metadata['pending_transaction_id'] = pending.id
            else:
                # Not a transaction email
                raw_email.processing_status = 'ignored'
                raw_email.is_transaction_email = False
                stats['ignored'] += 1

            raw_email.save()

        except Exception as e:
            logger.error(f"Failed to process email {raw_email.id}: {e}")
            raw_email.processing_status = 'failed'
            raw_email.metadata = raw_email.metadata or {}
            raw_email.metadata['error'] = str(e)
            raw_email.save()
            stats['failed'] += 1

    logger.info(f"Email processing complete: {stats}")
    return stats


@shared_task(name='finance_v2.sync_user_emails')
def sync_user_emails(user_id: int):
    """
    Sync emails for a specific user from Gmail.

    Args:
        user_id: User ID to sync emails for
    """
    logger.info(f"Syncing emails for user {user_id}")

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        logger.error(f"User {user_id} not found")
        return {'error': 'User not found'}

    # Check if user has email account connected
    if not hasattr(user, 'emailaccount_set') or not user.emailaccount_set.exists():
        logger.warning(f"User {user_id} has no email account connected")
        return {'error': 'No email account connected'}

    from services.services.gmail_service import GmailService

    stats = {
        'synced': 0,
        'failed': 0
    }

    for email_account in user.emailaccount_set.all():
        try:
            gmail = GmailService(email_account)

            # Fetch new emails since last sync
            since = email_account.last_sync_at or (timezone.now() - timedelta(days=7))

            new_emails = gmail.fetch_emails(
                since=since,
                max_results=100
            )

            # Store in RawEmail
            for email_data in new_emails:
                try:
                    RawEmail.objects.update_or_create(
                        message_id=email_data['message_id'],
                        defaults={
                            'email_account': email_account,
                            'thread_id': email_data.get('thread_id', ''),
                            'subject': email_data.get('subject', '')[:500],
                            'sender_email': email_data.get('from', ''),
                            'sender_name': email_data.get('from_name', ''),
                            'received_date': email_data.get('date'),
                            'body_plain': email_data.get('body_plain', ''),
                            'body_html': email_data.get('body_html', ''),
                            'processing_status': 'pending'
                        }
                    )
                    stats['synced'] += 1
                except Exception as e:
                    logger.error(f"Failed to store email {email_data.get('message_id')}: {e}")
                    stats['failed'] += 1

            # Update last sync timestamp
            email_account.last_sync_at = timezone.now()
            email_account.save(update_fields=['last_sync_at'])

        except Exception as e:
            logger.error(f"Gmail sync failed for account {email_account.id}: {e}")
            stats['failed'] += 1

    logger.info(f"Email sync complete for user {user_id}: {stats}")
    return stats


@shared_task(name='finance_v2.sync_all_users_emails')
def sync_all_users_emails():
    """
    Sync emails for all users with connected Gmail accounts.

    Runs every hour (configured in Celery beat schedule).
    """
    logger.info("Starting email sync for all users")

    from services.models import EmailAccount

    # Get all active email accounts
    email_accounts = EmailAccount.objects.select_related('user').all()

    stats = {
        'users_processed': 0,
        'total_synced': 0,
        'total_failed': 0
    }

    for email_account in email_accounts:
        try:
            result = sync_user_emails.delay(email_account.user.id)
            stats['users_processed'] += 1
        except Exception as e:
            logger.error(f"Failed to queue sync for user {email_account.user.id}: {e}")
            stats['total_failed'] += 1

    logger.info(f"Queued email sync for {stats['users_processed']} users")
    return stats


# ============================================================================
# FILE PROCESSING TASKS
# ============================================================================

@shared_task(name='finance_v2.process_uploaded_file')
def process_uploaded_file(uploaded_file_id: int):
    """
    Process uploaded file - statements, receipts, invoices, bills, documents.

    For statements (CSV/PDF): Parse and create multiple pending transactions
    For receipts/invoices/bills (images/PDFs): OCR and create single pending transaction

    Args:
        uploaded_file_id: UploadedFile ID to process
    """
    logger.info(f"Processing uploaded file {uploaded_file_id}")

    try:
        uploaded_file = UploadedFile.objects.select_related('user', 'account').get(id=uploaded_file_id)
    except UploadedFile.DoesNotExist:
        logger.error(f"UploadedFile {uploaded_file_id} not found")
        return {'error': 'UploadedFile not found'}

    # Update metadata to mark as processing
    uploaded_file.metadata = uploaded_file.metadata or {}
    uploaded_file.metadata['processing_status'] = 'processing'
    uploaded_file.save(update_fields=['metadata'])

    try:
        processor = get_processor()
        processing_mode = getattr(uploaded_file, 'processing_mode', 'parser') or 'parser'

        # Branch based on file type
        if uploaded_file.file_type == 'statement':
            # Statement processing - parse and create multiple transactions
            created_count = 0
            failed_count = 0

            if processing_mode == 'ai':
                parser = UnifiedParserService()
                with uploaded_file.file.open('rb') as statement_file:
                    file_bytes = statement_file.read()

                result = parser.parse_document(
                    file_bytes=file_bytes,
                    file_name=uploaded_file.file_name or uploaded_file.file.name,
                    force_type='statement',
                )

                if result.get('error'):
                    uploaded_file.metadata['processing_status'] = 'failed'
                    uploaded_file.metadata['error'] = result.get('error')
                    uploaded_file.metadata['parse_result'] = {
                        'mode': processing_mode,
                        'parser': 'ai',
                        'parsing_method': 'ai',
                        'details': dict(result.get('metadata', {}) or {}),
                    }
                    uploaded_file.save(update_fields=['metadata'])
                    return {'error': result.get('error')}

                transactions = _normalize_ai_statement_transactions(result.get('transactions'))

            else:
                parser = get_parser()
                result = parser.parse_file(
                    file_path=uploaded_file.file.path,
                    file_format='csv',  # Can be enhanced to detect format
                    account_info={
                        'account_id': uploaded_file.account.id if uploaded_file.account else None,
                        'account_name': uploaded_file.account.name if uploaded_file.account else None,
                        'currency': uploaded_file.account.currency if uploaded_file.account else None,
                    },
                )

                if not result.get('success'):
                    uploaded_file.metadata['processing_status'] = 'failed'
                    uploaded_file.metadata['error'] = result.get('error')
                    uploaded_file.metadata['parse_result'] = {
                        'mode': processing_mode,
                        'parser': 'parser',
                        'parsing_method': 'parser',
                        'details': dict(result.get('metadata', {}) or {}),
                    }
                    uploaded_file.save(update_fields=['metadata'])
                    return {'error': result.get('error')}

                transactions = result.get('transactions', [])

            for txn_data in transactions:
                try:
                    pending = processor.create_from_statement_row(
                        row_data=txn_data,
                        statement_id=uploaded_file_id,
                        user=uploaded_file.user,
                        account=uploaded_file.account,
                    )

                    if pending:
                        created_count += 1

                except Exception as e:
                    logger.error(f"Failed to create transaction from row: {e}")
                    failed_count += 1

            # Update metadata with results
            parse_metadata = {
                'details': dict(result.get('metadata', {}) or {}),
                'mode': processing_mode,
                'parser': 'ai' if processing_mode == 'ai' else 'parser',
                'quality_score': result.get('quality_score'),
                'document_type': result.get('document_type'),
                'parsing_method': result.get('parsing_method', processing_mode),
            }

            uploaded_file.metadata['processing_status'] = 'completed'
            uploaded_file.metadata['processing_mode'] = processing_mode
            uploaded_file.metadata['parse_result'] = parse_metadata
            uploaded_file.metadata['transactions_created'] = created_count
            uploaded_file.metadata['transactions_failed'] = failed_count
            uploaded_file.save(update_fields=['metadata'])

            logger.info(
                "Statement %s processed via %s: %s created / %s failed",
                uploaded_file_id,
                processing_mode,
                created_count,
                failed_count,
            )

            return {
                'success': True,
                'created': created_count,
                'failed': failed_count,
            }

        else:
            # Document processing (receipt, invoice, bill, document) - OCR and create one transaction
            ocr_service = get_ocr_service()

            result = ocr_service.extract_structured_data(
                file_path=uploaded_file.file.path,
                document_type=uploaded_file.file_type
            )

            if not result.get('success'):
                uploaded_file.metadata['processing_status'] = 'failed'
                uploaded_file.metadata['ocr_error'] = result.get('error')
                uploaded_file.save(update_fields=['metadata'])
                return {'error': result.get('error')}

            # Store OCR text
            uploaded_file.ocr_text = result['ocr_result']['text']
            uploaded_file.metadata['ocr_result'] = {
                'confidence': result['ocr_result'].get('confidence'),
                'page_count': result['ocr_result'].get('page_count')
            }

            # Create pending transaction from extracted data
            pending = processor.create_from_ocr(
                ocr_text=result['ocr_result']['text'],
                document_id=uploaded_file_id,
                user=uploaded_file.user,
                document_type=uploaded_file.file_type
            )

            if pending:
                uploaded_file.metadata['processing_status'] = 'completed'
                uploaded_file.metadata['pending_transaction_id'] = pending.id
            else:
                uploaded_file.metadata['processing_status'] = 'ignored'
                uploaded_file.metadata['reason'] = 'Not a transaction document'

            uploaded_file.save(update_fields=['ocr_text', 'metadata'])

            logger.info(f"Document {uploaded_file_id} OCR completed")

            return {
                'success': True,
                'pending_transaction_id': pending.id if pending else None
            }
    except Exception as e:
        logger.error(f"File processing failed: {e}")
        uploaded_file.metadata = uploaded_file.metadata or {}
        uploaded_file.metadata['processing_status'] = 'failed'
        uploaded_file.metadata['error'] = str(e)
        uploaded_file.save(update_fields=['metadata'])
        return {'error': str(e)}

def _normalize_ai_statement_transactions(transactions):
    """
    Ensure AI parser output matches the deterministic parser schema expected downstream.
    """
    normalized = []
    if not transactions:
        return normalized

    for idx, txn in enumerate(transactions, start=1):
        if not isinstance(txn, dict):
            continue

        amount_value = txn.get('amount') or txn.get('value') or txn.get('total_amount')
        if amount_value in (None, ''):
            continue

        try:
            amount = Decimal(str(amount_value))
        except (InvalidOperation, TypeError, ValueError):
            continue

        tx_type = (txn.get('type') or '').lower()
        is_expense = txn.get('is_expense')
        if is_expense is None:
            is_credit = tx_type in {'credit', 'cr', 'deposit', 'income'}
            is_expense = not is_credit

        normalized.append({
            'row_number': txn.get('row_number', idx),
            'date': txn.get('date') or txn.get('posting_date') or txn.get('txn_date') or timezone.now().date().isoformat(),
            'description': txn.get('description') or txn.get('merchant') or txn.get('narration') or 'Statement transaction',
            'amount': abs(float(amount)),
            'is_expense': bool(is_expense),
            'reference': txn.get('reference') or txn.get('transaction_id'),
            'balance': txn.get('balance'),
            'raw_row': txn,
        })

    return normalized


# ============================================================================
# DEDUPLICATION TASKS
# ============================================================================

@shared_task(name='finance_v2.run_deduplication_cleanup')
def run_deduplication_cleanup():
    """
    Periodic task to find and flag potential duplicates.

    Runs daily to check for duplicates that might have been missed.
    """
    logger.info("Running deduplication cleanup")

    from .services.deduplication_service import DeduplicationService

    dedup_service = DeduplicationService()

    # Get all pending transactions from last 7 days
    since = timezone.now() - timedelta(days=7)
    pending_txns = PendingTransaction.objects.filter(
        status='pending',
        created_at__gte=since
    ).order_by('-created_at')

    stats = {
        'checked': 0,
        'flagged': 0,
        'merged': 0
    }

    for pending in pending_txns:
        try:
            # Re-check for duplicates
            primary = dedup_service.check_and_handle_duplicates(
                pending,
                auto_merge_threshold=0.90,  # Higher threshold for cleanup
                flag_threshold=0.70
            )

            stats['checked'] += 1

            if primary.id != pending.id:
                # Was merged
                stats['merged'] += 1
            elif primary.metadata.get('possible_duplicate_of'):
                # Was flagged
                stats['flagged'] += 1

        except Exception as e:
            logger.error(f"Deduplication cleanup failed for {pending.id}: {e}")

    logger.info(f"Deduplication cleanup complete: {stats}")
    return stats


# ============================================================================
# PERIODIC TASKS CONFIGURATION
# ============================================================================

"""
Add to celery.py or celerybeat_schedule in settings:

from celery.schedules import crontab

# ============================================================================
# CHAT MESSAGE PROCESSING TASKS
# ============================================================================

"""
@shared_task(name='finance_v2.parse_chat_message_with_ai')
def parse_chat_message_with_ai(message_id: int):
    """
        Parse a chat message using AI to extract transaction data.

        Args:
            message_id: ID of the ChatMessage to parse
    """
    from .models import ChatMessage
    from services.llm_provider_service import get_llm_service

    try:
        message = ChatMessage.objects.get(id=message_id)
    except ChatMessage.DoesNotExist:
        logger.error(f"ChatMessage {message_id} not found")
        return {"status": "error", "message": "Message not found"}

    try:
        # Get user's AI settings
        ai_settings = getattr(message.user, 'ai_settings', None)
        provider = ai_settings.preferred_provider if ai_settings else 'system'

        # Get LLM service
        llm_service = get_llm_service(provider, message.user)

        # Build prompt
        prompt = f"""
Extract transaction details from this message:
"{message.content}"

Return JSON with:
- amount (number)
- description (string)
- is_expense (boolean)
- date (YYYY-MM-DD, default to today)
- category (string, optional)
- mentions (list of @mentions found)
- confidence (0-1)

Example: "@john $50 lunch" -> {{"amount": 50, "description": "lunch", "is_expense": true, "mentions": ["@john"], "confidence": 0.95}}
"""

        # Call AI
        response = llm_service.generate(prompt)

        # Parse response (assuming JSON)
        import json
        try:
            parsed_data = json.loads(response)
        except json.JSONDecodeError:
            # Try to extract JSON from markdown code blocks
            import re
            json_match = re.search(r'```json\n(.*?)\n```', response, re.DOTALL)
            if json_match:
                parsed_data = json.loads(json_match.group(1))
            else:
                parsed_data = {"raw_response": response}

        # Update message
        message.metadata = message.metadata or {}
        message.metadata['parsed'] = parsed_data
        message.metadata['ai_provider'] = provider
        message.status = 'completed'
        message.save(update_fields=['metadata', 'status', 'updated_at'])

        logger.info(f"Parsed chat message {message_id} with {provider}")
        return {
            "status": "success",
            "message_id": message_id,
            "parsed_data": parsed_data
        }

    except Exception as e:
        logger.error(f"Failed to parse chat message {message_id}: {e}")
        message.status = 'failed'
        message.metadata = message.metadata or {}
        message.metadata['error'] = str(e)
        message.save(update_fields=['status', 'metadata', 'updated_at'])
        return {"status": "error", "message": str(e)}


@shared_task(name='finance_v2.parse_shortcut_message')
def parse_shortcut_message(message_id: int):
    """
    Parse shortcut format: @person $amount description

    Args:
        message_id: ID of the ChatMessage to parse
    """
    from .models import ChatMessage
    from django.contrib.auth import get_user_model
    import re

    User = get_user_model()

    try:
        message = ChatMessage.objects.get(id=message_id)
    except ChatMessage.DoesNotExist:
        logger.error(f"ChatMessage {message_id} not found")
        return {"status": "error", "message": "Message not found"}

    try:
        content = message.content

        # Regex pattern: @username $amount description
        # Supports: @john $50 lunch, @sarah 30 coffee, @mike $100.50 dinner
        pattern = r'@(\w+)\s+\$?([\d.,]+)\s+(.*)'
        match = re.match(pattern, content.strip())

        if not match:
            # Try alternate format: $amount @username description
            alt_pattern = r'\$?([\d.,]+)\s+@(\w+)\s+(.*)'
            alt_match = re.match(alt_pattern, content.strip())

            if alt_match:
                amount_str, username, description = alt_match.groups()
            else:
                raise ValueError("Invalid shortcut format. Use: @person $amount description")
        else:
            username, amount_str, description = match.groups()

        # Parse amount
        amount = float(amount_str.replace(',', ''))

        # Find mentioned user
        mentioned_user = User.objects.filter(username=username).first()

        if not mentioned_user:
            # Still parse, but flag as unknown user
            logger.warning(f"User @{username} not found")

        # Build parsed data
        parsed_data = {
            "amount": amount,
            "currency": message.user.preferences.preferred_currency if hasattr(message.user, 'preferences') else "USD",
            "description": description.strip(),
            "date": timezone.now().date().isoformat(),
            "is_expense": True,
            "transaction_type": "group" if mentioned_user else "personal",
            "mentions": [
                {
                    "type": "user",
                    "id": mentioned_user.id if mentioned_user else None,
                    "text": f"@{username}",
                    "username": username,
                    "found": mentioned_user is not None
                }
            ],
            "split_with": [mentioned_user.id] if mentioned_user else [],
            "split_method": "equal",
            "confidence": 0.98  # High confidence for explicit format
        }

        # Update message
        message.metadata = message.metadata or {}
        message.metadata['parsed'] = parsed_data
        message.metadata['parsing_method'] = 'shortcut'
        message.status = 'completed'
        message.save(update_fields=['metadata', 'status', 'updated_at'])

        logger.info(f"Parsed shortcut message {message_id}: ${amount} for {username}")
        return {
            "status": "success",
            "message_id": message_id,
            "parsed_data": parsed_data
        }

    except ValueError as e:
        logger.error(f"Invalid shortcut format in message {message_id}: {e}")
        message.status = 'failed'
        message.metadata = message.metadata or {}
        message.metadata['error'] = str(e)
        message.save(update_fields=['status', 'metadata', 'updated_at'])
        return {"status": "error", "message": str(e)}
    except Exception as e:
        logger.error(f"Failed to parse shortcut message {message_id}: {e}")
        message.status = 'failed'
        message.metadata = message.metadata or {}
        message.metadata['error'] = str(e)
        message.save(update_fields=['status', 'metadata', 'updated_at'])
        return {"status": "error", "message": str(e)}


@shared_task(name='finance_v2.process_chat_file_upload')
def process_chat_file_upload(message_id: int, file_id: int):
    """
    Process file uploaded in chat (statements, receipts, invoices).

    Args:
        message_id: ID of the ChatMessage
        file_id: ID of the UploadedFile
    """
    from .models import ChatMessage, UploadedFile

    try:
        message = ChatMessage.objects.get(id=message_id)
        uploaded_file = UploadedFile.objects.get(id=file_id)
    except (ChatMessage.DoesNotExist, UploadedFile.DoesNotExist) as e:
        logger.error(f"Chat message or file not found: {e}")
        return {"status": "error", "message": str(e)}

    try:
        # Update status
        message.metadata = message.metadata or {}
        message.metadata['file_info'] = message.metadata.get('file_info', {})
        message.metadata['file_info']['processing_status'] = 'processing'
        message.save(update_fields=['metadata', 'updated_at'])

        # Determine file type and processing method
        file_ext = uploaded_file.file_name.lower().split('.')[-1] if uploaded_file.file_name else ''

        if file_ext in ['pdf', 'csv']:
            # Bank statement - process with existing task
            # This will create multiple pending transactions
            result = process_uploaded_file(file_id)

            if result.get('error'):
                raise ValueError(result['error'])

            transactions_count = result.get('created', 0)

            parsed_data = {
                "file_type": "statement",
                "transactions_found": transactions_count,
                "processing_mode": uploaded_file.processing_mode,
                "confidence": 0.85
            }

        elif file_ext in ['jpg', 'jpeg', 'png', 'gif']:
            # Receipt/Invoice - OCR processing
            from .services.ocr_service import get_ocr_service

            ocr_service = get_ocr_service()
            ocr_result = ocr_service.extract_structured_data(
                file_path=uploaded_file.file.path,
                document_type='receipt'
            )

            if not ocr_result.get('success'):
                raise ValueError(ocr_result.get('error', 'OCR processing failed'))

            # Extract transaction data from OCR result
            ocr_data = ocr_result.get('structured_data', {})

            parsed_data = {
                "file_type": "receipt",
                "amount": ocr_data.get('total'),
                "description": ocr_data.get('merchant', 'Receipt'),
                "date": ocr_data.get('date', timezone.now().date().isoformat()),
                "items": ocr_data.get('line_items', []),
                "confidence": ocr_result.get('confidence', 0.75)
            }

        else:
            raise ValueError(f"Unsupported file type: {file_ext}")

        # Update message with parsed data
        message.metadata['parsed'] = parsed_data
        message.metadata['file_info']['processing_status'] = 'completed'
        message.status = 'completed'
        message.save(update_fields=['metadata', 'status', 'updated_at'])

        # Create a system response message
        response_content = f"File processed: "
        if parsed_data['file_type'] == 'statement':
            response_content += f"Found {parsed_data['transactions_found']} transaction(s)"
        else:
            response_content += f"${parsed_data.get('amount', 0)} - {parsed_data.get('description', 'N/A')}"

        ChatMessage.objects.create(
            user=message.user,
            conversation_id=message.conversation_id,
            message_type='suggestion',
            content=response_content,
            metadata={'file_parsed_data': parsed_data},
            status='completed'
        )

        logger.info(f"Processed chat file upload {file_id} for message {message_id}")
        return {
            "status": "success",
            "message_id": message_id,
            "file_id": file_id,
            "parsed_data": parsed_data
        }

    except Exception as e:
        logger.error(f"Failed to process chat file {file_id}: {e}")
        message.metadata['file_info']['processing_status'] = 'failed'
        message.metadata['error'] = str(e)
        message.status = 'failed'
        message.save(update_fields=['metadata', 'status', 'updated_at'])
        return {"status": "error", "message": str(e)}


app.conf.beat_schedule = {
    'sync-all-emails-hourly': {
        'task': 'finance_v2.sync_all_users_emails',
        'schedule': crontab(minute=0),  # Every hour
    },
    'process-pending-emails': {
        'task': 'finance_v2.process_pending_emails',
        'schedule': crontab(minute='*/10'),  # Every 10 minutes
    },
    'deduplication-cleanup-daily': {
        'task': 'finance_v2.run_deduplication_cleanup',
        'schedule': crontab(hour=2, minute=0),  # 2 AM daily
    },
}
"""
# app.conf.beat_schedule = {
#     'sync-all-emails-hourly': {
#         'task': 'finance_v2.sync_all_users_emails',
#         'schedule': crontab(minute=0),  # Every hour
#     },
#     'process-pending-emails': {
#         'task': 'finance_v2.process_pending_emails',
#         'schedule': crontab(minute='*/10'),  # Every 10 minutes
#     },
#     'deduplication-cleanup-daily': {
#         'task': 'finance_v2.run_deduplication_cleanup',
#         'schedule': crontab(hour=2, minute=0),  # 2 AM daily
#     },
# }


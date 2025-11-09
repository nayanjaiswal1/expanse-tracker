"""
Service for processing pending transactions with deduplication.

This service handles the flow:
RawEmail/Statement → Extract → Create PendingTransaction → Check Duplicates → Merge if needed
"""

from decimal import Decimal
from typing import Dict, List, Optional, Any
from datetime import datetime
import logging

from django.contrib.auth import get_user_model
from django.utils import timezone

from ..models import PendingTransaction, Entity
from finance.models.accounts import Account
from finance.models.transactions import Category
from .ai_transaction_extractor import get_extractor
from .deduplication_service import DeduplicationService
from .currency_helper import get_user_currency

User = get_user_model()
logger = logging.getLogger(__name__)


class PendingTransactionProcessor:
    """Process and create pending transactions with intelligent deduplication."""

    def __init__(self):
        self.ai_extractor = get_extractor()
        self.dedup_service = DeduplicationService()

    def create_from_email(
        self,
        raw_email_data: Dict[str, Any],
        user: User
    ) -> Optional[PendingTransaction]:
        """
        Create pending transaction from email data with AI extraction.

        Args:
            raw_email_data: Dict with email info (subject, body, metadata)
            user: User who owns this transaction

        Returns:
            Created PendingTransaction (or merged primary if duplicate found)
        """
        # Extract transaction data using AI
        extracted = self.ai_extractor.extract_from_email(
            email_text=raw_email_data.get('body_plain', ''),
            email_subject=raw_email_data.get('subject', '')
        )

        # Check if it's a transaction email
        if not extracted.get('is_transaction'):
            logger.info(f"Email {raw_email_data.get('message_id')} is not a transaction")
            return None

        # Create pending transaction
        pending = self._create_pending_from_extracted(
            extracted=extracted,
            user=user,
            source='email',
            source_id=raw_email_data.get('message_id'),
            source_metadata={
                'email_subject': raw_email_data.get('subject'),
                'email_sender': raw_email_data.get('sender_email'),
                'email_date': raw_email_data.get('received_date')
            }
        )

        # Check for duplicates and merge if needed
        primary = self.dedup_service.check_and_handle_duplicates(pending)

        return primary

    def create_from_statement_row(
        self,
        row_data: Dict[str, Any],
        statement_id: int,
        user: User,
        account: Optional[Account] = None
    ) -> Optional[PendingTransaction]:
        """
        Create pending transaction from statement row with AI extraction.

        Args:
            row_data: Dict with row info (date, description, amount, etc.)
            statement_id: ID of the parent statement
            user: User who owns this transaction
            account: Account if known

        Returns:
            Created PendingTransaction (or merged primary if duplicate found)
        """
        # Extract using AI if needed
        if 'description' in row_data and 'amount' in row_data:
            # Already structured data, use directly
            extracted = row_data
        else:
            # Need AI extraction from raw text
            context = f"Statement ID: {statement_id}"
            if account:
                context += f", Account: {account.name}"

            extracted = self.ai_extractor.extract_from_statement_row(
                row_text=str(row_data),
                statement_context=context
            )

        # Create pending transaction
        pending = self._create_pending_from_extracted(
            extracted=extracted,
            user=user,
            source='statement',
            source_id=f"stmt_{statement_id}_row_{row_data.get('row_number', 0)}",
            source_metadata={
                'statement_id': statement_id,
                'row_number': row_data.get('row_number')
            },
            account=account
        )

        # Check for duplicates
        primary = self.dedup_service.check_and_handle_duplicates(pending)

        return primary

    def create_from_ocr(
        self,
        ocr_text: str,
        document_id: int,
        user: User,
        document_type: str = 'receipt'
    ) -> Optional[PendingTransaction]:
        """
        Create pending transaction from OCR text with AI extraction.

        Args:
            ocr_text: Extracted text from document
            document_id: ID of the source document
            user: User who owns this transaction
            document_type: Type of document (receipt, invoice, bill)

        Returns:
            Created PendingTransaction (or merged primary if duplicate found)
        """
        # Extract using AI
        extracted = self.ai_extractor.extract_from_ocr_text(
            ocr_text=ocr_text,
            document_type=document_type
        )

        if extracted.get('error'):
            logger.error(f"OCR extraction failed for doc {document_id}: {extracted['error']}")
            return None

        # Create pending transaction
        pending = self._create_pending_from_extracted(
            extracted=extracted,
            user=user,
            source='document',
            source_id=f"doc_{document_id}",
            source_metadata={
                'document_id': document_id,
                'document_type': document_type
            }
        )

        # Check for duplicates
        primary = self.dedup_service.check_and_handle_duplicates(pending)

        return primary

    def _create_pending_from_extracted(
        self,
        extracted: Dict[str, Any],
        user: User,
        source: str,
        source_id: str,
        source_metadata: Dict[str, Any],
        account: Optional[Account] = None
    ) -> PendingTransaction:
        """
        Create PendingTransaction from extracted AI data.

        Args:
            extracted: AI-extracted transaction data
            user: User who owns transaction
            source: Source type (email, statement, document, manual)
            source_id: Unique identifier from source
            source_metadata: Additional metadata from source
            account: Pre-selected account (optional)

        Returns:
            Created PendingTransaction
        """
        # Detect or create account if not provided
        if not account:
            account = self._detect_or_create_account(user, extracted)

        # Detect or create entity (merchant/payee)
        entity = self._detect_or_create_entity(user, extracted)

        # Determine transaction direction
        is_expense = self._determine_is_expense(extracted)

        # Get amount and handle currency conversion
        amount, currency_meta = self._handle_currency_conversion(
            extracted=extracted,
            account=account,
            user=user
        )

        # Parse date
        date = self._parse_date(extracted.get('date'))

        # Build description
        description = self._build_description(extracted)

        # Suggest category
        suggested_category = self._suggest_category(extracted, user)

        # Combine metadata
        metadata = {
            **source_metadata,
            **extracted.get('metadata', {}),
            **currency_meta,
            'ai_confidence': extracted.get('confidence', 0.8),
            'source_type': source,
            'extraction_timestamp': timezone.now().isoformat()
        }

        # Extract items if present
        items = self._process_items(extracted.get('items', []))

        # Create pending transaction
        pending = PendingTransaction.objects.create(
            user=user,
            source=source,
            source_id=source_id,
            amount=amount,
            is_expense=is_expense,
            description=description,
            date=date,
            account=account,
            entity=entity,
            suggested_category=suggested_category,
            status='pending',
            metadata=metadata,
            items=items
        )

        logger.info(f"Created pending transaction {pending.id} from {source}")
        return pending

    def _detect_account(self, user: User, extracted: Dict[str, Any]) -> Account:
        """
        Get the user's default account or create one if none exists.

        Args:
            user: User object
            extracted: Extracted transaction data (unused in this implementation)

        Returns:
            Account object (always returns an account)
        """
        # Try to get user's default account (first active account)
        default_account = Account.objects.filter(
            user=user,
            is_deleted=False
        ).order_by('-created_at').first()

        if default_account:
            return default_account

        # Create a default account if none exists
        default_account = Account.objects.create(
            user=user,
            name="Default Account",
            account_type='checking',
            currency=get_user_currency(user),
            status='active'
        )
        
        logger.info(f"Created default account for user {user.id}")
        return default_account

    def _detect_or_create_entity(self, user: User, extracted: Dict[str, Any]) -> Optional[Entity]:
        """
        Detect or create entity from extracted transaction data.

        Args:
            user: User object
            extracted: Extracted transaction data

        Returns:
            Entity object or None
        """
        merchant_name = extracted.get('merchant', '').strip()
        if not merchant_name or merchant_name.lower() in ['unknown', 'n/a', 'none']:
            return None

        # Try exact match first
        entity = Entity.objects.filter(
            user=user,
            name__iexact=merchant_name
        ).first()

        if entity:
            return entity

        # Try fuzzy match (case-insensitive contains)
        entity = Entity.objects.filter(
            user=user,
            name__icontains=merchant_name
        ).first()

        if entity:
            return entity

        # Create new entity
        entity_type = self._detect_entity_type(extracted)
        entity = Entity.objects.create(
            user=user,
            name=merchant_name,
            entity_type=entity_type,
            metadata={
                'auto_created': True,
                'created_from': extracted.get('source_type', 'unknown')
            }
        )

        logger.info(f"Auto-created entity '{merchant_name}' for user {user.id}")
        return entity

    def _detect_entity_type(self, extracted: Dict[str, Any]) -> str:
        """Detect entity type from extracted data."""
        transaction_type = extracted.get('transaction_type', '').lower()

        if transaction_type in ['salary', 'income', 'interest']:
            return 'income_source'
        elif transaction_type in ['transfer']:
            return 'self'
        else:
            return 'merchant'

    def _determine_is_expense(self, extracted: Dict[str, Any]) -> bool:
        """Determine if transaction is expense or income."""
        transaction_type = extracted.get('transaction_type', '').lower()

        # Income types
        if transaction_type in ['income', 'salary', 'refund', 'interest', 'credit']:
            return False

        # Expense types
        if transaction_type in ['purchase', 'payment', 'expense', 'debit']:
            return True

        # Check is_expense field if present
        if 'is_expense' in extracted:
            return bool(extracted['is_expense'])

        # Default to expense
        return True

        def _handle_currency_conversion(
            self,
            extracted: Dict[str, Any],
            account: Account,
            user: User
        ) -> tuple[Decimal, Dict]:
            """
            Handle currency conversion if needed.

            Args:
                extracted: Extracted transaction data
                account: Account object
                user: User object

            Returns:
                (final_amount, currency_metadata)
            """
            extracted_currency = extracted.get('currency', get_user_currency(user))
            account_currency = account.currency if account else get_user_currency(user)
            amount = Decimal(str(extracted.get('amount', 0)))

            if extracted_currency == account_currency:
                # No conversion needed
                return amount, {}

            # Need conversion - use AI to get exchange rate
            from .currency_helper import convert_currency

            conversion = convert_currency(
                amount=float(amount),
                from_currency=extracted_currency,
                to_currency=account_currency
            )

            return Decimal(str(conversion['amount'])), {
                'currency_conversion': {
                    'original_amount': float(amount),
                    'original_currency': extracted_currency,
                    'converted_amount': conversion['amount'],
                    'converted_currency': account_currency,
                    'exchange_rate': conversion['exchange_rate'],
                    'converted': conversion['converted'],
                    'conversion_timestamp': timezone.now().isoformat()
                }
            }

    def _parse_date(self, date_str: Optional[str]) -> datetime.date:
        """Parse date from string or use today."""
        if not date_str:
            return timezone.now().date()

        try:
            # Try ISO format first
            return datetime.fromisoformat(date_str).date()
        except (ValueError, AttributeError):
            try:
                # Try common formats
                for fmt in ['%Y-%m-%d', '%d-%m-%Y', '%m/%d/%Y', '%d/%m/%Y']:
                    try:
                        return datetime.strptime(date_str, fmt).date()
                    except ValueError:
                        continue
            except Exception:
                pass

        # Fallback to today
        logger.warning(f"Could not parse date '{date_str}', using today")
        return timezone.now().date()

    def _build_description(self, extracted: Dict[str, Any]) -> str:
        """Build description from extracted data."""
        description = extracted.get('description', '').strip()

        if not description:
            # Build from merchant and transaction type
            merchant = extracted.get('merchant', '')
            txn_type = extracted.get('transaction_type', '')
            if merchant and txn_type:
                description = f"{txn_type.title()} at {merchant}"
            elif merchant:
                description = merchant
            elif txn_type:
                description = txn_type.title()
            else:
                description = "Transaction"

        # Limit to 500 chars
        return description[:500]

    def _suggest_category(
        self,
        extracted: Dict[str, Any],
        user: User
    ) -> Optional[Category]:
        """Suggest category using AI."""
        # Get AI suggestion
        category_suggestion = self.ai_extractor.suggest_category(
            description=extracted.get('description', ''),
            merchant=extracted.get('merchant', '')
        )

        category_name = category_suggestion.get('category', '').strip()
        if not category_name:
            return None

        # Try to find matching category
        category = Category.objects.filter(
            user=user,
            name__iexact=category_name
        ).first()

        if not category:
            # Try case-insensitive contains
            category = Category.objects.filter(
                user=user,
                name__icontains=category_name
            ).first()

        return category

    def _process_items(self, items_data: List[Dict]) -> List[Dict]:
        """Process and clean items data."""
        if not items_data:
            return []

        processed = []
        for item in items_data:
            processed_item = {
                'name': item.get('name', '').strip(),
                'quantity': float(item.get('quantity', 1.0)),
                'unit_price': float(item.get('unit_price', 0.0)),
                'amount': float(item.get('amount', 0.0)),
                'category': item.get('category', '').strip()
            }
            processed.append(processed_item)

        return processed


# Singleton instance
_processor = None


def get_processor() -> PendingTransactionProcessor:
    """Get singleton instance of pending transaction processor."""
    global _processor
    if _processor is None:
        _processor = PendingTransactionProcessor()
    return _processor

from __future__ import annotations

from decimal import Decimal
from typing import Dict, List, Optional, Tuple

from django.db import transaction as db_transaction
from django.utils import timezone

from finance.models import Account, Transaction
from .account_matcher_service import AccountMatcherService
from .email_parser import EmailParser


class EmailTransactionService:
    """
    Lightweight service that converts parsed emails into pending transactions.

    The implementation relies on simple heuristics and delegates richer learning
    to the training pipeline.
    """

    DEFAULT_CURRENCY = "USD"

    def __init__(self, user):
        self.user = user
        self.email_parser = EmailParser()
        self.account_matcher = AccountMatcherService(user)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def process_email_to_transaction(
        self, gmail_message: Dict, gmail_message_id: Optional[str] = None
    ) -> Dict:
        """Parse email payload and create a pending transaction if applicable."""
        parsed_data = self.email_parser.parse_gmail_message(gmail_message)

        if not parsed_data.get("is_transaction"):
            return {
                "success": False,
                "message": "Email does not appear to contain transaction information",
                "parsed_data": parsed_data,
            }

        if gmail_message_id and self._is_duplicate_transaction(gmail_message_id):
            return {
                "success": False,
                "message": "Transaction from this email already exists",
                "duplicate": True,
            }

        account_info = self._build_account_info(parsed_data)
        account, account_suggestions, _ = self.account_matcher.find_account(
            account_info,
            sender=parsed_data.get("sender"),
            merchant_name=parsed_data.get("merchant_name"),
        )

        if not account and account_info.get("type"):
            account = self.create_account_from_info(account_info)

        try:
            with db_transaction.atomic():
                transaction_obj = self._create_pending_transaction(
                    parsed_data, account, account_info, gmail_message_id
                )

            return {
                "success": True,
                "message": "Pending transaction created successfully",
                "transaction": {
                    "id": transaction_obj.id,
                    "amount": str(transaction_obj.amount),
                    "description": transaction_obj.description,
                    "date": transaction_obj.date.isoformat(),
                    "transaction_type": transaction_obj.transaction_type,
                    "status": transaction_obj.status,
                },
                "account": {
                    "id": account.id if account else None,
                    "name": account.name if account else None,
                }
                if account
                else None,
                "account_suggestions": account_suggestions,
                "account_info": account_info,
                "needs_review": True,
                "parsed_data": parsed_data,
            }
        except Exception as exc:
            return {
                "success": False,
                "message": f"Failed to create transaction: {exc}",
                "error": str(exc),
            }

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    def _build_account_info(self, parsed_data: Dict) -> Dict:
        details = parsed_data.get("account_details") or {}
        account_info: Dict[str, Optional[str]] = {
            "type": details.get("type"),
            "last_digits": details.get("last_digits"),
            "wallet_name": None,
            "upi_id": None,
            "institution_name": None,
            "raw_matches": [],
        }

        merchant = parsed_data.get("merchant_name")
        if merchant:
            account_info["institution_name"] = merchant

        sender_domain = self._extract_domain(parsed_data.get("sender", ""))
        if sender_domain and not account_info["institution_name"]:
            account_info["institution_name"] = sender_domain.title()

        if account_info.get("type") == "unknown":
            account_info["type"] = None

        return account_info

    def _extract_domain(self, sender: str) -> Optional[str]:
        sender = sender or ""
        if "<" in sender and ">" in sender:
            sender = sender[sender.find("<") + 1 : sender.find(">")]

        parts = sender.split("@")
        if len(parts) != 2:
            return None

        domain = parts[1].strip().lower()
        for suffix in (".com", ".co", ".in", ".org", ".net"):
            if domain.endswith(suffix):
                domain = domain[: -len(suffix)]
        return domain or None

    def _is_duplicate_transaction(self, gmail_message_id: str) -> bool:
        """Check if transaction with this Gmail message ID already exists."""
        return Transaction.objects.filter(
            user=self.user,
            metadata__gmail_message_id=gmail_message_id
        ).exists()

    def _create_pending_transaction(
        self,
        parsed_data: Dict,
        account: Optional[Account],
        account_info: Dict,
        gmail_message_id: Optional[str],
    ) -> Transaction:
        amount = parsed_data.get("parsed_amount") or Decimal("0.00")
        currency = parsed_data.get("parsed_currency") or self.DEFAULT_CURRENCY
        transaction_type = parsed_data.get("transaction_type") or "expense"
        description = (
            parsed_data.get("parsed_description") or parsed_data.get("subject") or ""
        )

        date = timezone.now().date()
        if parsed_data.get("date"):
            try:
                from email.utils import parsedate_to_datetime

                date = parsedate_to_datetime(parsed_data["date"]).date()
            except Exception:
                pass

        # Determine is_credit based on transaction type
        is_credit = transaction_type.lower() in ['income', 'credit', 'refund']

        # Build metadata with all email-specific data
        metadata = {
            "source": "email_import",
            "transaction_subtype": transaction_type,
            "confidence_score": parsed_data.get("confidence_score", 0.0),
            "account_info": account_info,
            "sender": parsed_data.get("sender"),
            "email_date": parsed_data.get("date"),
            "merchant_details": parsed_data.get("merchant_details"),
            "pay_to": parsed_data.get("pay_to"),
            "recipient_details": parsed_data.get("recipient_details"),
            "account_details": parsed_data.get("account_details"),
            "body_preview": parsed_data.get("body_preview"),
            "original_description": parsed_data.get("subject"),
            "gmail_message_id": gmail_message_id,
            "verified": False,
        }

        # Add merchant name if available
        merchant_name = parsed_data.get("merchant_name")
        if merchant_name:
            metadata["merchant_name"] = merchant_name

        transaction_obj = Transaction.objects.create(
            user=self.user,
            amount=amount,
            description=description or "Email Transaction",
            date=date,
            currency=currency,
            status="pending",
            is_credit=is_credit,
            account=account,
            metadata=metadata,
        )

        return transaction_obj

    def create_account_from_info(
        self, account_info: Dict, name: Optional[str] = None
    ) -> Account:
        """
        Create a minimal account record using the available hints.

        The goal is to avoid rejecting ingestion when we have enough signals
        to suggest a new account for the user to review.
        """

        type_map = {
            "credit_card": "credit",
            "card": "credit",
            "checking": "checking",
            "savings": "savings",
            "wallet": "other",
        }
        account_type = type_map.get(account_info.get("type") or "", "other")

        last_digits = account_info.get("last_digits") or ""
        account_number_masked = f"****{last_digits}" if last_digits else ""

        metadata = {
            "source": "email_import",
            "account_info": account_info,
        }

        account = Account.objects.create(
            user=self.user,
            name=name or self._generate_account_name(account_info),
            description="Created from email ingestion",
            account_type=account_type,
            institution=account_info.get("institution_name") or "",
            account_number=last_digits,
            account_number_masked=account_number_masked,
            is_active=True,
            status="active",
            currency=self.DEFAULT_CURRENCY,
            balance=Decimal("0.00"),
            metadata=metadata,
        )
        return account

    def _generate_account_name(self, account_info: Dict) -> str:
        parts: List[str] = []

        if account_info.get("institution_name"):
            parts.append(account_info["institution_name"])

        if account_info.get("type"):
            parts.append(account_info["type"].replace("_", " ").title())

        if account_info.get("last_digits"):
            parts.append(f"****{account_info['last_digits']}")

        label = " ".join(parts)
        return label or "Email Account"

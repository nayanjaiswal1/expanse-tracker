"""
Utility service to power quick-add transaction workflows.
"""

import re
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Dict, Optional, Tuple, Any

from django.utils import timezone

from ..models import Account, Category


INCOME_KEYWORDS = {
    "salary",
    "income",
    "paycheck",
    "bonus",
    "refund",
    "credit",
    "received",
    "deposit",
}

EXPENSE_KEYWORDS = {
    "spent",
    "purchase",
    "buy",
    "payment",
    "paid",
    "bill",
    "debit",
    "charge",
    "expense",
}

CATEGORY_KEYWORDS = {
    "food": {"food", "restaurant", "dining", "lunch", "dinner", "breakfast", "meal"},
    "groceries": {"grocery", "groceries", "supermarket", "market"},
    "coffee": {"coffee", "cafe", "starbucks"},
    "transport": {"uber", "lyft", "taxi", "gas", "fuel", "transport", "car", "metro"},
    "entertainment": {"movie", "netflix", "spotify", "cinema", "entertainment"},
    "shopping": {"shopping", "amazon", "store", "mall"},
    "utilities": {"electricity", "water bill", "internet", "utility", "utilities"},
    "rent": {"rent", "mortgage", "apartment", "lease"},
    "travel": {"flight", "hotel", "travel", "trip"},
    "health": {"doctor", "pharmacy", "hospital", "clinic", "health"},
}


@dataclass
class QuickAddSuggestion:
    amount: Optional[Decimal] = None
    description: str = ""
    transaction_type: str = "expense"
    merchant_name: Optional[str] = None
    suggested_account: Optional[Account] = None
    suggested_category: Optional[Category] = None
    detected_date: Optional[datetime] = None
    confidence: float = 0.0
    sources: Dict[str, Any] = None
    missing_fields: list = None
    quick_actions: list = None

    def as_dict(self) -> Dict[str, Any]:
        """Return serialisable representation for API responses."""
        return {
            "amount": str(self.amount) if self.amount is not None else None,
            "description": self.description,
            "transaction_type": self.transaction_type,
            "merchant_name": self.merchant_name,
            "suggested_account": (
                {
                    "id": self.suggested_account.id,
                    "name": self.suggested_account.name,
                    "icon": getattr(self.suggested_account, "icon", ""),
                }
                if self.suggested_account
                else None
            ),
            "suggested_category": (
                {
                    "id": str(self.suggested_category.id),
                    "name": self.suggested_category.name,
                    "color": getattr(self.suggested_category, "color", "#0066CC"),
                }
                if self.suggested_category
                else None
            ),
            "date": (
                self.detected_date.date().isoformat()
                if isinstance(self.detected_date, datetime)
                else timezone.now().date().isoformat()
            ),
            "confidence": round(self.confidence, 3),
            "sources": self.sources or {},
            "missing_fields": self.missing_fields or [],
            "quick_actions": self.quick_actions or [],
        }


class QuickAddService:
    """Service that interprets user-provided quick-add input."""

    def __init__(self, user):
        self.user = user

    def build_suggestion(
        self,
        message: Optional[str],
        uploaded_file,
        previous_suggestion: Optional[Dict[str, Any]] = None,
    ) -> QuickAddSuggestion:
        """Generate a transaction suggestion from message and optional attachment."""
        # Start with previous context if available
        if previous_suggestion:
            suggestion = QuickAddSuggestion(
                amount=Decimal(previous_suggestion.get("amount")) if previous_suggestion.get("amount") else None,
                description=previous_suggestion.get("description", ""),
                transaction_type=previous_suggestion.get("transaction_type", "expense"),
                merchant_name=previous_suggestion.get("merchant_name"),
                confidence=previous_suggestion.get("confidence", 0.0),
                sources=previous_suggestion.get("sources", {}),
            )
            # Try to restore suggested account
            if previous_suggestion.get("suggested_account"):
                acc_id = previous_suggestion["suggested_account"].get("id")
                if acc_id:
                    suggestion.suggested_account = Account.objects.filter(
                        user=self.user, id=acc_id
                    ).first()
            # Try to restore suggested category
            if previous_suggestion.get("suggested_category"):
                cat_id = previous_suggestion["suggested_category"].get("id")
                if cat_id:
                    suggestion.suggested_category = Category.objects.filter(
                        user=self.user, id=cat_id
                    ).first()
        else:
            suggestion = QuickAddSuggestion(
                description="",
                transaction_type="expense",
                confidence=0.0,
                sources={},
            )

        text_message = (message or "").strip()
        if text_message:
            parsed = self._parse_message(text_message)
            # Only override if new data found
            if parsed.get("amount"):
                suggestion.amount = parsed.get("amount")
            if parsed.get("description"):
                suggestion.description = parsed.get("description")
            if parsed.get("transaction_type"):
                suggestion.transaction_type = parsed.get("transaction_type")
            if parsed.get("merchant_name"):
                suggestion.merchant_name = parsed.get("merchant_name")
            suggestion.confidence += parsed.get("confidence", 0.0)
            suggestion.sources["message"] = parsed

        # Process attachment if present
        if uploaded_file:
            file_info = self._parse_attachment(uploaded_file)
            if file_info:
                suggestion.sources["attachment"] = file_info
                suggestion.confidence += file_info.get("confidence", 0.0)
                suggestion.amount = file_info.get("amount", suggestion.amount)
                suggestion.description = (
                    file_info.get("description") or suggestion.description
                )
                suggestion.transaction_type = file_info.get(
                    "transaction_type", suggestion.transaction_type
                )
                suggestion.merchant_name = file_info.get(
                    "merchant_name", suggestion.merchant_name
                )
                suggestion.detected_date = file_info.get("date", suggestion.detected_date)

        # Choose account - try to match from message first, then use default
        if not suggestion.suggested_account:
            matched_account = self._match_account_from_text(text_message)
            if matched_account:
                suggestion.suggested_account = matched_account
                suggestion.confidence += 0.2
            else:
                suggestion.suggested_account = self._select_default_account()

        # Determine category suggestion
        category, category_confidence = self._suggest_category(
            suggestion.description or suggestion.merchant_name or text_message
        )
        if category:
            suggestion.suggested_category = category
            suggestion.confidence += category_confidence

        # Bound confidence between 0 and 1
        suggestion.confidence = max(0.0, min(1.0, suggestion.confidence))

        # Fallback description
        if not suggestion.description and suggestion.merchant_name:
            suggestion.description = suggestion.merchant_name
        elif not suggestion.description and text_message:
            suggestion.description = text_message[:120]

        # Final fallback for amount
        if suggestion.amount is None:
            suggestion.confidence *= 0.6  # penalise missing amount

        # Detect missing fields and generate quick actions
        suggestion.missing_fields = self._detect_missing_fields(suggestion)
        suggestion.quick_actions = self._generate_quick_actions(suggestion)

        return suggestion

    def _detect_missing_fields(self, suggestion: QuickAddSuggestion) -> list:
        """Identify which required fields are missing from the suggestion."""
        missing = []
        if suggestion.amount is None:
            missing.append("amount")
        if not suggestion.description:
            missing.append("description")
        if not suggestion.suggested_account:
            missing.append("account")
        return missing

    def _generate_quick_actions(self, suggestion: QuickAddSuggestion) -> list:
        """Generate contextual quick action buttons for the conversation."""
        actions = []

        # If we have amount and description, offer to create
        if suggestion.amount and suggestion.description:
            actions.append({
                "label": "✓ Create Transaction",
                "action": "confirm_transaction",
            })

        # Suggest accounts if missing or low confidence
        if not suggestion.suggested_account or suggestion.confidence < 0.5:
            accounts = Account.objects.filter(user=self.user, is_active=True).order_by("-is_primary", "priority")[:3]
            for account in accounts:
                actions.append({
                    "label": f"💳 {account.name}",
                    "action": "select_account",
                    "value": str(account.id),
                })

        # Suggest popular categories if missing
        if not suggestion.suggested_category:
            categories = Category.objects.filter(user=self.user, is_active=True).order_by("name")[:4]
            for category in categories:
                actions.append({
                    "label": f"📁 {category.name}",
                    "action": "select_category",
                    "value": str(category.id),
                })

        return actions

    def _parse_message(self, message: str) -> Dict[str, Any]:
        """Parse amount, description, and type from plain text."""
        result: Dict[str, Any] = {"confidence": 0.1}
        working = message.strip()

        # Detect sign or explicit type keywords
        sign = 1
        if working.startswith("+"):
            sign = 1
            working = working[1:].strip()
            result["transaction_type"] = "income"
        elif working.startswith("-"):
            sign = -1
            working = working[1:].strip()
            result["transaction_type"] = "expense"

        lower_message = working.lower()

        # Determine type via keywords
        if any(word in lower_message for word in INCOME_KEYWORDS):
            result["transaction_type"] = "income"
            result["confidence"] += 0.1
        elif any(word in lower_message for word in EXPENSE_KEYWORDS):
            result["transaction_type"] = "expense"
            result["confidence"] += 0.1
        else:
            result["transaction_type"] = "income" if sign > 0 else "expense"

        # Find amount
        amount_match = re.search(
            r"([-+]?\d{1,3}(?:[,\s]\d{3})*(?:\.\d{1,2})|\d+(?:\.\d{1,2})?)", working
        )
        if amount_match:
            amount_str = amount_match.group(0).replace(",", "").replace(" ", "")
            try:
                amount = Decimal(amount_str)
                if sign < 0:
                    amount *= -1
                result["amount"] = abs(amount)
                result["confidence"] += 0.3
            except (InvalidOperation, ValueError):
                pass
            working = (
                working[: amount_match.start()] + working[amount_match.end() :]
            ).strip()

        # Merchant heuristics based on leading words
        merchant = self._extract_merchant_from_text(lower_message)
        if merchant:
            result["merchant_name"] = merchant
            result["confidence"] += 0.1

        description = working.strip(" -,:")
        result["description"] = description or merchant or ""
        if result["description"]:
            result["confidence"] += 0.1

        return result

    def _parse_attachment(self, uploaded_file) -> Optional[Dict[str, Any]]:
        """Extract structured data from uploaded receipts/statements if possible."""
        try:
            file_bytes = uploaded_file.read()
            if not file_bytes:
                return None

            # Lazy import to avoid unnecessary dependency at module load
            from services.ai_document_processing_service import DocumentProcessingService

            processor = DocumentProcessingService()
            parsed = processor.parse_document(
                file_bytes=file_bytes,
                file_name=getattr(uploaded_file, "name", "upload"),
                enhanced=True,
            )

            transactions = parsed.get("extracted_transactions") or []
            if not transactions:
                return None

            best_tx = max(
                transactions,
                key=lambda tx: tx.get("confidence", tx.get("confidence_score", 0)),
            )

            info: Dict[str, Any] = {"confidence": 0.25}

            amount_value = best_tx.get("amount") or best_tx.get("parsed_amount")
            if amount_value:
                try:
                    info["amount"] = abs(Decimal(str(amount_value)))
                    info["confidence"] += 0.2
                except (InvalidOperation, TypeError):
                    pass

            info["description"] = (
                best_tx.get("description")
                or best_tx.get("parsed_description")
                or ""
            )
            info["merchant_name"] = (
                best_tx.get("merchant_name")
                or best_tx.get("merchant")
                or parsed.get("account_info", {}).get("merchant")
            )

            tx_type = best_tx.get("transaction_type") or best_tx.get("type")
            if tx_type in {"income", "expense"}:
                info["transaction_type"] = tx_type
                info["confidence"] += 0.1

            if best_tx.get("date"):
                try:
                    info["date"] = datetime.fromisoformat(str(best_tx["date"]))
                except ValueError:
                    pass

            return info
        except Exception:
            return None
        finally:
            try:
                uploaded_file.seek(0)
            except Exception:
                pass

    def _match_account_from_text(self, text: str) -> Optional[Account]:
        """Try to match an account name from the user's message."""
        if not text:
            return None

        text_lower = text.lower()
        accounts = Account.objects.filter(user=self.user)

        # Try exact name match first
        for account in accounts:
            if account.name.lower() in text_lower:
                return account

        # Try partial match
        for account in accounts:
            # Split account name into words and check if any match
            account_words = account.name.lower().split()
            if any(word in text_lower for word in account_words if len(word) > 3):
                return account

        return None

    def _select_default_account(self) -> Optional[Account]:
        """Pick a sensible default account to pre-fill quick add."""
        account = (
            Account.objects.filter(user=self.user, is_active=True)
            .order_by("-is_primary", "priority", "id")
            .first()
        )
        if account:
            return account
        return Account.objects.filter(user=self.user).order_by("id").first()

    def _suggest_category(
        self, description: Optional[str]
    ) -> Tuple[Optional[Category], float]:
        if not description:
            return None, 0.0

        description_lower = description.lower()
        categories = Category.objects.filter(user=self.user, is_active=True)

        # Exact category name matches
        for category in categories:
            if category.name and category.name.lower() in description_lower:
                return category, 0.15

        # Keyword hints
        for hint_name, keywords in CATEGORY_KEYWORDS.items():
            if any(keyword in description_lower for keyword in keywords):
                matched_category = next(
                    (
                        cat
                        for cat in categories
                        if hint_name in cat.name.lower()
                    ),
                    None,
                )
                if matched_category:
                    return matched_category, 0.12

        return None, 0.0

    def _extract_merchant_from_text(self, text: str) -> Optional[str]:
        """Try to extract merchant-like tokens from plain text input."""
        merchant_patterns = [
            r"(?:at|from)\s+([a-z0-9&'\- ]{3,40})",
            r"([a-z0-9&'\- ]{3,40})\s+store",
            r"(?:order|purchase)\s+([a-z0-9&'\- ]{3,40})",
        ]
        for pattern in merchant_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                candidate = match.group(1).strip(" .,:;-")
                if candidate:
                    return " ".join(word.capitalize() for word in candidate.split())
        return None

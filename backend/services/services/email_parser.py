from __future__ import annotations

import base64
from decimal import Decimal, InvalidOperation
from html import unescape
from html.parser import HTMLParser
from typing import Dict, Iterable, List, Optional, Tuple


class _HTMLStripper(HTMLParser):
    """Lightweight HTML to text converter used during body extraction."""

    def __init__(self) -> None:
        super().__init__()
        self._chunks: List[str] = []

    def handle_data(self, data: str) -> None:
        self._chunks.append(data)

    def get_text(self) -> str:
        return "".join(self._chunks)


class EmailParser:
    """
    Parse emails to extract coarse transaction information.

    The goal is to provide lightweight heuristics that can seed ML training
    without relying on brittle regular expressions.
    """

    CURRENCY_SYMBOLS = {
        "$": "USD",
        "₹": "INR",
        "€": "EUR",
        "£": "GBP",
        "¥": "JPY",
    }

    CURRENCY_CODES = {"USD", "INR", "EUR", "GBP", "JPY", "AUD", "CAD", "SGD"}

    EXPENSE_KEYWORDS = {
        "purchase",
        "payment",
        "paid",
        "charged",
        "debit",
        "withdrawal",
        "spent",
        "bill",
        "invoice",
        "subscription",
        "order",
    }

    INCOME_KEYWORDS = {
        "received",
        "deposit",
        "credit",
        "refund",
        "cashback",
        "salary",
        "payout",
        "transfer in",
        "payment received",
    }

    NON_TRANSACTION_KEYWORDS = {
        "unsubscribe",
        "promotion",
        "offer",
        "sale",
        "discount",
        "newsletter",
        "deals",
        "advertisement",
        "marketing",
        "update",
        "security alert",
    }

    TRANSACTION_HINT_KEYWORDS = {
        "transaction",
        "receipt",
        "payment",
        "purchase",
        "invoice",
        "statement",
        "order",
        "debited",
        "credited",
        "charged",
    }

    def parse_gmail_message(self, gmail_message: Dict) -> Dict:
        """Parse a Gmail message and extract coarse transaction data."""
        headers = gmail_message.get("payload", {}).get("headers", []) or []
        subject = self._get_header_value(headers, "Subject") or ""
        sender = self._get_header_value(headers, "From") or ""
        date_str = self._get_header_value(headers, "Date") or ""

        payload = gmail_message.get("payload", {})
        body = self._extract_email_body(payload)

        combined_text = " ".join(filter(None, [subject, body, sender])).lower()

        parsed_amount, parsed_currency = self._extract_amount_and_currency(
            (subject, body)
        )
        transaction_type = self._determine_transaction_type(combined_text)
        is_transaction = self._looks_like_transaction(combined_text, parsed_amount)

        merchant_name = self._guess_merchant(subject, sender)
        account_details = self._extract_account_details(body)
        pay_to, recipient_details = self._extract_recipient_info(body)

        description = self._generate_description(subject, body, merchant_name)

        confidence_score = 0.0
        if is_transaction:
            confidence_score += 0.3
        if parsed_amount is not None:
            confidence_score += 0.3
        if merchant_name:
            confidence_score += 0.1
        if account_details:
            confidence_score += 0.1
        if transaction_type:
            confidence_score += 0.1

        return {
            "subject": subject,
            "sender": sender,
            "date": date_str,
            "body_preview": body[:200] + "..." if len(body) > 200 else body,
            "parsed_amount": parsed_amount,
            "parsed_currency": parsed_currency,
            "parsed_description": description,
            "transaction_type": transaction_type,
            "account_details": account_details,
            "merchant_name": merchant_name,
            "merchant_details": {"guessed_from": "subject_or_sender"}
            if merchant_name
            else None,
            "pay_to": pay_to,
            "recipient_details": recipient_details,
            "confidence_score": min(confidence_score, 1.0),
            "is_transaction": is_transaction,
        }

    # ------------------------------------------------------------------
    # Extraction helpers
    # ------------------------------------------------------------------

    def _get_header_value(self, headers: Iterable[Dict], name: str) -> Optional[str]:
        for header in headers:
            if header.get("name", "").lower() == name.lower():
                return header.get("value", "")
        return None

    def _extract_email_body(self, payload: Dict) -> str:
        """
        Extract plain text body from a Gmail message payload.

        Prefers text/plain parts but will fall back to stripping HTML when needed.
        """
        text_fragments: List[str] = []

        def _decode_part(part: Dict) -> Optional[str]:
            data = part.get("body", {}).get("data")
            if not data:
                return None
            try:
                decoded = base64.urlsafe_b64decode(data.encode("ASCII")).decode(
                    "utf-8", errors="replace"
                )
            except Exception:
                return None
            if part.get("mimeType") == "text/html":
                return self._strip_html(decoded)
            return decoded

        if "parts" in payload:
            for part in payload.get("parts", []):
                mime_type = part.get("mimeType")
                if mime_type == "text/plain":
                    decoded = _decode_part(part)
                    if decoded:
                        text_fragments.append(decoded)
                elif mime_type == "text/html":
                    decoded = _decode_part(part)
                    if decoded and not text_fragments:
                        text_fragments.append(decoded)
                elif "parts" in part:
                    nested = self._extract_email_body(part)
                    if nested:
                        text_fragments.append(nested)
        else:
            decoded = _decode_part(payload)
            if decoded:
                text_fragments.append(decoded)

        body = " ".join(fragment.strip() for fragment in text_fragments if fragment)
        return " ".join(body.split())

    def _strip_html(self, html: str) -> str:
        stripper = _HTMLStripper()
        stripper.feed(unescape(html))
        return stripper.get_text()

    def _looks_like_transaction(
        self, combined_text: str, parsed_amount: Optional[Decimal]
    ) -> bool:
        if any(keyword in combined_text for keyword in self.NON_TRANSACTION_KEYWORDS):
            return False

        if parsed_amount is not None:
            return True

        return any(hint in combined_text for hint in self.TRANSACTION_HINT_KEYWORDS)

    def _extract_amount_and_currency(
        self, parts: Tuple[str, ...]
    ) -> Tuple[Optional[Decimal], Optional[str]]:
        best_amount: Optional[Decimal] = None
        detected_currency: Optional[str] = None

        for part in parts:
            for token in part.replace("\n", " ").split():
                cleaned_token, currency_hint = self._normalise_amount_token(token)
                if cleaned_token is None:
                    continue
                try:
                    value = Decimal(cleaned_token)
                except (InvalidOperation, ValueError):
                    continue

                if best_amount is None or value > best_amount:
                    best_amount = value
                    detected_currency = currency_hint or detected_currency

        return best_amount, detected_currency

    def _normalise_amount_token(self, token: str) -> Tuple[Optional[str], Optional[str]]:
        if not token:
            return None, None

        stripped = token.strip().strip(",;:()[]")
        if not stripped:
            return None, None

        currency_hint: Optional[str] = None

        if stripped[0] in self.CURRENCY_SYMBOLS:
            currency_hint = self.CURRENCY_SYMBOLS[stripped[0]]
            stripped = stripped[1:]

        upper_stripped = stripped.upper()
        for code in self.CURRENCY_CODES:
            if upper_stripped.endswith(code):
                currency_hint = currency_hint or code
                stripped = stripped[: -len(code)]
                break

        stripped = stripped.replace(",", "").replace("+", "")

        if stripped.startswith("-"):
            stripped = stripped[1:]

        if stripped.count(".") > 1:
            return None, None

        if not stripped or any(ch not in "0123456789." for ch in stripped):
            return None, None

        return stripped, currency_hint

    def _determine_transaction_type(self, combined_text: str) -> Optional[str]:
        if any(keyword in combined_text for keyword in self.INCOME_KEYWORDS):
            return "income"
        if any(keyword in combined_text for keyword in self.EXPENSE_KEYWORDS):
            return "expense"
        return None

    def _guess_merchant(self, subject: str, sender: str) -> Optional[str]:
        for token in subject.split():
            token_clean = token.strip().strip(",;:").title()
            if len(token_clean) > 3 and token_clean.isalpha():
                return token_clean

        sender_name = sender.split("<")[0].strip().strip('"')
        if sender_name:
            return sender_name
        return None

    def _extract_account_details(self, body: str) -> Optional[Dict[str, str]]:
        body_lower = body.lower()
        tokens = body.replace("\n", " ").split()

        last_digits: Optional[str] = None
        for token in tokens:
            digits = "".join(ch for ch in token if ch.isdigit())
            if len(digits) >= 4:
                last_digits = digits[-4:]
                break

        if not last_digits:
            return None

        account_type = None
        if "card" in body_lower:
            account_type = "card"
        elif "account" in body_lower:
            account_type = "account"

        return {
            "type": account_type or "unknown",
            "last_digits": last_digits,
        }

    def _extract_recipient_info(
        self, body: str
    ) -> Tuple[Optional[str], Optional[Dict[str, str]]]:
        lines = [line.strip() for line in body.split("\n") if line.strip()]
        for line in lines:
            lower_line = line.lower()
            if "paid to" in lower_line or "payment to" in lower_line:
                recipient = line.split("to", 1)[-1].strip(" :-")
                return recipient, {"source_line": line}
            if lower_line.startswith("to "):
                recipient = line[3:].strip(" :-")
                return recipient, {"source_line": line}
        return None, None

    def _generate_description(
        self, subject: str, body: str, merchant_name: Optional[str]
    ) -> Optional[str]:
        if subject:
            return subject
        if merchant_name:
            return f"Purchase from {merchant_name}"
        if body:
            return body[:140]
        return None

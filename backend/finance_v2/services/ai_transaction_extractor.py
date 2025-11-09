"""
AI-based transaction extraction service.
Uses LLM to extract transaction data from text (emails, statements, documents).
NO REGEX - Pure AI extraction for better accuracy.
"""

import json
import logging
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

from django.conf import settings

logger = logging.getLogger(__name__)


class AITransactionExtractor:
    """
    Extract transaction information using AI/LLM.
    Supports: emails, bank statements, OCR text from images.
    """

    def __init__(self):
        self.llm_provider = self._get_llm_provider()

    def _get_llm_provider(self):
        """Get configured LLM provider (Ollama, OpenAI, etc.)"""
        provider = settings.LLM_PROVIDER
        if provider == "ollama":
            from services.ai_providers import OllamaProvider
            return OllamaProvider()
        elif provider == "openai":
            from services.ai_providers import OpenAIProvider
            return OpenAIProvider()
        # Add more providers as needed
        return None

    def extract_from_email(self, email_text: str, email_subject: str = "") -> Dict[str, Any]:
        """
        Extract transaction data from email text using AI.

        Args:
            email_text: Email body text
            email_subject: Email subject line

        Returns:
            {
                "is_transaction": bool,
                "transaction_type": str,  # purchase, payment, transfer, refund
                "amount": float,
                "currency": str,
                "merchant": str,
                "date": str,  # ISO format
                "description": str,
                "items": [
                    {
                        "name": str,
                        "quantity": float,
                        "unit_price": float,
                        "amount": float,
                        "category": str,
                    }
                ],
                "metadata": dict,
                "confidence": float,
            }
        """
        prompt = f"""
You are a financial transaction extraction AI. Analyze this email and extract transaction information.

Email Subject: {email_subject}
Email Body:
{email_text}

Extract the following information in JSON format:
{{
    "is_transaction": true/false,  // Is this a transaction notification?
    "transaction_type": "purchase/payment/transfer/refund/income",
    "amount": 0.00,  // Total transaction amount
    "currency": "USD/INR/EUR",
    "merchant": "Merchant name or person",
    "date": "YYYY-MM-DD",  // Transaction date
    "description": "Brief description",
    "items": [  // For orders (Amazon, etc.), list all items
        {{
            "name": "Product name",
            "quantity": 1.0,
            "unit_price": 0.00,
            "amount": 0.00,
            "category": "Electronics/Food/Clothing/etc."
        }}
    ],
    "account_info": {{  // If available
        "account_last4": "1234",
        "account_type": "credit_card/savings"
    }},
    "metadata": {{
        "order_id": "...",
        "payment_method": "...",
        "shipping": 0.00,
        "tax": 0.00,
        "discount": 0.00
    }},
    "confidence": 0.9  // Your confidence level (0-1)
}}

IMPORTANT:
- If not a transaction email, set is_transaction to false
- For single-item transactions, still put it in items array
- Extract all items for orders (Amazon, Flipkart, etc.)
- Suggest appropriate category for each item
- If date not found, use today's date
- Return ONLY valid JSON, no extra text
"""

        try:
            response = self.llm_provider.generate(prompt, temperature=0.1)
            data = self._parse_json_response(response)
            return data
        except Exception as e:
            logger.error(f"Error extracting from email: {e}")
            return {"is_transaction": False, "error": str(e)}

    def extract_from_statement_row(self, row_text: str, statement_context: str = "") -> Dict[str, Any]:
        """
        Extract transaction from bank statement row using AI.

        Args:
            row_text: Single row/line from statement
            statement_context: Additional context (bank name, account type, etc.)

        Returns:
            Same format as extract_from_email but simpler
        """
        prompt = f"""
You are a financial transaction extraction AI. Extract transaction from this bank statement row.

Context: {statement_context}
Row: {row_text}

Extract:
{{
    "date": "YYYY-MM-DD",
    "description": "Transaction description",
    "amount": 0.00,
    "is_expense": true/false,  // true = debit, false = credit
    "reference": "Reference/check number",
    "category": "Suggested category",
    "merchant": "Merchant/payee name",
    "confidence": 0.9
}}

Return ONLY valid JSON.
"""

        try:
            response = self.llm_provider.generate(prompt, temperature=0.1)
            data = self._parse_json_response(response)
            return data
        except Exception as e:
            logger.error(f"Error extracting from statement: {e}")
            return {"error": str(e)}

    def extract_from_ocr_text(self, ocr_text: str, document_type: str = "receipt") -> Dict[str, Any]:
        """
        Extract transaction from OCR text (receipt, invoice) using AI.

        Args:
            ocr_text: Text extracted from image via OCR
            document_type: Type of document (receipt, invoice, bill)

        Returns:
            Transaction data with items
        """
        prompt = f"""
You are a financial document extraction AI. Extract transaction from this {document_type}.

OCR Text:
{ocr_text}

Extract all items and transaction details:
{{
    "merchant": "Store/business name",
    "date": "YYYY-MM-DD",
    "total_amount": 0.00,
    "currency": "USD/INR",
    "items": [
        {{
            "name": "Item name",
            "quantity": 1.0,
            "unit_price": 0.00,
            "amount": 0.00,
            "category": "Suggested category"
        }}
    ],
    "subtotal": 0.00,
    "tax": 0.00,
    "discount": 0.00,
    "payment_method": "cash/card/upi",
    "metadata": {{
        "invoice_number": "...",
        "store_location": "..."
    }},
    "confidence": 0.9
}}

IMPORTANT:
- Extract ALL line items from the receipt/invoice
- Suggest category for each item
- Calculate totals if not clear
- Return ONLY valid JSON
"""

        try:
            response = self.llm_provider.generate(prompt, temperature=0.1)
            data = self._parse_json_response(response)
            return data
        except Exception as e:
            logger.error(f"Error extracting from OCR: {e}")
            return {"error": str(e)}

    def suggest_category(self, description: str, merchant: str = "") -> Dict[str, Any]:
        """
        Suggest category for a transaction using AI.

        Args:
            description: Transaction description
            merchant: Merchant name (optional)

        Returns:
            {
                "category": "Food & Dining",
                "subcategory": "Restaurants",
                "confidence": 0.95
            }
        """
        prompt = f"""
Suggest a transaction category for:
Description: {description}
Merchant: {merchant}

Return JSON:
{{
    "category": "Main category",
    "subcategory": "Subcategory (if applicable)",
    "confidence": 0.95
}}

Common categories:
- Food & Dining (Restaurants, Groceries, Takeout)
- Shopping (Clothing, Electronics, Home, Personal Care)
- Transport (Fuel, Public Transit, Ride Share, Parking)
- Bills & Utilities (Electricity, Water, Internet, Phone)
- Entertainment (Movies, Streaming, Events, Games)
- Health & Fitness (Medical, Pharmacy, Gym, Sports)
- Travel (Hotels, Flights, Vacation)
- Education (Books, Courses, School Fees)
- Income (Salary, Freelance, Interest)
- Transfer (Between Accounts)
- Investment (Stocks, Mutual Funds)
- Loan (EMI, Interest)

Return ONLY valid JSON.
"""

        try:
            response = self.llm_provider.generate(prompt, temperature=0.1)
            data = self._parse_json_response(response)
            return data
        except Exception as e:
            logger.error(f"Error suggesting category: {e}")
            return {"category": "Uncategorized", "confidence": 0.5}

    def check_duplicate(self, txn1: Dict, txn2: Dict) -> Dict[str, Any]:
        """
        Use AI to determine if two transactions are duplicates.

        Args:
            txn1: First transaction dict
            txn2: Second transaction dict

        Returns:
            {
                "is_duplicate": bool,
                "confidence": float,
                "reason": str
            }
        """
        prompt = f"""
Are these two transactions duplicates?

Transaction 1:
Date: {txn1.get('date')}
Amount: {txn1.get('amount')}
Description: {txn1.get('description')}
Merchant: {txn1.get('merchant')}
Source: {txn1.get('source')}

Transaction 2:
Date: {txn2.get('date')}
Amount: {txn2.get('amount')}
Description: {txn2.get('description')}
Merchant: {txn2.get('merchant')}
Source: {txn2.get('source')}

Analyze and return:
{{
    "is_duplicate": true/false,
    "confidence": 0.95,
    "reason": "Explanation"
}}

Consider:
- Same date (±2 days acceptable)
- Same amount (±1% acceptable)
- Same merchant (fuzzy match)
- Different sources (email + statement) often indicate same transaction

Return ONLY valid JSON.
"""

        try:
            response = self.llm_provider.generate(prompt, temperature=0.1)
            data = self._parse_json_response(response)
            return data
        except Exception as e:
            logger.error(f"Error checking duplicate: {e}")
            return {"is_duplicate": False, "confidence": 0.5, "reason": str(e)}

    def _parse_json_response(self, response: str) -> Dict[str, Any]:
        """Parse JSON from LLM response, handling various formats."""
        try:
            # Try direct JSON parse
            return json.loads(response)
        except json.JSONDecodeError:
            # Try extracting JSON from markdown code blocks
            if "```json" in response:
                start = response.find("```json") + 7
                end = response.find("```", start)
                json_str = response[start:end].strip()
                return json.loads(json_str)
            elif "```" in response:
                start = response.find("```") + 3
                end = response.find("```", start)
                json_str = response[start:end].strip()
                return json.loads(json_str)
            else:
                # Try finding JSON object
                start = response.find("{")
                end = response.rfind("}") + 1
                if start >= 0 and end > start:
                    json_str = response[start:end]
                    return json.loads(json_str)

            raise ValueError(f"Could not parse JSON from response: {response[:100]}...")


# Singleton instance
_extractor = None


def get_extractor() -> AITransactionExtractor:
    """Get singleton instance of AI transaction extractor."""
    global _extractor
    if _extractor is None:
        _extractor = AITransactionExtractor()
    return _extractor

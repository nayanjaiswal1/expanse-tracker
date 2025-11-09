"""
Unified Document Parser Service.
Auto-detects document type (bank statement, invoice, receipt) and routes to appropriate parser.
Implements multi-stage parsing with fallback strategies.
"""

import fitz  # PyMuPDF
import io
import re
from typing import Dict, Any, Optional, List, Tuple
from PIL import Image
from .ai_bank_statement_parsers import parse_bank_statement
from .ai_invoice_parser import InvoiceParser
from django.conf import settings


class UnifiedParserService:
    """
    Intelligent document parser with auto-detection and multi-stage parsing.

    Parsing Strategy:
    1. Extract text from document (PDF or image)
    2. Auto-detect document type (statement, invoice, receipt, unknown)
    3. Route to specialized parser based on type
    4. Apply LLM-based extraction if specialized parser fails
    5. Return structured data with confidence scores
    """

    def __init__(self):
        """Initialize the unified parser with all sub-parsers."""
        self.invoice_parser = InvoiceParser(
            ollama_url=getattr(settings, 'OLLAMA_API_URL', 'http://localhost:11434/api/generate'),
            ollama_model=getattr(settings, 'OLLAMA_MODEL', 'llama3')
        )

    def parse_document(self, file_bytes: bytes, file_name: str,
                      password: Optional[str] = None,
                      force_type: Optional[str] = None) -> Dict[str, Any]:
        """
        Main entry point for document parsing with auto-detection.

        Args:
            file_bytes: Document file bytes
            file_name: Original filename
            password: Optional password for encrypted PDFs
            force_type: Force specific document type ('statement', 'invoice', 'receipt')

        Returns:
            Structured document data with metadata and transactions
        """
        try:
            # Extract text from document
            text, num_pages = self._extract_text(file_bytes, file_name, password)

            if not text.strip():
                return {
                    "file_name": file_name,
                    "error": "No text found in document",
                    "document_type": "unknown",
                    "num_pages": num_pages
                }

            # Auto-detect document type (or use forced type)
            doc_type, confidence = self._detect_document_type(text) if not force_type else (force_type, 1.0)

            # Route to appropriate parser
            if doc_type == "statement":
                parsed_data = self._parse_statement(text, file_name)
            elif doc_type == "invoice":
                parsed_data = self._parse_invoice(file_bytes, file_name, text)
            elif doc_type == "receipt":
                parsed_data = self._parse_receipt(file_bytes, file_name, text)
            else:
                # Unknown type - try generic extraction
                parsed_data = self._parse_generic(file_bytes, file_name, text)

            # Add metadata
            parsed_data["file_name"] = file_name
            parsed_data["num_pages"] = num_pages
            parsed_data["document_type"] = doc_type
            parsed_data["detection_confidence"] = confidence
            parsed_data["parsing_status"] = "success" if parsed_data.get("transactions") else "partial"

            # Calculate data quality score
            parsed_data["quality_score"] = self._calculate_quality_score(parsed_data)

            return parsed_data

        except ValueError as e:
            # Password errors or validation errors
            error_msg = str(e)
            return {
                "file_name": file_name,
                "error": error_msg,
                "password_required": "password" in error_msg.lower(),
                "document_type": "unknown"
            }
        except Exception as e:
            return {
                "file_name": file_name,
                "error": f"Parsing failed: {str(e)}",
                "document_type": "unknown"
            }

    def _extract_text(self, file_bytes: bytes, file_name: str,
                     password: Optional[str] = None) -> Tuple[str, int]:
        """
        Extract text from PDF or image file.

        Returns:
            Tuple of (extracted_text, num_pages)
        """
        file_type = file_name.split('.')[-1].lower()

        if file_type == 'pdf':
            doc = fitz.open(stream=file_bytes, filetype="pdf")

            # Handle encrypted PDFs
            if doc.is_encrypted:
                if password:
                    auth_result = doc.authenticate(password)
                    if not auth_result:
                        raise ValueError("Incorrect password for encrypted PDF.")
                else:
                    raise ValueError("PDF is password-protected. Please provide the password.")

            # Extract text from all pages
            text_parts = []
            for page_num in range(doc.page_count):
                page = doc.load_page(page_num)
                text_parts.append(page.get_text())

            return "\n".join(text_parts), doc.page_count

        elif file_type in ['png', 'jpg', 'jpeg', 'bmp', 'tiff', 'tif']:
            # Use invoice parser's OCR for images
            text = self.invoice_parser.extract_text_from_image(file_bytes)
            return text, 1

        else:
            raise ValueError(f"Unsupported file type: {file_type}")

    def _detect_document_type(self, text: str) -> Tuple[str, float]:
        """
        Auto-detect document type from text content.

        Returns:
            Tuple of (document_type, confidence_score)
        """
        text_lower = text.lower()

        # Statement indicators
        statement_indicators = [
            (r"account\s+statement", 3),
            (r"bank\s+statement", 3),
            (r"credit\s+card\s+statement", 3),
            (r"statement\s+period", 2),
            (r"opening\s+balance", 2),
            (r"closing\s+balance", 2),
            (r"transaction\s+history", 2),
            (r"statement\s+for\s+account", 3),
        ]

        # Invoice indicators
        invoice_indicators = [
            (r"invoice", 2),
            (r"bill\s+(?:no|number)", 2),
            (r"invoice\s+(?:no|number)", 3),
            (r"tax\s+invoice", 3),
            (r"proforma\s+invoice", 3),
            (r"commercial\s+invoice", 3),
            (r"gstin|gst\s+number", 2),
            (r"place\s+of\s+supply", 2),
        ]

        # Receipt indicators
        receipt_indicators = [
            (r"receipt", 2),
            (r"cash\s+receipt", 3),
            (r"payment\s+receipt", 3),
            (r"official\s+receipt", 3),
            (r"receipt\s+(?:no|number)", 2),
        ]

        # Calculate scores
        statement_score = self._calculate_indicator_score(text_lower, statement_indicators)
        invoice_score = self._calculate_indicator_score(text_lower, invoice_indicators)
        receipt_score = self._calculate_indicator_score(text_lower, receipt_indicators)

        # Bank-specific keywords boost statement score
        bank_keywords = ["icici", "hdfc", "sbi", "axis", "paytm", "kotak", "maharashtra", "ifsc"]
        for keyword in bank_keywords:
            if keyword in text_lower:
                statement_score += 2

        # Determine type based on highest score
        scores = {
            "statement": statement_score,
            "invoice": invoice_score,
            "receipt": receipt_score
        }

        max_score = max(scores.values())
        if max_score == 0:
            return "unknown", 0.0

        doc_type = max(scores, key=scores.get)
        confidence = min(max_score / 10.0, 1.0)  # Normalize to 0-1

        return doc_type, confidence

    def _calculate_indicator_score(self, text: str, indicators: List[Tuple[str, int]]) -> int:
        """Calculate weighted score based on pattern matches."""
        score = 0
        for pattern, weight in indicators:
            if re.search(pattern, text, re.IGNORECASE):
                score += weight
        return score

    def _parse_statement(self, text: str, file_name: str) -> Dict[str, Any]:
        """
        Parse bank statement using specialized parsers.

        Args:
            text: Extracted text
            file_name: Original filename

        Returns:
            Parsed statement data
        """
        try:
            result = parse_bank_statement(text)

            # Handle unrecognized bank format
            if result.get("error") == "Bank format not recognized":
                # Try generic transaction extraction
                result = self._extract_generic_transactions(text)
                result["metadata"]["bank"] = "Unknown"
                result["metadata"]["account_type"] = "unknown"
                result["parsing_method"] = "generic_extraction"

            result["parsing_method"] = result.get("parsing_method", "bank_specific")
            return result

        except Exception as e:
            return {
                "metadata": {"bank": "Unknown", "parsing_error": str(e)},
                "transactions": [],
                "error": str(e)
            }

    def _parse_invoice(self, file_bytes: bytes, file_name: str, text: str) -> Dict[str, Any]:
        """
        Parse invoice using LLM-based parser.

        Args:
            file_bytes: File bytes for image processing
            file_name: Original filename
            text: Pre-extracted text (optional, parser will re-extract if needed)

        Returns:
            Parsed invoice data
        """
        try:
            # Determine if we should use LLM
            use_llm = getattr(settings, 'USE_LLM_FOR_PARSING', True)

            result = self.invoice_parser.parse_invoice(
                file_bytes=file_bytes,
                file_name=file_name,
                use_llm=use_llm
            )

            return result

        except Exception as e:
            return {
                "metadata": {"parsing_error": str(e)},
                "transactions": [],
                "error": str(e)
            }

    def _parse_receipt(self, file_bytes: bytes, file_name: str, text: str) -> Dict[str, Any]:
        """
        Parse receipt (similar to invoice but simpler structure).

        Args:
            file_bytes: File bytes
            file_name: Original filename
            text: Extracted text

        Returns:
            Parsed receipt data
        """
        # Receipts are similar to invoices, use invoice parser
        result = self._parse_invoice(file_bytes, file_name, text)
        result["document_type"] = "receipt"
        return result

    def _parse_generic(self, file_bytes: bytes, file_name: str, text: str) -> Dict[str, Any]:
        """
        Generic parser for unknown document types.
        Attempts basic transaction extraction.

        Returns:
            Best-effort parsed data
        """
        result = {
            "metadata": {"document_type": "unknown"},
            "transactions": [],
            "raw_text": text[:1000]  # First 1000 chars
        }

        # Try generic transaction extraction
        transactions = self._extract_generic_transactions(text)
        result["transactions"] = transactions.get("transactions", [])

        return result

    def _extract_generic_transactions(self, text: str) -> Dict[str, Any]:
        """
        Generic transaction extraction using common patterns.

        Returns:
            Extracted transactions (best effort)
        """
        transactions = []
        lines = text.split('\n')

        # Look for lines with date + amount patterns
        date_amount_pattern = re.compile(
            r'(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\s+(.*?)\s+([0-9,]+\.?\d*)',
            re.IGNORECASE
        )

        for idx, line in enumerate(lines):
            match = date_amount_pattern.search(line)
            if match:
                date_str, description, amount = match.groups()

                # Clean amount
                amount = amount.replace(',', '')

                # Determine type (look for CR or debit/credit indicators)
                tx_type = "debit"
                if re.search(r'\bCR\b|\bcredit\b', line, re.IGNORECASE):
                    tx_type = "credit"

                transactions.append({
                    "id": f"generic-{idx}",
                    "date": self._standardize_date(date_str),
                    "description": description.strip(),
                    "amount": amount,
                    "type": tx_type,
                    "selected": True
                })

        return {
            "metadata": {},
            "transactions": transactions
        }

    def _standardize_date(self, date_str: str) -> str:
        """Standardize date format to YYYY-MM-DD."""
        from datetime import datetime

        formats = [
            '%d-%m-%Y', '%d/%m/%Y', '%d.%m.%Y',
            '%d-%m-%y', '%d/%m/%y',
            '%Y-%m-%d', '%Y/%m/%d',
        ]

        for fmt in formats:
            try:
                return datetime.strptime(date_str.strip(), fmt).strftime('%Y-%m-%d')
            except (ValueError, TypeError):
                continue

        return date_str

    def _calculate_quality_score(self, parsed_data: Dict[str, Any]) -> float:
        """
        Calculate quality score for parsed data (0.0 to 1.0).

        Factors:
        - Number of transactions found
        - Completeness of metadata
        - Presence of amounts and dates
        - Detection confidence
        """
        score = 0.0

        # Transaction count (max 0.3)
        transactions = parsed_data.get("transactions", [])
        if transactions:
            score += min(len(transactions) / 10.0, 0.3)

        # Metadata completeness (max 0.3)
        metadata = parsed_data.get("metadata", {})
        important_fields = ["bank", "account_number", "account_holder", "statement_period",
                           "invoice_number", "merchant_details"]
        filled_fields = sum(1 for field in important_fields if metadata.get(field))
        score += (filled_fields / len(important_fields)) * 0.3

        # Transaction data quality (max 0.3)
        if transactions:
            complete_transactions = sum(
                1 for t in transactions
                if t.get("date") and t.get("amount") and t.get("description")
            )
            score += (complete_transactions / len(transactions)) * 0.3

        # Detection confidence (max 0.1)
        confidence = parsed_data.get("detection_confidence", 0.0)
        score += confidence * 0.1

        return round(score, 2)

    def get_supported_banks(self) -> List[str]:
        """Return list of supported banks for statement parsing."""
        return ["HDFC Bank", "ICICI Bank", "State Bank of India", "Bank of Maharashtra", "Paytm"]

    def validate_parsed_data(self, parsed_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate and enrich parsed data.

        Returns:
            Validation results and suggestions
        """
        validation = {
            "is_valid": True,
            "warnings": [],
            "suggestions": []
        }

        transactions = parsed_data.get("transactions", [])

        # Check for transactions
        if not transactions:
            validation["warnings"].append("No transactions found in document")
            validation["suggestions"].append("Try uploading a clearer image or PDF")

        # Check for duplicate transactions
        seen_transactions = set()
        for tx in transactions:
            key = (tx.get("date"), tx.get("amount"), tx.get("description"))
            if key in seen_transactions:
                validation["warnings"].append(f"Possible duplicate transaction: {tx.get('description')}")
            seen_transactions.add(key)

        # Check data completeness
        incomplete_count = sum(
            1 for tx in transactions
            if not tx.get("date") or not tx.get("amount")
        )
        if incomplete_count > 0:
            validation["warnings"].append(f"{incomplete_count} transactions have missing data")
            validation["suggestions"].append("Review and fill in missing dates or amounts")

        # Quality score check
        quality = parsed_data.get("quality_score", 0.0)
        if quality < 0.5:
            validation["warnings"].append(f"Low parsing quality (score: {quality})")
            validation["suggestions"].append("Consider manual review of extracted data")

        return validation

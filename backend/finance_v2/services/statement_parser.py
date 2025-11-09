"""
Statement parser service for parsing bank statements (CSV, PDF, Excel).

Uses AI to intelligently detect format and extract transactions.
No hardcoded templates - adapts to different bank formats.
"""

import csv
import io
import logging
from typing import Dict, List, Any, Optional
from decimal import Decimal
from datetime import datetime
import re

from django.utils import timezone

logger = logging.getLogger(__name__)


class StatementParser:
    """Parse bank statements in various formats using AI."""

    def __init__(self):
        self._check_dependencies()

    def _check_dependencies(self):
        """Check optional dependencies for Excel parsing."""
        try:
            import openpyxl
            self.openpyxl = openpyxl
        except ImportError:
            logger.warning("openpyxl not installed. Excel parsing will not work.")
            self.openpyxl = None

        try:
            import pandas
            self.pandas = pandas
        except ImportError:
            logger.warning("pandas not installed. Advanced parsing will be limited.")
            self.pandas = None

    def parse_file(
        self,
        file_path: str,
        file_format: Optional[str] = None,
        account_info: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Parse statement file and extract transactions.

        Args:
            file_path: Path to statement file
            file_format: File format (csv, pdf, xlsx, xls) - auto-detected if None
            account_info: Optional account metadata for context

        Returns:
            {
                "success": bool,
                "transactions": List[Dict],
                "metadata": Dict,
                "format_detected": str,
                "error": str (if failed)
            }
        """
        # Detect format if not provided
        if not file_format:
            file_format = self._detect_format(file_path)

        try:
            if file_format == 'csv':
                return self._parse_csv(file_path, account_info)
            elif file_format == 'pdf':
                return self._parse_pdf(file_path, account_info)
            elif file_format in ['xlsx', 'xls']:
                return self._parse_excel(file_path, account_info)
            else:
                return {
                    "success": False,
                    "error": f"Unsupported format: {file_format}"
                }
        except Exception as e:
            logger.error(f"Statement parsing failed: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    def parse_bytes(
        self,
        file_bytes: bytes,
        file_format: str,
        account_info: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Parse statement from bytes (useful for uploaded files).

        Args:
            file_bytes: File content as bytes
            file_format: File format (csv, pdf, xlsx)
            account_info: Optional account metadata

        Returns:
            Same as parse_file
        """
        import tempfile
        import os

        # Save to temp file
        suffix = f".{file_format}"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as temp_file:
            temp_file.write(file_bytes)
            temp_path = temp_file.name

        try:
            result = self.parse_file(temp_path, file_format, account_info)
            return result
        finally:
            # Clean up
            try:
                os.unlink(temp_path)
            except Exception:
                pass

    def _detect_format(self, file_path: str) -> str:
        """Detect file format from extension."""
        ext = file_path.lower().split('.')[-1]
        return ext

    def _parse_csv(
        self,
        file_path: str,
        account_info: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Parse CSV statement using AI to detect columns.

        Strategy:
        1. Read first few rows to detect structure
        2. Use AI to map columns to fields
        3. Parse all rows
        """
        try:
            with open(file_path, 'r', encoding='utf-8-sig') as f:
                # Read first 10 rows for analysis
                sample_lines = [next(f) for _ in range(min(10, sum(1 for _ in f) + 1))]
                f.seek(0)

                # Detect delimiter
                delimiter = self._detect_csv_delimiter(sample_lines)

                # Parse CSV
                reader = csv.DictReader(f, delimiter=delimiter)
                rows = list(reader)

            if not rows:
                return {
                    "success": False,
                    "error": "Empty CSV file"
                }

            # Detect column mapping using AI
            column_mapping = self._detect_column_mapping(
                headers=list(rows[0].keys()),
                sample_rows=rows[:5],
                account_info=account_info
            )

            # Parse transactions
            transactions = []
            for idx, row in enumerate(rows):
                txn = self._parse_csv_row(row, column_mapping, idx + 1)
                if txn:
                    transactions.append(txn)

            return {
                "success": True,
                "transactions": transactions,
                "metadata": {
                    "format": "csv",
                    "row_count": len(rows),
                    "transaction_count": len(transactions),
                    "column_mapping": column_mapping,
                    "delimiter": delimiter
                },
                "format_detected": "csv"
            }

        except Exception as e:
            logger.error(f"CSV parsing failed: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    def _detect_csv_delimiter(self, sample_lines: List[str]) -> str:
        """Detect CSV delimiter (comma, semicolon, tab, pipe)."""
        delimiters = [',', ';', '\t', '|']

        # Count occurrences of each delimiter
        counts = {}
        for delim in delimiters:
            count = sum(line.count(delim) for line in sample_lines[:3])
            counts[delim] = count

        # Return most common (non-zero)
        detected = max(counts, key=counts.get)
        return detected if counts[detected] > 0 else ','

    def _detect_column_mapping(
        self,
        headers: List[str],
        sample_rows: List[Dict],
        account_info: Optional[Dict] = None
    ) -> Dict[str, str]:
        """
        Use AI to map CSV columns to transaction fields.

        Args:
            headers: CSV column headers
            sample_rows: First few rows as examples
            account_info: Account context

        Returns:
            {
                "date": "Transaction Date",
                "description": "Description",
                "amount": "Amount",
                "type": "Dr/Cr",
                ...
            }
        """
        from .ai_service import LLMProvider

        llm = LLMProvider()

        # Build sample data for AI
        sample_str = "\n".join([
            f"Row {i+1}: {row}"
            for i, row in enumerate(sample_rows)
        ])

        prompt = f"""Analyze this bank statement CSV and map columns to transaction fields.

Headers: {headers}

Sample rows:
{sample_str}

Account info: {account_info or 'Unknown'}

Map the columns to these standard fields:
- date: Transaction date
- description: Transaction description/narration
- amount: Transaction amount (single column)
- debit: Debit amount (if separate columns for debit/credit)
- credit: Credit amount (if separate columns)
- balance: Running balance (optional)
- reference: Reference/check number (optional)
- type: Transaction type indicator (Dr/Cr, Debit/Credit, etc.)

Return ONLY valid JSON in this format:
{{
    "date": "Date column name",
    "description": "Narration column name",
    "amount": "Amount column name or null",
    "debit": "Debit column name or null",
    "credit": "Credit column name or null",
    "balance": "Balance column name or null",
    "reference": "Reference column name or null",
    "type": "Type column name or null"
}}

IMPORTANT:
- Use exact column names from headers
- If amount is split into debit/credit, set both
- If single amount column, set amount only
- Use null for fields not present
- Return ONLY the JSON, no extra text
"""

        try:
            response = llm.generate(prompt, temperature=0.1)

            # Parse JSON response
            import json
            if isinstance(response, str):
                # Try to extract JSON
                if '{' in response:
                    start = response.find('{')
                    end = response.rfind('}') + 1
                    json_str = response[start:end]
                    mapping = json.loads(json_str)
                else:
                    mapping = json.loads(response)
            else:
                mapping = response

            # Filter out null values
            mapping = {k: v for k, v in mapping.items() if v}

            logger.info(f"Detected column mapping: {mapping}")
            return mapping

        except Exception as e:
            logger.error(f"AI column mapping failed: {e}, using fallback")
            return self._fallback_column_mapping(headers)

    def _fallback_column_mapping(self, headers: List[str]) -> Dict[str, str]:
        """
        Fallback heuristic column mapping if AI fails.

        Looks for common column name patterns.
        """
        mapping = {}

        for header in headers:
            h_lower = header.lower().strip()

            # Date detection
            if 'date' in h_lower or 'txn date' in h_lower or 'value date' in h_lower:
                mapping['date'] = header

            # Description detection
            elif any(kw in h_lower for kw in ['description', 'narration', 'particulars', 'details', 'transaction']):
                mapping['description'] = header

            # Amount detection (single column)
            elif h_lower in ['amount', 'amt', 'transaction amount']:
                mapping['amount'] = header

            # Debit
            elif any(kw in h_lower for kw in ['debit', 'dr', 'withdrawal', 'paid']):
                mapping['debit'] = header

            # Credit
            elif any(kw in h_lower for kw in ['credit', 'cr', 'deposit', 'received']):
                mapping['credit'] = header

            # Balance
            elif 'balance' in h_lower or 'closing' in h_lower:
                mapping['balance'] = header

            # Reference
            elif any(kw in h_lower for kw in ['ref', 'reference', 'cheque', 'check', 'transaction id']):
                mapping['reference'] = header

            # Type
            elif h_lower in ['type', 'dr/cr', 'debit/credit']:
                mapping['type'] = header

        return mapping

    def _parse_csv_row(
        self,
        row: Dict[str, str],
        column_mapping: Dict[str, str],
        row_number: int
    ) -> Optional[Dict[str, Any]]:
        """Parse single CSV row into transaction dict."""
        try:
            # Extract fields based on mapping
            date_str = row.get(column_mapping.get('date', ''), '').strip()
            description = row.get(column_mapping.get('description', ''), '').strip()

            # Handle amount (either single or debit/credit)
            if 'amount' in column_mapping:
                amount_str = row.get(column_mapping['amount'], '').strip()
                amount = self._parse_amount(amount_str)
                is_expense = amount < 0  # Negative = expense

            elif 'debit' in column_mapping and 'credit' in column_mapping:
                debit_str = row.get(column_mapping['debit'], '').strip()
                credit_str = row.get(column_mapping['credit'], '').strip()

                debit = self._parse_amount(debit_str) if debit_str else Decimal('0')
                credit = self._parse_amount(credit_str) if credit_str else Decimal('0')

                if debit > 0:
                    amount = -debit  # Debit is expense (negative)
                    is_expense = True
                elif credit > 0:
                    amount = credit  # Credit is income (positive)
                    is_expense = False
                else:
                    return None  # Skip empty rows
            else:
                return None  # Can't determine amount

            # Skip zero amounts
            if amount == 0:
                return None

            # Parse date
            date = self._parse_date(date_str)
            if not date:
                logger.warning(f"Could not parse date '{date_str}' in row {row_number}")
                return None

            # Reference (optional)
            reference = row.get(column_mapping.get('reference', ''), '').strip()

            # Balance (optional)
            balance_str = row.get(column_mapping.get('balance', ''), '').strip()
            balance = self._parse_amount(balance_str) if balance_str else None

            return {
                'row_number': row_number,
                'date': date.isoformat(),
                'description': description,
                'amount': abs(float(amount)),  # Always positive
                'is_expense': is_expense,
                'reference': reference or None,
                'balance': float(balance) if balance else None,
                'raw_row': row  # Keep original for debugging
            }

        except Exception as e:
            logger.warning(f"Failed to parse row {row_number}: {e}")
            return None

    def _parse_amount(self, amount_str: str) -> Decimal:
        """Parse amount string to Decimal."""
        if not amount_str:
            return Decimal('0')

        # Remove currency symbols and commas
        cleaned = re.sub(r'[₹$€£,\s]', '', amount_str)

        # Handle parentheses (negative)
        if '(' in cleaned or ')' in cleaned:
            cleaned = '-' + cleaned.replace('(', '').replace(')', '')

        # Handle Dr/Cr suffix
        if cleaned.endswith('Dr') or cleaned.endswith('dr'):
            cleaned = '-' + cleaned[:-2]
        elif cleaned.endswith('Cr') or cleaned.endswith('cr'):
            cleaned = cleaned[:-2]

        try:
            return Decimal(cleaned)
        except Exception as e:
            logger.warning(f"Could not parse amount '{amount_str}': {e}")
            return Decimal('0')

    def _parse_date(self, date_str: str) -> Optional[datetime.date]:
        """Parse date string to date object."""
        if not date_str:
            return None

        # Common date formats
        formats = [
            '%Y-%m-%d',
            '%d-%m-%Y',
            '%m/%d/%Y',
            '%d/%m/%Y',
            '%d-%b-%Y',  # 15-Jan-2024
            '%d %b %Y',  # 15 Jan 2024
            '%d/%b/%Y',  # 15/Jan/2024
            '%Y/%m/%d',
            '%b %d, %Y',  # Jan 15, 2024
        ]

        for fmt in formats:
            try:
                return datetime.strptime(date_str.strip(), fmt).date()
            except ValueError:
                continue

        logger.warning(f"Could not parse date: {date_str}")
        return None

    def _parse_pdf(
        self,
        file_path: str,
        account_info: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Parse PDF statement.

        Strategy:
        1. Extract text from PDF
        2. Detect if it's tabular or text-based
        3. Use AI to extract transactions
        """
        # Extract text using OCR service
        from .ocr_service import get_ocr_service

        ocr = get_ocr_service()
        ocr_result = ocr.extract_text_from_file(file_path)

        if ocr_result.get('error'):
            return {
                "success": False,
                "error": f"PDF text extraction failed: {ocr_result['error']}"
            }

        text = ocr_result['text']

        # Use AI to extract transactions from text
        transactions = self._extract_transactions_from_text(text, account_info)

        return {
            "success": True,
            "transactions": transactions,
            "metadata": {
                "format": "pdf",
                "page_count": ocr_result.get('page_count', 0),
                "transaction_count": len(transactions),
                "confidence": ocr_result.get('confidence', 0.0)
            },
            "format_detected": "pdf"
        }

    def _parse_excel(
        self,
        file_path: str,
        account_info: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Parse Excel statement (similar to CSV)."""
        if not self.pandas:
            return {
                "success": False,
                "error": "pandas not installed for Excel parsing"
            }

        try:
            # Read Excel file
            df = self.pandas.read_excel(file_path)

            # Convert to list of dicts
            rows = df.to_dict('records')

            # Get headers
            headers = list(df.columns)

            # Detect column mapping
            column_mapping = self._detect_column_mapping(
                headers=headers,
                sample_rows=rows[:5],
                account_info=account_info
            )

            # Parse transactions
            transactions = []
            for idx, row in enumerate(rows):
                # Convert row to string dict
                row_str = {str(k): str(v) for k, v in row.items()}
                txn = self._parse_csv_row(row_str, column_mapping, idx + 1)
                if txn:
                    transactions.append(txn)

            return {
                "success": True,
                "transactions": transactions,
                "metadata": {
                    "format": "xlsx",
                    "row_count": len(rows),
                    "transaction_count": len(transactions),
                    "column_mapping": column_mapping
                },
                "format_detected": "xlsx"
            }

        except Exception as e:
            logger.error(f"Excel parsing failed: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    def _extract_transactions_from_text(
        self,
        text: str,
        account_info: Optional[Dict] = None
    ) -> List[Dict]:
        """
        Extract transactions from unstructured text using AI.

        Used for PDF statements that don't have clear tabular structure.
        """
        from .ai_service import LLMProvider
        import json

        llm = LLMProvider()

        prompt = f"""Extract all transactions from this bank statement text.

Account info: {account_info or 'Unknown'}

Statement text:
{text}

Extract each transaction and return as JSON array:
[
  {{
    "date": "YYYY-MM-DD",
    "description": "Transaction description",
    "amount": 0.00,
    "is_expense": true/false,
    "reference": "Reference number (if any)",
    "balance": 0.00 (if mentioned)
  }}
]

IMPORTANT:
- Extract ALL transactions
- Parse dates to YYYY-MM-DD format
- is_expense = true for debits/withdrawals, false for credits/deposits
- amount should always be positive
- Skip header/footer text, only extract actual transactions
- Return ONLY the JSON array, no extra text
"""

        try:
            response = llm.generate(prompt, temperature=0.1)

            # Parse JSON response
            if isinstance(response, str):
                # Extract JSON array
                if '[' in response:
                    start = response.find('[')
                    end = response.rfind(']') + 1
                    json_str = response[start:end]
                    transactions = json.loads(json_str)
                else:
                    transactions = json.loads(response)
            else:
                transactions = response

            # Add row numbers
            for idx, txn in enumerate(transactions):
                txn['row_number'] = idx + 1

            return transactions

        except Exception as e:
            logger.error(f"AI transaction extraction from text failed: {e}")
            return []


# Singleton instance
_parser = None


def get_parser() -> StatementParser:
    """Get singleton instance of statement parser."""
    global _parser
    if _parser is None:
        _parser = StatementParser()
    return _parser

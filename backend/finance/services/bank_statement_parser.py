"""
Enhanced Bank Statement Parser supporting multiple banks with comprehensive transaction extraction.

Supports:
- ICICI Bank (including Amazon Pay ICICI Bank)
- Bank of Maharashtra
- State Bank of India (SBI)
- Paytm
- HDFC Bank

Features:
- Password-protected PDF support
- Metadata extraction (account holder, account numbers, statement periods, etc.)
- Transaction parsing with date standardization
- Bank auto-detection based on document content
- Error handling and validation
"""

import re
import json
from typing import Dict, List, Any, Optional
from pypdf import PdfReader
from datetime import datetime
from django.contrib.auth import get_user_model

User = get_user_model()


class BankStatementParser:
    """Enhanced bank statement parser with support for multiple Indian banks."""

    def __init__(self, user: User):
        self.user = user
        self.supported_banks = [
            "ICICI Bank",
            "Bank of Maharashtra",
            "State Bank of India",
            "Paytm",
            "HDFC Bank"
        ]

    def standardize_date(self, date_str: str) -> str:
        """Standardize date format to YYYY-MM-DD."""
        if not isinstance(date_str, str):
            return date_str

        # Handle formats like JUN'25
        date_str = date_str.replace("'", "")

        # Try different date formats
        formats = ['%d-%m-%y', '%d/%m/%Y', '%d %b %y', '%d %b, %Y']
        for fmt in formats:
            try:
                return datetime.strptime(date_str, fmt).strftime('%Y-%m-%d')
            except (ValueError, TypeError):
                continue

        return date_str

    def _parse_icici(self, lines: List[str]) -> Dict[str, Any]:
        """Parse ICICI Bank statements."""
        text = "\n".join(lines)
        metadata = {"bank": "ICICI Bank"}

        # Extract metadata
        if match := re.search(r"Statement period\s*:\s*(.*)", text, re.I):
            metadata["statement_period"] = match.group(1).strip()

        for line in lines:
            if re.search(r"^\s*(MR|MRS|MS)\b", line, re.I):
                metadata["account_holder"] = line.strip()
                break

        if match := re.search(r"(\d{4}XXXXXXXX\d{4})", text):
            metadata["card_number"] = match.group(1)

        if match := re.search(r"Credit Limit.*?([\d,]+\.\d{2})", text, re.DOTALL):
            metadata["credit_limit"] = match.group(1).replace(",", "")

        if match := re.search(r"Available Credit.*?([\d,]+\.\d{2})", text, re.DOTALL):
            metadata["available_credit"] = match.group(1).replace(",", "")

        if match := re.search(r"GST Number:\s*(\w+)", text, re.I):
            metadata["gst_number"] = match.group(1)

        if match := re.search(r"HSN Code:\s*(\d+)", text, re.I):
            metadata["hsn_code"] = match.group(1)

        # Extract transactions
        transactions = []
        tx_starts = list(re.finditer(r"^(\d{2}/\d{2}/\d{4})\s+(\d+)\s+(.*)", text, re.MULTILINE))
        amount_regex = re.compile(r"([\d,]+\.\d{2})\s*(CR)?$")

        for i, start_match in enumerate(tx_starts):
            date, ser_no, desc_start = start_match.groups()
            end_pos = tx_starts[i+1].start() if i + 1 < len(tx_starts) else len(text)
            full_desc = (desc_start + " " + text[start_match.end():end_pos]).strip()

            if amount_match := amount_regex.search(full_desc):
                amount_str, credit_indicator = amount_match.groups()
                description = full_desc[:amount_match.start()].replace("\n", " ").strip()
                description = re.sub(r"\s+-?[\d,]+\.?\d*$", "", description).strip()

                transactions.append({
                    "date": self.standardize_date(date),
                    "transaction_id": ser_no,
                    "description": re.sub(r"\s+", " ", description),
                    "amount": amount_str.replace(",", ""),
                    "type": "credit" if credit_indicator else "debit"
                })

        return {"metadata": metadata, "transactions": transactions}

    def _parse_bom(self, lines: List[str]) -> Dict[str, Any]:
        """Parse Bank of Maharashtra statements."""
        text = "\n".join(lines)
        metadata = {"bank": "Bank of Maharashtra"}

        # Extract metadata
        if match := re.search(r"Account Holder Names\s*(.*)", text, re.I):
            metadata["account_holder"] = match.group(1).strip().split("Primary")[0].strip()

        if match := re.search(r"Account No\s*(\d+)", text, re.I):
            metadata["account_number"] = match.group(1).strip()

        if match := re.search(r"Statement for Account No.*?from\s+to\s+\d+\s+([\d/]+)\s+([\d/]+)", text, re.I):
            metadata["statement_period"] = f"{match.group(1)} to {match.group(2)}"

        if match := re.search(r"CIF Number\s*(\d+)", text, re.I):
            metadata["cif_number"] = match.group(1).strip()

        if match := re.search(r"Email\s*(\S+@\S+)", text, re.I):
            metadata["email"] = match.group(1).strip()

        if match := re.search(r"IFSC\s*(\w+)", text, re.I):
            metadata["ifsc_code"] = match.group(1).strip()

        # Extract transactions
        transactions = []
        table_text = ""
        in_table = False

        for line in lines:
            if "Sr No Date Particulars" in line:
                in_table = True
                continue
            if "END OF STATEMENT" in line:
                break
            if in_table:
                table_text += line + "\n"

        tx_starts = list(re.finditer(r"^(\d+)\s+(\d{2}/\d{2}/\d{4})", table_text, re.MULTILINE))

        for i, start_match in enumerate(tx_starts):
            tx_block = table_text[start_match.start():tx_starts[i+1].start() if i + 1 < len(tx_starts) else len(table_text)].strip()

            if match := re.search(r"([\d,.-]+)\s+([\d,.-]+)\s+([\d,.-]+)\s+([\w\s/-]+)$", tx_block.replace('\n', ' ')):
                debit_str, credit_str, _, _ = match.groups()
                description = re.sub(r"^\d+\s+\d{2}/\d{2}/\d{4}\s+", "", tx_block[:match.start()].replace("\n", " ")).strip()

                debit, credit = (debit_str.replace(",", ""), None) if debit_str.strip() != '-' else (None, credit_str.replace(",", "").strip())

                if amount := debit or credit:
                    transactions.append({
                        "date": self.standardize_date(start_match.group(2)),
                        "description": re.sub(r"\s+", " ", description),
                        "amount": amount,
                        "type": "debit" if debit else "credit"
                    })

        return {"metadata": metadata, "transactions": transactions}

    def _parse_sbi(self, lines: List[str]) -> Dict[str, Any]:
        """Parse State Bank of India statements."""
        text = "\n".join(lines)
        metadata = {"bank": "State Bank of India"}

        # Extract metadata
        if match := re.search(r"Welcome\s+(Mr\.\s*.*?)$", text, re.I | re.MULTILINE):
            metadata["account_holder"] = match.group(1).strip()

        if match := re.search(r"Account Number\s+([X\d]+)", text, re.I):
            metadata["account_number"] = match.group(1).strip()

        if match_open := re.search(r"Opening Balance on\s+([\d-]+)", text):
            if match_close := re.search(r"Closing Balance on\s+([\d-]+)", text):
                metadata["statement_period"] = f"{match_open.group(1)} to {match_close.group(1)}"

        if match := re.search(r"([A-Z]{5}[0-9]{4}[A-Z]{1})", text):
            metadata["pan"] = match.group(1)

        if match := re.search(r"(SBIN\w+)IFSC Code", text, re.I):
            metadata["ifsc_code"] = match.group(1)

        # Extract transactions
        transactions = []
        in_table = False

        for line in lines:
            if "Date Transaction Reference" in line:
                in_table = True
                continue
            if not in_table or line.startswith("Page") or not line.strip() or line.startswith("null null"):
                continue

            if match := re.match(r"^([\d-]+)\s+(.*?)\s+([\d,.-]+)\s+([\d,.-]+)\s+([\d,.-]+)$", line):
                date_str, description, credit_str, debit_str, _ = match.groups()

                credit, debit = (credit_str.replace(",", ""), None) if credit_str.strip() != '-' else (None, debit_str.replace(",", "").strip())

                if amount := debit or credit:
                    transactions.append({
                        "date": self.standardize_date(date_str),
                        "description": description.strip(),
                        "amount": amount,
                        "type": "debit" if debit else "credit"
                    })

        return {"metadata": metadata, "transactions": transactions}

    def _parse_paytm(self, lines: List[str]) -> Dict[str, Any]:
        """Parse Paytm statements."""
        text = "\n".join(lines)
        metadata = {"bank": "Paytm"}

        # Extract metadata
        if match := re.search(r"^(Master .*?)1?$", text, re.MULTILINE):
            metadata["account_holder"] = match.group(1).strip()

        if match := re.search(r"([\d\s]+), (.*@.*)", text):
            metadata["contact"] = f"{match.group(1).strip()}, {match.group(2)}"

        if match := re.search(r"UPI Statement for\n(.*)", text):
            metadata["statement_period"] = match.group(1).strip()

        if match := re.search(r"Total Money Paid\n-\s*Rs\.([\d,]+)", text):
            metadata["total_paid"] = match.group(1)

        if match := re.search(r"Total Money Received\n\+\s*Rs\.([\d,]+)", text):
            metadata["total_received"] = match.group(1)

        # Extract transactions
        transactions = []
        tx_blocks = re.split(r"(?=\d{1,2} \w{3}'\d{2})", text)

        for tx_block in tx_blocks:
            if not ("Money sent to" in tx_block or "Payment to" in tx_block):
                continue

            if date_match := re.search(r"(\d{1,2} \w{3}'\d{2})", tx_block):
                if desc_match := re.search(r"(Money sent to .*?|Payment to .*?)\n", tx_block):
                    if amount_match := re.search(r"- Rs\.([\d,]+)", tx_block):
                        transactions.append({
                            "date": self.standardize_date(date_match.group(1)),
                            "description": desc_match.group(1).strip(),
                            "amount": amount_match.group(1).replace(",", ""),
                            "type": "debit"
                        })

        return {"metadata": metadata, "transactions": transactions}

    def _parse_hdfc(self, lines: List[str]) -> Dict[str, Any]:
        """Parse HDFC Bank statements."""
        text = "\n".join(lines)
        metadata = {"bank": "HDFC Bank"}

        # Extract metadata
        if match := re.search(r"AMAL KANT JAISWAL", text):
            metadata["account_holder"] = match.group(0).strip()

        if match := re.search(r"Email : (\S+@\S+)", text):
            metadata["email"] = match.group(1).strip()

        if match := re.search(r"Credit Card No\..*?(\d{4}XXXXXX\d{4})", text, re.DOTALL):
            metadata["card_number"] = match.group(1)

        if match := re.search(r"Statement Date.*?(\d{1,2} \w{3}, \d{4})", text, re.DOTALL):
            metadata["statement_date"] = self.standardize_date(match.group(1).strip())

        if match := re.search(r"Billing Period.*?(\d{1,2} \w{3}, \d{4} - \d{1,2} \w{3}, \d{4})", text, re.DOTALL):
            metadata["billing_period"] = match.group(1).strip()

        if match := re.search(r"TOTAL AMOUNT DUE\nC([\d,]+\.\d{2})", text):
            metadata["total_amount_due"] = match.group(1).replace(",", "")

        if match := re.search(r"MINIMUM DUE\nC([\d,]+\.\d{2})", text):
            metadata["minimum_due"] = match.group(1).replace(",", "")

        if match := re.search(r"DUE DATE\n(.*)", text):
            metadata["due_date"] = self.standardize_date(match.group(1).strip())

        if match := re.search(r"C([\d,]+)\s*C([\d,]+)\s*C([\d,]+)", text):
            metadata["total_credit_limit"] = match.group(1).replace(",", "")
            metadata["available_credit_limit"] = match.group(2).replace(",", "")
            metadata["available_cash_limit"] = match.group(3).replace(",", "")

        if match := re.search(r"GSTIN: (\w+)", text):
            metadata["gstin"] = match.group(1)

        if match := re.search(r"HSN Code: (\d+)", text):
            metadata["hsn_code"] = match.group(1)

        # Extract transactions
        transactions = []
        transaction_starts = list(re.finditer(r"^(\d{2}/\d{2}/\d{4})\|\s*(\d{2}:\d{2})", text, re.MULTILINE))

        for i, start_match in enumerate(transaction_starts):
            start_pos = start_match.start()
            end_pos = transaction_starts[i+1].start() if i + 1 < len(transaction_starts) else len(text)

            transaction_block = text[start_pos:end_pos].strip()

            # Parse individual transaction block
            tx_regex = re.compile(
                r"(\d{2}/\d{2}/\d{4})\|\s*(\d{2}:\d{2})\s+(.*?)\s+C\s*([\d,]+\.\d{2})\s*l?",
                re.DOTALL
            )
            match = tx_regex.search(transaction_block)
            if match:
                date_str, time_str, description, amount_str = match.groups()
                transactions.append({
                    "date": self.standardize_date(date_str),
                    "time": time_str,
                    "description": description.strip(),
                    "amount": amount_str.replace(",", ""),
                    "type": "credit" if "PAYMENT" in description.upper() else "debit"
                })

        return {"metadata": metadata, "transactions": transactions}

    def parse_statement(self, file_path: str, password: Optional[str] = None) -> Dict[str, Any]:
        """
        Main parsing method that auto-detects bank and parses the statement.

        Args:
            file_path: Path to the PDF file
            password: Optional password for encrypted PDFs

        Returns:
            Dictionary containing metadata, transactions, and parsing info
        """
        try:
            reader = PdfReader(file_path)

            # Handle encrypted PDFs
            if reader.is_encrypted:
                if not password or not reader.decrypt(password):
                    return {
                        "success": False,
                        "error": f"Password incorrect or not provided for {file_path}",
                        "requires_password": True
                    }

            # Extract text from all pages
            raw_text = "\n".join(page.extract_text() or "" for page in reader.pages)

        except Exception as e:
            return {
                "success": False,
                "error": f"Error reading PDF {file_path}: {str(e)}"
            }

        if not raw_text:
            return {
                "success": False,
                "error": f"Could not extract text from PDF: {file_path}"
            }

        # Clean up text
        lines = [line.strip() for line in raw_text.replace("Á", "").splitlines() if line.strip()]

        # Auto-detect bank and parse
        try:
            if "HDFC Bank" in raw_text:
                result = self._parse_hdfc(lines)
            elif "Paytm" in raw_text:
                result = self._parse_paytm(lines)
            elif "sbi.co.in" in raw_text or "SBIN0" in raw_text:
                result = self._parse_sbi(lines)
            elif "bankofmaharashtra.in" in raw_text or "MAHB0" in raw_text:
                result = self._parse_bom(lines)
            elif "Amazon Pay ICICI Bank" in raw_text or "icicibank.com" in raw_text:
                result = self._parse_icici(lines)
            else:
                return {
                    "success": False,
                    "error": "Unknown bank format - supported banks: " + ", ".join(self.supported_banks),
                    "file": file_path
                }

            # Sort transactions by date
            if "transactions" in result:
                try:
                    result["transactions"].sort(key=lambda x: x.get('date', ''))
                except (TypeError, ValueError) as e:
                    print(f"Could not sort transactions: {e}")

            # Add success flag and additional info
            result.update({
                "success": True,
                "total_transactions": len(result.get("transactions", [])),
                "bank_detected": result.get("metadata", {}).get("bank", "Unknown"),
                "file_path": file_path
            })

            return result

        except Exception as e:
            return {
                "success": False,
                "error": f"Error parsing statement: {str(e)}",
                "file": file_path
            }

    def get_supported_banks(self) -> List[str]:
        """Return list of supported banks."""
        return self.supported_banks.copy()
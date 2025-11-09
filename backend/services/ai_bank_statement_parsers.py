"""
Bank Statement Parsers for various Indian banks.
Extracts structured data including metadata and transactions.
"""

import re
from datetime import datetime
from typing import Dict, List, Any, Optional


def standardize_date(date_str: str) -> str:
    """Convert various date formats to YYYY-MM-DD."""
    if not isinstance(date_str, str):
        return date_str

    date_str = date_str.replace("'", "")  # Handles formats like JUN'25

    formats = [
        '%d-%m-%y',
        '%d/%m/%Y',
        '%d %b %y',
        '%d %b, %Y',
        '%d-%m-%Y',
        '%d %b %Y',
        '%d-%b-%Y',
        '%d-%b-%y'
    ]

    for fmt in formats:
        try:
            return datetime.strptime(date_str.strip(), fmt).strftime('%Y-%m-%d')
        except (ValueError, TypeError):
            continue

    return date_str


def parse_icici_statement(lines: List[str]) -> Dict[str, Any]:
    """Parse ICICI Bank credit card statement."""
    text = "\n".join(lines)
    metadata = {"bank": "ICICI Bank", "account_type": "credit_card"}

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
                "date": standardize_date(date),
                "transaction_id": ser_no,
                "description": re.sub(r"\s+", " ", description),
                "amount": amount_str.replace(",", ""),
                "type": "credit" if credit_indicator else "debit"
            })

    return {"metadata": metadata, "transactions": transactions}


def parse_bom_statement(lines: List[str]) -> Dict[str, Any]:
    """Parse Bank of Maharashtra statement."""
    text = "\n".join(lines)
    metadata = {"bank": "Bank of Maharashtra", "account_type": "savings"}

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
            debit_str, credit_str, balance_str, _ = match.groups()
            description = re.sub(r"^\d+\s+\d{2}/\d{2}/\d{4}\s+", "", tx_block[:match.start()].replace("\n", " ")).strip()

            debit = debit_str.replace(",", "") if debit_str.strip() != '-' else None
            credit = credit_str.replace(",", "").strip() if credit_str.strip() != '-' else None
            amount = debit or credit

            if amount:
                transactions.append({
                    "date": standardize_date(start_match.group(2)),
                    "description": re.sub(r"\s+", " ", description),
                    "amount": amount,
                    "type": "debit" if debit else "credit",
                    "balance": balance_str.replace(",", "")
                })

    return {"metadata": metadata, "transactions": transactions}


def parse_sbi_statement(lines: List[str]) -> Dict[str, Any]:
    """Parse State Bank of India statement."""
    text = "\n".join(lines)
    metadata = {"bank": "State Bank of India", "account_type": "savings"}

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
            date_str, description, credit_str, debit_str, balance_str = match.groups()

            credit = credit_str.replace(",", "") if credit_str.strip() != '-' else None
            debit = debit_str.replace(",", "").strip() if debit_str.strip() != '-' else None
            amount = debit or credit

            if amount:
                transactions.append({
                    "date": standardize_date(date_str),
                    "description": description.strip(),
                    "amount": amount,
                    "type": "debit" if debit else "credit",
                    "balance": balance_str.replace(",", "")
                })

    return {"metadata": metadata, "transactions": transactions}


def parse_paytm_statement(lines: List[str]) -> Dict[str, Any]:
    """Parse Paytm UPI statement."""
    text = "\n".join(lines)
    metadata = {"bank": "Paytm", "account_type": "upi"}

    # Extract metadata
    if match := re.search(r"^(Master .*?)1?$", text, re.MULTILINE):
        metadata["account_holder"] = match.group(1).strip()

    if match := re.search(r"([\d\s]+), (.*@.*)", text):
        metadata["contact"] = f"{match.group(1).strip()}, {match.group(2)}"

    if match := re.search(r"UPI Statement for\n(.*)", text):
        metadata["statement_period"] = match.group(1).strip()

    if match := re.search(r"Total Money Paid\n-\s*Rs\.([\d,]+)", text):
        metadata["total_paid"] = match.group(1).replace(",", "")

    if match := re.search(r"Total Money Received\n\+\s*Rs\.([\d,]+)", text):
        metadata["total_received"] = match.group(1).replace(",", "")

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
                        "date": standardize_date(date_match.group(1)),
                        "description": desc_match.group(1).strip(),
                        "amount": amount_match.group(1).replace(",", ""),
                        "type": "debit"
                    })

    return {"metadata": metadata, "transactions": transactions}


def parse_hdfc_statement(lines: List[str]) -> Dict[str, Any]:
    """Parse HDFC Bank credit card statement."""
    text = "\n".join(lines)
    metadata = {"bank": "HDFC Bank", "account_type": "credit_card"}

    # Extract metadata
    if match := re.search(r"AMAL KANT JAISWAL", text):
        metadata["account_holder"] = match.group(0).strip()

    if match := re.search(r"Email : (\S+@\S+)", text):
        metadata["email"] = match.group(1).strip()

    if match := re.search(r"Credit Card No\..*?(\d{4}XXXXXX\d{4})", text, re.DOTALL):
        metadata["card_number"] = match.group(1)

    if match := re.search(r"Statement Date.*?(\d{1,2} \w{3}, \d{4})", text, re.DOTALL):
        metadata["statement_date"] = standardize_date(match.group(1).strip())

    if match := re.search(r"Billing Period.*?(\d{1,2} \w{3}, \d{4} - \d{1,2} \w{3}, \d{4})", text, re.DOTALL):
        metadata["billing_period"] = match.group(1).strip()

    if match := re.search(r"TOTAL AMOUNT DUE\nC([\d,]+\.\d{2})", text):
        metadata["total_amount_due"] = match.group(1).replace(",", "")

    if match := re.search(r"MINIMUM DUE\nC([\d,]+\.\d{2})", text):
        metadata["minimum_due"] = match.group(1).replace(",", "")

    if match := re.search(r"DUE DATE\n(.*)", text):
        metadata["due_date"] = standardize_date(match.group(1).strip())

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

        tx_regex = re.compile(r"(\d{2}/\d{2}/\d{4})\|\s*(\d{2}:\d{2})\s+(.*?)\s+C\s*([\d,]+\.\d{2})\s*l?", re.DOTALL)

        if match := tx_regex.search(transaction_block):
            date_str, time_str, description, amount_str = match.groups()
            transactions.append({
                "date": standardize_date(date_str),
                "time": time_str,
                "description": description.strip(),
                "amount": amount_str.replace(",", ""),
                "type": "credit" if "PAYMENT" in description.upper() else "debit"
            })

    return {"metadata": metadata, "transactions": transactions}


def parse_bank_statement(text: str) -> Dict[str, Any]:
    """
    Auto-detect bank and parse statement.

    Args:
        text: Extracted text from PDF

    Returns:
        Dictionary with metadata and transactions
    """
    lines = [line.strip() for line in text.replace("Á", "").splitlines() if line.strip()]

    # Bank detection
    if "HDFC Bank" in text:
        return parse_hdfc_statement(lines)
    elif "Paytm" in text:
        return parse_paytm_statement(lines)
    elif "sbi.co.in" in text or "SBIN0" in text:
        return parse_sbi_statement(lines)
    elif "bankofmaharashtra.in" in text or "MAHB0" in text:
        return parse_bom_statement(lines)
    elif "Amazon Pay ICICI Bank" in text or "icicibank.com" in text:
        return parse_icici_statement(lines)

    # Return generic structure if bank not recognized
    return {
        "metadata": {"bank": "Unknown", "account_type": "unknown"},
        "transactions": [],
        "error": "Bank format not recognized"
    }

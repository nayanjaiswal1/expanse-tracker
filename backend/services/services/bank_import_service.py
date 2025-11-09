"""
Bank import service for processing bank statements and transaction files.
"""

import csv
import io
from decimal import Decimal
from datetime import datetime
from typing import List, Dict, Optional
from finance.models import Transaction, Account, Category
from finance.services import TransactionService


class BankImportService:
    """Service for importing bank transactions from various file formats"""

    def __init__(self, user):
        self.user = user
        self.transaction_service = TransactionService(user=user)

    def import_csv(self, file_content: bytes, account_id: int, mapping: Dict) -> Dict:
        """Import transactions from CSV file"""
        try:
            # Decode file content
            content = file_content.decode("utf-8")
            csv_file = io.StringIO(content)
            reader = csv.DictReader(csv_file)

            account = Account.objects.get(id=account_id, user=self.user)
            imported_transactions = []
            errors = []

            for row_num, row in enumerate(
                reader, start=2
            ):  # Start from 2 (header is row 1)
                try:
                    transaction_data = self._map_csv_row(row, mapping, account)

                    # Check for duplicates
                    if not self._is_duplicate_transaction(transaction_data, account):
                        transaction_obj = self.transaction_service.create_transaction(
                            transaction_data
                        )
                        imported_transactions.append(transaction_obj)
                    else:
                        errors.append(f"Row {row_num}: Duplicate transaction skipped")

                except Exception as e:
                    errors.append(f"Row {row_num}: {str(e)}")

            return {
                "success": True,
                "imported_count": len(imported_transactions),
                "errors": errors,
                "transactions": [t.id for t in imported_transactions],
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "imported_count": 0,
                "errors": [],
            }

    def import_ofx(self, file_content: bytes, account_id: int) -> Dict:
        """Import transactions from OFX/QFX file"""
        # OFX parsing would require additional library like ofxparse
        # For now, return a placeholder implementation
        return {
            "success": False,
            "error": "OFX import not yet implemented",
            "imported_count": 0,
            "errors": ["OFX format support coming soon"],
        }

    def import_qif(self, file_content: bytes, account_id: int) -> Dict:
        """Import transactions from QIF file"""
        try:
            content = file_content.decode("utf-8")
            lines = content.strip().split("\n")

            account = Account.objects.get(id=account_id, user=self.user)
            imported_transactions = []
            errors = []

            current_transaction = {}
            transaction_count = 0

            for line_num, line in enumerate(lines, start=1):
                line = line.strip()

                if not line:
                    continue

                if line.startswith("D"):  # Date
                    current_transaction["date"] = self._parse_qif_date(line[1:])
                elif line.startswith("T"):  # Amount
                    current_transaction["amount"] = abs(Decimal(line[1:]))
                    current_transaction["transaction_type"] = (
                        "expense" if Decimal(line[1:]) < 0 else "income"
                    )
                elif line.startswith("P"):  # Payee/Description
                    current_transaction["description"] = line[1:]
                elif line.startswith("M"):  # Memo
                    current_transaction["notes"] = line[1:]
                elif line.startswith("L"):  # Category
                    category_name = line[1:]
                    category = self._get_or_create_category(category_name)
                    current_transaction["category"] = category
                elif line == "^":  # End of transaction
                    try:
                        if current_transaction:
                            current_transaction["account"] = account
                            current_transaction["user"] = self.user

                            # Check for duplicates
                            if not self._is_duplicate_transaction(
                                current_transaction, account
                            ):
                                transaction_obj = (
                                    self.transaction_service.create_transaction(
                                        current_transaction
                                    )
                                )
                                imported_transactions.append(transaction_obj)
                                transaction_count += 1

                            current_transaction = {}

                    except Exception as e:
                        errors.append(f"Transaction {transaction_count + 1}: {str(e)}")

            return {
                "success": True,
                "imported_count": len(imported_transactions),
                "errors": errors,
                "transactions": [t.id for t in imported_transactions],
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "imported_count": 0,
                "errors": [],
            }

    def get_csv_preview(self, file_content: bytes, max_rows: int = 5) -> Dict:
        """Preview CSV file structure for mapping configuration"""
        try:
            content = file_content.decode("utf-8")
            csv_file = io.StringIO(content)
            reader = csv.DictReader(csv_file)

            headers = reader.fieldnames
            sample_rows = []

            for i, row in enumerate(reader):
                if i >= max_rows:
                    break
                sample_rows.append(row)

            return {
                "success": True,
                "headers": headers,
                "sample_rows": sample_rows,
                "suggested_mapping": self._suggest_csv_mapping(headers),
            }

        except Exception as e:
            return {"success": False, "error": str(e), "headers": [], "sample_rows": []}

    def _map_csv_row(self, row: Dict, mapping: Dict, account: Account) -> Dict:
        """Map CSV row to transaction data"""
        transaction_data = {"account": account, "user": self.user}

        # Map required fields
        if "date" in mapping and mapping["date"] in row:
            transaction_data["date"] = self._parse_date(row[mapping["date"]])

        if "amount" in mapping and mapping["amount"] in row:
            amount = Decimal(str(row[mapping["amount"]]).replace(",", ""))
            transaction_data["amount"] = abs(amount)

            # Determine transaction type
            if "transaction_type" in mapping and mapping["transaction_type"] in row:
                transaction_data["transaction_type"] = row[
                    mapping["transaction_type"]
                ].lower()
            else:
                transaction_data["transaction_type"] = (
                    "expense" if amount < 0 else "income"
                )

        if "description" in mapping and mapping["description"] in row:
            transaction_data["description"] = row[mapping["description"]]

        # Optional fields
        if (
            "category" in mapping
            and mapping["category"] in row
            and row[mapping["category"]]
        ):
            category_name = row[mapping["category"]]
            category = self._get_or_create_category(category_name)
            transaction_data["category"] = category

        if "notes" in mapping and mapping["notes"] in row:
            transaction_data["notes"] = row[mapping["notes"]]

        return transaction_data

    def _parse_date(self, date_string: str) -> datetime.date:
        """Parse date string in various formats"""
        date_formats = [
            "%Y-%m-%d",
            "%m/%d/%Y",
            "%d/%m/%Y",
            "%m-%d-%Y",
            "%d-%m-%Y",
            "%Y/%m/%d",
        ]

        for date_format in date_formats:
            try:
                return datetime.strptime(date_string, date_format).date()
            except ValueError:
                continue

        raise ValueError(f"Unable to parse date: {date_string}")

    def _parse_qif_date(self, date_string: str) -> datetime.date:
        """Parse QIF date format"""
        # QIF dates are typically in MM/DD/YYYY or MM/DD/YY format
        try:
            if len(date_string.split("/")[2]) == 2:
                return datetime.strptime(date_string, "%m/%d/%y").date()
            else:
                return datetime.strptime(date_string, "%m/%d/%Y").date()
        except ValueError:
            return datetime.strptime(date_string, "%m/%d/%Y").date()

    def _suggest_csv_mapping(self, headers: List[str]) -> Dict:
        """Suggest field mapping based on header names"""
        mapping = {}

        # Common mappings
        header_mappings = {
            "date": ["date", "transaction_date", "posting_date", "effective_date"],
            "amount": ["amount", "transaction_amount", "value", "debit", "credit"],
            "description": ["description", "payee", "merchant", "reference", "details"],
            "category": ["category", "transaction_category", "type"],
            "notes": ["notes", "memo", "comment"],
        }

        for field, possible_headers in header_mappings.items():
            for header in headers:
                if header.lower() in [h.lower() for h in possible_headers]:
                    mapping[field] = header
                    break

        return mapping

    def _get_or_create_category(self, category_name: str) -> Optional[Category]:
        """Get existing category or create new one"""
        try:
            category, created = Category.objects.get_or_create(
                user=self.user,
                name=category_name,
                defaults={"category_type": "expense", "color": "#6B7280"},
            )
            return category
        except Exception:
            return None

    def _is_duplicate_transaction(
        self, transaction_data: Dict, account: Account
    ) -> bool:
        """Check if transaction already exists"""
        existing = Transaction.objects.filter(
            user=self.user,
            account=account,
            amount=transaction_data["amount"],
            date=transaction_data["date"],
            description=transaction_data.get("description", ""),
            status="active",
        ).exists()

        return existing

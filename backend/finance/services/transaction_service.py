"""
Transaction Management Service - Core business logic for transaction operations
"""

from datetime import date
from decimal import Decimal
from typing import Dict, List, Optional, Tuple

from django.core.exceptions import ValidationError
from django.db import transaction as db_transaction
from django.db.models import Count, Sum
from django.utils import timezone

from ..models.accounts import Account
from ..models.transaction_details import TransactionDetail
from ..models.transaction_groups import TransactionGroup
from ..models.transactions import Category, Transaction
from .base import BaseService


class TransactionService(BaseService):
    """
    Service for managing all transaction operations with business logic.
    """

    def get_queryset(self):
        return Transaction.objects.all()

    @db_transaction.atomic
    def create_simple_transaction(
        self,
        account: Account,
        amount: Decimal,
        description: str,
        is_credit: bool = False,
        transaction_date: date = None,
        category_id: Optional[int] = None,
        merchant_name: Optional[str] = None,
        source: str = "manual",
        **metadata_fields
    ) -> Transaction:
        """
        Create a simple transaction (expense, income, etc.)
        
        Args:
            account: Account instance
            amount: Transaction amount
            description: Transaction description
            is_credit: True for income/credit, False for expense/debit
            transaction_date: Date of transaction (defaults to today)
            category_id: Category ID
            merchant_name: Name of merchant (will create/get TransactionGroup)
            source: Source of transaction (manual, gmail, sms, etc.)
            **metadata_fields: Additional metadata fields
            
        Returns:
            Transaction instance
        """
        if not transaction_date:
            transaction_date = timezone.now().date()

        # Create or get transaction group for merchant
        transaction_group = None
        if merchant_name:
            transaction_group, created = TransactionGroup.get_or_create_from_name(
                user=self.user,
                name=merchant_name,
                group_type='merchant'
            )

        # Build metadata
        metadata = {
            'transaction_subtype': 'income' if is_credit else 'expense',
            'source': source,
            **metadata_fields
        }
        
        resolved_category_id = None
        if category_id not in (None, ''):
            if isinstance(category_id, str):
                category_id = category_id.strip()
                resolved_category_id = int(category_id) if category_id else None
            elif isinstance(category_id, int):
                resolved_category_id = category_id
            else:
                try:
                    resolved_category_id = int(category_id)
                except (TypeError, ValueError):
                    resolved_category_id = None

        if isinstance(resolved_category_id, int) and resolved_category_id <= 0:
            resolved_category_id = None

        # Create transaction
        transaction = Transaction.objects.create(
            user=self.user,
            account=account,
            amount=amount,
            description=description,
            date=transaction_date,
            is_credit=is_credit,
            transaction_group=transaction_group,
            category_id=resolved_category_id,
            metadata=metadata
        )

        return transaction

    @db_transaction.atomic
    def create_transfer(
        self,
        from_account: Account,
        to_account: Account,
        amount: Decimal,
        description: str = "Account Transfer",
        transfer_date: date = None,
        transfer_fee: Decimal = None,
        source: str = "manual"
    ) -> Tuple[Transaction, Transaction]:
        """
        Create a transfer between two accounts (creates 2 transactions)
        
        Args:
            from_account: Source account
            to_account: Destination account
            amount: Transfer amount
            description: Transfer description
            transfer_date: Date of transfer
            transfer_fee: Optional transfer fee
            source: Source of transaction
            
        Returns:
            Tuple of (debit_transaction, credit_transaction)
        """
        if from_account == to_account:
            raise ValidationError("Cannot transfer to the same account")

        if not transfer_date:
            transfer_date = timezone.now().date()

        # Create debit transaction (money leaving from_account)
        debit_metadata = {
            'transaction_subtype': 'transfer',
            'transfer_account_id': to_account.id,
            'source': source
        }
        if transfer_fee:
            debit_metadata['transfer_fee'] = str(transfer_fee)

        debit_transaction = Transaction.objects.create(
            user=self.user,
            account=from_account,
            amount=amount,
            description=f"{description} (to {to_account.name})",
            date=transfer_date,
            is_credit=False,  # Money going out
            metadata=debit_metadata
        )

        # Create credit transaction (money entering to_account)
        credit_metadata = {
            'transaction_subtype': 'transfer',
            'transfer_account_id': from_account.id,
            'source': source
        }

        credit_transaction = Transaction.objects.create(
            user=self.user,
            account=to_account,
            amount=amount,
            description=f"{description} (from {from_account.name})",
            date=transfer_date,
            is_credit=True,  # Money coming in
            metadata=credit_metadata
        )

        return debit_transaction, credit_transaction

    @db_transaction.atomic
    def create_multi_item_transaction(
        self,
        account: Account,
        description: str,
        items: List[Dict],
        transaction_date: date = None,
        merchant_name: Optional[str] = None,
        source: str = "manual"
    ) -> Tuple[Transaction, List[TransactionDetail]]:
        """
        Create a transaction with multiple line items (e.g., grocery receipt)
        
        Args:
            account: Account instance
            description: Main transaction description
            items: List of item dictionaries with keys: name, amount, category_id, quantity, unit_price
            transaction_date: Date of transaction
            merchant_name: Merchant name
            source: Source of transaction
            
        Returns:
            Tuple of (transaction, list_of_details)
        """
        # Calculate total amount
        total_amount = sum(Decimal(str(item['amount'])) for item in items)

        # Create main transaction
        transaction = self.create_simple_transaction(
            account=account,
            amount=total_amount,
            description=description,
            is_credit=False,  # Usually expenses for multi-item
            transaction_date=transaction_date,
            merchant_name=merchant_name,
            source=source
        )

        # Create detail records
        details = []
        for item in items:
            detail = TransactionDetail.create_line_item(
                transaction=transaction,
                name=item['name'],
                amount=Decimal(str(item['amount'])),
                category_id=item.get('category_id'),
                quantity=item.get('quantity'),
                unit_price=item.get('unit_price'),
                metadata=item.get('metadata', {})
            )
            details.append(detail)

        return transaction, details

    def get_transaction_summary(self, start_date: date = None, end_date: date = None) -> Dict:
        """
        Get transaction summary for the user within a date range
        
        Args:
            start_date: Start date (optional)
            end_date: End date (optional)
            
        Returns:
            Dictionary with transaction summary
        """
        queryset = Transaction.active_objects.filter(user=self.user, status="active")

        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)

        # Get totals
        total_credit = Transaction.get_credit_total(self.user, start_date, end_date)
        total_debit = Transaction.get_debit_total(self.user, start_date, end_date)

        # Get counts
        transaction_count = queryset.count()
        credit_count = queryset.filter(is_credit=True).count()
        debit_count = queryset.filter(is_credit=False).count()

        return {
            "total_income": total_credit,
            "total_expenses": total_debit,
            "net_flow": total_credit - total_debit,
            "transaction_count": transaction_count,
            "income_count": credit_count,
            "expense_count": debit_count,
            "avg_income": total_credit / max(credit_count, 1),
            "avg_expense": total_debit / max(debit_count, 1),
        }
    def delete_transaction(self, transaction_id):
        """Delete a transaction and update account balance"""
        with db_transaction.atomic():
            transaction_obj = self.get_user_queryset().get(id=transaction_id)
            account = transaction_obj.account

            transaction_obj.delete()

            # Recalculate account balance
            if account:
                self._recalculate_account_balance(account)

    def get_transactions_by_date_range(self, start_date, end_date, filters=None):
        """Get transactions within a date range with optional filters"""
        queryset = self.get_user_queryset().filter(date__gte=start_date, date__lte=end_date)

        if filters:
            category_id = filters.get("category")
            if category_id:
                queryset = queryset.filter(category_id=category_id)

            if filters.get("account"):
                queryset = queryset.filter(account_id=filters["account"])

            tx_type = filters.get("transaction_type")
            if tx_type:
                tx_type_normalized = str(tx_type).lower()
                if tx_type_normalized in {"income", "credit"}:
                    queryset = queryset.filter(is_credit=True)
                elif tx_type_normalized in {"expense", "debit"}:
                    queryset = queryset.filter(is_credit=False)
                else:
                    queryset = queryset.filter(metadata__transaction_subtype=tx_type)

            if filters.get("min_amount"):
                queryset = queryset.filter(amount__gte=filters["min_amount"])
            if filters.get("max_amount"):
                queryset = queryset.filter(amount__lte=filters["max_amount"])

        return queryset.order_by("-date", "-created_at")

    def get_spending_summary(self, start_date, end_date):
        """Get spending summary for a date range"""
        transactions = self.get_user_queryset().filter(date__gte=start_date, date__lte=end_date)

        income_total = (
            transactions.filter(is_credit=True).aggregate(total=Sum("amount"))["total"]
            or Decimal("0")
        )

        expense_total = (
            transactions.filter(is_credit=False).aggregate(total=Sum("amount"))["total"]
            or Decimal("0")
        )

        expense_breakdown_queryset = (
            transactions.filter(is_credit=False)
            .values("category_id")
            .annotate(total=Sum("amount"), count=Count("id"))
            .order_by("-total")
        )

        category_ids = [
            entry["category_id"]
            for entry in expense_breakdown_queryset
            if entry["category_id"]
        ]
        categories = Category.objects.filter(user=self.user, id__in=category_ids)
        category_name_map = {category.id: category.name for category in categories}

        category_breakdown = []
        for entry in expense_breakdown_queryset:
            category_id = entry["category_id"]
            if not category_id:
                continue
            category_name = category_name_map.get(category_id)
            if not category_name:
                category_name = "Uncategorized"
            category_breakdown.append(
                {
                    "category_id": category_id,
                    "category_name": category_name,
                    "total": entry["total"],
                    "count": entry["count"],
                }
            )

        return {
            "income_total": income_total,
            "expense_total": expense_total,
            "net_income": income_total - expense_total,
            "category_breakdown": category_breakdown,
            "transaction_count": transactions.count(),
        }

    def categorize_transaction(self, transaction_id, category_id):
        """Assign a category to a transaction"""
        transaction_obj = self.get_user_queryset().get(id=transaction_id)
        category = Category.objects.get(id=category_id, user=self.user)

        transaction_obj.category = category
        transaction_obj.verified = True
        transaction_obj.save()

        return transaction_obj

    def bulk_categorize(self, transaction_ids, category_id):
        """Bulk categorize multiple transactions"""
        category = Category.objects.get(id=category_id, user=self.user)

        transactions = list(self.get_user_queryset().filter(id__in=transaction_ids))

        updated_count = 0
        for transaction in transactions:
            transaction.category = category
            transaction.verified = True
            transaction.save()
            updated_count += 1

        return updated_count

    def _update_account_balance(self, account, transaction_obj):
        """Update account balance based on transaction"""
        if transaction_obj.is_credit:
            account.balance += transaction_obj.amount
        else:
            account.balance -= transaction_obj.amount

        account.save()

    def _recalculate_account_balance(self, account):
        """Recalculate account balance from all transactions"""
        transactions = Transaction.objects.filter(account=account, status="active")

        balance = Decimal("0")
        for transaction_obj in transactions:
            if transaction_obj.is_credit:
                balance += transaction_obj.amount
            else:
                balance -= transaction_obj.amount

        account.balance = balance
        account.save()

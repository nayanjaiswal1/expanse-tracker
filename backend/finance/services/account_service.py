"""
Account service for handling account business logic.
"""

from decimal import Decimal
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from finance.services.base import BaseService
from ..models import Account, Transaction
from .transaction_service import TransactionService


class AccountService(BaseService):
    """Service for account operations"""

    def get_queryset(self):
        return Account.objects.all()

    def create_account(self, account_data):
        """Create a new account"""
        return Account.objects.create(user=self.user, **account_data)

    def update_account(self, account_id, update_data):
        """Update an existing account"""
        account = self.get_user_queryset().get(id=account_id)

        for field, value in update_data.items():
            setattr(account, field, value)

        account.save()
        return account

    def transfer_funds(
        self, from_account_id, to_account_id, amount, description="Transfer"
    ):
        """Transfer funds between accounts"""
        with transaction.atomic():
            from_account = self.get_user_queryset().get(id=from_account_id)
            to_account = self.get_user_queryset().get(id=to_account_id)

            if from_account.balance < amount:
                raise ValueError("Insufficient funds in source account")

            transaction_service = TransactionService(user=self.user)
            transfer_out, transfer_in = transaction_service.create_transfer(
                from_account=from_account,
                to_account=to_account,
                amount=amount,
                description=description,
                transfer_date=timezone.now().date(),
                source="account_service",
            )

            # Update account balances
            from_account.balance -= amount
            to_account.balance += amount

            from_account.save()
            to_account.save()

            return {
                "transfer_out": transfer_out,
                "transfer_in": transfer_in,
                "from_account_balance": from_account.balance,
                "to_account_balance": to_account.balance,
            }

    def get_account_summary(self, account_id=None):
        """Get account summary with transaction statistics"""
        if account_id:
            accounts = [self.get_user_queryset().get(id=account_id)]
        else:
            accounts = self.get_user_queryset().filter(is_active=True)

        summary = {"total_balance": Decimal("0"), "accounts": [], "account_types": {}}

        for account in accounts:
            # Calculate transaction statistics
            transactions = account.transactions.filter(status="active")

            account_stats = {
                "id": account.id,
                "name": account.name,
                "account_type": account.account_type,
                "balance": account.balance,
                "currency": account.currency,
                "institution": account.institution,
                "transaction_count": transactions.count(),
                "last_transaction_date": None,
                "monthly_average": Decimal("0"),
            }

            # Get last transaction date
            last_transaction = transactions.order_by("-date").first()
            if last_transaction:
                account_stats["last_transaction_date"] = last_transaction.date

            # Calculate monthly average (last 30 days)
            thirty_days_ago = timezone.now().date() - timezone.timedelta(days=30)
            recent_transactions = transactions.filter(date__gte=thirty_days_ago)

            if recent_transactions.exists():
                total_recent = recent_transactions.aggregate(total=Sum("amount"))[
                    "total"
                ] or Decimal("0")
                account_stats["monthly_average"] = total_recent

            summary["accounts"].append(account_stats)
            summary["total_balance"] += account.balance

            # Group by account type
            account_type = account.account_type
            if account_type not in summary["account_types"]:
                summary["account_types"][account_type] = {
                    "count": 0,
                    "total_balance": Decimal("0"),
                    "accounts": [],
                }

            summary["account_types"][account_type]["count"] += 1
            summary["account_types"][account_type]["total_balance"] += account.balance
            summary["account_types"][account_type]["accounts"].append(account.name)

        return summary

    def reconcile_account(self, account_id, actual_balance):
        """Reconcile account balance with actual balance"""
        account = self.get_user_queryset().get(id=account_id)
        difference = actual_balance - account.balance

        if difference != 0:
            # Create reconciliation transaction
            is_credit = difference > 0
            description = f"Account reconciliation - {account.name}"

            reconciliation_transaction = Transaction.objects.create(
                user=self.user,
                account=account,
                amount=abs(difference),
                description=description,
                date=timezone.now().date(),
                is_credit=is_credit,
                metadata={
                    "transaction_subtype": "account_reconciliation",
                    "source": "account_service",
                },
            )

            # Update account balance
            account.balance = actual_balance
            account.save()

            return {
                "reconciliation_transaction": reconciliation_transaction,
                "difference": difference,
                "new_balance": actual_balance,
            }

        return {"message": "Account already balanced", "difference": Decimal("0")}

    def get_cash_flow(self, account_id, start_date, end_date):
        """Get cash flow analysis for an account"""
        account = self.get_user_queryset().get(id=account_id)

        transactions = account.transactions.filter(
            date__gte=start_date, date__lte=end_date, status="active"
        )

        cash_flow = {
            "account_name": account.name,
            "starting_balance": account.balance,
            "inflows": Decimal("0"),
            "outflows": Decimal("0"),
            "net_flow": Decimal("0"),
            "ending_balance": account.balance,
            "transaction_count": transactions.count(),
            "daily_breakdown": {},
        }

        # Calculate inflows and outflows
        for transaction_obj in transactions:
            if transaction_obj.is_credit:
                cash_flow["inflows"] += transaction_obj.amount
            else:
                cash_flow["outflows"] += transaction_obj.amount

            # Daily breakdown
            date_str = transaction_obj.date.strftime("%Y-%m-%d")
            if date_str not in cash_flow["daily_breakdown"]:
                cash_flow["daily_breakdown"][date_str] = {
                    "inflows": Decimal("0"),
                    "outflows": Decimal("0"),
                    "net": Decimal("0"),
                }

            if transaction_obj.is_credit:
                cash_flow["daily_breakdown"][date_str]["inflows"] += (
                    transaction_obj.amount
                )
            else:
                cash_flow["daily_breakdown"][date_str]["outflows"] += (
                    transaction_obj.amount
                )

            cash_flow["daily_breakdown"][date_str]["net"] = (
                cash_flow["daily_breakdown"][date_str]["inflows"]
                - cash_flow["daily_breakdown"][date_str]["outflows"]
            )

        cash_flow["net_flow"] = cash_flow["inflows"] - cash_flow["outflows"]

        return cash_flow

    def archive_account(self, account_id):
        """Archive an account (mark as inactive)"""
        account = self.get_user_queryset().get(id=account_id)

        if account.balance != 0:
            raise ValueError("Cannot archive account with non-zero balance")

        account.is_active = False
        account.save()

        return account

    def get_accounts_by_type(self, account_type):
        """Get all accounts of a specific type"""
        return self.get_user_queryset().filter(
            account_type=account_type, is_active=True
        )

    def create_contact(self, contact_data):
        """Create a new User"""
        return

    def get_contacts(self):
        """Get all user contacts"""
        return

    def update_contact(self, contact_id, update_data):
        """Update a User"""
        for field, value in update_data.items():
            setattr(User, field, value)

        User.save()
        return User

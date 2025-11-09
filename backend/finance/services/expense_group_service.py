from decimal import Decimal
from django.db import transaction
from finance.models import ExpenseGroup, GroupExpense, GroupExpenseShare, Transaction
from django.contrib.auth import get_user_model

User = get_user_model()


class ExpenseGroupService:
    @staticmethod
    def create_expense_group(name, owner, group_type="multi-person", description=None):
        expense_group = ExpenseGroup.objects.create(
            name=name, owner=owner, group_type=group_type, description=description
        )
        # Add the owner as a member of the group with admin role
        ExpenseGroupService.add_member_to_group(expense_group, owner, role="admin")
        return expense_group

    @staticmethod
    def add_member_to_group(expense_group, user, role="member"):
        membership, created = expense_group.memberships.get_or_create(
            user=user, defaults={"role": role}
        )
        if not created:
            membership.role = role
            membership.save()
        return membership

    @staticmethod
    @transaction.atomic
    def create_group_expense(
        expense_group,
        created_by,
        title,
        total_amount,
        date,
        split_method,
        description=None,
        currency="USD",
        shares_data=None,
    ):
        group_expense = GroupExpense.objects.create(
            group=expense_group,
            created_by=created_by,
            title=title,
            total_amount=total_amount,
            date=date,
            split_method=split_method,
            description=description,
            currency=currency,
        )

        if split_method == "equal":
            ExpenseGroupService._split_equally(
                group_expense, expense_group.memberships.all()
            )
        elif split_method == "percentage":
            if not shares_data:
                raise ValueError("shares_data is required for percentage split")
            ExpenseGroupService._split_by_percentage(group_expense, shares_data)
        elif split_method == "amount":
            if not shares_data:
                raise ValueError("shares_data is required for amount split")
            ExpenseGroupService._split_by_amount(group_expense, shares_data)
        elif split_method == "shares":
            if not shares_data:
                raise ValueError("shares_data is required for shares split")
            ExpenseGroupService._split_by_shares(group_expense, shares_data)
        else:
            raise ValueError(f"Invalid split method: {split_method}")

        return group_expense

    @staticmethod
    def _split_equally(group_expense, memberships):
        num_members = memberships.count()
        if num_members == 0:
            return
        share_amount = (group_expense.total_amount / num_members).quantize(
            Decimal("0.01")
        )
        for membership in memberships:
            GroupExpenseShare.objects.create(
                group_expense=group_expense,
                user=membership.user,
                share_amount=share_amount,
            )
            Transaction.objects.create(
                user=membership.user,
                amount=-share_amount,
                transaction_type="expense",
                description=f"Share of {group_expense.title} in {group_expense.group.name}",
                date=group_expense.date,
                group_expense=group_expense,
                currency=group_expense.currency,
            )

    @staticmethod
    def _split_by_percentage(group_expense, shares_data):
        # shares_data: [{'user_id': user_id, 'percentage': 25}, ...]
        total_percentage = sum(item["percentage"] for item in shares_data)
        if total_percentage != 100:
            raise ValueError("Percentages must sum to 100")

        for item in shares_data:
            user = User.objects.get(id=item["user_id"])
            share_amount = (
                group_expense.total_amount * Decimal(item["percentage"] / 100)
            ).quantize(Decimal("0.01"))
            GroupExpenseShare.objects.create(
                group_expense=group_expense, user=user, share_amount=share_amount
            )
            Transaction.objects.create(
                user=user,
                amount=-share_amount,
                transaction_type="expense",
                description=f"Share of {group_expense.title} in {group_expense.group.name}",
                date=group_expense.date,
                group_expense=group_expense,
                currency=group_expense.currency,
            )

    @staticmethod
    def _split_by_amount(group_expense, shares_data):
        # shares_data: [{'user_id': user_id, 'amount': 10.50}, ...]
        total_shares_amount = sum(Decimal(item["amount"]) for item in shares_data)
        if total_shares_amount != group_expense.total_amount:
            raise ValueError("Amounts must sum to total_amount")

        for item in shares_data:
            user = User.objects.get(id=item["user_id"])
            share_amount = Decimal(item["amount"]).quantize(Decimal("0.01"))
            GroupExpenseShare.objects.create(
                group_expense=group_expense, user=user, share_amount=share_amount
            )
            Transaction.objects.create(
                user=user,
                amount=-share_amount,
                transaction_type="expense",
                description=f"Share of {group_expense.title} in {group_expense.group.name}",
                date=group_expense.date,
                group_expense=group_expense,
                currency=group_expense.currency,
            )

    @staticmethod
    def _split_by_shares(group_expense, shares_data):
        # shares_data: [{'user_id': user_id, 'shares': 1}, ...]
        total_shares = sum(item["shares"] for item in shares_data)
        if total_shares == 0:
            raise ValueError("Total shares cannot be zero")
        amount_per_share = (group_expense.total_amount / total_shares).quantize(
            Decimal("0.01")
        )

        for item in shares_data:
            user = User.objects.get(id=item["user_id"])
            share_amount = (amount_per_share * Decimal(item["shares"])).quantize(
                Decimal("0.01")
            )
            GroupExpenseShare.objects.create(
                group_expense=group_expense, user=user, share_amount=share_amount
            )
            Transaction.objects.create(
                user=user,
                amount=-share_amount,
                transaction_type="expense",
                description=f"Share of {group_expense.title} in {group_expense.group.name}",
                date=group_expense.date,
                group_expense=group_expense,
                currency=group_expense.currency,
            )

    @staticmethod
    @transaction.atomic
    def calculate_balances(expense_group):
        # This is a simplified balance calculation. For a full Splitwise-like system,
        # a more complex algorithm (e.g., minimizing transactions) would be needed.
        balances = {}
        for membership in expense_group.memberships.all():
            balances[membership.user.id] = Decimal("0.00")

        # Calculate who paid what and who owes what
        for expense in expense_group.expenses.all():
            # Who paid for the expense? (Assuming the created_by user paid the full amount initially)
            balances[expense.created_by.id] += expense.total_amount

            # Who owes what?
            for share in expense.shares.all():
                balances[share.user.id] -= share.share_amount

        # Format balances for output
        formatted_balances = []
        for user_id, balance in balances.items():
            user = User.objects.get(id=user_id)
            formatted_balances.append(
                {
                    "user_id": user.id,
                    "username": user.username,
                    "balance": balance.quantize(Decimal("0.01")),
                }
            )
        return formatted_balances

    @staticmethod
    def calculate_overall_balances_for_user(user):
        total_net_balance = Decimal("0.00")
        user_memberships = user.expense_group_memberships.all()

        for membership in user_memberships:
            expense_group = membership.group
            group_balances = ExpenseGroupService.calculate_balances(expense_group)

            for balance_entry in group_balances:
                if balance_entry["user_id"] == user.id:
                    total_net_balance += balance_entry["balance"]
                    break

        return {
            "user_id": user.id,
            "username": user.username,
            "overall_net_balance": total_net_balance.quantize(Decimal("0.01")),
        }
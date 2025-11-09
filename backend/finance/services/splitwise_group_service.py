"""
Splitwise-like Group Expense Service
Full functionality like Splitwise: create groups, add members, split expenses, track balances
"""

from decimal import Decimal
from django.utils import timezone
from django.db import transaction
from django.contrib.auth import get_user_model
from django.db.models import Sum, Q

from ..models import ExpenseGroup, ExpenseGroupMembership, Transaction

User = get_user_model()


class SplitwiseGroupService:
    """Service for Splitwise-like group expense management"""

    @staticmethod
    def create_group(owner, name, description=None, budget_limit=None, budget_warning_threshold=None, budget_per_person_limit=None):
        """Create a new expense group (like Splitwise group)"""
        group_data = {
            'owner': owner,
            'name': name,
            'description': description or '',
            'group_type': 'multi-person',  # Always multi-person for Splitwise-like groups
            'purpose': 'shared_expenses'
        }

        # Add budget fields if provided
        if budget_limit is not None:
            group_data['budget_limit'] = budget_limit
        if budget_warning_threshold is not None:
            group_data['budget_warning_threshold'] = budget_warning_threshold
        if budget_per_person_limit is not None:
            group_data['budget_per_person_limit'] = budget_per_person_limit

        group = ExpenseGroup.objects.create(**group_data)
        return group

    @staticmethod
    def add_member(group, user, added_by):
        """Add a member to the group"""
        if group.owner != added_by:
            # Check if added_by is an admin
            membership = ExpenseGroupMembership.objects.filter(
                group=group, user=added_by, role='admin', is_active=True
            ).first()
            if not membership:
                raise ValueError("Only group owner or admins can add members")

        # Check if user is already a member
        existing = ExpenseGroupMembership.objects.filter(
            group=group, user=user, is_active=True
        ).first()
        if existing:
            raise ValueError("User is already a member of this group")

        # Add member
        membership = ExpenseGroupMembership.objects.create(
            group=group,
            user=user,
            role='member'
        )

        # Record in group history
        group.member_history.append({
            "user_id": user.id,
            "username": user.username,
            "action": "joined",
            "added_by": added_by.username,
            "timestamp": timezone.now().isoformat(),
            "member_count_after": group.memberships.filter(is_active=True).count() + 1  # +1 for owner
        })
        group.save(update_fields=['member_history'])

        return membership

    @staticmethod
    def create_group_expense(
        group,
        created_by,
        title,
        total_amount,
        split_method,
        paid_by_user,
        date=None,
        description=None,
        category=None,
        shares_data=None
    ):
        """
        Create a shared expense in the group (like adding expense in Splitwise)
        split_method: 'equal', 'exact', 'percentage', 'shares'
        shares_data: List of {"user_id": int, "amount": decimal} for exact amounts
                    or {"user_id": int, "percentage": decimal} for percentages
                    or {"user_id": int, "shares": int} for share-based splitting
        """
        with transaction.atomic():
            # Verify created_by is a member or owner
            if created_by != group.owner:
                membership = ExpenseGroupMembership.objects.filter(
                    group=group, user=created_by, is_active=True
                ).first()
                if not membership:
                    raise ValueError("Only group members can add expenses")

            # Get all active members including owner
            all_members = [group.owner]
            all_members.extend([m.user for m in group.memberships.filter(is_active=True)])

            # Create participant snapshot
            participants_snapshot = {
                "participants": [
                    {
                        "id": member.id,
                        "username": member.username,
                        "name": member.get_full_name() or member.username,
                        "is_owner": member == group.owner
                    } for member in all_members
                ],
                "paid_by": {
                    "id": paid_by_user.id,
                    "username": paid_by_user.username,
                    "name": paid_by_user.get_full_name() or paid_by_user.username
                },
                "split_method": split_method,
                "snapshot_date": timezone.now().isoformat()
            }

            # Calculate splits based on method
            splits = SplitwiseGroupService._calculate_splits(
                all_members, total_amount, split_method, shares_data
            )

            # Add split details to snapshot
            participants_snapshot["splits"] = splits

            # Create the main expense transaction
            expense_transaction = Transaction.objects.create(
                user=created_by,
                amount=total_amount,
                description=title,
                date=date or timezone.now().date(),
                transaction_category='group_expense',
                transaction_type='expense',
                notes=description,
                participants_snapshot=participants_snapshot,
                group_state_snapshot={
                    "group_id": group.id,
                    "group_name": group.name,
                    "member_count": len(all_members),
                    "snapshot_date": timezone.now().isoformat()
                },
                status='active'
            )

            return expense_transaction

    @staticmethod
    def _calculate_splits(members, total_amount, split_method, shares_data):
        """Calculate how much each member owes based on split method"""
        splits = []

        if split_method == 'equal':
            # Split equally among all members
            amount_per_person = total_amount / len(members)
            for member in members:
                splits.append({
                    "user_id": member.id,
                    "username": member.username,
                    "amount": float(amount_per_person)
                })

        elif split_method == 'exact':
            # Exact amounts specified
            for share in shares_data:
                user = next((m for m in members if m.id == share['user_id']), None)
                if user:
                    splits.append({
                        "user_id": user.id,
                        "username": user.username,
                        "amount": float(share['amount'])
                    })

        elif split_method == 'percentage':
            # Percentage-based splitting
            for share in shares_data:
                user = next((m for m in members if m.id == share['user_id']), None)
                if user:
                    amount = total_amount * (Decimal(share['percentage']) / 100)
                    splits.append({
                        "user_id": user.id,
                        "username": user.username,
                        "amount": float(amount)
                    })

        elif split_method == 'shares':
            # Share-based splitting
            total_shares = sum(share['shares'] for share in shares_data)
            amount_per_share = total_amount / total_shares

            for share in shares_data:
                user = next((m for m in members if m.id == share['user_id']), None)
                if user:
                    amount = amount_per_share * share['shares']
                    splits.append({
                        "user_id": user.id,
                        "username": user.username,
                        "amount": float(amount)
                    })

        return splits

    @staticmethod
    def get_group_balances(group):
        """
        Calculate current balances for all group members
        (like the balances view in Splitwise)
        """
        # Get all group expense transactions
        group_expenses = Transaction.objects.filter(
            transaction_category='group_expense',
            participants_snapshot__group_state_snapshot__group_id=group.id,
            status='active'
        )

        balances = {}

        # Initialize balances for all current members
        all_members = [group.owner]
        all_members.extend([m.user for m in group.memberships.filter(is_active=True)])

        for member in all_members:
            balances[member.id] = {
                'user': member,
                'paid': Decimal('0'),
                'owes': Decimal('0'),
                'balance': Decimal('0')
            }

        # Calculate from transaction snapshots
        for expense in group_expenses:
            snapshot = expense.participants_snapshot
            paid_by_id = snapshot['paid_by']['id']

            # Add to paid amount
            if paid_by_id in balances:
                balances[paid_by_id]['paid'] += expense.amount

            # Add to owed amounts
            for split in snapshot['splits']:
                user_id = split['user_id']
                amount = Decimal(str(split['amount']))

                if user_id in balances:
                    balances[user_id]['owes'] += amount

        # Calculate net balances
        for user_id, data in balances.items():
            data['balance'] = data['paid'] - data['owes']

        return list(balances.values())

    @staticmethod
    def settle_balance(group, from_user, to_user, amount):
        """
        Record a settlement between two group members
        (like "settle up" in Splitwise)
        """
        settlement_transaction = Transaction.objects.create(
            user=from_user,
            amount=amount,
            description=f"Settlement payment to {to_user.username}",
            date=timezone.now().date(),
            transaction_category='settlement',
            transaction_type='transfer',
            contact_user=to_user,
            participants_snapshot={
                "from_user": {
                    "id": from_user.id,
                    "username": from_user.username,
                    "name": from_user.get_full_name() or from_user.username
                },
                "to_user": {
                    "id": to_user.id,
                    "username": to_user.username,
                    "name": to_user.get_full_name() or to_user.username
                },
                "settlement_amount": float(amount),
                "group_id": group.id,
                "settlement_date": timezone.now().isoformat()
            },
            status='completed'
        )

        return settlement_transaction

    @staticmethod
    def get_group_expenses(group):
        """Get all expenses for a group with split details"""
        expenses = Transaction.objects.filter(
            transaction_category='group_expense',
            participants_snapshot__group_state_snapshot__group_id=group.id
        ).order_by('-date')

        return expenses

    @staticmethod
    def remove_member(group, user_to_remove, removed_by):
        """
        Remove a member from the group
        Past expenses remain unchanged (transaction isolation)
        """
        # Verify permissions
        if removed_by != group.owner:
            admin_membership = ExpenseGroupMembership.objects.filter(
                group=group, user=removed_by, role='admin', is_active=True
            ).first()
            if not admin_membership:
                raise ValueError("Only group owner or admins can remove members")

        # Find and deactivate membership
        membership = ExpenseGroupMembership.objects.filter(
            group=group, user=user_to_remove, is_active=True
        ).first()

        if not membership:
            raise ValueError("User is not an active member of this group")

        # Deactivate membership (preserves history)
        membership.deactivate()

        return True
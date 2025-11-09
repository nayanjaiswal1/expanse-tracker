"""
Individual Lending Service - Simple person-to-person lending/borrowing
No groups, just direct transactions between two people
"""

from decimal import Decimal
from django.utils import timezone
from django.db import transaction
from django.contrib.auth import get_user_model
from django.db.models import Sum, Q
from datetime import datetime, timedelta

from ..models import Transaction

User = get_user_model()


class IndividualLendingService:
    """Service for simple person-to-person lending transactions"""

    @staticmethod
    def detect_duplicate_transaction(
        lender_user,
        borrower_user,
        amount,
        description,
        transaction_date=None
    ):
        """
        Detect potential duplicate transactions between two users.
        Returns existing transaction if found, None otherwise.
        """
        if transaction_date is None:
            transaction_date = timezone.now().date()

        # Look for similar transactions in the last 24 hours
        time_window = timezone.now() - timedelta(hours=24)

        # Check for exact match (same amount, similar description, same users)
        potential_duplicates = Transaction.objects.filter(
            Q(
                (Q(user=lender_user) & Q(metadata__contact_user_id=borrower_user.id)) |
                (Q(user=borrower_user) & Q(metadata__contact_user_id=lender_user.id))
            ),
            metadata__transaction_category='lending',
            amount=amount,
            created_at__gte=time_window
        )

        # Check for similar descriptions (basic fuzzy matching)
        for existing_tx in potential_duplicates:
            # Simple similarity check - at least 70% similar words
            existing_words = set(existing_tx.description.lower().split())
            new_words = set(description.lower().split())

            if existing_words and new_words:
                similarity = len(existing_words & new_words) / len(existing_words | new_words)
                if similarity >= 0.7:  # 70% similarity threshold
                    return existing_tx

        return None

    @staticmethod
    def create_lending_transaction(
        lender_user,
        borrower_user,
        amount,
        description,
        due_date=None,
        interest_rate=None,
        notes=None,
        check_duplicates=True
    ):
        """
        Create a simple lending transaction between two people.
        No groups involved - just direct P2P lending.
        Includes duplicate detection and sync features.
        """
        with transaction.atomic():
            # Check for duplicates if requested
            if check_duplicates:
                existing_transaction = IndividualLendingService.detect_duplicate_transaction(
                    lender_user, borrower_user, amount, description
                )
                if existing_transaction:
                    # Update notes to indicate potential duplicate
                    merge_notes = f"Potential duplicate detected. Original: {existing_transaction.created_at}. "
                    if notes:
                        merge_notes += f"New notes: {notes}"
                    existing_transaction.notes = merge_notes
                    existing_transaction.save()
                    return existing_transaction

            # Create simple lending transaction with metadata fields
            # Need to get or create a dummy account for lending transactions
            from ..models import Account

            # Try to get user's first account, or create a "Lending" account
            account = Account.objects.filter(user=lender_user).first()
            if not account:
                account = Account.objects.create(
                    user=lender_user,
                    name="Lending",
                    account_type="other",
                    currency="IND",
                    balance=0
                )

            lending_transaction = Transaction(
                user=lender_user,  # Person who lent the money
                account=account,
                amount=amount,
                description=description,
                date=timezone.now().date(),
                notes=notes or '',
                status='pending',  # Pending until borrower confirms or settles
                is_credit=False,  # Money out for lender
            )

            # Set metadata properties
            lending_transaction.transaction_category = 'lending'
            lending_transaction.transaction_type = 'lend'
            lending_transaction.contact_user = borrower_user
            if due_date:
                lending_transaction.due_date = due_date
            if interest_rate:
                lending_transaction.interest_rate = interest_rate

            lending_transaction.save()

            return lending_transaction

    @staticmethod
    def get_user_lending_summary(user):
        """Get summary of user's lending activity"""
        from django.db.models import Sum

        # Calculate total lent (where user is the lender)
        total_lent = Transaction.objects.filter(
            user=user,
            metadata__transaction_category='lending',
            status__in=['pending', 'active']
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        # Calculate total borrowed (where user is the borrower)
        total_borrowed = Transaction.objects.filter(
            metadata__contact_user_id=user.id,
            metadata__transaction_category='lending',
            status__in=['pending', 'active']
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        # Count unique lending relationships
        unique_lenders = Transaction.objects.filter(
            metadata__contact_user_id=user.id,
            metadata__transaction_category='lending'
        ).values('user').distinct().count()

        unique_borrowers = Transaction.objects.filter(
            user=user,
            metadata__transaction_category='lending'
        ).values('metadata__contact_user_id').distinct().count()

        return {
            'total_lent': total_lent,
            'total_borrowed': total_borrowed,
            'active_relationships': unique_lenders + unique_borrowers
        }

    @staticmethod
    def get_user_lending_transactions(user):
        """Get all lending transactions for a user"""
        from django.db.models import Q

        # Transactions where user is lender or borrower
        transactions = Transaction.objects.filter(
            Q(
                Q(user=user, metadata__transaction_category='lending') |
                Q(metadata__contact_user_id=user.id, metadata__transaction_category='lending')
            )
        ).select_related('user').order_by('-date')

        return transactions

    @staticmethod
    def settle_lending_transaction(transaction_id, settled_by_user):
        """Mark a lending transaction as settled"""
        try:
            lending_transaction = Transaction.objects.get(
                id=transaction_id,
                metadata__transaction_category='lending'
            )

            # Verify user is involved in this transaction
            if settled_by_user not in [lending_transaction.user, lending_transaction.contact_user]:
                raise ValueError("User not authorized to settle this transaction")

            lending_transaction.status = 'settled'
            lending_transaction.save()

            return lending_transaction

        except Transaction.DoesNotExist:
            raise ValueError("Lending transaction not found")

    @staticmethod
    def get_lending_relationship_details(user, contact_user, page=1, page_size=20):
        """Get detailed lending relationship between two users with pagination"""
        from django.db.models import Q, Sum, Count
        from django.core.paginator import Paginator

        # Get all transactions between these users (ordered by newest first for pagination)
        all_transactions = Transaction.objects.filter(
            Q(
                (Q(user=user) & Q(metadata__contact_user_id=contact_user.id)) |
                (Q(user=contact_user) & Q(metadata__contact_user_id=user.id))
            ),
            metadata__transaction_category='lending'
        ).order_by('-created_at', '-id')  # Most recent first

        # Pagination
        paginator = Paginator(all_transactions, page_size)
        page_obj = paginator.get_page(page)

        # Calculate comprehensive balances
        # Active amounts (pending/active status)
        active_lent = Transaction.objects.filter(
            user=user,
            metadata__contact_user_id=contact_user.id,
            metadata__transaction_category='lending',
            status__in=['pending', 'active']
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        active_borrowed = Transaction.objects.filter(
            user=contact_user,
            metadata__contact_user_id=user.id,
            metadata__transaction_category='lending',
            status__in=['pending', 'active']
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        # Total amounts (all time including settled)
        total_lent_ever = Transaction.objects.filter(
            user=user,
            metadata__contact_user_id=contact_user.id,
            metadata__transaction_category='lending'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        total_borrowed_ever = Transaction.objects.filter(
            user=contact_user,
            metadata__contact_user_id=user.id,
            metadata__transaction_category='lending'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        # Settled amounts
        settled_lent = Transaction.objects.filter(
            user=user,
            metadata__contact_user_id=contact_user.id,
            metadata__transaction_category='lending',
            status='settled'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        settled_borrowed = Transaction.objects.filter(
            user=contact_user,
            metadata__contact_user_id=user.id,
            metadata__transaction_category='lending',
            status='settled'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        # Transaction counts
        total_transactions = all_transactions.count()
        pending_count = all_transactions.filter(status='pending').count()
        active_count = all_transactions.filter(status='active').count()
        settled_count = all_transactions.filter(status='settled').count()

        # Net calculations
        active_net_balance = active_lent - active_borrowed
        total_net_balance = total_lent_ever - total_borrowed_ever

        return {
            'transactions': page_obj.object_list,
            'pagination': {
                'current_page': page,
                'total_pages': paginator.num_pages,
                'has_next': page_obj.has_next(),
                'has_previous': page_obj.has_previous(),
                'total_count': total_transactions
            },
            'balances': {
                'active': {
                    'lent': active_lent,
                    'borrowed': active_borrowed,
                    'net': active_net_balance,
                    'status': 'owed_to_you' if active_net_balance > 0 else 'you_owe' if active_net_balance < 0 else 'settled'
                },
                'total_lifetime': {
                    'lent': total_lent_ever,
                    'borrowed': total_borrowed_ever,
                    'net': total_net_balance
                },
                'settled': {
                    'lent': settled_lent,
                    'borrowed': settled_borrowed,
                    'net': settled_lent - settled_borrowed
                }
            },
            'stats': {
                'total_transactions': total_transactions,
                'pending_count': pending_count,
                'active_count': active_count,
                'settled_count': settled_count
            }
        }

    @staticmethod
    def get_pending_confirmations(user):
        """Get transactions that need user's confirmation (borrower side)"""
        # Transactions where user is the borrower and status is pending
        pending_transactions = Transaction.objects.filter(
            metadata__contact_user_id=user.id,
            metadata__transaction_category='lending',
            status='pending'
        ).select_related('user').order_by('-created_at')

        return pending_transactions

    @staticmethod
    def confirm_borrowing_transaction(transaction_id, borrower_user):
        """Confirm a lending transaction from borrower's side"""
        try:
            lending_transaction = Transaction.objects.get(
                id=transaction_id,
                metadata__transaction_category='lending',
                metadata__contact_user_id=borrower_user.id,
                status='pending'
            )

            lending_transaction.status = 'active'
            lending_transaction.save()

            return lending_transaction

        except Transaction.DoesNotExist:
            raise ValueError("Lending transaction not found or already confirmed")

    @staticmethod
    def reject_borrowing_transaction(transaction_id, borrower_user, reason=None):
        """Reject a lending transaction from borrower's side"""
        try:
            lending_transaction = Transaction.objects.get(
                id=transaction_id,
                metadata__transaction_category='lending',
                metadata__contact_user_id=borrower_user.id,
                status='pending'
            )

            # Add rejection reason to notes
            rejection_note = f"Rejected by borrower on {timezone.now()}."
            if reason:
                rejection_note += f" Reason: {reason}"

            if lending_transaction.notes:
                lending_transaction.notes += f" | {rejection_note}"
            else:
                lending_transaction.notes = rejection_note

            lending_transaction.status = 'rejected'
            lending_transaction.save()

            return lending_transaction

        except Transaction.DoesNotExist:
            raise ValueError("Lending transaction not found")

    @staticmethod
    def get_sync_notifications(user):
        """Get notifications for sync events (new transactions, confirmations, etc.)"""
        # Get recent transactions involving this user (last 7 days)
        recent_cutoff = timezone.now() - timedelta(days=7)

        notifications = []

        # New lending requests (where user is borrower)
        new_requests = Transaction.objects.filter(
            metadata__contact_user_id=user.id,
            metadata__transaction_category='lending',
            status='pending',
            created_at__gte=recent_cutoff
        ).select_related('user')

        for tx in new_requests:
            notifications.append({
                'type': 'lending_request',
                'transaction_id': tx.id,
                'from_user': {
                    'id': tx.user.id,
                    'name': tx.user.get_full_name() or tx.user.username
                },
                'amount': float(tx.amount),
                'description': tx.description,
                'created_at': tx.created_at,
                'message': f"{tx.user.get_full_name() or tx.user.username} wants to lend you {tx.amount}"
            })

        # Recent confirmations (where user is lender)
        recent_confirmations = Transaction.objects.filter(
            user=user,
            metadata__transaction_category='lending',
            status='active',
            created_at__gte=recent_cutoff
        )

        for tx in recent_confirmations:
            contact_user = tx.contact_user
            if contact_user:
                notifications.append({
                    'type': 'lending_confirmed',
                    'transaction_id': tx.id,
                    'from_user': {
                        'id': contact_user.id,
                        'name': contact_user.get_full_name() or contact_user.username
                    },
                    'amount': float(tx.amount),
                    'description': tx.description,
                    'created_at': tx.created_at,
                    'message': f"{contact_user.get_full_name() or contact_user.username} confirmed your lending of {tx.amount}"
                })

        return sorted(notifications, key=lambda x: x['created_at'], reverse=True)
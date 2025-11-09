"""
Individual Lending API Views
Simple person-to-person lending/borrowing endpoints
"""

from decimal import Decimal
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from django.db.models import Sum, Q
from datetime import datetime, date

from ..models import Transaction
from ..serializers import TransactionSerializer
from ..services.individual_lending_service import IndividualLendingService

User = get_user_model()


def safe_isoformat(date_value):
    """Safely convert date to ISO format string"""
    if date_value is None:
        return None
    if isinstance(date_value, str):
        return date_value
    if hasattr(date_value, 'isoformat'):
        return date_value.isoformat()
    return str(date_value)


class IndividualLendingViewSet(viewsets.ViewSet):
    """API for simple individual lending transactions"""
    permission_classes = [IsAuthenticated]

    def list(self, request):
        """Get all lending transactions for the user"""
        transactions = IndividualLendingService.get_user_lending_transactions(request.user)

        # Convert to simple format for frontend
        data = []
        for transaction in transactions:
            # Determine if user is lender or borrower
            is_lender = transaction.user == request.user
            contact = transaction.contact_user if is_lender else transaction.user

            data.append({
                'id': transaction.id,
                'amount': float(transaction.amount),
                'description': transaction.description,
                'date': safe_isoformat(transaction.date),
                'due_date': safe_isoformat(transaction.due_date),
                'status': transaction.status,
                'type': 'lend' if is_lender else 'borrow',
                'contact': {
                    'id': contact.id,
                    'name': contact.get_full_name() or contact.username,
                    'username': contact.username,
                    'email': contact.email
                },
                'notes': transaction.notes,
                'interest_rate': float(transaction.interest_rate) if transaction.interest_rate else None,
                'created_at': safe_isoformat(transaction.created_at)
            })

        return Response(data)

    def create(self, request):
        """Create a new lending transaction with duplicate detection"""
        data = request.data

        try:
            # Get contact user
            contact_user = get_object_or_404(User, id=data['contact_user_id'])

            # Determine lender and borrower based on transaction type
            transaction_type = data.get('type', 'lend')  # 'lend' or 'borrow'

            if transaction_type == 'lend':
                lender = request.user
                borrower = contact_user
            else:  # borrow
                lender = contact_user
                borrower = request.user

            # Check for duplicate detection flag (default True)
            check_duplicates = data.get('check_duplicates', True)

            # Create transaction with duplicate detection
            transaction = IndividualLendingService.create_lending_transaction(
                lender_user=lender,
                borrower_user=borrower,
                amount=data['amount'],
                description=data['description'],
                due_date=data.get('due_date'),
                interest_rate=data.get('interest_rate'),
                notes=data.get('notes', ''),
                check_duplicates=check_duplicates
            )

            # Return transaction data
            contact = transaction.contact_user if transaction.user == request.user else transaction.user
            return Response({
                'id': transaction.id,
                'amount': float(transaction.amount),
                'description': transaction.description,
                'date': safe_isoformat(transaction.date),
                'due_date': safe_isoformat(transaction.due_date),
                'status': transaction.status,
                'type': transaction_type,
                'contact': {
                    'id': contact.id,
                    'name': contact.get_full_name() or contact.username,
                    'username': contact.username,
                    'email': contact.email
                },
                'notes': transaction.notes,
                'interest_rate': float(transaction.interest_rate) if transaction.interest_rate else None,
                'created_at': safe_isoformat(transaction.created_at)
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    def retrieve(self, request, pk=None):
        """Get a specific lending transaction"""
        try:
            transaction = Transaction.objects.get(
                id=pk,
                metadata__transaction_category='lending'
            )

            # Check if user is involved in this transaction
            contact_user = transaction.contact_user
            if request.user not in [transaction.user, contact_user] and (not contact_user or request.user.id != transaction.contact_user_id):
                return Response({
                    'error': 'You are not authorized to view this transaction'
                }, status=status.HTTP_403_FORBIDDEN)

            # Determine if user is lender or borrower
            is_lender = transaction.user == request.user
            contact = transaction.contact_user if is_lender else transaction.user

            return Response({
                'id': transaction.id,
                'amount': float(transaction.amount),
                'description': transaction.description,
                'date': safe_isoformat(transaction.date),
                'due_date': safe_isoformat(transaction.due_date),
                'status': transaction.status,
                'type': 'lend' if is_lender else 'borrow',
                'contact': {
                    'id': contact.id,
                    'name': contact.get_full_name() or contact.username,
                    'username': contact.username,
                    'email': contact.email
                },
                'notes': transaction.notes,
                'interest_rate': float(transaction.interest_rate) if transaction.interest_rate else None,
                'created_at': safe_isoformat(transaction.created_at)
            })

        except Transaction.DoesNotExist:
            return Response({
                'error': 'Transaction not found'
            }, status=status.HTTP_404_NOT_FOUND)

    def update(self, request, pk=None):
        """Update a lending transaction"""
        try:
            transaction = Transaction.objects.get(
                id=pk,
                metadata__transaction_category='lending'
            )

            # Check if user is involved in this transaction
            contact_user = transaction.contact_user
            if request.user not in [transaction.user, contact_user] and (not contact_user or request.user.id != transaction.contact_user_id):
                return Response({
                    'error': 'You are not authorized to update this transaction'
                }, status=status.HTTP_403_FORBIDDEN)

            # Update allowed fields
            data = request.data
            if 'description' in data:
                transaction.description = data['description']
            if 'due_date' in data:
                transaction.due_date = data['due_date']
            if 'notes' in data:
                transaction.notes = data['notes']
            if 'interest_rate' in data:
                transaction.interest_rate = data['interest_rate']

            transaction.save()

            # Return updated transaction
            is_lender = transaction.user == request.user
            contact = transaction.contact_user if is_lender else transaction.user

            return Response({
                'id': transaction.id,
                'amount': float(transaction.amount),
                'description': transaction.description,
                'date': safe_isoformat(transaction.date),
                'due_date': safe_isoformat(transaction.due_date),
                'status': transaction.status,
                'type': 'lend' if is_lender else 'borrow',
                'contact': {
                    'id': contact.id,
                    'name': contact.get_full_name() or contact.username,
                    'username': contact.username,
                    'email': contact.email
                },
                'notes': transaction.notes,
                'interest_rate': float(transaction.interest_rate) if transaction.interest_rate else None,
                'created_at': safe_isoformat(transaction.created_at)
            })

        except Transaction.DoesNotExist:
            return Response({
                'error': 'Transaction not found'
            }, status=status.HTTP_404_NOT_FOUND)

    def destroy(self, request, pk=None):
        """Delete a lending transaction"""
        try:
            transaction = Transaction.objects.get(
                id=pk,
                metadata__transaction_category='lending'
            )

            # Check if user is the lender (only lender can delete)
            if transaction.user != request.user:
                return Response({
                    'error': 'Only the lender can delete this transaction'
                }, status=status.HTTP_403_FORBIDDEN)

            # Only allow deletion if transaction is pending
            if transaction.status != 'pending':
                return Response({
                    'error': 'Cannot delete a settled or active transaction'
                }, status=status.HTTP_400_BAD_REQUEST)

            transaction.delete()

            return Response({
                'message': 'Transaction deleted successfully'
            }, status=status.HTTP_204_NO_CONTENT)

        except Transaction.DoesNotExist:
            return Response({
                'error': 'Transaction not found'
            }, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get comprehensive user lending summary"""
        from django.utils import timezone
        from datetime import timedelta

        summary = IndividualLendingService.get_user_lending_summary(request.user)

        # Get overdue transactions (checking metadata for due_date)
        from django.db.models.functions import Cast
        from django.db.models import DateField

        today = timezone.now().date().isoformat()

        overdue_lent = Transaction.objects.filter(
            user=request.user,
            metadata__transaction_category='lending',
            status__in=['pending', 'active'],
            metadata__due_date__lt=today
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        overdue_borrowed = Transaction.objects.filter(
            metadata__contact_user_id=request.user.id,
            metadata__transaction_category='lending',
            status__in=['pending', 'active'],
            metadata__due_date__lt=today
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        # Recent activity (last 30 days)
        last_month = timezone.now().date() - timedelta(days=30)
        recent_activity = Transaction.objects.filter(
            Q(user=request.user, metadata__transaction_category='lending') |
            Q(metadata__contact_user_id=request.user.id, metadata__transaction_category='lending'),
            created_at__gte=last_month
        ).count()

        return Response({
            # Basic stats
            'total_lent': float(summary['total_lent']),
            'total_borrowed': float(summary['total_borrowed']),
            'net_balance': float(summary['total_lent'] - summary['total_borrowed']),
            'active_relationships': summary['active_relationships'],

            # Overdue amounts
            'overdue_lent': float(overdue_lent),
            'overdue_borrowed': float(overdue_borrowed),

            # Activity
            'recent_activity_count': recent_activity,

            # Counts
            'pending_confirmations': Transaction.objects.filter(
                metadata__contact_user_id=request.user.id,
                metadata__transaction_category='lending',
                status='pending'
            ).count(),
        })

    @action(detail=True, methods=['post'])
    def settle(self, request, pk=None):
        """Mark a lending transaction as settled"""
        try:
            transaction = IndividualLendingService.settle_lending_transaction(
                transaction_id=pk,
                settled_by_user=request.user
            )

            return Response({
                'message': 'Transaction settled successfully',
                'transaction_id': transaction.id,
                'status': transaction.status
            })

        except ValueError as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def contacts(self, request):
        """Get list of contacts with balances for lending"""
        from django.db.models import Sum, Q, Case, When, F

        # Get all users who have lending transactions with current user
        lending_transactions = Transaction.objects.filter(
            Q(user=request.user, metadata__transaction_category='lending') |
            Q(metadata__contact_user_id=request.user.id, metadata__transaction_category='lending')
        ).values('user', 'metadata__contact_user_id').distinct()

        # Extract unique contact IDs
        contact_ids = set()
        for tx in lending_transactions:
            if tx['user'] == request.user.id:
                contact_id = tx.get('metadata__contact_user_id')
                if contact_id:
                    contact_ids.add(contact_id)
            else:
                contact_ids.add(tx['user'])

        # Get contact users
        contacts = User.objects.filter(id__in=contact_ids).only(
            'id', 'username', 'email', 'first_name', 'last_name'
        )

        data = []
        for contact in contacts:
            # Calculate balance with this contact
            # Amount lent to contact (user lent, contact borrowed)
            lent = Transaction.objects.filter(
                user=request.user,
                metadata__contact_user_id=contact.id,
                metadata__transaction_category='lending',
                status__in=['pending', 'active']
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

            # Amount borrowed from contact (contact lent, user borrowed)
            borrowed = Transaction.objects.filter(
                user=contact,
                metadata__contact_user_id=request.user.id,
                metadata__transaction_category='lending',
                status__in=['pending', 'active']
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

            balance = float(lent - borrowed)

            # Only include contacts with non-zero balance
            if balance != 0:
                data.append({
                    'id': contact.id,
                    'name': contact.get_full_name() or contact.username,
                    'username': contact.username,
                    'email': contact.email,
                    'balance': balance
                })

        return Response(data)

    @action(detail=False, methods=['get'], url_path='relationship/(?P<contact_id>[^/.]+)')
    def relationship_details(self, request, contact_id=None):
        """Get detailed lending relationship with a specific contact with pagination"""
        try:
            contact_user = get_object_or_404(User, id=contact_id)

            # Get pagination parameters
            page = int(request.GET.get('page', 1))
            page_size = min(int(request.GET.get('page_size', 20)), 50)  # Max 50 per page

            details = IndividualLendingService.get_lending_relationship_details(
                request.user, contact_user, page=page, page_size=page_size
            )

            # Format transactions for response
            transactions_data = []
            for transaction in details['transactions']:
                # Determine if user is lender or borrower
                is_lender = transaction.user == request.user
                contact = transaction.contact_user if is_lender else transaction.user

                transactions_data.append({
                    'id': transaction.id,
                    'amount': float(transaction.amount),
                    'description': transaction.description,
                    'date': safe_isoformat(transaction.date),
                    'due_date': safe_isoformat(transaction.due_date),
                    'status': transaction.status,
                    'type': 'lend' if is_lender else 'borrow',
                    'contact': {
                        'id': contact.id,
                        'name': contact.get_full_name() or contact.username,
                        'username': contact.username,
                        'email': contact.email
                    },
                    'notes': transaction.notes,
                    'interest_rate': float(transaction.interest_rate) if transaction.interest_rate else None,
                    'created_at': safe_isoformat(transaction.created_at)
                })

            return Response({
                'contact': {
                    'id': contact_user.id,
                    'name': contact_user.get_full_name() or contact_user.username,
                    'username': contact_user.username,
                    'email': contact_user.email
                },
                'transactions': transactions_data,
                'pagination': details['pagination'],
                'balances': {
                    'active': {
                        'lent': float(details['balances']['active']['lent']),
                        'borrowed': float(details['balances']['active']['borrowed']),
                        'net': float(details['balances']['active']['net']),
                        'status': details['balances']['active']['status']
                    },
                    'total_lifetime': {
                        'lent': float(details['balances']['total_lifetime']['lent']),
                        'borrowed': float(details['balances']['total_lifetime']['borrowed']),
                        'net': float(details['balances']['total_lifetime']['net'])
                    },
                    'settled': {
                        'lent': float(details['balances']['settled']['lent']),
                        'borrowed': float(details['balances']['settled']['borrowed']),
                        'net': float(details['balances']['settled']['net'])
                    }
                },
                'stats': details['stats']
            })

        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def pending_confirmations(self, request):
        """Get transactions that need user's confirmation"""
        pending_transactions = IndividualLendingService.get_pending_confirmations(request.user)

        data = []
        for transaction in pending_transactions:
            data.append({
                'id': transaction.id,
                'amount': float(transaction.amount),
                'description': transaction.description,
                'date': safe_isoformat(transaction.date),
                'due_date': safe_isoformat(transaction.due_date),
                'status': transaction.status,
                'lender': {
                    'id': transaction.user.id,
                    'name': transaction.user.get_full_name() or transaction.user.username,
                    'username': transaction.user.username,
                    'email': transaction.user.email
                },
                'notes': transaction.notes,
                'interest_rate': float(transaction.interest_rate) if transaction.interest_rate else None,
                'created_at': safe_isoformat(transaction.created_at)
            })

        return Response(data)

    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        """Confirm a lending transaction (borrower confirms they received the money)"""
        try:
            transaction = IndividualLendingService.confirm_borrowing_transaction(
                transaction_id=pk,
                borrower_user=request.user
            )

            return Response({
                'message': 'Transaction confirmed successfully',
                'transaction_id': transaction.id,
                'status': transaction.status
            })

        except ValueError as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject a lending transaction (borrower rejects the loan)"""
        try:
            reason = request.data.get('reason', '')
            transaction = IndividualLendingService.reject_borrowing_transaction(
                transaction_id=pk,
                borrower_user=request.user,
                reason=reason
            )

            return Response({
                'message': 'Transaction rejected successfully',
                'transaction_id': transaction.id,
                'status': transaction.status
            })

        except ValueError as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def sync_notifications(self, request):
        """Get sync notifications for recent activity"""
        notifications = IndividualLendingService.get_sync_notifications(request.user)

        return Response({
            'notifications': notifications,
            'count': len(notifications)
        })
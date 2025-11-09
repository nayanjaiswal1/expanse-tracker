"""
Views for managing pending transactions from email imports
"""

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Count
from django.shortcuts import get_object_or_404

from ..models import Transaction, Account
from ..serializers import TransactionSerializer, AccountSerializer
from services.services.email_transaction_service import EmailTransactionService


class PendingTransactionViewSet(viewsets.ModelViewSet):
    """ViewSet for managing pending transactions"""

    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Get all pending transactions for the user"""
        return Transaction.objects.filter(
            user=self.request.user,
            status='pending'
        ).select_related('account').order_by('-date', '-created_at')

    @action(detail=False, methods=['get'], url_path='count')
    def get_count(self, request):
        """Get count of pending transactions"""
        count = self.get_queryset().count()
        return Response({'count': count})

    @action(detail=True, methods=['post'], url_path='confirm')
    def confirm_transaction(self, request, pk=None):
        """
        Confirm a pending transaction and move it to active status
        """
        transaction = self.get_object()

        # Update transaction fields if provided
        update_fields = ['account', 'category', 'amount', 'description', 'date', 'notes', 'transaction_type']
        for field in update_fields:
            if field in request.data:
                if field == 'account' and request.data[field]:
                    # Handle account FK
                    account = get_object_or_404(Account, id=request.data[field], user=request.user)
                    transaction.account = account
                elif field == 'category' and request.data[field]:
                    # Handle category FK
                    from ..models import Category
                    category = get_object_or_404(Category, id=request.data[field], user=request.user)
                    transaction.category = category
                else:
                    setattr(transaction, field, request.data[field])

        # Change status to active and mark as verified
        transaction.status = 'active'
        transaction.verified = True
        transaction.save()

        return Response({
            'message': 'Transaction confirmed successfully',
            'transaction': self.get_serializer(transaction).data
        })

    @action(detail=False, methods=['post'], url_path='confirm-bulk')
    def confirm_bulk(self, request):
        """
        Confirm multiple pending transactions at once
        Expected payload: {"transaction_ids": [1, 2, 3]}
        """
        transaction_ids = request.data.get('transaction_ids', [])

        if not transaction_ids:
            return Response(
                {'error': 'No transaction IDs provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get transactions
        transactions = self.get_queryset().filter(id__in=transaction_ids)

        if not transactions.exists():
            return Response(
                {'error': 'No matching transactions found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Confirm all
        confirmed_count = transactions.update(status='active', verified=True)

        return Response({
            'message': f'{confirmed_count} transactions confirmed',
            'confirmed_count': confirmed_count
        })

    @action(detail=True, methods=['delete'], url_path='reject')
    def reject_transaction(self, request, pk=None):
        """Reject/delete a pending transaction"""
        transaction = self.get_object()
        transaction.status = 'cancelled'
        transaction.save()

        return Response({
            'message': 'Transaction rejected',
            'id': transaction.id
        })

    @action(detail=False, methods=['post'], url_path='parse-email')
    def parse_email_to_transaction(self, request):
        """
        Parse email data and create a pending transaction
        Expected payload:
        {
            "gmail_message": {...},  // Gmail API message object
            "gmail_message_id": "abc123"
        }
        """
        gmail_message = request.data.get('gmail_message')
        gmail_message_id = request.data.get('gmail_message_id')

        if not gmail_message:
            return Response(
                {'error': 'gmail_message is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Use the email transaction service
            service = EmailTransactionService(request.user)
            result = service.process_email_to_transaction(gmail_message, gmail_message_id)

            if result['success']:
                return Response(result, status=status.HTTP_201_CREATED)
            else:
                return Response(result, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            return Response(
                {'error': f'Failed to process email: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['patch'], url_path='assign-account')
    def assign_account(self, request, pk=None):
        """
        Assign an account to a pending transaction
        Payload: {"account_id": 123} or {"create_account": {...}}
        """
        transaction = self.get_object()

        if 'account_id' in request.data:
            # Assign existing account
            account = get_object_or_404(Account, id=request.data['account_id'], user=request.user)
            transaction.account = account
            transaction.save()

            return Response({
                'message': 'Account assigned successfully',
                'transaction': self.get_serializer(transaction).data
            })

        elif 'create_account' in request.data:
            # Create new account and assign
            account_data = request.data['create_account']
            account_data['user'] = request.user.id

            # Get account info from transaction metadata
            account_info = transaction.metadata.get('account_info', {})

            # Use EmailTransactionService to create account
            service = EmailTransactionService(request.user)
            account = service.create_account_from_info(
                account_info,
                name=account_data.get('name')
            )

            # Assign to transaction
            transaction.account = account
            transaction.save()

            return Response({
                'message': 'Account created and assigned successfully',
                'account': AccountSerializer(account).data,
                'transaction': self.get_serializer(transaction).data
            }, status=status.HTTP_201_CREATED)

        else:
            return Response(
                {'error': 'Either account_id or create_account must be provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'], url_path='stats')
    def get_stats(self, request):
        """Get statistics about pending transactions"""
        queryset = self.get_queryset()

        # Group by date
        by_date = queryset.values('date').annotate(count=Count('id')).order_by('-date')[:7]

        # Group by transaction type
        by_type = queryset.values('transaction_type').annotate(count=Count('id'))

        # Total amount
        total_expense = sum(
            t.amount for t in queryset.filter(transaction_type='expense')
        )
        total_income = sum(
            t.amount for t in queryset.filter(transaction_type='income')
        )

        # Without account
        without_account = queryset.filter(account__isnull=True).count()

        return Response({
            'total_count': queryset.count(),
            'total_expense': float(total_expense) if total_expense else 0,
            'total_income': float(total_income) if total_income else 0,
            'without_account': without_account,
            'by_date': list(by_date),
            'by_type': list(by_type),
        })

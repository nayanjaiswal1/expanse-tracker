"""
Views for managing account PDF passwords.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from ..models.accounts import Account, AccountPdfPassword
from ..serializers import AccountPdfPasswordSerializer


class AccountPdfPasswordViewSet(viewsets.ModelViewSet):
    """ViewSet for managing PDF passwords for accounts"""

    permission_classes = [IsAuthenticated]
    serializer_class = AccountPdfPasswordSerializer

    def get_queryset(self):
        """Get passwords for user's accounts only"""
        user_account_ids = Account.objects.filter(user=self.request.user).values_list('id', flat=True)
        return AccountPdfPassword.objects.filter(
            user=self.request.user,
            account_id__in=user_account_ids
        ).select_related('account')

    def perform_create(self, serializer):
        """Ensure user owns the account"""
        account = serializer.validated_data.get('account')
        if account.user != self.request.user:
            raise PermissionError("You don't have permission to add passwords to this account")

        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'])
    def by_account(self, request):
        """Get all passwords for a specific account"""
        account_id = request.query_params.get('account_id')

        if not account_id:
            return Response(
                {'error': 'account_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            account = Account.objects.get(id=account_id, user=request.user)
        except Account.DoesNotExist:
            return Response(
                {'error': 'Account not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        passwords = AccountPdfPassword.objects.filter(
            account=account,
            is_active=True
        ).order_by('-usage_count', '-last_used')

        serializer = self.get_serializer(passwords, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """Deactivate a password (soft delete)"""
        password = self.get_object()
        password.is_active = False
        password.save()

        return Response({
            'message': 'Password deactivated successfully'
        })

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Reactivate a password"""
        password = self.get_object()
        password.is_active = True
        password.save()

        return Response({
            'message': 'Password activated successfully'
        })

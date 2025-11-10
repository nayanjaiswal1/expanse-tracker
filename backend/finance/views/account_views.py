"""Account management views."""

from rest_framework import viewsets, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend

from finance.models import Account
from finance.serializers import AccountSerializer


class AccountViewSet(viewsets.ModelViewSet):
    """ViewSet for managing user accounts."""

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AccountSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['account_type', 'is_active']
    search_fields = ['name', 'account_number']
    ordering_fields = ['name', 'created_at', 'balance']
    ordering = ['-created_at']

    def get_queryset(self):
        return Account.objects.filter(user=self.request.user, is_deleted=False)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

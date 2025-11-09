"""
Transaction Group views for managing grouped transactions.
"""

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from finance.models import TransactionGroup
from finance.serializers import TransactionGroupSerializer


class TransactionGroupViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing transaction groups.

    Allows users to create groups of related transactions.
    """

    serializer_class = TransactionGroupSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter transaction groups by user."""
        return TransactionGroup.objects.filter(
            user=self.request.user
        ).prefetch_related('transactions').order_by('-created_at')

    def perform_create(self, serializer):
        """Set user when creating transaction group."""
        serializer.save(user=self.request.user)

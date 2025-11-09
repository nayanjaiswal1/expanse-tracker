"""
API views for email account pattern management
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from services.models import EmailAccountPattern
from services.serializers import EmailAccountPatternSerializer, LearnPatternSerializer
from services.services.account_matcher_service import AccountMatcherService
from finance.models import Transaction, Account


class EmailAccountPatternViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing learned email account patterns

    List: Get all learned patterns for the authenticated user
    Retrieve: Get a specific pattern
    Create: Manually create a pattern
    Update/Patch: Update a pattern
    Delete: Remove a pattern
    Learn: Learn pattern from a transaction (POST action)
    """

    serializer_class = EmailAccountPatternSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter patterns by authenticated user"""
        queryset = EmailAccountPattern.objects.filter(user=self.request.user)

        # Optional filter by account
        account_id = self.request.query_params.get('account_id')
        if account_id:
            queryset = queryset.filter(account_id=account_id)

        # Optional filter by sender domain
        sender_domain = self.request.query_params.get('sender_domain')
        if sender_domain:
            queryset = queryset.filter(sender_domain__icontains=sender_domain)

        # Optional filter by institution
        institution = self.request.query_params.get('institution')
        if institution:
            queryset = queryset.filter(institution_name__icontains=institution)

        return queryset.select_related('account').order_by('-confidence_score', '-usage_count')

    def perform_create(self, serializer):
        """Ensure user is set when creating pattern"""
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['post'], url_path='learn')
    def learn_from_transaction(self, request):
        """
        Learn a pattern from a transaction

        POST /integrations/email-patterns/learn/
        Body: {"transaction_id": 123, "account_id": 456}
        """
        serializer = LearnPatternSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        transaction_id = serializer.validated_data['transaction_id']
        account_id = serializer.validated_data['account_id']

        # Get transaction and account
        transaction = get_object_or_404(
            Transaction,
            id=transaction_id,
            user=request.user
        )
        account = get_object_or_404(
            Account,
            id=account_id,
            user=request.user
        )

        # Update transaction account if different
        if transaction.account_id != account_id:
            transaction.account = account
            transaction.save(update_fields=['account'])

        # Learn the pattern
        matcher = AccountMatcherService(request.user)
        pattern = matcher.learn_pattern(transaction, account)

        # Return the pattern
        response_serializer = EmailAccountPatternSerializer(pattern)
        return Response(
            {
                'message': 'Pattern learned successfully',
                'pattern': response_serializer.data
            },
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['post'], url_path='reset-confidence')
    def reset_confidence(self, request, pk=None):
        """
        Reset confidence score and usage count for a pattern

        POST /integrations/email-patterns/{id}/reset-confidence/
        """
        pattern = self.get_object()
        pattern.confidence_score = 0.8
        pattern.usage_count = 1
        pattern.save(update_fields=['confidence_score', 'usage_count'])

        serializer = self.get_serializer(pattern)
        return Response({
            'message': 'Pattern confidence reset successfully',
            'pattern': serializer.data
        })

    @action(detail=False, methods=['get'], url_path='stats')
    def get_stats(self, request):
        """
        Get statistics about learned patterns

        GET /integrations/email-patterns/stats/
        """
        queryset = self.get_queryset()

        stats = {
            'total_patterns': queryset.count(),
            'by_account': {},
            'by_institution': {},
            'high_confidence': queryset.filter(confidence_score__gte=0.9).count(),
            'medium_confidence': queryset.filter(confidence_score__gte=0.7, confidence_score__lt=0.9).count(),
            'low_confidence': queryset.filter(confidence_score__lt=0.7).count(),
        }

        # Count by account
        for pattern in queryset:
            account_name = pattern.account.name
            stats['by_account'][account_name] = stats['by_account'].get(account_name, 0) + 1

        # Count by institution
        for pattern in queryset.exclude(institution_name__isnull=True):
            institution = pattern.institution_name
            stats['by_institution'][institution] = stats['by_institution'].get(institution, 0) + 1

        return Response(stats)

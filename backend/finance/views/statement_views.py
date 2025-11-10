"""
Views for Statement management.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from finance.models import Statement, StatementComparison, StatementDuplicate
from finance.serializers.statement_serializers import (
    StatementSerializer, StatementUploadSerializer, StatementListSerializer,
    StatementComparisonSerializer, StatementDuplicateSerializer
)


class StatementViewSet(viewsets.ModelViewSet):
    """ViewSet for managing Statements."""

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        queryset = Statement.objects.filter(user=self.request.user)

        # Filter by account
        account_id = self.request.query_params.get('account')
        if account_id:
            queryset = queryset.filter(account_id=account_id)

        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        return queryset.select_related('account')

    def get_serializer_class(self):
        if self.action == 'create':
            return StatementUploadSerializer
        elif self.action == 'list':
            return StatementListSerializer
        return StatementSerializer

    @action(detail=True, methods=['get'])
    def parsed_data(self, request, pk=None):
        """Get parsed transaction data from statement."""
        statement = self.get_object()

        # Get comparison if exists
        comparison = StatementComparison.objects.filter(
            user=request.user,
            statement=statement
        ).first()

        if comparison:
            return Response({
                'parsed_json': comparison.parsed_json,
                'raw_text': comparison.raw_text
            })

        return Response({
            'detail': 'No parsed data available'
        }, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'])
    def reprocess(self, request, pk=None):
        """Reprocess a statement."""
        statement = self.get_object()

        # Reset status
        statement.status = 'pending'
        statement.error_message = ''
        statement.add_log('Reprocessing requested by user')
        statement.save()

        # TODO: Trigger processing task

        return Response({
            'detail': 'Statement queued for reprocessing'
        })

    @action(detail=True, methods=['post'])
    def merge_duplicates(self, request, pk=None):
        """Merge duplicate statements."""
        statement = self.get_object()
        duplicate_id = request.data.get('duplicate_id')

        if not duplicate_id:
            return Response({
                'detail': 'duplicate_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            duplicate = Statement.objects.get(
                id=duplicate_id,
                user=request.user
            )

            # Mark as merged
            duplicate.status = 'duplicate'
            duplicate.merged_with = statement
            duplicate.save()

            # Update duplicate record
            dup_record = StatementDuplicate.objects.filter(
                user=request.user,
                statement1=statement,
                statement2=duplicate
            ).first()

            if dup_record:
                dup_record.resolution = 'merged'
                from django.utils import timezone
                dup_record.resolved_at = timezone.now()
                dup_record.resolution_notes = request.data.get('notes', '')
                dup_record.save()

            return Response({
                'detail': 'Statements merged successfully'
            })

        except Statement.DoesNotExist:
            return Response({
                'detail': 'Duplicate statement not found'
            }, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'])
    def duplicates(self, request):
        """Get all pending duplicate statements."""
        duplicates = StatementDuplicate.objects.filter(
            user=request.user,
            resolution='pending'
        ).select_related('statement1', 'statement2')

        serializer = StatementDuplicateSerializer(duplicates, many=True)
        return Response(serializer.data)


class StatementComparisonViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for Statement Comparisons (read-only)."""

    permission_classes = [IsAuthenticated]
    serializer_class = StatementComparisonSerializer

    def get_queryset(self):
        return StatementComparison.objects.filter(
            user=self.request.user
        ).select_related('statement')


class StatementDuplicateViewSet(viewsets.ModelViewSet):
    """ViewSet for managing Statement Duplicates."""

    permission_classes = [IsAuthenticated]
    serializer_class = StatementDuplicateSerializer

    def get_queryset(self):
        queryset = StatementDuplicate.objects.filter(
            user=self.request.user
        ).select_related('statement1', 'statement2')

        # Filter by resolution status
        resolution = self.request.query_params.get('resolution')
        if resolution:
            queryset = queryset.filter(resolution=resolution)

        return queryset

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        """Resolve a duplicate statement."""
        duplicate = self.get_object()

        resolution = request.data.get('resolution')
        if resolution not in ['merged', 'kept_both', 'deleted']:
            return Response({
                'detail': 'Invalid resolution. Must be: merged, kept_both, or deleted'
            }, status=status.HTTP_400_BAD_REQUEST)

        duplicate.resolution = resolution
        from django.utils import timezone
        duplicate.resolved_at = timezone.now()
        duplicate.resolution_notes = request.data.get('notes', '')
        duplicate.save()

        return Response({
            'detail': f'Duplicate resolved as: {resolution}'
        })

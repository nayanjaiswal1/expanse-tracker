"""
Transaction Deduplication API Views

Provides endpoints for:
- Finding duplicate transactions
- Merging duplicate transactions
- Auto-merging high-confidence duplicates
"""

import logging
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from datetime import datetime, timedelta

from finance.services.transaction_deduplication_service import TransactionDeduplicationService
from finance.models import Transaction

logger = logging.getLogger(__name__)


class TransactionDeduplicationViewSet(viewsets.ViewSet):
    """
    ViewSet for transaction deduplication operations.

    Endpoints:
    - GET /api/transactions/deduplication/find/ - Find all duplicates for user
    - POST /api/transactions/deduplication/merge/ - Merge specific duplicates
    - POST /api/transactions/deduplication/auto-merge/ - Auto-merge high-confidence duplicates
    - GET /api/transactions/deduplication/check/{transaction_id}/ - Check specific transaction for duplicates
    """

    permission_classes = [IsAuthenticated]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.dedup_service = TransactionDeduplicationService()

    @action(detail=False, methods=['get'], url_path='find')
    def find_duplicates(self, request):
        """
        Find all potential duplicate transactions for the current user.

        Query Parameters:
        - limit: Optional limit on transactions to process
        - start_date: Optional start date filter (YYYY-MM-DD)
        - end_date: Optional end date filter (YYYY-MM-DD)

        Returns:
            {
                "stats": {
                    "total_transactions": 1000,
                    "duplicate_groups_found": 15,
                    "total_duplicates": 30,
                    "potential_savings": 1500.00
                },
                "duplicate_groups": [
                    {
                        "primary": {transaction_data},
                        "duplicates": [
                            {
                                "transaction": {transaction_data},
                                "confidence": 0.95,
                                "reasons": ["external_id_exact_match", ...]
                            }
                        ]
                    }
                ]
            }
        """
        try:
            # Parse query parameters
            limit = request.query_params.get('limit')
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')

            if limit:
                limit = int(limit)

            if start_date:
                start_date = datetime.strptime(start_date, '%Y-%m-%d').date()

            if end_date:
                end_date = datetime.strptime(end_date, '%Y-%m-%d').date()

            # Find duplicates
            result = self.dedup_service.find_duplicates_for_user(
                user=request.user,
                limit=limit,
                start_date=start_date,
                end_date=end_date
            )

            return Response(result, status=status.HTTP_200_OK)

        except ValueError as e:
            return Response(
                {'error': f'Invalid parameter: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error finding duplicates: {str(e)}", exc_info=True)
            return Response(
                {'error': 'Failed to find duplicates'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], url_path='merge')
    def merge_duplicates(self, request):
        """
        Merge specific duplicate transactions.

        Request Body:
            {
                "primary_transaction_id": 123,
                "duplicate_transaction_ids": [456, 789],
                "merge_strategy": "merge_metadata"  // Options: keep_primary, merge_details, merge_metadata
            }

        Returns:
            {
                "status": "success",
                "primary_transaction_id": 123,
                "merged_count": 2,
                "merged_transaction_ids": [456, 789]
            }
        """
        try:
            # Validate request data
            primary_id = request.data.get('primary_transaction_id')
            duplicate_ids = request.data.get('duplicate_transaction_ids', [])
            merge_strategy = request.data.get('merge_strategy', 'keep_primary')

            if not primary_id:
                return Response(
                    {'error': 'primary_transaction_id is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if not duplicate_ids:
                return Response(
                    {'error': 'duplicate_transaction_ids is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if merge_strategy not in ['keep_primary', 'merge_details', 'merge_metadata']:
                return Response(
                    {'error': 'Invalid merge_strategy'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Get transactions
            try:
                primary_transaction = Transaction.active_objects.get(
                    id=primary_id,
                    user=request.user
                )
            except Transaction.DoesNotExist:
                return Response(
                    {'error': 'Primary transaction not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

            duplicate_transactions = Transaction.active_objects.filter(
                id__in=duplicate_ids,
                user=request.user
            )

            if duplicate_transactions.count() != len(duplicate_ids):
                return Response(
                    {'error': 'One or more duplicate transactions not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Merge transactions
            result = self.dedup_service.merge_transactions(
                primary_transaction=primary_transaction,
                duplicate_transactions=list(duplicate_transactions),
                merge_strategy=merge_strategy
            )

            return Response(result, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error merging transactions: {str(e)}", exc_info=True)
            return Response(
                {'error': 'Failed to merge transactions'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], url_path='auto-merge')
    def auto_merge(self, request):
        """
        Automatically merge high-confidence duplicate transactions (≥95% confidence).

        Request Body:
            {
                "confidence_threshold": 0.95,  // Optional, default 0.95
                "limit": 100  // Optional, limit transactions to process
            }

        Returns:
            {
                "groups_processed": 5,
                "transactions_merged": 10,
                "groups_skipped_low_confidence": 3
            }
        """
        try:
            confidence_threshold = request.data.get('confidence_threshold', 0.95)
            limit = request.data.get('limit')

            if confidence_threshold < 0.75 or confidence_threshold > 1.0:
                return Response(
                    {'error': 'confidence_threshold must be between 0.75 and 1.0'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if limit:
                limit = int(limit)

            # Auto-merge
            result = self.dedup_service.auto_merge_high_confidence_duplicates(
                user=request.user,
                confidence_threshold=confidence_threshold,
                limit=limit
            )

            return Response(result, status=status.HTTP_200_OK)

        except ValueError as e:
            return Response(
                {'error': f'Invalid parameter: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error in auto-merge: {str(e)}", exc_info=True)
            return Response(
                {'error': 'Failed to auto-merge transactions'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'], url_path='check')
    def check_transaction(self, request, pk=None):
        """
        Check a specific transaction for potential duplicates.

        Returns:
            {
                "transaction_id": 123,
                "duplicates_found": 2,
                "duplicates": [
                    {
                        "transaction": {transaction_data},
                        "confidence": 0.95,
                        "reasons": ["external_id_exact_match", ...]
                    }
                ]
            }
        """
        try:
            # Get transaction
            try:
                transaction = Transaction.active_objects.get(
                    id=pk,
                    user=request.user
                )
            except Transaction.DoesNotExist:
                return Response(
                    {'error': 'Transaction not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Find duplicates
            duplicates = self.dedup_service.find_duplicates_for_transaction(transaction)

            result = {
                'transaction_id': transaction.id,
                'duplicates_found': len(duplicates),
                'duplicates': [
                    {
                        'transaction': self.dedup_service._serialize_transaction(dup),
                        'confidence': score,
                        'reasons': reasons
                    }
                    for dup, score, reasons in duplicates
                ]
            }

            return Response(result, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error checking transaction: {str(e)}", exc_info=True)
            return Response(
                {'error': 'Failed to check transaction'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

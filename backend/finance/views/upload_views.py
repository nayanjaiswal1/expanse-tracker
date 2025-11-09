"""
Views for handling file uploads and statement processing.
"""

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from django.http import JsonResponse
from django.db.models import Q
from typing import Dict, Any

from ..models import (
    UploadSession, StatementImport, TransactionImport,
    TransactionLink, MerchantPattern, Account
)
from ..serializers import (
    UploadSessionSerializer, UploadSessionListSerializer,
    StatementImportSerializer, TransactionImportSerializer,
    TransactionLinkSerializer, MerchantPatternSerializer,
    FileUploadSerializer, UploadProgressSerializer
)
from ..services.upload_service import UploadService
from ..tasks import process_upload_session_task


class UploadSessionViewSet(viewsets.ModelViewSet):
    """ViewSet for managing upload sessions"""

    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    filterset_fields = ['account_id', 'status']

    def get_serializer_class(self):
        if self.action == 'list':
            return UploadSessionListSerializer
        return UploadSessionSerializer

    def get_queryset(self):
        return UploadSession.objects.filter(
            user=self.request.user
        ).select_related('account').order_by('-created_at')

    @action(detail=False, methods=['post'], url_path='upload')
    def upload_file(self, request):
        """Upload and process a file"""
        serializer = FileUploadSerializer(
            data=request.data,
            context={'request': request}
        )

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Create upload service
            upload_service = UploadService(request.user)

            # Create upload session
            upload_session = upload_service.create_upload_session(
                file=serializer.validated_data['file'],
                account_id=serializer.validated_data.get('account_id'),
                password=serializer.validated_data.get('password')
            )

            # Set AI categorization preference
            upload_session.ai_categorization_enabled = serializer.validated_data.get(
                'ai_categorization', True
            )
            upload_session.save()

            # If async requested, queue a background job, otherwise process synchronously
            if request.data.get('async') in ['true', '1', True]:
                process_upload_session_task.delay(
                    upload_session_id=upload_session.id,
                    user_id=request.user.id,
                    password=serializer.validated_data.get('password')
                )
                response_data = UploadSessionSerializer(upload_session).data
                response_data.update({'success': True, 'queued': True})
                return Response(response_data, status=status.HTTP_202_ACCEPTED)
            else:
                result = upload_service.process_upload_session(
                    upload_session,
                    password=serializer.validated_data.get('password')
                )

                # Return session details with processing result
                response_data = UploadSessionSerializer(upload_session).data
                response_data.update(result)

                return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['get'], url_path='status')
    def get_upload_status(self, request, pk=None):
        """Get upload session status and progress"""
        upload_session = self.get_object()

        # Calculate progress
        progress_percentage = 0
        current_step = 'Pending'

        if upload_session.status == 'processing':
            progress_percentage = 50
            current_step = 'Processing file'
        elif upload_session.status == 'completed':
            progress_percentage = 100
            current_step = 'Completed'
        elif upload_session.status == 'failed':
            progress_percentage = 0
            current_step = 'Failed'

        processed_transactions = (
            upload_session.successful_imports +
            upload_session.failed_imports +
            upload_session.duplicate_imports
        )

        progress_data = {
            'session_id': upload_session.id,
            'status': upload_session.status,
            'progress_percentage': progress_percentage,
            'current_step': current_step,
            'total_transactions': upload_session.total_transactions,
            'processed_transactions': processed_transactions,
            'successful_imports': upload_session.successful_imports,
            'failed_imports': upload_session.failed_imports,
            'duplicate_imports': upload_session.duplicate_imports,
            'error_message': upload_session.error_message or '',
            'processing_log': upload_session.processing_log
        }

        serializer = UploadProgressSerializer(progress_data)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='retry')
    def retry_processing(self, request, pk=None):
        """Retry processing a failed upload session"""
        upload_session = self.get_object()

        if upload_session.status != 'failed':
            return Response(
                {'error': 'Can only retry failed upload sessions'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            upload_service = UploadService(request.user)
            password = request.data.get('password')

            # Reset session status
            upload_session.status = 'pending'
            upload_session.error_message = ''
            upload_session.save()

            # Retry processing
            result = upload_service.process_upload_session(upload_session, password)

            response_data = UploadSessionSerializer(upload_session).data
            response_data.update(result)

            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['patch'], url_path='update-account')
    def update_account(self, request, pk=None):
        """Update account for all transactions in this upload session"""
        upload_session = self.get_object()
        account_id = request.data.get('account_id')

        if not account_id:
            return Response(
                {'error': 'account_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            account = get_object_or_404(Account, id=account_id, user=request.user)

            # Update all transactions from this upload session
            transaction_imports = upload_session.transaction_imports.filter(
                import_status='imported',
                transaction__isnull=False
            )

            updated_count = 0
            for tx_import in transaction_imports:
                tx_import.transaction.account = account
                tx_import.transaction.save()
                updated_count += 1

            # Update the session account
            upload_session.account = account
            upload_session.save()

            return Response({
                'message': f'Updated {updated_count} transactions to account {account.name}',
                'updated_count': updated_count
            })

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['get'], url_path='transactions')
    def get_transactions(self, request, pk=None):
        """Get all transaction imports for this upload session"""
        upload_session = self.get_object()

        # Filter parameters
        import_status = request.query_params.get('status')

        queryset = upload_session.transaction_imports.all()
        if import_status:
            queryset = queryset.filter(import_status=import_status)

        queryset = queryset.select_related('transaction', 'statement_import').order_by(
            'parsed_date', 'created_at'
        )

        serializer = TransactionImportSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='stats')
    def get_upload_stats(self, request):
        """Get upload statistics for the user"""
        queryset = self.get_queryset()

        stats = {
            'total_sessions': queryset.count(),
            'completed_sessions': queryset.filter(status='completed').count(),
            'failed_sessions': queryset.filter(status='failed').count(),
            'processing_sessions': queryset.filter(status='processing').count(),
            'total_transactions_imported': sum(
                session.successful_imports for session in queryset
            ),
            'total_files_size': sum(session.file_size for session in queryset),
        }

        # Recent activity
        recent_sessions = queryset[:5]
        stats['recent_sessions'] = UploadSessionListSerializer(
            recent_sessions, many=True
        ).data

        return Response(stats)


class TransactionImportViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing transaction imports"""

    serializer_class = TransactionImportSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return TransactionImport.objects.filter(
            user=self.request.user
        ).select_related(
            'upload_session', 'statement_import', 'transaction'
        ).order_by('-created_at')

    @action(detail=True, methods=['patch'], url_path='update-status')
    def update_status(self, request, pk=None):
        """Update import status (e.g., mark as skipped)"""
        tx_import = self.get_object()
        new_status = request.data.get('status')

        if new_status not in ['skipped', 'pending']:
            return Response(
                {'error': 'Invalid status. Allowed values: skipped, pending'},
                status=status.HTTP_400_BAD_REQUEST
            )

        tx_import.import_status = new_status
        tx_import.save()

        return Response(TransactionImportSerializer(tx_import).data)


class TransactionLinkViewSet(viewsets.ModelViewSet):
    """ViewSet for managing transaction links"""

    serializer_class = TransactionLinkSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return TransactionLink.objects.filter(
            user=self.request.user
        ).select_related(
            'from_transaction', 'to_transaction'
        ).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['patch'], url_path='confirm')
    def confirm_link(self, request, pk=None):
        """Confirm a transaction link"""
        link = self.get_object()
        link.is_confirmed = True
        link.save()

        return Response(self.get_serializer(link).data)

    @action(detail=False, methods=['get'], url_path='suggestions')
    def get_suggestions(self, request):
        """Get suggested transaction links"""
        # Get unconfirmed auto-detected links
        suggestions = self.get_queryset().filter(
            is_confirmed=False,
            auto_detected=True
        ).order_by('-confidence_score')[:10]

        return Response(self.get_serializer(suggestions, many=True).data)


class MerchantPatternViewSet(viewsets.ModelViewSet):
    """ViewSet for managing merchant patterns"""

    serializer_class = MerchantPatternSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Exclude soft-deleted patterns by default
        return MerchantPattern.objects.filter(
            user=self.request.user,
            is_deleted=False
        ).select_related('category').order_by('-confidence', '-usage_count')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user, is_user_confirmed=True)

    @action(detail=False, methods=['post'], url_path='learn-from-transaction')
    def learn_from_transaction(self, request):
        """Create pattern from a transaction"""
        transaction_id = request.data.get('transaction_id')
        pattern = request.data.get('pattern')

        if not transaction_id or not pattern:
            return Response(
                {'error': 'transaction_id and pattern are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            from ..models import Transaction
            transaction = get_object_or_404(
                Transaction, id=transaction_id, user=request.user
            )

            if not transaction.category:
                return Response(
                    {'error': 'Transaction must have a category'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Create or update pattern
            merchant_pattern, created = MerchantPattern.objects.get_or_create(
                user=request.user,
                pattern=pattern,
                defaults={
                    'category': transaction.category,
                    'merchant_name': transaction.merchant_name or '',
                    'confidence': 0.8,
                    'is_user_confirmed': True,
                }
            )

            if not created:
                merchant_pattern.category = transaction.category
                merchant_pattern.is_user_confirmed = True
                merchant_pattern.confidence = min(1.0, merchant_pattern.confidence + 0.2)
                merchant_pattern.save()

            return Response(
                MerchantPatternSerializer(merchant_pattern).data,
                status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
            )

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'], url_path='top-patterns')
    def get_top_patterns(self, request):
        """Get top performing patterns"""
        top_patterns = self.get_queryset().filter(
            is_active=True,
            usage_count__gt=0
        )[:20]

        return Response(self.get_serializer(top_patterns, many=True).data)

    @action(detail=True, methods=['delete'], url_path='soft-delete')
    def soft_delete(self, request, pk=None):
        """Soft delete a merchant pattern"""
        pattern = self.get_object()
        pattern.soft_delete()

        return Response({
            'message': 'Pattern deleted successfully',
            'id': pattern.id
        }, status=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        """Override destroy to use soft delete instead of hard delete"""
        pattern = self.get_object()
        pattern.soft_delete()

        return Response({
            'message': 'Pattern deleted successfully'
        }, status=status.HTTP_200_OK)
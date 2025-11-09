"""
Enhanced upload views with improved file processing and transaction preview capabilities.
"""

from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from django.db import transaction
from typing import Dict, List, Any
import json

from ..models import (
    UploadSession, StatementImport, TransactionImport,
    Account, Category, MerchantPattern, Transaction
)
from ..serializers import (
    UploadSessionSerializer, TransactionImportSerializer,
    AccountSerializer, CategorySerializer, TransactionSerializer
)
from ..services.enhanced_upload_service import EnhancedUploadService
from ..services.multi_level_parsing_service import MultiLevelParsingService


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def enhanced_file_upload(request):
    """
    Enhanced file upload with comprehensive parsing and preview capabilities.

    Supports:
    - PDF (with password protection)
    - CSV (auto-column detection)
    - JSON (flexible schema)
    - XLSX (multiple sheets)
    - Auto account detection
    - Transaction categorization
    - Duplicate detection
    """

    if 'file' not in request.FILES:
        return Response(
            {'error': 'No file provided'},
            status=status.HTTP_400_BAD_REQUEST
        )

    file = request.FILES['file']
    password = request.data.get('password')
    account_id = request.data.get('account_id')
    use_multi_level_parsing = request.data.get('use_multi_level_parsing', False)

    # Validate file size (50MB limit)
    if file.size > 50 * 1024 * 1024:
        return Response(
            {'error': 'File size exceeds 50MB limit'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Validate file type
    allowed_types = [
        'application/pdf',
        'text/csv',
        'application/json',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]

    allowed_extensions = ['.pdf', '.csv', '.json', '.xls', '.xlsx']

    file_valid = (
        file.content_type in allowed_types or
        any(file.name.lower().endswith(ext) for ext in allowed_extensions)
    )

    if not file_valid:
        return Response(
            {'error': 'Unsupported file type. Please upload PDF, CSV, JSON, XLS, or XLSX files.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # Initialize enhanced upload service
        upload_service = EnhancedUploadService(request.user)

        # Create upload session
        upload_session = upload_service.create_upload_session(
            file=file,
            account_id=account_id,
            password=password
        )

        # Process file with enhanced or multi-level parsing
        if use_multi_level_parsing:
            # Use multi-level parsing service
            multi_level_service = MultiLevelParsingService(request.user)
            parsing_result = multi_level_service.parse_statement_progressive(
                upload_session,
                password=password
            )

            if parsing_result.success:
                result = {
                    'success': True,
                    'parsed_transactions': parsing_result.transactions,
                    'warnings': [],
                    'errors': [],
                    'confidence': parsing_result.confidence,
                    'duplicate_count': 0,
                    'categorization_results': {},
                    'parsing_method': parsing_result.method,
                    'parsing_time': parsing_result.parsing_time
                }
            else:
                result = {
                    'success': False,
                    'error': parsing_result.error_message,
                    'requires_manual_correction': parsing_result.method == 'manual_correction',
                    'manual_correction_data': parsing_result.metadata.get('requires_manual_correction', False),
                    'parsed_transactions': [],
                    'warnings': [],
                    'errors': [parsing_result.error_message]
                }
        else:
            # Use original enhanced parsing
            result = upload_service.process_file_enhanced(
                upload_session,
                password=password,
                preview_mode=True  # Return parsed data without saving transactions
            )

        if not result['success']:
            if result.get('requires_password'):
                return Response({
                    'requires_password': True,
                    'error': 'Password required for encrypted PDF',
                    'session_id': upload_session.id
                }, status=status.HTTP_400_BAD_REQUEST)

            if result.get('requires_manual_correction'):
                return Response({
                    'requires_manual_correction': True,
                    'error': result.get('error', 'Manual correction required'),
                    'session_id': upload_session.id,
                    'manual_correction_data': result.get('manual_correction_data', {}),
                    'parsing_method': result.get('parsing_method', 'unknown')
                }, status=status.HTTP_400_BAD_REQUEST)

            return Response(
                {'error': result.get('error', 'Processing failed')},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Auto-detect account if not provided
        detected_account = None
        if not account_id and result.get('parsed_transactions'):
            detected_account = upload_service.detect_account_from_transactions(
                result['parsed_transactions']
            )

        # Prepare response data
        response_data = {
            'session_id': upload_session.id,
            'file_type': upload_session.file_type,
            'original_filename': upload_session.original_filename,
            'total_transactions': len(result.get('parsed_transactions', [])),
            'transactions': result.get('parsed_transactions', []),
            'detected_account': AccountSerializer(detected_account).data if detected_account else None,
            'warnings': result.get('warnings', []),
            'errors': result.get('errors', []),
            'confidence': result.get('confidence', 0.8),
            'duplicate_count': result.get('duplicate_count', 0),
            'categorization_results': result.get('categorization_results', {}),
            'parsing_method': result.get('parsing_method', 'enhanced_upload'),
            'parsing_time': result.get('parsing_time', 0),
            'multi_level_parsing_used': use_multi_level_parsing,
            'stats': {
                'total': len(result.get('parsed_transactions', [])),
                'duplicates': result.get('duplicate_count', 0),
                'errors': len(result.get('errors', [])),
                'confidence': result.get('confidence', 0.8)
            }
        }

        return Response(response_data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {'error': f'Upload processing failed: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def import_parsed_transactions(request, session_id):
    """
    Import the parsed transactions after user review and verification.
    """

    try:
        upload_session = get_object_or_404(
            UploadSession,
            id=session_id,
            user=request.user
        )

        transactions_data = request.data.get('transactions', [])
        account_id = request.data.get('account_id')

        if not account_id:
            return Response(
                {'error': 'Account ID is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        account = get_object_or_404(
            Account,
            id=account_id,
            user=request.user
        )

        # Initialize upload service
        upload_service = EnhancedUploadService(request.user)

        # Import verified transactions
        result = upload_service.import_verified_transactions(
            upload_session,
            transactions_data,
            account
        )

        if result['success']:
            upload_session.mark_completed()

            return Response({
                'success': True,
                'imported_count': result['imported_count'],
                'failed_count': result['failed_count'],
                'duplicate_count': result['duplicate_count'],
                'session_id': upload_session.id
            }, status=status.HTTP_200_OK)
        else:
            return Response(
                {'error': result.get('error', 'Import failed')},
                status=status.HTTP_400_BAD_REQUEST
            )

    except Exception as e:
        return Response(
            {'error': f'Import failed: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_upload_session_details(request, session_id):
    """
    Get detailed information about an upload session.
    """

    try:
        upload_session = get_object_or_404(
            UploadSession,
            id=session_id,
            user=request.user
        )

        # Get transaction imports for this session
        transaction_imports = upload_session.transaction_imports.all().order_by(
            'parsed_date', 'created_at'
        )

        serializer = UploadSessionSerializer(upload_session)
        session_data = serializer.data

        # Add transaction details
        session_data['transaction_imports'] = TransactionImportSerializer(
            transaction_imports, many=True
        ).data

        return Response(session_data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {'error': f'Failed to get session details: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def retry_password_protected_file(request, session_id):
    """
    Retry processing a password-protected file with provided password.
    """

    try:
        upload_session = get_object_or_404(
            UploadSession,
            id=session_id,
            user=request.user
        )

        password = request.data.get('password')
        if not password:
            return Response(
                {'error': 'Password is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Initialize upload service
        upload_service = EnhancedUploadService(request.user)

        # Reset session status
        upload_session.status = 'pending'
        upload_session.error_message = ''
        upload_session.password_attempts += 1
        upload_session.save()

        # Retry processing with password
        result = upload_service.process_file_enhanced(
            upload_session,
            password=password,
            preview_mode=True
        )

        if not result['success']:
            if result.get('requires_password'):
                return Response({
                    'requires_password': True,
                    'error': 'Invalid password',
                    'attempts': upload_session.password_attempts
                }, status=status.HTTP_400_BAD_REQUEST)

            return Response(
                {'error': result.get('error', 'Processing failed')},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Return success with parsed data
        response_data = {
            'session_id': upload_session.id,
            'file_type': upload_session.file_type,
            'total_transactions': len(result.get('parsed_transactions', [])),
            'transactions': result.get('parsed_transactions', []),
            'warnings': result.get('warnings', []),
            'errors': result.get('errors', []),
            'confidence': result.get('confidence', 0.8)
        }

        return Response(response_data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {'error': f'Retry failed: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_upload_history(request):
    """
    Get upload session history for the authenticated user.
    """
    try:
        # Get recent upload sessions for the user
        upload_sessions = UploadSession.objects.filter(
            user=request.user
        ).order_by('-created_at')[:50]  # Last 50 uploads

        history_data = []
        for session in upload_sessions:
            # Get transaction count from related statement imports
            transaction_count = 0
            statement_imports = StatementImport.objects.filter(upload_session=session)

            for statement in statement_imports:
                transaction_count += TransactionImport.objects.filter(
                    statement_import=statement
                ).count()

            # Map session status to frontend status
            if session.status == 'completed' and transaction_count > 0:
                status_mapped = 'ready'
            elif session.status == 'processing':
                status_mapped = 'parsing'
            elif session.status == 'failed' or session.error_message:
                status_mapped = 'error'
            else:
                status_mapped = 'completed'

            history_item = {
                'id': session.id,
                'name': session.original_filename,
                'size': session.file_size or 0,
                'type': session.original_filename.split('.')[-1] if '.' in session.original_filename else '',
                'status': status_mapped,
                'progress': 100 if session.status == 'completed' else 0,
                'error': session.error_message if session.status == 'failed' else None,
                'data': {
                    'sessionId': session.id,
                    'fileName': session.original_filename,
                    'fileType': session.original_filename.split('.')[-1] if '.' in session.original_filename else '',
                    'transactions': [],  # Will be populated when needed
                    'warnings': [],
                    'errors': [session.error_message] if session.error_message else [],
                    'stats': {
                        'total': transaction_count,
                        'duplicates': 0,
                        'errors': 1 if session.error_message else 0,
                        'confidence': 0.8
                    }
                } if session.status == 'completed' or session.status == 'failed' else None,
                'created_at': session.created_at.isoformat(),
                'updated_at': session.updated_at.isoformat()
            }

            history_data.append(history_item)

        return Response(history_data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {'error': f'Failed to get upload history: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_user_categories(request):
    """
    Get all categories for the authenticated user for transaction categorization.
    """

    try:
        categories = Category.objects.filter(
            user=request.user,
            is_active=True
        ).order_by('category_type', 'name')

        serializer = CategorySerializer(categories, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {'error': f'Failed to get categories: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def auto_detect_account(request):
    """
    Auto-detect account from uploaded transaction data.
    """

    try:
        transactions_data = request.data.get('transactions', [])

        if not transactions_data:
            return Response(
                {'error': 'No transaction data provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Initialize upload service
        upload_service = EnhancedUploadService(request.user)

        # Detect account
        detected_account = upload_service.detect_account_from_transactions(
            transactions_data
        )

        response_data = {
            'detected_account': AccountSerializer(detected_account).data if detected_account else None,
            'confidence': 0.8 if detected_account else 0.0,
            'detection_method': upload_service.last_detection_method if detected_account else 'none'
        }

        return Response(response_data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {'error': f'Account detection failed: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def retry_file_processing(request, session_id):
    """
    Retry processing for a failed upload session using stored file data.
    """
    try:
        # Get the upload session
        upload_session = get_object_or_404(
            UploadSession,
            id=session_id,
            user=request.user
        )

        # Check if session has stored file content
        if not upload_session.file_content:
            return Response(
                {'error': 'No file content available for retry. Please upload the file again.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Reset session status
        upload_session.status = 'processing'
        upload_session.error_message = ''
        upload_session.save()

        # Initialize upload service
        upload_service = EnhancedUploadService(request.user)

        # Determine file type from original filename
        file_extension = upload_session.original_filename.lower().split('.')[-1]

        # Retry processing based on file type
        if file_extension == 'pdf':
            result = upload_service._process_pdf_enhanced(
                upload_session,
                upload_session.file_content
            )
        elif file_extension in ['csv', 'xlsx', 'xls']:
            result = upload_service._process_csv_xlsx(
                upload_session,
                upload_session.file_content,
                file_extension
            )
        elif file_extension == 'json':
            result = upload_service._process_json(
                upload_session,
                upload_session.file_content
            )
        else:
            return Response(
                {'error': f'Unsupported file type: {file_extension}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if result['success']:
            upload_session.status = 'completed'
            upload_session.save()

            # Return the same response structure as original upload
            response_data = {
                'session_id': upload_session.id,
                'file_type': file_extension,
                'original_filename': upload_session.original_filename,
                'total_transactions': len(result.get('parsed_transactions', [])),
                'transactions': result.get('parsed_transactions', []),
                'warnings': result.get('warnings', []),
                'errors': result.get('errors', []),
                'confidence': result.get('confidence', 0.8),
                'duplicate_count': result.get('duplicate_count', 0),
                'stats': {
                    'total': len(result.get('parsed_transactions', [])),
                    'duplicates': result.get('duplicate_count', 0),
                    'errors': len(result.get('errors', [])),
                    'confidence': result.get('confidence', 0.8)
                }
            }

            return Response(response_data, status=status.HTTP_200_OK)
        else:
            upload_session.status = 'failed'
            upload_session.error_message = result.get('error', 'Processing failed')
            upload_session.save()

            return Response(
                {'error': result.get('error', 'Processing failed')},
                status=status.HTTP_400_BAD_REQUEST
            )

    except Exception as e:
        return Response(
            {'error': f'Retry failed: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_statement_transactions(request, session_id):
    """
    Get all transactions created from a specific statement/upload session.
    """
    try:
        # Get the upload session
        upload_session = get_object_or_404(
            UploadSession,
            id=session_id,
            user=request.user
        )

        # Get linked transaction IDs from the session
        transaction_ids = upload_session.linked_transactions or []

        if not transaction_ids:
            return Response({
                'transactions': [],
                'count': 0,
                'statement_id': session_id,
                'statement_filename': upload_session.original_filename
            }, status=status.HTTP_200_OK)

        # Fetch transactions by IDs
        transactions = Transaction.objects.filter(
            id__in=transaction_ids,
            user=request.user,
            status='active'
        ).select_related('account').order_by('-date', '-created_at')

        # Serialize transactions
        serializer = TransactionSerializer(transactions, many=True)

        return Response({
            'transactions': serializer.data,
            'count': len(serializer.data),
            'statement_id': session_id,
            'statement_filename': upload_session.original_filename,
            'upload_date': upload_session.created_at.isoformat() if upload_session.created_at else None
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {'error': f'Failed to get statement transactions: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

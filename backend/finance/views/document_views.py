"""
API views for transaction document management (receipts, invoices, bills).
Supports upload, OCR extraction, AI processing, and auto-transaction creation.
"""

import logging
from io import BytesIO

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction as db_transaction

from finance.models import TransactionDocument, Transaction, TransactionDetail, Category
from finance.serializers import (
    TransactionDocumentSerializer,
    DocumentUploadSerializer,
    DocumentBulkUploadSerializer,
    DocumentProcessSerializer,
    DocumentVerificationSerializer,
)
from services.storage_service import storage_service
from services.document_ocr_service import document_ocr_service


logger = logging.getLogger(__name__)


class DocumentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing transaction documents.

    Endpoints:
    - GET /api/documents/ - List all documents
    - POST /api/documents/ - Upload a single document
    - GET /api/documents/{id}/ - Get document details
    - PATCH /api/documents/{id}/ - Update document
    - DELETE /api/documents/{id}/ - Delete document
    - POST /api/documents/upload/ - Upload with OCR processing
    - POST /api/documents/bulk-upload/ - Upload multiple documents
    - POST /api/documents/process/ - Process uploaded document
    - POST /api/documents/verify/ - Verify extracted data
    - POST /api/documents/create-transaction/ - Create transaction from document
    """

    serializer_class = TransactionDocumentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter documents by user."""
        return TransactionDocument.objects.filter(
            user=self.request.user
        ).select_related('transaction').order_by('-created_at')

    def perform_create(self, serializer):
        """Set user when creating document."""
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['post'], url_path='upload')
    def upload_document(self, request):
        """
        Upload a document with automatic OCR and AI extraction.

        Request:
        - file: File upload (JPEG, PNG, PDF)
        - document_type: receipt|invoice|bill|statement|other
        - transaction_id: Optional transaction to attach to
        - auto_process: Auto-run OCR and AI extraction (default: True)
        - auto_create_transaction: Auto-create transaction from extracted data (default: False)
        - ai_model: Optional AI model to use
        - notes: Optional notes

        Response:
        {
            "document": {...},
            "extracted_data": {...},
            "transaction": {...} (if auto_create_transaction=True)
        }
        """
        serializer = DocumentUploadSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        uploaded_file = serializer.validated_data['file']
        document_type = serializer.validated_data.get('document_type', 'receipt')
        transaction_id = serializer.validated_data.get('transaction_id')
        auto_process = serializer.validated_data.get('auto_process', True)
        auto_create = serializer.validated_data.get('auto_create_transaction', False)
        processing_method = serializer.validated_data.get('processing_method', 'auto')
        ai_model = serializer.validated_data.get('ai_model')
        notes = serializer.validated_data.get('notes', '')

        try:
            # Step 1: Save file to storage (S3 or local)
            folder = f"documents/{document_type}s"
            file_path, file_url = storage_service.save_uploaded_file(uploaded_file, folder)

            # Step 2: Create document record
            document = TransactionDocument.objects.create(
                user=request.user,
                transaction_id=transaction_id,
                file_path=file_path,
                file_url=file_url,
                original_filename=uploaded_file.name,
                file_size=uploaded_file.size,
                content_type=uploaded_file.content_type,
                document_type=document_type,
                notes=notes,
                metadata={
                    'upload_source': 'api',
                    'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                    'processing_method': processing_method,
                }
            )

            response_data = {
                'document': TransactionDocumentSerializer(document).data,
                'message': 'Document uploaded successfully'
            }

            # Step 3: Process document if requested
            if auto_process:
                document.mark_processing_started()

                # Get file content
                file_content = BytesIO(uploaded_file.read())

                # Process with OCR and AI based on user's chosen method
                result = document_ocr_service.process_document(
                    file_content,
                    uploaded_file.name,
                    document_type,
                    ai_model,
                    processing_method=processing_method
                )

                if result.get('success'):
                    # Update document with extracted data
                    document.ocr_text = result.get('ocr_text', '')
                    document.mark_processing_completed(
                        extracted_data=result.get('structured_data', {}),
                        confidence=result.get('confidence', 0.7),
                        model_used=result.get('model_used')
                    )

                    response_data['extracted_data'] = result.get('structured_data', {})

                    # Step 4: Auto-create transaction if requested
                    if auto_create and result.get('structured_data'):
                        transaction_result = self._create_transaction_from_document(
                            document,
                            result['structured_data']
                        )
                        if transaction_result.get('success'):
                            response_data['transaction'] = transaction_result['transaction']
                            response_data['items'] = transaction_result.get('items', [])
                        else:
                            response_data['transaction_error'] = transaction_result.get('error')

                else:
                    document.mark_processing_failed(result.get('error', 'Unknown error'))
                    response_data['processing_error'] = result.get('error')

                # Refresh document data
                response_data['document'] = TransactionDocumentSerializer(document).data

            return Response(response_data, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Error uploading document: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], url_path='bulk-upload')
    def bulk_upload(self, request):
        """
        Upload multiple documents at once.

        Request:
        - files: List of files
        - document_type: receipt|invoice|bill|statement|other
        - auto_process: Auto-run OCR on all (default: True)
        - auto_create_transaction: Auto-create transactions (default: False)
        - ai_model: Optional AI model

        Response:
        {
            "uploaded": [...],
            "failed": [...]
        }
        """
        serializer = DocumentBulkUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        files = serializer.validated_data['files']
        document_type = serializer.validated_data.get('document_type', 'receipt')
        auto_process = serializer.validated_data.get('auto_process', True)
        auto_create = serializer.validated_data.get('auto_create_transaction', False)
        ai_model = serializer.validated_data.get('ai_model')

        uploaded = []
        failed = []

        for uploaded_file in files:
            try:
                # Save file
                folder = f"documents/{document_type}s"
                file_path, file_url = storage_service.save_uploaded_file(uploaded_file, folder)

                # Create document
                document = TransactionDocument.objects.create(
                    user=request.user,
                    file_path=file_path,
                    file_url=file_url,
                    original_filename=uploaded_file.name,
                    file_size=uploaded_file.size,
                    content_type=uploaded_file.content_type,
                    document_type=document_type,
                    metadata={'upload_source': 'bulk_api'}
                )

                doc_data = TransactionDocumentSerializer(document).data

                # Process if requested
                if auto_process:
                    document.mark_processing_started()
                    file_content = BytesIO(uploaded_file.read())

                    result = document_ocr_service.process_document(
                        file_content,
                        uploaded_file.name,
                        document_type,
                        ai_model
                    )

                    if result.get('success'):
                        document.mark_processing_completed(
                            extracted_data=result.get('structured_data', {}),
                            confidence=result.get('confidence', 0.7),
                            model_used=result.get('model_used')
                        )
                        doc_data['extracted_data'] = result.get('structured_data', {})

                        if auto_create:
                            trans_result = self._create_transaction_from_document(
                                document,
                                result['structured_data']
                            )
                            doc_data['transaction_created'] = trans_result.get('success', False)

                uploaded.append(doc_data)

            except Exception as e:
                logger.error(f"Failed to upload {uploaded_file.name}: {str(e)}")
                failed.append({
                    'filename': uploaded_file.name,
                    'error': str(e)
                })

        return Response({
            'uploaded': uploaded,
            'failed': failed,
            'total': len(files),
            'success_count': len(uploaded),
            'failed_count': len(failed)
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='process')
    def process_document(self, request):
        """
        Process an already uploaded document.

        Request:
        - document_id: ID of document to process
        - ai_model: Optional AI model
        - auto_create_transaction: Auto-create transaction (default: False)

        Response:
        {
            "document": {...},
            "extracted_data": {...},
            "transaction": {...} (if auto_create=True)
        }
        """
        serializer = DocumentProcessSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        document_id = serializer.validated_data['document_id']
        ai_model = serializer.validated_data.get('ai_model')
        auto_create = serializer.validated_data.get('auto_create_transaction', False)

        try:
            document = TransactionDocument.objects.get(id=document_id, user=request.user)

            # Get file from storage
            file_content = storage_service.get_file(document.file_path)

            # Process
            document.mark_processing_started()

            result = document_ocr_service.process_document(
                file_content,
                document.original_filename,
                document.document_type,
                ai_model
            )

            response_data = {}

            if result.get('success'):
                document.mark_processing_completed(
                    extracted_data=result.get('structured_data', {}),
                    confidence=result.get('confidence', 0.7),
                    model_used=result.get('model_used')
                )

                response_data['extracted_data'] = result.get('structured_data', {})

                if auto_create:
                    trans_result = self._create_transaction_from_document(
                        document,
                        result['structured_data']
                    )
                    if trans_result.get('success'):
                        response_data['transaction'] = trans_result['transaction']
                        response_data['items'] = trans_result.get('items', [])
            else:
                document.mark_processing_failed(result.get('error', 'Unknown error'))
                response_data['error'] = result.get('error')

            response_data['document'] = TransactionDocumentSerializer(document).data

            return Response(response_data)

        except TransactionDocument.DoesNotExist:
            return Response(
                {'error': 'Document not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error processing document: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], url_path='verify')
    def verify_extraction(self, request):
        """
        Verify and optionally correct extracted data.

        Request:
        - document_id: ID of document
        - verified: True/False
        - corrected_data: Optional corrections

        Response:
        {
            "document": {...}
        }
        """
        serializer = DocumentVerificationSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        document_id = serializer.validated_data['document_id']
        verified = serializer.validated_data['verified']
        corrected_data = serializer.validated_data.get('corrected_data')

        try:
            document = TransactionDocument.objects.get(id=document_id, user=request.user)

            document.user_verified = verified
            if corrected_data:
                document.user_corrected_data = corrected_data

            document.save(update_fields=['user_verified', 'user_corrected_data'])

            return Response({
                'document': TransactionDocumentSerializer(document).data,
                'message': 'Verification saved successfully'
            })

        except TransactionDocument.DoesNotExist:
            return Response(
                {'error': 'Document not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'], url_path='create-transaction')
    def create_transaction_from_document(self, request, pk=None):
        """
        Create a transaction from a processed document.

        Response:
        {
            "transaction": {...},
            "items": [...]
        }
        """
        try:
            document = self.get_object()

            if not document.is_processed:
                return Response(
                    {'error': 'Document not yet processed'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if document.transaction:
                return Response(
                    {'error': 'Transaction already exists for this document'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            result = self._create_transaction_from_document(
                document,
                document.extracted_data
            )

            if result.get('success'):
                return Response(result)
            else:
                return Response(
                    {'error': result.get('error')},
                    status=status.HTTP_400_BAD_REQUEST
                )

        except Exception as e:
            logger.error(f"Error creating transaction: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _create_transaction_from_document(self, document, extracted_data):
        """Helper to create transaction from extracted data."""
        from datetime import datetime
        from finance.serializers import TransactionSerializer

        try:
            with db_transaction.atomic():
                # Create transaction
                transaction = Transaction.objects.create(
                    user=document.user,
                    amount=extracted_data.get('total_amount', 0),
                    description=f"{extracted_data.get('merchant', 'Unknown')} - {document.document_type}",
                    date=extracted_data.get('date') or datetime.now().date(),
                    is_credit=extracted_data.get('transaction_type') == 'refund',
                    metadata={
                        'source': 'document_upload',
                        'document_id': document.id,
                        'merchant': extracted_data.get('merchant'),
                        'payment_method': extracted_data.get('payment_method'),
                        'reference_number': extracted_data.get('reference_number'),
                    }
                )

                # Attach document
                document.attach_to_transaction(transaction)

                # Create line items
                items_created = []
                for item in extracted_data.get('items', []):
                    # Get or create category if category name is provided
                    category = None
                    category_name = item.get('category')
                    if category_name:
                        category, _ = Category.objects.get_or_create(
                            user=document.user,
                            name=category_name,
                            defaults={
                                'category_type': 'expense',
                                'icon': '📦',
                                'color': '#9E9E9E'
                            }
                        )

                    detail = TransactionDetail.create_line_item(
                        transaction=transaction,
                        name=item.get('name'),
                        amount=item.get('amount', 0),
                        quantity=item.get('quantity', 1),
                        unit_price=item.get('unit_price'),
                        category=category,
                    )
                    items_created.append({
                        'id': detail.id,
                        'name': detail.name,
                        'amount': detail.amount,
                        'category': category.name if category else None
                    })

                return {
                    'success': True,
                    'transaction': TransactionSerializer(transaction).data,
                    'items': items_created,
                    'items_count': len(items_created)
                }

        except Exception as e:
            logger.error(f"Error creating transaction from document: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

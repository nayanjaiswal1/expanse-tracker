"""
API views for interactive statement upload and parsing flow.
"""

import hashlib
import io
from decimal import Decimal, InvalidOperation
from typing import Dict, Any
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.files.uploadedfile import UploadedFile
from django.db import transaction as db_transaction
from django.utils import timezone

from finance.models import (
    UploadSession, StatementImport, Transaction,
    TransactionImport, Tag
)
from finance.serializers import (
    UploadSessionSerializer,
    TransactionSerializer
)
from services.ai_table_extractor import TableExtractorService
from services.ai_bank_statement_parsers import parse_bank_statement

try:
    import fitz  # PyMuPDF
    PYMUPDF_AVAILABLE = True
except ImportError:
    PYMUPDF_AVAILABLE = False


class StatementUploadViewSet(viewsets.ModelViewSet):
    """
    ViewSet for interactive statement upload and parsing flow.

    Workflow:
    1. POST /upload/ - Upload file, create session
    2. POST /{id}/parse/ - Parse and extract data
    3. POST /{id}/extract-table/ - Extract table from user-drawn region
    4. GET /{id}/check-duplicates/ - Check for duplicate transactions
    5. POST /{id}/save-transactions/ - Save as real transactions
    """

    serializer_class = UploadSessionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UploadSession.objects.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        """
        Upload a statement file and create an upload session.
        Returns session ID and file metadata for the review page.
        """
        file: UploadedFile = request.FILES.get('file')
        account_id = request.data.get('account_id')

        if not file:
            return Response(
                {'error': 'No file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Read file content
        file_bytes = file.read()
        file_hash = hashlib.sha256(file_bytes).hexdigest()

        # Check for duplicate upload
        existing = UploadSession.objects.filter(
            user=request.user,
            file_hash=file_hash,
            status__in=['completed', 'processing']
        ).first()

        if existing:
            return Response({
                'message': 'File already uploaded',
                'session': self.get_serializer(existing).data
            }, status=status.HTTP_200_OK)

        # Create upload session
        session = UploadSession.objects.create(
            user=request.user,
            original_filename=file.name,
            file_type=file.name.split('.')[-1].lower(),
            file_size=file.size,
            file_hash=file_hash,
            file_content=file_bytes,
            account_id=account_id if account_id else None,
            status='pending'
        )

        # Extract page count for PDFs
        page_count = 1
        if session.file_type == 'pdf' and PYMUPDF_AVAILABLE:
            try:
                pdf_doc = fitz.open(stream=file_bytes, filetype='pdf')
                page_count = len(pdf_doc)
                pdf_doc.close()
            except:
                pass

        return Response({
            'session_id': session.id,
            'file_name': session.original_filename,
            'file_size': session.file_size,
            'file_type': session.file_type,
            'page_count': page_count,
            'status': session.status,
            'message': 'File uploaded successfully. Ready for parsing.'
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['POST'])
    def parse(self, request, pk=None):
        """
        Parse the uploaded statement file.
        Supports auto-detection or user-specified extraction method.
        """
        session = self.get_object()

        if session.status == 'completed':
            return Response({
                'message': 'Session already parsed',
                'data': session.table_extraction_metadata
            })

        extraction_mode = request.data.get('mode', 'auto')  # auto, manual, hybrid
        ai_model = request.data.get('ai_model', 'anthropic_claude_sonnet')

        session.mark_processing()

        try:
            file_bytes = bytes(session.file_content)

            # Convert PDF pages to images if needed
            pages_data = []
            if session.file_type == 'pdf' and PYMUPDF_AVAILABLE:
                pdf_doc = fitz.open(stream=file_bytes, filetype='pdf')
                for page_num in range(len(pdf_doc)):
                    page = pdf_doc[page_num]
                    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))  # 2x zoom
                    img_bytes = pix.tobytes('png')
                    pages_data.append((img_bytes, page_num + 1))
                pdf_doc.close()
            else:
                # Single image file
                pages_data = [(file_bytes, 1)]

            # Initialize table extractor
            extractor = TableExtractorService(ai_model=ai_model)

            # Extract tables
            if extraction_mode == 'auto':
                result = extractor.extract_multi_page_tables(
                    pages=pages_data,
                    auto_detect=True
                )
            else:
                # Manual mode - wait for user to draw regions
                result = {
                    'total_pages': len(pages_data),
                    'total_tables': 0,
                    'tables': [],
                    'mode': 'manual',
                    'message': 'Ready for manual table selection'
                }

            # Also try traditional parser for metadata
            metadata = {}
            if session.file_type == 'pdf':
                try:
                    # Extract text for traditional parsing
                    pdf_doc = fitz.open(stream=file_bytes, filetype='pdf')
                    full_text = ''
                    for page in pdf_doc:
                        full_text += page.get_text()
                    pdf_doc.close()

                    parsed = parse_bank_statement(full_text)
                    metadata = parsed.get('metadata', {})
                except:
                    pass

            # Store extraction results
            session.extracted_tables = result.get('tables', [])
            session.table_extraction_metadata = {
                'ai_model': ai_model,
                'extraction_mode': extraction_mode,
                'total_tables': result.get('total_tables', 0),
                'total_pages': result.get('total_pages', 0),
                'errors': result.get('errors', []),
                'parsed_at': timezone.now().isoformat(),
                'bank_metadata': metadata
            }

            # Convert tables to transactions format
            all_transactions = []
            for table in result.get('tables', []):
                txs = extractor.convert_table_to_transactions(
                    table,
                    account_id=session.account_id
                )
                all_transactions.extend(txs)

            session.total_transactions = len(all_transactions)
            session.save()

            # Create StatementImport record
            statement_import = StatementImport.objects.create(
                user=request.user,
                upload_session=session,
                parsed_data={'transactions': all_transactions},
                metadata=metadata
            )

            return Response({
                'session_id': session.id,
                'statement_import_id': statement_import.id,
                'tables': result.get('tables', []),
                'transactions': all_transactions,
                'metadata': metadata,
                'extraction_metadata': session.table_extraction_metadata,
                'total_transactions': len(all_transactions)
            })

        except Exception as e:
            session.mark_failed(str(e))
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['POST'])
    def extract_table(self, request, pk=None):
        """
        Extract table from a user-drawn region on the PDF.

        Request body:
        {
            "page_number": 1,
            "bounding_box": {"x": 10, "y": 20, "width": 80, "height": 60},
            "table_type": "transactions"
        }
        """
        session = self.get_object()

        page_number = request.data.get('page_number', 1)
        bounding_box = request.data.get('bounding_box')
        table_type = request.data.get('table_type', 'transactions')
        ai_model = request.data.get('ai_model', 'anthropic_claude_sonnet')

        if not bounding_box:
            return Response(
                {'error': 'bounding_box is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            file_bytes = bytes(session.file_content)

            # Get specific page
            if session.file_type == 'pdf' and PYMUPDF_AVAILABLE:
                pdf_doc = fitz.open(stream=file_bytes, filetype='pdf')
                page = pdf_doc[page_number - 1]
                pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
                page_bytes = pix.tobytes('png')
                pdf_doc.close()
            else:
                page_bytes = file_bytes

            # Extract table
            extractor = TableExtractorService(ai_model=ai_model)
            result = extractor.extract_table_from_region(
                image_bytes=page_bytes,
                bounding_box=bounding_box,
                page_number=page_number,
                table_type=table_type
            )

            if 'error' in result:
                return Response(result, status=status.HTTP_400_BAD_REQUEST)

            # Convert to transactions
            transactions = extractor.convert_table_to_transactions(
                result,
                account_id=session.account_id
            )

            # Add to session's extracted tables
            if not session.extracted_tables:
                session.extracted_tables = []

            session.extracted_tables.append(result)
            session.total_transactions += len(transactions)
            session.save()

            # Update statement import
            statement_import = StatementImport.objects.filter(
                upload_session=session
            ).first()

            if statement_import:
                existing_txs = statement_import.parsed_data.get('transactions', [])
                existing_txs.extend(transactions)
                statement_import.parsed_data['transactions'] = existing_txs
                statement_import.save()

            return Response({
                'table': result,
                'transactions': transactions,
                'total_transactions_extracted': len(transactions)
            })

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['GET'])
    def check_duplicates(self, request, pk=None):
        """
        Check for duplicate transactions before importing.
        Compares against existing transactions by date, amount, and description.
        """
        session = self.get_object()

        statement_import = StatementImport.objects.filter(
            upload_session=session
        ).first()

        if not statement_import:
            return Response(
                {'error': 'No parsed data found'},
                status=status.HTTP_404_NOT_FOUND
            )

        transactions = statement_import.parsed_data.get('transactions', [])

        if not transactions:
            return Response({
                'duplicates': [],
                'unique': [],
                'total': 0
            })

        duplicates = []
        unique = []

        for tx in transactions:
            # Check for duplicates
            existing = Transaction.objects.filter(
                user=request.user,
                date=tx.get('date'),
                amount=tx.get('amount'),
                description__icontains=tx.get('description', '')[:50]
            ).first()

            if existing:
                duplicates.append({
                    **tx,
                    'duplicate_of': existing.id,
                    'status': 'duplicate'
                })
            else:
                unique.append({**tx, 'status': 'new'})

        return Response({
            'duplicates': duplicates,
            'unique': unique,
            'total': len(transactions),
            'duplicate_count': len(duplicates),
            'unique_count': len(unique)
        })

    @action(detail=True, methods=['POST'])
    def save_transactions(self, request, pk=None):
        """
        Save parsed transactions as real Transaction records.

        Request body:
        {
            "transactions": [...],  # Optional: specific transactions to save
            "skip_duplicates": true,
            "add_tag": "statement-import"
        }
        """
        session = self.get_object()

        statement_import = StatementImport.objects.filter(
            upload_session=session
        ).first()

        if not statement_import:
            return Response(
                {'error': 'No parsed data found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get transactions to save
        transactions_to_save = request.data.get('transactions')
        if not transactions_to_save:
            transactions_to_save = statement_import.parsed_data.get('transactions', [])

        skip_duplicates = request.data.get('skip_duplicates', True)
        tag_name = request.data.get('add_tag', 'statement-import')

        # Get or create tag
        tag = None
        if tag_name:
            tag, _ = Tag.objects.get_or_create(
                user=request.user,
                name=tag_name,
                defaults={'color': '#3B82F6'}
            )

        created_transactions = []
        skipped_duplicates = []
        failed = []

        with db_transaction.atomic():
            for tx_data in transactions_to_save:
                try:
                    raw_amount = tx_data.get('amount', 0)
                    amount_decimal = Decimal(str(raw_amount))
                    is_credit = amount_decimal >= 0
                    amount_decimal = abs(amount_decimal)
                    if amount_decimal <= 0:
                        raise ValueError("Transaction amount must be greater than zero")

                    subtype = tx_data.get('transaction_subtype') or tx_data.get('transaction_type')
                    if not subtype:
                        subtype = 'income' if is_credit else 'expense'

                    # Check for duplicates
                    if skip_duplicates:
                        existing = Transaction.objects.filter(
                            user=request.user,
                            date=tx_data.get('date'),
                            amount=amount_decimal,
                            is_credit=is_credit,
                            description__icontains=tx_data.get('description', '')[:50]
                        ).exists()

                        if existing:
                            skipped_duplicates.append(tx_data)
                            session.duplicate_imports += 1
                            continue

                    metadata = {
                        'source': 'statement_import',
                        'upload_session_id': session.id,
                        'balance': tx_data.get('balance'),
                        'transaction_subtype': subtype,
                    }
                    if tx_data.get('transaction_category'):
                        metadata['transaction_category'] = tx_data['transaction_category']

                    category_id = tx_data.get('category_id')
                    if isinstance(category_id, str):
                        category_id = category_id.strip()
                        category_id = int(category_id) if category_id else None
                    elif category_id is not None and category_id != '':
                        try:
                            category_id = int(category_id)
                        except (TypeError, ValueError):
                            category_id = None
                    else:
                        category_id = None

                    if isinstance(category_id, int) and category_id <= 0:
                        category_id = None

                    # Create transaction
                    tx = Transaction.objects.create(
                        user=request.user,
                        date=tx_data['date'],
                        amount=amount_decimal,
                        is_credit=is_credit,
                        description=tx_data.get('description', ''),
                        currency=tx_data.get('currency', 'USD'),
                        notes=tx_data.get('notes', ''),
                        account_id=tx_data.get('account_id') or session.account_id,
                        external_id=tx_data.get('external_id'),
                        category_id=category_id,
                        metadata=metadata,
                    )

                    # Add tag
                    if tag:
                        tx.tags.add(tag)

                    # Create import record
                    TransactionImport.objects.create(
                        user=request.user,
                        upload_session=session,
                        statement_import=statement_import,
                        transaction=tx,
                        import_status='imported',
                        raw_data=tx_data,
                        parsed_amount=tx.amount,
                        parsed_date=tx.date,
                        parsed_description=tx.description
                    )

                    created_transactions.append(tx)
                    session.successful_imports += 1

                except (ValueError, InvalidOperation) as parse_error:
                    failed.append({
                        'transaction': tx_data,
                        'error': str(parse_error)
                    })
                    session.failed_imports += 1
                except Exception as e:
                    failed.append({
                        'transaction': tx_data,
                        'error': str(e)
                    })
                    session.failed_imports += 1

            # Update session
            session.linked_transactions = [tx.id for tx in created_transactions]
            session.mark_completed()

        # Serialize created transactions
        serializer = TransactionSerializer(
            created_transactions,
            many=True,
            context={'request': request}
        )

        return Response({
            'success': True,
            'created': len(created_transactions),
            'skipped_duplicates': len(skipped_duplicates),
            'failed': len(failed),
            'transactions': serializer.data,
            'session_id': session.id
        })

    @action(detail=True, methods=['GET'])
    def get_pdf_page(self, request, pk=None):
        """
        Get a specific PDF page as an image for rendering in frontend.

        Query params:
        - page_number: Page to retrieve (1-indexed)
        - scale: Image scale (default 2.0 for better quality)
        """
        session = self.get_object()

        if session.file_type != 'pdf':
            return Response(
                {'error': 'Not a PDF file'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not PYMUPDF_AVAILABLE:
            return Response(
                {'error': 'PDF processing not available'},
                status=status.HTTP_501_NOT_IMPLEMENTED
            )

        page_number = int(request.query_params.get('page_number', 1))
        scale = float(request.query_params.get('scale', 2.0))

        try:
            file_bytes = bytes(session.file_content)
            pdf_doc = fitz.open(stream=file_bytes, filetype='pdf')

            if page_number < 1 or page_number > len(pdf_doc):
                return Response(
                    {'error': 'Invalid page number'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            page = pdf_doc[page_number - 1]
            pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale))
            img_bytes = pix.tobytes('png')
            pdf_doc.close()

            # Return as base64
            import base64
            img_b64 = base64.b64encode(img_bytes).decode('utf-8')

            return Response({
                'page_number': page_number,
                'image': f'data:image/png;base64,{img_b64}',
                'width': pix.width,
                'height': pix.height
            })

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

"""
ML training data export views for preparing datasets.
"""

import logging
import json
import csv
from io import StringIO
from datetime import datetime

from rest_framework import views, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.http import HttpResponse

from finance.models import TransactionDocument, TransactionDetail, Transaction
from training.models import AILabel, UnifiedTransaction


logger = logging.getLogger(__name__)


class MLDatasetExportView(views.APIView):
    """
    Export ML training dataset from verified documents and transactions.

    Query Parameters:
    - format: json|csv|jsonl (default: jsonl)
    - verified_only: true|false (default: true)
    - include_corrections: true|false (default: true)
    - min_confidence: Minimum confidence score (0-1)
    - start_date: Start date filter
    - end_date: End date filter
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        # Parse parameters
        export_format = request.query_params.get('format', 'jsonl')
        verified_only = request.query_params.get('verified_only', 'true').lower() == 'true'
        include_corrections = request.query_params.get('include_corrections', 'true').lower() == 'true'
        min_confidence = float(request.query_params.get('min_confidence', 0.0))
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        # Build query for documents
        documents = TransactionDocument.objects.filter(
            user=user,
            processing_status='completed'
        ).select_related('transaction')

        if verified_only:
            documents = documents.filter(user_verified=True)
        if min_confidence > 0:
            documents = documents.filter(extraction_confidence__gte=min_confidence)
        if start_date:
            documents = documents.filter(created_at__gte=start_date)
        if end_date:
            documents = documents.filter(created_at__lte=end_date)

        # Prepare dataset
        dataset = []
        for doc in documents:
            # Base extracted data
            extracted = doc.extracted_data

            # Use corrected data if available
            if include_corrections and doc.user_corrected_data:
                extracted = {**extracted, **doc.user_corrected_data}

            training_item = {
                'document_id': doc.id,
                'document_type': doc.document_type,
                'ocr_text': doc.ocr_text,
                'extracted_data': extracted,
                'confidence': float(doc.extraction_confidence),
                'verified': doc.user_verified,
                'ai_model': doc.ai_model_used,
                'created_at': doc.created_at.isoformat() if doc.created_at else None,
            }

            # Add transaction data if exists
            if doc.transaction:
                training_item['transaction'] = {
                    'id': doc.transaction.id,
                    'amount': float(doc.transaction.amount),
                    'description': doc.transaction.description,
                    'date': doc.transaction.date.isoformat() if doc.transaction.date else None,
                    'is_credit': doc.transaction.is_credit,
                }

                # Add line items
                items = TransactionDetail.objects.filter(transaction=doc.transaction)
                if items.exists():
                    training_item['transaction']['items'] = [
                        {
                            'name': item.name,
                            'amount': float(item.amount) if item.amount else 0,
                            'quantity': float(item.quantity) if item.quantity else 1,
                            'unit_price': float(item.unit_price) if item.unit_price else 0,
                            'category': item.category.name if item.category else None,
                        }
                        for item in items
                    ]

            dataset.append(training_item)

        # Export in requested format
        if export_format == 'json':
            return Response({
                'dataset': dataset,
                'count': len(dataset),
                'metadata': {
                    'exported_at': datetime.now().isoformat(),
                    'verified_only': verified_only,
                    'include_corrections': include_corrections,
                    'min_confidence': min_confidence,
                }
            })

        elif export_format == 'jsonl':
            # JSONL format (one JSON object per line)
            output = StringIO()
            for item in dataset:
                output.write(json.dumps(item) + '\n')

            response = HttpResponse(output.getvalue(), content_type='application/x-jsonlines')
            response['Content-Disposition'] = f'attachment; filename="training_data_{datetime.now().strftime("%Y%m%d_%H%M%S")}.jsonl"'
            return response

        elif export_format == 'csv':
            # CSV format (flattened)
            output = StringIO()
            if dataset:
                # Flatten the data structure
                flattened = []
                for item in dataset:
                    flat_item = {
                        'document_id': item['document_id'],
                        'document_type': item['document_type'],
                        'ocr_text': item['ocr_text'],
                        'merchant': item['extracted_data'].get('merchant', ''),
                        'total_amount': item['extracted_data'].get('total_amount', 0),
                        'date': item['extracted_data'].get('date', ''),
                        'confidence': item['confidence'],
                        'verified': item['verified'],
                        'ai_model': item['ai_model'],
                    }
                    flattened.append(flat_item)

                writer = csv.DictWriter(output, fieldnames=flattened[0].keys())
                writer.writeheader()
                writer.writerows(flattened)

            response = HttpResponse(output.getvalue(), content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="training_data_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv"'
            return response

        else:
            return Response(
                {'error': 'Invalid format. Use json, jsonl, or csv'},
                status=status.HTTP_400_BAD_REQUEST
            )


class CategoryTrainingDataView(views.APIView):
    """
    Export category prediction training data.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        # Get all transaction details with categories
        items = TransactionDetail.objects.filter(
            transaction__user=user,
            category__isnull=False
        ).select_related('category', 'transaction')[:5000]

        dataset = []
        for item in items:
            dataset.append({
                'text': item.name,
                'category': item.category.name if item.category else None,
                'amount': float(item.amount) if item.amount else 0,
                'transaction_description': item.transaction.description if item.transaction else '',
                'quantity': float(item.quantity) if item.quantity else 1,
            })

        return Response({
            'dataset': dataset,
            'count': len(dataset),
            'categories': list(set(item['category'] for item in dataset if item['category'])),
        })


class EmailExtractionDataView(views.APIView):
    """
    Export email extraction training data.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        # Get AI labels that have been verified
        labels = AILabel.objects.filter(
            raw_email__user=user,
            user_verified=True
        ).select_related('raw_email')[:1000]

        dataset = []
        for label in labels:
            # Use corrected data if available, otherwise use original
            data = label.user_corrected_data if label.user_corrected_data else {
                'label': label.label,
                'transaction_type': label.transaction_type,
                'amount': float(label.amount) if label.amount else None,
                'merchant': label.merchant,
                'date': label.transaction_date.isoformat() if label.transaction_date else None,
            }

            dataset.append({
                'email_subject': label.raw_email.subject if label.raw_email else '',
                'email_body': label.raw_email.body_text if label.raw_email else '',
                'email_sender': label.raw_email.sender if label.raw_email else '',
                'extracted_data': data,
                'confidence': float(label.label_confidence) if label.label_confidence else 0,
            })

        return Response({
            'dataset': dataset,
            'count': len(dataset),
        })

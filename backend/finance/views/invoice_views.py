"""
Invoice upload and processing views with multi-model support and training data capture.
"""

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.conf import settings
from services.enhanced_invoice_parser import EnhancedInvoiceParser
from ..models import InvoiceParsingAttempt, InvoiceFieldCorrection
from ..serializers_invoice import (
    InvoiceUploadSerializer,
    InvoiceApprovalSerializer,
    TransactionWithLineItemsSerializer,
)


class InvoiceModelsView(APIView):
    """
    Get available AI models for invoice parsing.

    GET /api/finance/invoices/models/
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Return available AI models."""
        models = EnhancedInvoiceParser.get_available_models()
        return Response({'models': models}, status=status.HTTP_200_OK)


class InvoiceUploadView(APIView):
    """
    Handle invoice file upload and parsing with multi-model support.

    POST /api/finance/invoices/upload/
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Upload and parse invoice file."""
        serializer = InvoiceUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        uploaded_file = serializer.validated_data['file']
        ai_model = request.data.get('ai_model', 'ollama_llama3')

        try:
            # Read file bytes
            file_bytes = uploaded_file.read()

            # Parse invoice using selected AI model
            parser = EnhancedInvoiceParser(ai_model=ai_model)
            parsed_data = parser.parse_invoice(
                file_bytes=file_bytes,
                file_name=uploaded_file.name,
                user=request.user,
                store_training_data=True
            )

            # Check for errors
            if parsed_data.get('error'):
                return Response(
                    {
                        'error': parsed_data['error'],
                        'file_name': uploaded_file.name
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Format response for frontend
            response_data = {
                'file_name': parsed_data.get('file_name'),
                'file_hash': parsed_data.get('file_hash'),
                'invoice_number': parsed_data.get('invoice_number'),
                'invoice_date': parsed_data.get('invoice_date'),
                'total_amount': parsed_data.get('total_amount'),
                'currency': parsed_data.get('currency', 'USD'),
                'merchant_details': parsed_data.get('merchant_details', {}),
                'payment_method': parsed_data.get('payment_method'),
                'line_items': parsed_data.get('line_items', []),
                'tax_details': parsed_data.get('tax_details', {}),
                'subtotal': parsed_data.get('subtotal'),
                'discount': parsed_data.get('discount'),
                'extraction_method': parsed_data.get('extraction_method'),
                'ai_model_used': parsed_data.get('ai_model_used'),
                'processing_time_ms': parsed_data.get('processing_time_ms'),
            }

            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {
                    'error': f'Failed to process invoice: {str(e)}',
                    'file_name': uploaded_file.name
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class InvoiceApprovalView(APIView):
    """
    Handle invoice approval, transaction creation, and training data updates.

    POST /api/finance/invoices/approve/
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Create transaction from approved invoice data and update training data."""
        serializer = InvoiceApprovalSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)

        # Create transaction with sub-transactions
        transaction = serializer.save()

        # Update training data if corrections were made
        file_hash = request.data.get('file_hash')
        original_data = request.data.get('original_ai_data', {})
        final_data = serializer.validated_data

        if file_hash:
            self._update_training_data(
                user=request.user,
                file_hash=file_hash,
                original_data=original_data,
                final_data=final_data,
                transaction=transaction
            )

        # Return created transaction with line items
        response_serializer = TransactionWithLineItemsSerializer(transaction)

        return Response(
            {
                'message': 'Invoice imported successfully',
                'transaction': response_serializer.data
            },
            status=status.HTTP_201_CREATED
        )

    def _update_training_data(
        self,
        user,
        file_hash: str,
        original_data: dict,
        final_data: dict,
        transaction
    ):
        """Update training data with user corrections."""
        try:
            # Find the parsing attempt
            parsing_attempt = InvoiceParsingAttempt.objects.filter(
                user=user,
                file_hash=file_hash
            ).order_by('-created_at').first()

            if not parsing_attempt:
                return

            # Store user corrections
            parsing_attempt.final_approved_data = {
                'date': str(final_data['date']),
                'merchant_name': final_data['merchant_name'],
                'invoice_number': final_data.get('invoice_number', ''),
                'total_amount': str(final_data['total_amount']),
                'currency': final_data['currency'],
                'line_items': [
                    {
                        'description': item['description'],
                        'quantity': item.get('quantity'),
                        'total_price': str(item['total_price']),
                        'category_id': item.get('category_id'),
                    }
                    for item in final_data['line_items']
                    if item.get('selected', True)
                ]
            }

            # Check if data was corrected
            if original_data and original_data != parsing_attempt.final_approved_data:
                parsing_attempt.user_corrected_data = parsing_attempt.final_approved_data
                parsing_attempt.status = 'user_corrected'

                # Track individual field corrections
                self._track_field_corrections(parsing_attempt, original_data, final_data)
            else:
                parsing_attempt.status = 'user_approved'

            # Link to transaction
            parsing_attempt.transaction = transaction

            # Calculate accuracy
            parsing_attempt.calculate_accuracy()

            parsing_attempt.save()

        except Exception as e:
            # Don't fail the transaction creation if training data update fails
            print(f"Failed to update training data: {e}")

    def _track_field_corrections(self, parsing_attempt, original_data, final_data):
        """Track individual field corrections for detailed training data."""
        corrections = []

        # Compare top-level fields
        fields_to_check = [
            ('merchant_name', 'merchant_details.name'),
            ('invoice_number', 'invoice_number'),
            ('total_amount', 'total_amount'),
            ('currency', 'currency'),
        ]

        for final_key, original_path in fields_to_check:
            final_value = str(final_data.get(final_key, ''))
            original_value = str(self._get_nested_value(original_data, original_path) or '')

            if final_value != original_value:
                corrections.append(
                    InvoiceFieldCorrection(
                        user=parsing_attempt.user,
                        parsing_attempt=parsing_attempt,
                        field_name=final_key,
                        field_path=original_path,
                        ai_extracted_value=original_value,
                        user_corrected_value=final_value,
                        correction_type='wrong_value'
                    )
                )

        # Bulk create corrections
        if corrections:
            InvoiceFieldCorrection.objects.bulk_create(corrections)

    def _get_nested_value(self, data: dict, path: str):
        """Get nested dictionary value using dot notation."""
        keys = path.split('.')
        value = data
        for key in keys:
            if isinstance(value, dict):
                value = value.get(key)
            else:
                return None
        return value


class InvoiceTrainingDataView(APIView):
    """
    Get training data statistics and export.

    GET /api/finance/invoices/training-data/
    POST /api/finance/invoices/training-data/export/
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get training data statistics for the user."""
        stats = {
            'total_attempts': InvoiceParsingAttempt.objects.filter(user=request.user).count(),
            'pending_review': InvoiceParsingAttempt.objects.filter(
                user=request.user, status='pending_review'
            ).count(),
            'user_corrected': InvoiceParsingAttempt.objects.filter(
                user=request.user, status='user_corrected'
            ).count(),
            'user_approved': InvoiceParsingAttempt.objects.filter(
                user=request.user, status='user_approved'
            ).count(),
            'avg_field_accuracy': InvoiceParsingAttempt.objects.filter(
                user=request.user,
                field_accuracy_score__isnull=False
            ).aggregate(models.Avg('field_accuracy_score'))['field_accuracy_score__avg'],
        }

        return Response(stats, status=status.HTTP_200_OK)

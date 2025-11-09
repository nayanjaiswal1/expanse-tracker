"""
Advanced document OCR and extraction service.
Combines OCR with AI-powered structured data extraction.
"""

import logging
from typing import Dict, List, Tuple, Optional
from io import BytesIO
from datetime import datetime

from PIL import Image
import pytesseract
import fitz  # PyMuPDF

from django.conf import settings

from services.storage_service import storage_service
from services.providers import get_provider

logger = logging.getLogger(__name__)


class DocumentOCRService:
    """
    Advanced OCR and AI extraction for receipts, invoices, and bills.
    """

    def __init__(self):
        self.storage = storage_service

    def process_document(
        self,
        file_content: BytesIO,
        filename: str,
        document_type: str = 'receipt',
        ai_model: Optional[str] = None,
        processing_method: str = 'auto'
    ) -> Dict:
        """
        Process a document: OCR extraction + AI structured data extraction.

        Args:
            file_content: File content as BytesIO
            filename: Original filename
            document_type: Type of document (receipt, invoice, bill, etc.)
            ai_model: Optional specific AI model to use
            processing_method: Processing method - 'auto', 'ocr_only', 'ai_only', or 'both'
                - 'auto': Smart choice based on document type (default)
                - 'ocr_only': Only extract text, no AI processing
                - 'ai_only': Use AI without OCR (for clear/digital documents)
                - 'both': Always use both OCR and AI

        Returns:
            Dict with extracted data:
            {
                'ocr_text': str,
                'structured_data': dict,
                'confidence': float,
                'model_used': str,
                'items': list,
                'merchant': str,
                'total_amount': float,
                'date': str,
                'category_suggestions': list,
                'processing_method_used': str
            }
        """
        try:
            ocr_text = None
            structured_data = {}

            # Determine actual processing method to use
            if processing_method == 'auto':
                # Auto: Use both OCR and AI for best results
                actual_method = 'both'
            else:
                actual_method = processing_method

            # Step 1: Extract text via OCR (if needed)
            if actual_method in ['ocr_only', 'both']:
                ocr_text = self._extract_text(file_content, filename)

                if not ocr_text or len(ocr_text.strip()) < 10:
                    return {
                        'success': False,
                        'error': 'Could not extract text from document',
                        'ocr_text': ocr_text,
                        'processing_method_used': actual_method
                    }

            # Step 2: Use AI to extract structured data (if needed)
            if actual_method in ['ai_only', 'both']:
                if not ocr_text and actual_method == 'both':
                    # Should not happen, but handle gracefully
                    logger.warning("OCR text not available for AI processing")
                    return {
                        'success': False,
                        'error': 'OCR text required for AI processing',
                        'processing_method_used': actual_method
                    }

                structured_data = self._extract_structured_data(
                    ocr_text or '',
                    document_type,
                    ai_model
                )

                # Step 3: Auto-categorize items
                if structured_data.get('items'):
                    structured_data['items'] = self._categorize_items(
                        structured_data['items']
                    )

            result = {
                'success': True,
                'ocr_text': ocr_text or '',
                'processing_method_used': actual_method,
                **structured_data
            }

            # For OCR-only, provide basic structure from raw text
            if actual_method == 'ocr_only':
                result['structured_data'] = {
                    'raw_text': ocr_text,
                    'note': 'OCR only - no AI extraction performed'
                }

            return result

        except Exception as e:
            logger.error(f"Error processing document: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'processing_method_used': processing_method
            }

    def _extract_text(self, file_content: BytesIO, filename: str) -> str:
        """
        Extract text from image or PDF using OCR.

        Args:
            file_content: File content
            filename: Filename to determine file type

        Returns:
            Extracted text
        """
        file_ext = filename.lower().split('.')[-1]

        try:
            if file_ext == 'pdf':
                return self._extract_text_from_pdf(file_content)
            else:
                return self._extract_text_from_image(file_content)
        except Exception as e:
            logger.error(f"OCR extraction failed: {str(e)}")
            return ""

    def _extract_text_from_image(self, image_content: BytesIO) -> str:
        """Extract text from image using Tesseract OCR."""
        try:
            image = Image.open(image_content)
            # Convert to RGB if needed
            if image.mode != 'RGB':
                image = image.convert('RGB')

            # Perform OCR
            text = pytesseract.image_to_string(image)
            return text
        except Exception as e:
            logger.error(f"Image OCR failed: {str(e)}")
            return ""

    def _extract_text_from_pdf(self, pdf_content: BytesIO) -> str:
        """Extract text from PDF using PyMuPDF."""
        try:
            doc = fitz.open(stream=pdf_content.read(), filetype="pdf")
            text = ""

            for page_num in range(len(doc)):
                page = doc[page_num]
                text += page.get_text()

            doc.close()
            return text
        except Exception as e:
            logger.error(f"PDF text extraction failed: {str(e)}")
            return ""

    def _extract_structured_data(
        self,
        ocr_text: str,
        document_type: str,
        ai_model: Optional[str] = None
    ) -> Dict:
        """
        Use AI/LLM to extract structured data from OCR text.

        Args:
            ocr_text: Extracted text from OCR
            document_type: Type of document
            ai_model: Optional specific model

        Returns:
            Structured data dict
        """
        try:
            # Get AI provider
            provider_name = getattr(settings, 'LLM_PROVIDER', 'ollama')
            provider = get_provider(provider_name)

            # Create extraction prompt based on document type
            prompt = self._create_extraction_prompt(ocr_text, document_type)

            # Call AI for extraction
            response = provider.generate(prompt, model=ai_model)

            # Parse AI response
            structured_data = self._parse_ai_response(response)

            # Add metadata
            structured_data['model_used'] = ai_model or settings.LLM_MODEL
            structured_data['confidence'] = structured_data.get('confidence', 0.7)

            return structured_data

        except Exception as e:
            logger.error(f"AI extraction failed: {str(e)}")
            return {
                'error': str(e),
                'model_used': ai_model or settings.LLM_MODEL,
                'confidence': 0.0
            }

    def _create_extraction_prompt(self, ocr_text: str, document_type: str) -> str:
        """
        Create AI prompt for structured data extraction.
        """
        base_prompt = f"""
You are an expert at extracting structured information from {document_type} documents.

Extract the following information from this {document_type}:

OCR TEXT:
{ocr_text}

Please extract and return a JSON object with the following structure:
{{
    "merchant": "Merchant/vendor name",
    "total_amount": 123.45,
    "currency": "USD",
    "date": "YYYY-MM-DD",
    "transaction_type": "purchase|refund|payment",
    "items": [
        {{
            "name": "Item name",
            "quantity": 1,
            "unit_price": 10.00,
            "amount": 10.00,
            "category": "groceries|dining|transport|utilities|healthcare|entertainment|shopping|other"
        }}
    ],
    "tax_amount": 5.00,
    "discount_amount": 0.00,
    "payment_method": "cash|credit_card|debit_card|upi|wallet|other",
    "reference_number": "Transaction reference if available",
    "confidence": 0.85
}}

IMPORTANT:
- Return ONLY valid JSON, no markdown formatting
- If you cannot find a field, use null
- For items, extract all line items you can identify
- Confidence should be 0-1 based on text quality
- Date format must be YYYY-MM-DD
- Categorize items appropriately

JSON:"""

        return base_prompt

    def _parse_ai_response(self, response: str) -> Dict:
        """
        Parse AI response into structured data.
        """
        import json
        import re

        try:
            # Remove markdown code blocks if present
            cleaned = re.sub(r'```json\s*|\s*```', '', response).strip()

            # Parse JSON
            data = json.loads(cleaned)
            return data

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI JSON response: {str(e)}")
            logger.error(f"Response was: {response}")
            return {
                'error': 'Failed to parse AI response',
                'raw_response': response
            }

    def _categorize_items(self, items: List[Dict]) -> List[Dict]:
        """
        Auto-categorize items based on item names using keywords.

        Args:
            items: List of item dicts

        Returns:
            Items with updated categories
        """
        category_keywords = {
            'groceries': ['milk', 'bread', 'eggs', 'cheese', 'yogurt', 'vegetable', 'fruit', 'meat', 'chicken', 'fish'],
            'dining': ['restaurant', 'cafe', 'coffee', 'pizza', 'burger', 'food delivery', 'meal'],
            'transport': ['uber', 'lyft', 'taxi', 'gas', 'fuel', 'parking', 'toll', 'metro', 'bus'],
            'utilities': ['electricity', 'water', 'internet', 'phone', 'mobile', 'cable', 'gas bill'],
            'healthcare': ['pharmacy', 'medicine', 'doctor', 'hospital', 'clinic', 'health', 'medical'],
            'entertainment': ['movie', 'cinema', 'netflix', 'spotify', 'game', 'concert', 'show'],
            'shopping': ['clothing', 'shoes', 'electronics', 'amazon', 'store', 'retail'],
        }

        for item in items:
            if item.get('category'):
                # Category already assigned by AI
                continue

            item_name = item.get('name', '').lower()

            # Check keywords
            for category, keywords in category_keywords.items():
                if any(keyword in item_name for keyword in keywords):
                    item['category'] = category
                    item['category_confidence'] = 0.7
                    break

            # Default category
            if not item.get('category'):
                item['category'] = 'other'
                item['category_confidence'] = 0.3

        return items

    def process_and_create_transaction(
        self,
        document_id: int,
        user_id: int,
        auto_create: bool = False
    ) -> Optional[Dict]:
        """
        Process document and optionally auto-create transaction with items.

        Args:
            document_id: TransactionDocument ID
            user_id: User ID
            auto_create: Whether to auto-create transaction

        Returns:
            Created transaction data or None
        """
        from finance.models import TransactionDocument, Transaction, TransactionDetail, Category
        from django.contrib.auth import get_user_model

        try:
            User = get_user_model()
            user = User.objects.get(id=user_id)
            document = TransactionDocument.objects.get(id=document_id, user=user)

            if not document.is_processed:
                return {
                    'error': 'Document not yet processed'
                }

            extracted = document.extracted_data

            if not auto_create:
                return {
                    'extracted_data': extracted,
                    'auto_create': False
                }

            # Create transaction
            # Parse date string if needed
            date_str = extracted.get('date')
            if date_str and isinstance(date_str, str):
                try:
                    transaction_date = datetime.strptime(date_str, '%Y-%m-%d').date()
                except (ValueError, TypeError):
                    transaction_date = datetime.now().date()
            else:
                transaction_date = date_str or datetime.now().date()

            transaction_data = {
                'user': user,
                'amount': extracted.get('total_amount', 0),
                'description': f"{extracted.get('merchant', 'Unknown')} - {document.document_type}",
                'date': transaction_date,
                'is_credit': extracted.get('transaction_type') == 'refund',
                'metadata': {
                    'source': 'document_upload',
                    'document_id': document.id,
                    'merchant': extracted.get('merchant'),
                    'payment_method': extracted.get('payment_method'),
                    'reference_number': extracted.get('reference_number'),
                }
            }

            transaction = Transaction.objects.create(**transaction_data)

            # Attach document to transaction
            document.attach_to_transaction(transaction)

            # Create line items
            items_created = []
            for item in extracted.get('items', []):
                # Get or create category if category name is provided
                category = None
                category_name = item.get('category')
                if category_name:
                    category, _ = Category.objects.get_or_create(
                        user=user,
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
                'transaction_id': transaction.id,
                'items_count': len(items_created),
                'items': items_created
            }

        except Exception as e:
            logger.error(f"Error creating transaction from document: {str(e)}")
            return {
                'error': str(e)
            }


# Global instance
document_ocr_service = DocumentOCRService()

"""
Enhanced Document Service - Upload invoices/receipts with automatic item extraction.

Features:
- Image/PDF upload with OCR
- Automatic line item extraction
- Category assignment per item
- Integration with TransactionDetail creation
- Support for multiple document types
"""

from __future__ import annotations

import logging
import os
from decimal import Decimal, InvalidOperation
from typing import Dict, List, Optional, Tuple
from datetime import datetime
import re
from django.db import transaction as db_transaction
from django.conf import settings
from users.validators import FileValidator
from users.throttling import DocumentUploadRateThrottle

logger = logging.getLogger(__name__)


class EnhancedDocumentService:
    """
    Service for uploading and processing transaction documents (receipts, invoices, bills).

    Automatically extracts item-level details and creates TransactionDetail records.
    """

    def __init__(self, ocr_service=None, llm_provider=None, storage_service=None):
        """
        Initialize service with required dependencies.

        Args:
            ocr_service: OCR service for text extraction (pytesseract, AWS Textract, etc.)
            llm_provider: LLM provider for structured extraction (OpenAI, Anthropic, etc.)
            storage_service: Storage service for file uploads (S3, local, etc.)
        """
        self.ocr_service = ocr_service
        self.llm_provider = llm_provider
        self.storage_service = storage_service

    def process_document_upload(
        self,
        file_path: str,
        user,
        document_type: str = 'receipt',
        transaction_id: Optional[int] = None,
        auto_create_details: bool = True,
    ) -> Dict:
        """
        Process uploaded document and extract transaction/item data.

        Args:
            file_path: Path to uploaded file
            user: User instance
            document_type: Type of document (receipt, invoice, bill, statement)
            transaction_id: Optional existing transaction to attach to
            auto_create_details: Whether to automatically create TransactionDetail records

        Returns:
            Dict with extraction results and created records
        """
        from finance.models import TransactionDocument, Transaction, TransactionDetail

        # Validate file before processing
        FileValidator.validate_file_size(file_path, max_size=FileValidator.MAX_PDF_SIZE)
        FileValidator.validate_file_type(file_path)

        # Create TransactionDocument record
        document = self._create_document_record(
            file_path=file_path,
            user=user,
            document_type=document_type,
            transaction_id=transaction_id,
        )

        try:
            # Mark as processing
            document.mark_processing_started()

            # Extract text via OCR
            ocr_text = self._extract_text_from_document(file_path)
            document.ocr_text = ocr_text
            document.save(update_fields=['ocr_text'])

            # Extract structured data
            extracted_data = self._extract_structured_data(ocr_text, document_type)

            # Auto-categorize items
            if 'items' in extracted_data:
                extracted_data['items'] = self._categorize_items(extracted_data['items'])

            # Calculate confidence score
            confidence = self._calculate_confidence(extracted_data)

            # Mark as completed
            document.mark_processing_completed(
                extracted_data=extracted_data,
                confidence=confidence,
                model_used=getattr(self.llm_provider, 'model_name', 'ocr+patterns')
            )

            result = {
                'document_id': document.id,
                'document_type': document_type,
                'extraction_status': 'success',
                'extracted_data': extracted_data,
                'confidence': confidence,
                'items_found': len(extracted_data.get('items', [])),
            }

            # Auto-create transaction and details if requested
            if auto_create_details and extracted_data.get('items'):
                transaction, details = self._create_transaction_with_details(
                    document=document,
                    extracted_data=extracted_data,
                    user=user,
                    existing_transaction_id=transaction_id,
                )

                result['transaction_id'] = transaction.id if transaction else transaction_id
                result['details_created'] = len(details)
                result['auto_created'] = True

            return result

        except Exception as e:
            logger.error(f"Document processing failed: {e}", exc_info=True)
            document.mark_processing_failed(str(e))

            return {
                'document_id': document.id,
                'extraction_status': 'failed',
                'error': str(e),
            }

    def _create_document_record(
        self,
        file_path: str,
        user,
        document_type: str,
        transaction_id: Optional[int] = None,
    ):
        """Create TransactionDocument database record."""
        from finance.models import TransactionDocument

        # Get file info
        file_size = os.path.getsize(file_path)
        original_filename = os.path.basename(file_path)

        # Determine content type
        ext = os.path.splitext(file_path)[1].lower()
        content_type_map = {
            '.pdf': 'application/pdf',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
        }
        content_type = content_type_map.get(ext, 'application/octet-stream')

        # Upload to storage
        if self.storage_service:
            storage_path, file_url = self.storage_service.upload_file(
                file_path=file_path,
                user_id=user.id,
                prefix='documents'
            )
        else:
            # Local storage fallback
            storage_path = file_path
            file_url = f"/media/documents/{user.id}/{original_filename}"

        # Create record
        document = TransactionDocument.objects.create(
            user=user,
            transaction_id=transaction_id,
            file_path=storage_path,
            file_url=file_url,
            original_filename=original_filename,
            file_size=file_size,
            content_type=content_type,
            document_type=document_type,
            processing_status='pending',
        )

        return document

    def _extract_text_from_document(self, file_path: str) -> str:
        """Extract text from PDF/image using OCR."""
        if not self.ocr_service:
            # Fallback: try basic pytesseract
            return self._extract_text_with_tesseract(file_path)

        try:
            return self.ocr_service.extract_text(file_path)
        except Exception as e:
            logger.warning(f"OCR service failed, falling back to tesseract: {e}")
            return self._extract_text_with_tesseract(file_path)

    def _extract_text_with_tesseract(self, file_path: str) -> str:
        """Fallback OCR using pytesseract."""
        try:
            import pytesseract
            from PIL import Image
            import fitz  # PyMuPDF for PDFs

            ext = os.path.splitext(file_path)[1].lower()

            if ext == '.pdf':
                # Extract text from PDF pages
                text_parts = []
                doc = fitz.open(file_path)

                for page_num in range(len(doc)):
                    page = doc[page_num]

                    # Try native text extraction first
                    page_text = page.get_text()
                    if page_text.strip():
                        text_parts.append(page_text)
                    else:
                        # Fallback to OCR on page image
                        pix = page.get_pixmap()
                        img_data = pix.tobytes("png")

                        from io import BytesIO
                        img = Image.open(BytesIO(img_data))
                        ocr_text = pytesseract.image_to_string(img)
                        text_parts.append(ocr_text)

                doc.close()
                return "\n\n".join(text_parts)

            else:
                # Image file - direct OCR
                img = Image.open(file_path)
                return pytesseract.image_to_string(img)

        except ImportError as e:
            logger.error(f"OCR dependencies not available: {e}")
            return ""
        except Exception as e:
            logger.error(f"OCR extraction failed: {e}")
            return ""

    def _extract_structured_data(self, ocr_text: str, document_type: str) -> Dict:
        """Extract structured data from OCR text."""
        # Try LLM-based extraction first (most accurate)
        if self.llm_provider:
            llm_result = self._extract_with_llm(ocr_text, document_type)
            if llm_result:
                return llm_result

        # Fallback to pattern-based extraction
        return self._extract_with_patterns(ocr_text, document_type)

    def _extract_with_llm(self, ocr_text: str, document_type: str) -> Optional[Dict]:
        """Use LLM for structured extraction."""
        if not self.llm_provider:
            return None

        prompt = f"""Extract structured data from this {document_type} text.

Text:
{ocr_text[:5000]}  # Limit tokens

Extract the following information:
1. merchant: Merchant/vendor name
2. date: Transaction date (YYYY-MM-DD format)
3. total_amount: Total amount paid
4. currency: Currency code (INR, USD, etc.)
5. items: List of line items with:
   - name: Item name
   - quantity: Quantity (default 1)
   - unit_price: Price per unit
   - total_price: Total price for this item
   - category: Best matching category (Food & Dining, Groceries, Electronics, etc.)
6. subtotal: Subtotal before taxes/fees
7. tax: Tax amount
8. discount: Discount amount
9. payment_method: Payment method if mentioned

Return as JSON:
{{
  "merchant": "Store Name",
  "date": "2024-01-15",
  "total_amount": 1250.50,
  "currency": "INR",
  "items": [
    {{
      "name": "Product 1",
      "quantity": 2,
      "unit_price": 500.00,
      "total_price": 1000.00,
      "category": "Electronics"
    }}
  ],
  "subtotal": 1000.00,
  "tax": 180.00,
  "discount": 0.00,
  "payment_method": "Credit Card"
}}

If information is not available, use null. Extract all items you can find.
"""

        try:
            response = self.llm_provider.generate(
                prompt=prompt,
                response_format='json'
            )

            import json
            return json.loads(response)

        except Exception as e:
            logger.error(f"LLM extraction failed: {e}")
            return None

    def _extract_with_patterns(self, text: str, document_type: str) -> Dict:
        """Pattern-based extraction as fallback."""
        result = {
            'merchant': self._extract_merchant(text),
            'date': self._extract_date(text),
            'total_amount': self._extract_total_amount(text),
            'currency': self._extract_currency(text),
            'items': self._extract_items_from_text(text),
            'subtotal': None,
            'tax': self._extract_tax(text),
            'discount': self._extract_discount(text),
            'payment_method': self._extract_payment_method(text),
        }

        # Calculate subtotal if not found
        if result['items'] and not result['subtotal']:
            result['subtotal'] = sum(item['total_price'] for item in result['items'])

        return result

    def _extract_merchant(self, text: str) -> Optional[str]:
        """Extract merchant name from text."""
        lines = [line.strip() for line in text.split('\n') if line.strip()]

        # Usually merchant name is in first few lines, largest text
        for line in lines[:5]:
            if len(line) > 3 and not line.isdigit():
                # Skip common headers
                if line.lower() not in ['tax invoice', 'invoice', 'receipt', 'bill']:
                    return line

        return None

    def _extract_date(self, text: str) -> Optional[str]:
        """Extract date from text."""
        # Common date patterns
        date_patterns = [
            r'(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})',  # DD/MM/YYYY or DD-MM-YYYY
            r'(\d{4}[-/]\d{1,2}[-/]\d{1,2})',     # YYYY-MM-DD
            r'(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})',  # DD Month YYYY
        ]

        for pattern in date_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                date_str = match.group(1)
                # TODO: Parse to standard format
                return date_str

        return None

    def _extract_total_amount(self, text: str) -> Optional[float]:
        """Extract total amount from text."""
        patterns = [
            r'Total\s*:?\s*(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)',
            r'Grand\s+Total\s*:?\s*(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)',
            r'Amount\s+Payable\s*:?\s*(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)',
            r'Net\s+Amount\s*:?\s*(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)',
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    amount_str = match.group(1).replace(',', '')
                    return float(amount_str)
                except (ValueError, InvalidOperation):
                    continue

        return None

    def _extract_currency(self, text: str) -> str:
        """Extract currency from text."""
        if '₹' in text or 'INR' in text or 'Rs' in text:
            return 'INR'
        elif '$' in text or 'USD' in text:
            return 'USD'
        elif '€' in text or 'EUR' in text:
            return 'EUR'
        elif '£' in text or 'GBP' in text:
            return 'GBP'

        return 'INR'  # Default

    def _extract_items_from_text(self, text: str) -> List[Dict]:
        """Extract line items from text using patterns."""
        items = []

        # Item line patterns similar to email parser
        patterns = [
            r'(\d+)\s*[xX×]\s*([^\d\n]+?)\s*(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)',
            r'([^\d\n]+?)\s{2,}(\d+)\s{2,}(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)',
            r'([^\n]+?)\s+(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)\s+[xX×]?\s*(\d+)',
        ]

        for pattern in patterns:
            matches = re.finditer(pattern, text, re.MULTILINE)

            for match in matches:
                groups = match.groups()

                try:
                    # Parse quantity, name, price (order varies by pattern)
                    if groups[0].isdigit():
                        qty_str, name, price_str = groups
                    elif len(groups) == 3 and groups[2].isdigit():
                        name, price_str, qty_str = groups
                    else:
                        name, qty_str, price_str = groups

                    quantity = int(qty_str) if qty_str.isdigit() else 1
                    price_str = price_str.replace(',', '').strip()
                    total_price = float(price_str)

                    unit_price = total_price / quantity if quantity > 1 else total_price

                    name = name.strip().strip('*-•◦▪▫').strip()
                    if not name or len(name) < 3:
                        continue

                    items.append({
                        'name': name,
                        'quantity': quantity,
                        'unit_price': unit_price,
                        'total_price': total_price,
                        'category': None,  # Will be categorized later
                    })

                except (ValueError, InvalidOperation, ZeroDivisionError):
                    continue

        # Deduplicate
        unique_items = {}
        for item in items:
            key = item['name'].lower()
            if key not in unique_items:
                unique_items[key] = item

        return list(unique_items.values())

    def _extract_tax(self, text: str) -> Optional[float]:
        """Extract tax amount."""
        patterns = [
            r'Tax\s*:?\s*(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)',
            r'GST\s*:?\s*(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)',
            r'VAT\s*:?\s*(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)',
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    return float(match.group(1).replace(',', ''))
                except ValueError:
                    continue

        return None

    def _extract_discount(self, text: str) -> Optional[float]:
        """Extract discount amount."""
        patterns = [
            r'Discount\s*:?\s*(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)',
            r'Savings\s*:?\s*(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)',
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    return float(match.group(1).replace(',', ''))
                except ValueError:
                    continue

        return None

    def _extract_payment_method(self, text: str) -> Optional[str]:
        """Extract payment method."""
        methods = {
            'credit card': ['credit card', 'visa', 'mastercard', 'amex'],
            'debit card': ['debit card'],
            'cash': ['cash', 'paid in cash'],
            'upi': ['upi', 'paytm', 'gpay', 'phonepe', 'bhim'],
            'net banking': ['net banking', 'internet banking'],
        }

        text_lower = text.lower()

        for method, keywords in methods.items():
            if any(keyword in text_lower for keyword in keywords):
                return method

        return None

    def _categorize_items(self, items: List[Dict]) -> List[Dict]:
        """Auto-categorize extracted items."""
        # Use same category keywords as EmailOrderParser
        from services.services.email_order_parser import EmailOrderParser

        category_keywords = EmailOrderParser.CATEGORY_KEYWORDS

        for item in items:
            if not item.get('category'):
                name_lower = item['name'].lower()

                for category, keywords in category_keywords.items():
                    if any(keyword in name_lower for keyword in keywords):
                        item['category'] = category
                        break

        return items

    def _calculate_confidence(self, extracted_data: Dict) -> float:
        """Calculate extraction confidence score."""
        confidence = 0.0

        if extracted_data.get('merchant'):
            confidence += 0.2
        if extracted_data.get('date'):
            confidence += 0.2
        if extracted_data.get('total_amount'):
            confidence += 0.3
        if extracted_data.get('items'):
            confidence += 0.2
            # Bonus for having quantities and prices
            if all(item.get('quantity') and item.get('unit_price') for item in extracted_data['items']):
                confidence += 0.1

        return min(confidence, 1.0)

    def _create_transaction_with_details(
        self,
        document,
        extracted_data: Dict,
        user,
        existing_transaction_id: Optional[int] = None,
    ) -> Tuple[Optional[object], List[object]]:
        """
        Create Transaction and TransactionDetail records from extracted data.

        Uses database transaction to ensure atomicity - either all records are created
        or none are (rollback on error).
        """
        from finance.models import Transaction, TransactionDetail, Category

        # Wrap everything in a database transaction for atomicity
        with db_transaction.atomic():
            # If transaction already exists, attach to it
            if existing_transaction_id:
                transaction = Transaction.objects.get(id=existing_transaction_id, user=user)
            else:
                # Create new transaction
                from finance.models import Account
                account = Account.objects.filter(user=user, is_active=True).first()

                if not account:
                    logger.warning("No active account found for user")
                    return None, []

                transaction = Transaction.objects.create(
                    user=user,
                    account=account,
                    amount=Decimal(str(extracted_data['total_amount'])),
                    description=f"Purchase from {extracted_data.get('merchant', 'Unknown')}",
                    date=extracted_data.get('date') or datetime.now().date(),
                    is_credit=False,  # Expense
                    currency=extracted_data.get('currency', 'INR'),
                    status='pending',  # Mark as pending for user review
                    metadata={
                        'source': 'document_upload',
                        'document_id': document.id,
                        'extraction_confidence': document.extraction_confidence,
                    },
                )

                # Attach document to transaction
                document.attach_to_transaction(transaction)

            # Create TransactionDetail records for items
            details = []
            for item_data in extracted_data.get('items', []):
                # Find category by name if provided
                category = None
                if item_data.get('category'):
                    category = Category.objects.filter(
                        user=user,
                        name=item_data['category'],
                        is_active=True
                    ).first()

                detail = TransactionDetail.create_line_item(
                    transaction=transaction,
                    name=item_data['name'],
                    amount=Decimal(str(item_data['total_price'])),
                    category=category,
                    quantity=Decimal(str(item_data.get('quantity', 1))),
                    unit_price=Decimal(str(item_data.get('unit_price', item_data['total_price']))),
                    metadata={
                        'auto_extracted': True,
                        'extraction_method': 'ocr+llm' if self.llm_provider else 'ocr+patterns',
                    }
                )
                details.append(detail)

            # Create details for tax, discount
            if extracted_data.get('tax'):
                details.append(TransactionDetail.objects.create(
                    transaction=transaction,
                    user=user,
                    detail_type='tax_detail',
                    name='Tax',
                    amount=Decimal(str(extracted_data['tax'])),
                ))

            if extracted_data.get('discount'):
                details.append(TransactionDetail.objects.create(
                    transaction=transaction,
                    user=user,
                    detail_type='discount',
                    name='Discount',
                    amount=Decimal(str(extracted_data['discount'])),
                ))

            return transaction, details

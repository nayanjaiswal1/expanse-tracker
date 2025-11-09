"""
AI-powered table extraction service for PDFs and images.
Supports drawing bounding boxes on documents to extract tabular data.
"""

import base64
import json
from typing import Dict, List, Any, Optional, Tuple
from PIL import Image
import io
from django.conf import settings
from .providers.openai import OpenAIProvider
from .providers.anthropic import AnthropicProvider


class TableExtractorService:
    """
    Extract tables from documents using AI vision models.
    Supports both auto-detection and user-defined bounding boxes.
    """

    def __init__(self, ai_model: str = 'anthropic_claude_sonnet'):
        """
        Initialize with AI model.

        Args:
            ai_model: 'openai_gpt4o' or 'anthropic_claude_sonnet'
        """
        self.ai_model = ai_model
        self.provider = self._get_provider()

    def _get_provider(self):
        """Get the appropriate AI provider with vision support."""
        if self.ai_model == 'openai_gpt4o':
            api_key = getattr(settings, 'OPENAI_API_KEY', None)
            return OpenAIProvider(api_key=api_key, model='gpt-4o')
        elif self.ai_model == 'anthropic_claude_sonnet':
            api_key = getattr(settings, 'ANTHROPIC_API_KEY', None)
            return AnthropicProvider(api_key=api_key, model='claude-3-5-sonnet-20241022')
        else:
            raise ValueError(f"Unsupported AI model: {self.ai_model}")

    def extract_tables_auto(
        self,
        image_bytes: bytes,
        page_number: int = 1
    ) -> Dict[str, Any]:
        """
        Auto-detect and extract all tables from an image/PDF page.

        Args:
            image_bytes: Image or PDF page as bytes
            page_number: Page number for context

        Returns:
            Dict with detected tables and their data
        """
        # Convert to base64 for AI processing
        image_b64 = base64.b64encode(image_bytes).decode('utf-8')

        prompt = """Analyze this document image and extract ALL tables you can find.

For each table:
1. Identify the table's bounding box (approximate x, y, width, height as percentages of image dimensions)
2. Extract the table headers
3. Extract all table rows with proper column alignment

Return JSON in this exact format:
{
  "tables": [
    {
      "table_id": 1,
      "bounding_box": {"x": 10, "y": 20, "width": 80, "height": 30},
      "headers": ["Date", "Description", "Amount", "Balance"],
      "rows": [
        ["2025-01-15", "Payment received", "1000.00", "5000.00"],
        ["2025-01-16", "Grocery shopping", "-150.00", "4850.00"]
      ],
      "table_type": "transactions",
      "confidence": 0.95
    }
  ],
  "page_number": 1,
  "total_tables": 1
}

Important:
- Be precise with numerical values
- Maintain column alignment
- Identify table type (transactions, summary, metadata, etc.)
- Include confidence score (0-1)
"""

        try:
            if self.ai_model == 'openai_gpt4o':
                result = self.provider.extract_from_image(
                    image_b64=image_b64,
                    prompt=prompt,
                    response_format={"type": "json_object"}
                )
            else:  # Anthropic
                result = self.provider.extract_from_image(
                    image_b64=image_b64,
                    prompt=prompt
                )
                result = json.loads(result.get('text', '{}'))

            result['page_number'] = page_number
            result['extraction_method'] = 'auto_detection'
            return result

        except Exception as e:
            return {
                'error': str(e),
                'tables': [],
                'page_number': page_number,
                'extraction_method': 'auto_detection'
            }

    def extract_table_from_region(
        self,
        image_bytes: bytes,
        bounding_box: Dict[str, float],
        page_number: int = 1,
        table_type: str = 'transactions'
    ) -> Dict[str, Any]:
        """
        Extract table data from a specific region defined by user.

        Args:
            image_bytes: Image or PDF page as bytes
            bounding_box: {"x": 10, "y": 20, "width": 80, "height": 60} (percentages)
            page_number: Page number
            table_type: Type hint for better extraction (transactions, summary, etc.)

        Returns:
            Extracted table data
        """
        # Crop image to bounding box
        try:
            image = Image.open(io.BytesIO(image_bytes))
            width, height = image.size

            # Convert percentage to pixels
            x1 = int((bounding_box['x'] / 100) * width)
            y1 = int((bounding_box['y'] / 100) * height)
            x2 = x1 + int((bounding_box['width'] / 100) * width)
            y2 = y1 + int((bounding_box['height'] / 100) * height)

            # Crop and convert back to bytes
            cropped = image.crop((x1, y1, x2, y2))
            buffer = io.BytesIO()
            cropped.save(buffer, format='PNG')
            cropped_bytes = buffer.getvalue()

            image_b64 = base64.b64encode(cropped_bytes).decode('utf-8')

        except Exception as e:
            return {'error': f'Failed to crop image: {str(e)}'}

        # Build extraction prompt based on table type
        if table_type == 'transactions':
            prompt = """Extract the transaction table from this image.

Return JSON with this exact structure:
{
  "headers": ["Date", "Description", "Debit", "Credit", "Balance"],
  "rows": [
    ["2025-01-15", "Payment received", "", "1000.00", "5000.00"],
    ["2025-01-16", "Grocery shopping", "150.00", "", "4850.00"]
  ],
  "metadata": {
    "currency": "USD",
    "total_rows": 2,
    "date_format": "YYYY-MM-DD"
  }
}

Critical instructions:
- Extract EVERY row, even if there are 100+ rows
- Preserve exact numerical values with decimals
- Empty cells should be empty strings ""
- Maintain column alignment precisely
- Standardize dates to YYYY-MM-DD format
"""
        else:
            prompt = """Extract ALL data from this table.

Return JSON:
{
  "headers": [...],
  "rows": [[...], [...]],
  "metadata": {}
}

Extract every row and column precisely. Maintain data types and formatting."""

        try:
            if self.ai_model == 'openai_gpt4o':
                result = self.provider.extract_from_image(
                    image_b64=image_b64,
                    prompt=prompt,
                    response_format={"type": "json_object"}
                )
            else:  # Anthropic
                result = self.provider.extract_from_image(
                    image_b64=image_b64,
                    prompt=prompt
                )
                result = json.loads(result.get('text', '{}'))

            result['bounding_box'] = bounding_box
            result['page_number'] = page_number
            result['table_type'] = table_type
            result['extraction_method'] = 'user_defined_region'
            return result

        except Exception as e:
            return {
                'error': str(e),
                'bounding_box': bounding_box,
                'extraction_method': 'user_defined_region'
            }

    def extract_multi_page_tables(
        self,
        pages: List[Tuple[bytes, int]],
        auto_detect: bool = True,
        bounding_boxes: Optional[Dict[int, List[Dict]]] = None
    ) -> Dict[str, Any]:
        """
        Extract tables from multiple pages of a document.

        Args:
            pages: List of (page_bytes, page_number) tuples
            auto_detect: Whether to auto-detect tables
            bounding_boxes: Optional dict mapping page_number -> list of bounding boxes

        Returns:
            Combined results from all pages
        """
        all_tables = []
        errors = []

        for page_bytes, page_num in pages:
            try:
                if auto_detect:
                    result = self.extract_tables_auto(page_bytes, page_num)
                    if 'error' in result:
                        errors.append({
                            'page': page_num,
                            'error': result['error']
                        })
                    else:
                        all_tables.extend(result.get('tables', []))
                else:
                    # Use user-defined regions for this page
                    if bounding_boxes and page_num in bounding_boxes:
                        for bbox in bounding_boxes[page_num]:
                            result = self.extract_table_from_region(
                                page_bytes,
                                bbox,
                                page_num,
                                bbox.get('table_type', 'transactions')
                            )
                            if 'error' not in result:
                                all_tables.append(result)
                            else:
                                errors.append({
                                    'page': page_num,
                                    'bbox': bbox,
                                    'error': result['error']
                                })
            except Exception as e:
                errors.append({
                    'page': page_num,
                    'error': str(e)
                })

        return {
            'total_tables': len(all_tables),
            'total_pages': len(pages),
            'tables': all_tables,
            'errors': errors
        }

    def convert_table_to_transactions(
        self,
        table_data: Dict[str, Any],
        account_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Convert extracted table data to transaction format.

        Args:
            table_data: Extracted table with headers and rows
            account_id: Optional account ID to associate

        Returns:
            List of transaction dictionaries
        """
        headers = table_data.get('headers', [])
        rows = table_data.get('rows', [])

        if not headers or not rows:
            return []

        # Normalize headers (lowercase, remove spaces)
        normalized_headers = {
            h.lower().replace(' ', '_'): i
            for i, h in enumerate(headers)
        }

        transactions = []

        for row in rows:
            if len(row) != len(headers):
                continue  # Skip malformed rows

            # Try to map columns
            tx = {}

            # Date
            for date_key in ['date', 'transaction_date', 'txn_date', 'posting_date']:
                if date_key in normalized_headers:
                    tx['date'] = row[normalized_headers[date_key]]
                    break

            # Description
            for desc_key in ['description', 'particulars', 'details', 'narration', 'remarks']:
                if desc_key in normalized_headers:
                    tx['description'] = row[normalized_headers[desc_key]]
                    break

            # Amount (handle debit/credit or single amount column)
            debit_idx = normalized_headers.get('debit') or normalized_headers.get('withdrawal')
            credit_idx = normalized_headers.get('credit') or normalized_headers.get('deposit')
            amount_idx = normalized_headers.get('amount')

            if debit_idx is not None and credit_idx is not None:
                debit = row[debit_idx].strip() if row[debit_idx] else ''
                credit = row[credit_idx].strip() if row[credit_idx] else ''

                if debit and debit != '-':
                    tx['amount'] = f"-{debit.replace(',', '')}"
                    tx['transaction_type'] = 'debit'
                elif credit and credit != '-':
                    tx['amount'] = credit.replace(',', '')
                    tx['transaction_type'] = 'credit'
            elif amount_idx is not None:
                amount_str = row[amount_idx].strip()
                tx['amount'] = amount_str.replace(',', '')
                tx['transaction_type'] = 'debit' if '-' in amount_str else 'credit'

            # Balance
            if 'balance' in normalized_headers:
                tx['balance'] = row[normalized_headers['balance']].replace(',', '')

            # Reference/ID
            for ref_key in ['reference', 'ref_no', 'transaction_id', 'cheque_no']:
                if ref_key in normalized_headers:
                    tx['external_id'] = row[normalized_headers[ref_key]]
                    break

            if account_id:
                tx['account_id'] = account_id

            # Only add if we have minimum required fields
            if 'date' in tx and 'amount' in tx:
                transactions.append(tx)

        return transactions

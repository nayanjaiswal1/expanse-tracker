"""
Advanced Invoice Parser with OCR and LLM Integration.
Supports image preprocessing, OCR, and AI-powered structured data extraction.
"""

import cv2
import numpy as np
import pytesseract
import json
import requests
from typing import Dict, Any, Optional, List
from PIL import Image
import io
from decimal import Decimal
from datetime import datetime
import re


class InvoiceParser:
    """Advanced invoice parser with OCR and LLM capabilities."""

    def __init__(self, ollama_url: str = "http://localhost:11434/api/generate",
                 ollama_model: str = "llama3"):
        """
        Initialize the invoice parser.

        Args:
            ollama_url: URL for Ollama API endpoint
            ollama_model: Name of the Ollama model to use
        """
        self.ollama_url = ollama_url
        self.ollama_model = ollama_model

    def preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """
        Advanced image preprocessing pipeline for better OCR accuracy.

        Args:
            image: Input image as numpy array

        Returns:
            Preprocessed image ready for OCR
        """
        # Deskew the image
        image = self._deskew(image)

        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Denoise
        denoised = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)

        # Adaptive thresholding for better text extraction
        thresh = cv2.adaptiveThreshold(
            denoised, 255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY, 11, 2
        )

        return thresh

    def _deskew(self, image: np.ndarray) -> np.ndarray:
        """
        Automatically deskew (rotate) image to correct orientation.

        Args:
            image: Input image

        Returns:
            Deskewed image
        """
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        gray = cv2.bitwise_not(gray)
        coords = np.column_stack(np.where(gray > 0))

        if len(coords) == 0:
            return image

        angle = cv2.minAreaRect(coords)[-1]
        if angle < -45:
            angle = -(90 + angle)
        else:
            angle = -angle

        (h, w) = image.shape[:2]
        center = (w // 2, h // 2)
        M = cv2.getRotationMatrix2D(center, angle, 1.0)
        rotated = cv2.warpAffine(
            image, M, (w, h),
            flags=cv2.INTER_CUBIC,
            borderMode=cv2.BORDER_REPLICATE
        )

        return rotated

    def extract_text_from_image(self, image_bytes: bytes) -> str:
        """
        Extract text from image using OCR with preprocessing.

        Args:
            image_bytes: Image file bytes

        Returns:
            Extracted text
        """
        # Convert bytes to numpy array
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            raise ValueError("Could not read image")

        # Preprocess image
        processed = self.preprocess_image(img)

        # Perform OCR
        text = pytesseract.image_to_string(processed)

        return text

    def extract_with_llm(self, text: str) -> Dict[str, Any]:
        """
        Extract structured data from text using LLM.

        Args:
            text: OCR extracted text

        Returns:
            Structured invoice data
        """
        prompt = f"""You are a world-class AI assistant for invoice processing. Your task is to extract detailed, structured information from the provided OCR text of an invoice.

**Extraction Schema:**
Please extract the following fields into a valid JSON object:
- `invoice_number`: The unique identifier for the invoice.
- `invoice_date`: The date the invoice was issued (format: YYYY-MM-DD).
- `total_amount`: The final, grand total amount (numeric value only, no currency symbols).
- `merchant_details`: A JSON object containing the merchant's `name`, `address`, and `phone` number.
- `payment_method`: The method of payment used (e.g., 'Credit Card', 'Cash', 'Online', 'UPI').
- `line_items`: A list of all items purchased. Each item should be a JSON object with: `description`, `quantity`, `unit_price`, `total_price`.
- `tax_details`: A JSON object containing any tax information: `tax_rate`, `total_tax`, `cgst`, `sgst`, `igst`, `gst_number`.
- `subtotal`: Subtotal before taxes (if available).
- `discount`: Any discount amount (if available).
- `currency`: The currency code (e.g., 'INR', 'USD').

**CRITICAL INSTRUCTIONS FOR HANDLING NUMBERS AND CURRENCIES:**
- **THIS IS VERY IMPORTANT:** When you see a number with a dot (.), like `20.00`, the dot is a DECIMAL SEPARATOR. The correct value is `20.00`, NOT `2000`.
- **DO NOT** convert `20.00` to `2000`. This is incorrect.
- **EXAMPLE of what NOT to do:** If the text says "Total: 25.50", the `total_amount` should be `25.50`, NOT `2550`.
- All monetary values (`total_amount`, `unit_price`, `total_price`, `total_tax`, `subtotal`, `discount`) MUST be treated as decimal numbers.
- Currency symbols like `₹`, `Rs.`, or `$` should be ignored in the final numeric value.

**General Instructions:**
- Analyze the text carefully to distinguish between different fields.
- For `line_items`, capture each item listed on the invoice.
- If a specific value isn't available, set it to `null`.
- For Indian invoices, pay special attention to GST details (CGST, SGST, IGST, GST Number).
- The final output must be a single, valid JSON object.

**Invoice Text to Analyze:**
---
{text}
---

JSON Output:"""

        try:
            payload = {
                "model": self.ollama_model,
                "prompt": prompt,
                "stream": False,
                "format": "json"
            }

            response = requests.post(self.ollama_url, json=payload, timeout=60)
            response.raise_for_status()

            api_response = response.json()
            extracted_json_str = api_response.get('response', '{}')

            extracted_data = json.loads(extracted_json_str)

            # Post-process and validate
            extracted_data = self._post_process_llm_output(extracted_data)

            return extracted_data

        except requests.exceptions.RequestException as e:
            raise ValueError(f"LLM extraction failed: Could not connect to Ollama. Ensure it's running. {str(e)}")
        except json.JSONDecodeError as e:
            raise ValueError(f"LLM extraction failed: Invalid JSON response. {str(e)}")

    def extract_with_regex(self, text: str) -> Dict[str, Any]:
        """
        Fallback extraction using regex patterns (when LLM is unavailable).

        Args:
            text: OCR extracted text

        Returns:
            Structured invoice data (best effort)
        """
        data = {
            "extraction_method": "regex_fallback",
            "invoice_number": None,
            "invoice_date": None,
            "total_amount": None,
            "merchant_details": {},
            "line_items": [],
            "tax_details": {},
        }

        # Extract invoice number
        invoice_patterns = [
            r"Invoice\s*(?:No\.?|Number|#)\s*:?\s*([A-Z0-9-]+)",
            r"Bill\s*(?:No\.?|Number|#)\s*:?\s*([A-Z0-9-]+)",
        ]
        for pattern in invoice_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                data["invoice_number"] = match.group(1).strip()
                break

        # Extract date
        date_patterns = [
            r"Date\s*:?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})",
            r"(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})",
        ]
        for pattern in date_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                data["invoice_date"] = self._standardize_date(match.group(1))
                break

        # Extract total amount
        total_patterns = [
            r"(?:Total|Grand\s+Total|Amount\s+Payable)\s*:?\s*(?:Rs\.?|₹|INR)?\s*([0-9,]+\.?\d*)",
            r"(?:Net\s+Amount|Final\s+Amount)\s*:?\s*(?:Rs\.?|₹|INR)?\s*([0-9,]+\.?\d*)",
        ]
        for pattern in total_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                data["total_amount"] = match.group(1).replace(",", "")
                break

        # Extract GST number
        gst_match = re.search(r"GST(?:IN)?\s*(?:No\.?|Number)?\s*:?\s*([A-Z0-9]{15})", text, re.IGNORECASE)
        if gst_match:
            data["tax_details"]["gst_number"] = gst_match.group(1)

        # Extract tax amounts
        tax_patterns = {
            "cgst": r"CGST\s*:?\s*(?:Rs\.?|₹)?\s*([0-9,]+\.?\d*)",
            "sgst": r"SGST\s*:?\s*(?:Rs\.?|₹)?\s*([0-9,]+\.?\d*)",
            "igst": r"IGST\s*:?\s*(?:Rs\.?|₹)?\s*([0-9,]+\.?\d*)",
            "total_tax": r"(?:Total\s+)?Tax\s*:?\s*(?:Rs\.?|₹)?\s*([0-9,]+\.?\d*)",
        }
        for key, pattern in tax_patterns.items():
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                data["tax_details"][key] = match.group(1).replace(",", "")

        return data

    def _post_process_llm_output(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Post-process and validate LLM output.

        Args:
            data: Raw LLM output

        Returns:
            Cleaned and validated data
        """
        # Standardize date format
        if data.get("invoice_date"):
            data["invoice_date"] = self._standardize_date(data["invoice_date"])

        # Ensure numeric fields are properly formatted
        numeric_fields = ["total_amount", "subtotal", "discount"]
        for field in numeric_fields:
            if data.get(field):
                data[field] = self._clean_numeric_value(data[field])

        # Clean line items
        if data.get("line_items"):
            for item in data["line_items"]:
                if item.get("unit_price"):
                    item["unit_price"] = self._clean_numeric_value(item["unit_price"])
                if item.get("total_price"):
                    item["total_price"] = self._clean_numeric_value(item["total_price"])

        # Clean tax details
        if data.get("tax_details"):
            tax_numeric = ["total_tax", "cgst", "sgst", "igst", "tax_rate"]
            for field in tax_numeric:
                if data["tax_details"].get(field):
                    data["tax_details"][field] = self._clean_numeric_value(data["tax_details"][field])

        return data

    def _clean_numeric_value(self, value: Any) -> str:
        """Clean and standardize numeric values."""
        if value is None:
            return None

        # Convert to string
        value_str = str(value)

        # Remove currency symbols and commas
        value_str = re.sub(r'[₹$Rs.,]', '', value_str).strip()

        # Handle percentage
        if '%' in value_str:
            value_str = value_str.replace('%', '').strip()

        return value_str

    def _standardize_date(self, date_str: str) -> str:
        """Convert various date formats to YYYY-MM-DD."""
        if not date_str:
            return None

        formats = [
            '%d-%m-%Y', '%d/%m/%Y', '%d.%m.%Y',
            '%d-%m-%y', '%d/%m/%y', '%d.%m.%y',
            '%d %b %Y', '%d %b, %Y', '%d %B %Y',
            '%d %b %y', '%d %B, %Y',
            '%Y-%m-%d', '%Y/%m/%d',
        ]

        for fmt in formats:
            try:
                return datetime.strptime(date_str.strip(), fmt).strftime('%Y-%m-%d')
            except (ValueError, TypeError):
                continue

        return date_str

    def parse_invoice(self, file_bytes: bytes, file_name: str,
                     use_llm: bool = True) -> Dict[str, Any]:
        """
        Main entry point for invoice parsing.

        Args:
            file_bytes: File bytes (image or PDF)
            file_name: Original filename
            use_llm: Whether to use LLM for extraction (fallback to regex if False)

        Returns:
            Structured invoice data
        """
        try:
            # Extract text using OCR
            text = self.extract_text_from_image(file_bytes)

            if not text.strip():
                return {
                    "file_name": file_name,
                    "error": "No text found in image",
                    "document_type": "invoice"
                }

            # Extract structured data
            if use_llm:
                try:
                    extracted_data = self.extract_with_llm(text)
                    extracted_data["extraction_method"] = "llm"
                except Exception as llm_error:
                    # Fallback to regex
                    extracted_data = self.extract_with_regex(text)
                    extracted_data["llm_error"] = str(llm_error)
            else:
                extracted_data = self.extract_with_regex(text)

            # Add metadata
            extracted_data["file_name"] = file_name
            extracted_data["document_type"] = "invoice"
            extracted_data["raw_text"] = text[:500]  # First 500 chars for reference

            # Convert to transaction format
            extracted_data["transactions"] = self._convert_to_transactions(extracted_data)

            return extracted_data

        except Exception as e:
            return {
                "file_name": file_name,
                "error": str(e),
                "document_type": "invoice"
            }

    def _convert_to_transactions(self, invoice_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Convert invoice data to transaction format for import.

        Args:
            invoice_data: Parsed invoice data

        Returns:
            List of transactions ready for import
        """
        transactions = []

        # Create transaction from line items
        if invoice_data.get("line_items"):
            for idx, item in enumerate(invoice_data["line_items"]):
                transactions.append({
                    "id": f"invoice-item-{idx}",
                    "date": invoice_data.get("invoice_date"),
                    "description": item.get("description", ""),
                    "amount": item.get("total_price", item.get("unit_price", "0")),
                    "type": "debit",
                    "selected": True,
                    "metadata": {
                        "quantity": item.get("quantity"),
                        "unit_price": item.get("unit_price"),
                        "invoice_number": invoice_data.get("invoice_number"),
                        "merchant": invoice_data.get("merchant_details", {}).get("name"),
                    }
                })

        # If no line items, create single transaction for total
        if not transactions and invoice_data.get("total_amount"):
            merchant_name = invoice_data.get("merchant_details", {}).get("name", "Unknown Merchant")
            transactions.append({
                "id": "invoice-total",
                "date": invoice_data.get("invoice_date"),
                "description": f"Invoice from {merchant_name}",
                "amount": invoice_data.get("total_amount"),
                "type": "debit",
                "selected": True,
                "metadata": {
                    "invoice_number": invoice_data.get("invoice_number"),
                    "merchant": merchant_name,
                    "payment_method": invoice_data.get("payment_method"),
                }
            })

        return transactions

import fitz  # PyMuPDF
import io
import re
from datetime import datetime
from decimal import Decimal
from PIL import Image
import pytesseract
from typing import Dict, List, Any, Union, Optional
from .ai_unified_parser_service import UnifiedParserService


class DocumentProcessingService:
    """
    Enhanced service to parse documents with intelligent routing.

    Features:
    - Auto-detection of document type (bank statement, invoice, receipt)
    - Specialized parsers for different document types
    - LLM-based extraction for invoices
    - Password-protected PDF support
    - Quality scoring and validation
    """

    def __init__(self):
        """Initialize with unified parser service."""
        self.unified_parser = UnifiedParserService()

    def parse_document(self, file_bytes: bytes, file_name: str, password: str = None,
                      force_type: str = None, enhanced: bool = True) -> Dict[str, Any]:
        """
        Parse a document with intelligent type detection and routing.

        Args:
            file_bytes: The bytes of the file to parse.
            file_name: The original name of the file for format detection.
            password: Optional password for encrypted PDFs.
            force_type: Force specific document type ('statement', 'invoice', 'receipt')
            enhanced: Use enhanced parsing with auto-detection (default: True)

        Returns:
            A dictionary containing structured data from the document.
        """
        if enhanced:
            # Use new unified parser with auto-detection
            result = self.unified_parser.parse_document(
                file_bytes=file_bytes,
                file_name=file_name,
                password=password,
                force_type=force_type
            )

            # Add validation results
            if result.get("transactions"):
                result["validation"] = self.unified_parser.validate_parsed_data(result)

            # Convert to frontend-compatible format
            result = self._convert_to_frontend_format(result)

            return result
        else:
            # Fallback to basic extraction (legacy mode)
            return self._basic_parse_document(file_bytes, file_name, password)

    def _basic_parse_document(self, file_bytes: bytes, file_name: str, password: str = None) -> Dict[str, Any]:
        """
        Basic document parsing (legacy mode - table/text extraction only).

        This is the original parsing logic without intelligent routing.
        """
        file_type = self._get_file_type(file_name)
        doc = self._load_document(file_bytes, file_type, password)

        if not doc:
            raise ValueError("Could not load document. Unsupported file type or corrupted file.")

        extracted_data = {
            "file_name": file_name,
            "num_pages": doc.page_count,
            "pages": []
        }

        for page_num in range(doc.page_count):
            page = doc.load_page(page_num)
            page_data = self._process_page(page)
            extracted_data["pages"].append(page_data)

        return extracted_data

    def _convert_to_frontend_format(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Convert unified parser result to frontend-compatible format.

        Frontend expects:
        - extracted_transactions: List of transactions
        - account_info: Account metadata
        - document_type: Type of document
        - quality_score: Parsing quality
        - validation: Validation results
        """
        frontend_data = {
            "file_name": result.get("file_name"),
            "num_pages": result.get("num_pages", 1),
            "document_type": result.get("document_type"),
            "parsing_status": result.get("parsing_status"),
            "quality_score": result.get("quality_score"),
            "detection_confidence": result.get("detection_confidence"),
        }

        # Add transactions
        frontend_data["extracted_transactions"] = result.get("transactions", [])

        # Convert metadata to account_info format
        metadata = result.get("metadata", {})
        account_info = {}

        # Bank statement metadata
        if metadata.get("account_number"):
            account_info["account_number"] = metadata["account_number"]
        if metadata.get("account_holder"):
            account_info["account_name"] = metadata["account_holder"]
        if metadata.get("statement_period"):
            account_info["statement_period"] = metadata["statement_period"]
        if metadata.get("opening_balance"):
            account_info["opening_balance"] = metadata["opening_balance"]
        if metadata.get("closing_balance"):
            account_info["closing_balance"] = metadata["closing_balance"]

        # Bank info
        if metadata.get("bank"):
            account_info["bank"] = metadata["bank"]
        if metadata.get("account_type"):
            account_info["account_type"] = metadata["account_type"]

        # Credit card specific
        if metadata.get("card_number"):
            account_info["card_number"] = metadata["card_number"]
        if metadata.get("credit_limit"):
            account_info["credit_limit"] = metadata["credit_limit"]
        if metadata.get("available_credit"):
            account_info["available_credit"] = metadata["available_credit"]

        # Invoice/Receipt metadata
        if metadata.get("invoice_number"):
            account_info["invoice_number"] = metadata["invoice_number"]
        if metadata.get("merchant_details"):
            account_info["merchant"] = metadata["merchant_details"]

        frontend_data["account_info"] = account_info
        frontend_data["metadata"] = metadata  # Keep full metadata too

        # Add validation if present
        if result.get("validation"):
            frontend_data["validation"] = result["validation"]

        # Add error if present
        if result.get("error"):
            frontend_data["error"] = result["error"]

        # Add pages data for basic view (if available)
        if result.get("pages"):
            frontend_data["pages"] = result["pages"]

        return frontend_data

    def _get_file_type(self, file_name: str) -> str:
        """Determines the file type from the file extension."""
        return file_name.split('.')[-1].lower()

    def _load_document(self, file_bytes: bytes, file_type: str, password: str = None) -> Union[fitz.Document, None]:
        """
        Loads a document from bytes into a PyMuPDF Document object.

        Args:
            file_bytes: The bytes of the file.
            file_type: The file extension/type.
            password: Optional password for encrypted PDFs.

        Returns:
            A PyMuPDF Document object or None if loading fails.

        Raises:
            ValueError: If PDF is encrypted and password is incorrect or not provided.
        """
        if file_type == 'pdf':
            doc = fitz.open(stream=file_bytes, filetype="pdf")

            # Check if PDF is encrypted
            if doc.is_encrypted:
                if password:
                    # Try to authenticate with the provided password
                    auth_result = doc.authenticate(password)
                    if not auth_result:
                        raise ValueError("Incorrect password for encrypted PDF.")
                else:
                    raise ValueError("PDF is password-protected. Please provide the password.")

            return doc
        elif file_type in ['png', 'jpg', 'jpeg', 'bmp', 'tiff']:
            # Convert image to a PDF in memory to use a unified pipeline
            try:
                image = Image.open(io.BytesIO(file_bytes))
                pdf_buffer = io.BytesIO()
                image.save(pdf_buffer, format='PDF')
                pdf_buffer.seek(0)
                return fitz.open(stream=pdf_buffer, filetype="pdf")
            except Exception:
                return None
        return None

    def _process_page(self, page: fitz.Page) -> Dict[str, Any]:
        """Processes a single page to extract text, tables, and other elements."""
        page_data = {
            "page_number": page.number + 1,
            "text_blocks": [],
            "tables": []
        }

        # 1. Extract structured text blocks
        text_dict = page.get_text("dict")
        if not text_dict["blocks"]:
            # If no text blocks, it might be a scanned page. Perform OCR.
            pix = page.get_pixmap()
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            ocr_text = pytesseract.image_to_string(img)
            page_data["text_blocks"].append({
                "bbox": [0, 0, pix.width, pix.height],
                "text": ocr_text,
                "type": "ocr_full_page"
            })
        else:
            for block in text_dict.get("blocks", []):
                if block['type'] == 0:  # Text block
                    for line in block.get("lines", []):
                        line_text = " ".join([span["text"] for span in line.get("spans", [])])
                        page_data["text_blocks"].append({
                            "bbox": line["bbox"],
                            "text": line_text,
                            "type": "text"
                        })

        # 2. Extract tables
        tables = page.find_tables()
        for i, table in enumerate(tables):
            try:
                extracted_table = table.extract()
                page_data["tables"].append({
                    "bbox": table.bbox,
                    "rows": extracted_table,
                    "row_count": len(extracted_table),
                    "col_count": len(extracted_table[0]) if extracted_table else 0
                })
            except Exception:
                continue

        return page_data
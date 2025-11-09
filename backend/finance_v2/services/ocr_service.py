"""
OCR service for extracting text from receipts, invoices, and bills.

Uses Tesseract OCR for text extraction, then AI for transaction parsing.
Supports: Images (JPG, PNG), PDFs, scanned documents.
"""

import os
import io
import logging
from typing import Dict, Any, Optional, List
from pathlib import Path
import tempfile

from django.conf import settings

logger = logging.getLogger(__name__)


class OCRService:
    """Service for extracting text from documents using OCR."""

    def __init__(self):
        self.supported_image_formats = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif'}
        self.supported_pdf_formats = {'.pdf'}
        self._check_dependencies()

    def _check_dependencies(self):
        """Check if required OCR libraries are available."""
        try:
            import pytesseract
            self.pytesseract = pytesseract
        except ImportError:
            logger.warning("pytesseract not installed. OCR will not work.")
            self.pytesseract = None

        try:
            from PIL import Image
            self.PIL_Image = Image
        except ImportError:
            logger.warning("Pillow not installed. Image OCR will not work.")
            self.PIL_Image = None

        try:
            import fitz  # PyMuPDF
            self.fitz = fitz
        except ImportError:
            logger.warning("PyMuPDF not installed. PDF OCR will not work.")
            self.fitz = None

    def extract_text_from_file(
        self,
        file_path: str,
        language: str = 'eng',
        preprocess: bool = True
    ) -> Dict[str, Any]:
        """
        Extract text from image or PDF file.

        Args:
            file_path: Path to the file
            language: OCR language (eng, hin, spa, etc.)
            preprocess: Whether to preprocess image for better OCR

        Returns:
            {
                "text": str,
                "confidence": float,
                "page_count": int,
                "processing_time": float,
                "error": str (if any)
            }
        """
        if not os.path.exists(file_path):
            return {"error": f"File not found: {file_path}"}

        file_ext = Path(file_path).suffix.lower()

        try:
            if file_ext in self.supported_image_formats:
                return self._extract_from_image(file_path, language, preprocess)
            elif file_ext in self.supported_pdf_formats:
                return self._extract_from_pdf(file_path, language, preprocess)
            else:
                return {"error": f"Unsupported file format: {file_ext}"}
        except Exception as e:
            logger.error(f"OCR extraction failed for {file_path}: {e}")
            return {"error": str(e)}

    def _extract_from_image(
        self,
        image_path: str,
        language: str = 'eng',
        preprocess: bool = True
    ) -> Dict[str, Any]:
        """Extract text from single image using Tesseract."""
        if not self.pytesseract or not self.PIL_Image:
            return {"error": "OCR dependencies not installed (pytesseract, Pillow)"}

        import time
        start_time = time.time()

        try:
            # Open image
            image = self.PIL_Image.open(image_path)

            # Preprocess if requested
            if preprocess:
                image = self._preprocess_image(image)

            # Extract text with detailed data
            ocr_data = self.pytesseract.image_to_data(
                image,
                lang=language,
                output_type=self.pytesseract.Output.DICT
            )

            # Get full text
            text = self.pytesseract.image_to_string(image, lang=language)

            # Calculate average confidence
            confidences = [
                int(conf) for conf in ocr_data['conf']
                if conf != '-1'
            ]
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0

            processing_time = time.time() - start_time

            return {
                "text": text.strip(),
                "confidence": avg_confidence / 100.0,  # Convert to 0-1 scale
                "page_count": 1,
                "processing_time": processing_time,
                "word_count": len(text.split()),
                "metadata": {
                    "language": language,
                    "preprocessed": preprocess,
                    "image_size": image.size
                }
            }

        except Exception as e:
            logger.error(f"Image OCR failed: {e}")
            return {"error": str(e)}

    def _extract_from_pdf(
        self,
        pdf_path: str,
        language: str = 'eng',
        preprocess: bool = True
    ) -> Dict[str, Any]:
        """Extract text from PDF (handles both text-based and scanned PDFs)."""
        if not self.fitz:
            return {"error": "PyMuPDF not installed"}

        import time
        start_time = time.time()

        try:
            # Open PDF
            doc = self.fitz.open(pdf_path)
            all_text = []
            total_confidence = 0
            pages_processed = 0

            for page_num in range(len(doc)):
                page = doc[page_num]

                # Try extracting text directly (for text-based PDFs)
                text = page.get_text()

                if text.strip():
                    # Text-based PDF
                    all_text.append(text)
                    total_confidence += 1.0  # High confidence for text extraction
                    pages_processed += 1
                else:
                    # Scanned PDF - need OCR
                    page_text, confidence = self._ocr_pdf_page(page, language, preprocess)
                    if page_text:
                        all_text.append(page_text)
                        total_confidence += confidence
                        pages_processed += 1

            doc.close()

            combined_text = "\n\n".join(all_text)
            avg_confidence = total_confidence / pages_processed if pages_processed > 0 else 0
            processing_time = time.time() - start_time

            return {
                "text": combined_text.strip(),
                "confidence": avg_confidence,
                "page_count": pages_processed,
                "processing_time": processing_time,
                "word_count": len(combined_text.split()),
                "metadata": {
                    "language": language,
                    "preprocessed": preprocess,
                    "total_pages": len(doc)
                }
            }

        except Exception as e:
            logger.error(f"PDF OCR failed: {e}")
            return {"error": str(e)}

    def _ocr_pdf_page(
        self,
        page,
        language: str = 'eng',
        preprocess: bool = True
    ) -> tuple[str, float]:
        """
        Perform OCR on a single PDF page.

        Returns:
            (extracted_text, confidence)
        """
        if not self.pytesseract or not self.PIL_Image:
            return "", 0.0

        try:
            # Render page to image
            pix = page.get_pixmap(matrix=self.fitz.Matrix(2, 2))  # 2x zoom for better quality

            # Convert to PIL Image
            img_data = pix.tobytes("png")
            image = self.PIL_Image.open(io.BytesIO(img_data))

            # Preprocess if requested
            if preprocess:
                image = self._preprocess_image(image)

            # Extract text
            ocr_data = self.pytesseract.image_to_data(
                image,
                lang=language,
                output_type=self.pytesseract.Output.DICT
            )

            text = self.pytesseract.image_to_string(image, lang=language)

            # Calculate confidence
            confidences = [int(conf) for conf in ocr_data['conf'] if conf != '-1']
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0

            return text.strip(), avg_confidence / 100.0

        except Exception as e:
            logger.error(f"PDF page OCR failed: {e}")
            return "", 0.0

    def _preprocess_image(self, image):
        """
        Preprocess image for better OCR results.

        Techniques:
        - Convert to grayscale
        - Increase contrast
        - Remove noise
        - Sharpen
        """
        if not self.PIL_Image:
            return image

        try:
            from PIL import ImageEnhance, ImageFilter

            # Convert to grayscale
            if image.mode != 'L':
                image = image.convert('L')

            # Increase contrast
            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(2.0)

            # Sharpen
            image = image.filter(ImageFilter.SHARPEN)

            # Remove noise (optional)
            # image = image.filter(ImageFilter.MedianFilter(size=3))

            return image

        except Exception as e:
            logger.warning(f"Image preprocessing failed: {e}")
            return image

    def extract_text_from_bytes(
        self,
        file_bytes: bytes,
        file_extension: str,
        language: str = 'eng',
        preprocess: bool = True
    ) -> Dict[str, Any]:
        """
        Extract text from file bytes (useful for uploaded files).

        Args:
            file_bytes: File content as bytes
            file_extension: File extension (e.g., '.jpg', '.pdf')
            language: OCR language
            preprocess: Whether to preprocess

        Returns:
            Same as extract_text_from_file
        """
        # Save to temp file
        with tempfile.NamedTemporaryFile(
            suffix=file_extension,
            delete=False
        ) as temp_file:
            temp_file.write(file_bytes)
            temp_path = temp_file.name

        try:
            result = self.extract_text_from_file(
                temp_path,
                language=language,
                preprocess=preprocess
            )
            return result
        finally:
            # Clean up temp file
            try:
                os.unlink(temp_path)
            except Exception:
                pass

    def extract_structured_data(
        self,
        file_path: str,
        document_type: str = 'receipt'
    ) -> Dict[str, Any]:
        """
        Extract structured transaction data from document.

        This combines OCR + AI extraction in one call.

        Args:
            file_path: Path to document
            document_type: Type (receipt, invoice, bill)

        Returns:
            {
                "ocr_result": {...},  # Raw OCR output
                "extracted_data": {...},  # AI-extracted transaction data
                "success": bool
            }
        """
        # Step 1: OCR
        ocr_result = self.extract_text_from_file(file_path)

        if ocr_result.get('error'):
            return {
                "ocr_result": ocr_result,
                "success": False,
                "error": ocr_result['error']
            }

        # Step 2: AI extraction
        from .ai_transaction_extractor import get_extractor
        extractor = get_extractor()

        extracted_data = extractor.extract_from_ocr_text(
            ocr_text=ocr_result['text'],
            document_type=document_type
        )

        return {
            "ocr_result": ocr_result,
            "extracted_data": extracted_data,
            "success": True
        }


# Singleton instance
_ocr_service = None


def get_ocr_service() -> OCRService:
    """Get singleton instance of OCR service."""
    global _ocr_service
    if _ocr_service is None:
        _ocr_service = OCRService()
    return _ocr_service


# For backward compatibility
def extract_text_from_image(image_path: str, language: str = 'eng') -> str:
    """Extract text from image (simple interface)."""
    service = get_ocr_service()
    result = service.extract_text_from_file(image_path, language=language)
    return result.get('text', '')


def extract_text_from_pdf(pdf_path: str, language: str = 'eng') -> str:
    """Extract text from PDF (simple interface)."""
    service = get_ocr_service()
    result = service.extract_text_from_file(pdf_path, language=language)
    return result.get('text', '')

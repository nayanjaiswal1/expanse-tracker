"""
Enhanced Invoice Parser with multi-model support and training data capture.
"""

import hashlib
import time
from typing import Dict, Any, Optional
from django.conf import settings
from .ai_invoice_parser import InvoiceParser
from .providers.openai import OpenAIProvider
from .providers.anthropic import AnthropicProvider
from .providers.ollama import OllamaProvider


class EnhancedInvoiceParser:
    """
    Invoice parser with multi-model support and training data tracking.
    """

    AI_MODELS = {
        'openai_gpt4': {'provider': 'openai', 'model': 'gpt-4'},
        'openai_gpt4o': {'provider': 'openai', 'model': 'gpt-4o'},
        'openai_gpt35': {'provider': 'openai', 'model': 'gpt-3.5-turbo'},
        'anthropic_claude_opus': {'provider': 'anthropic', 'model': 'claude-3-opus-20240229'},
        'anthropic_claude_sonnet': {'provider': 'anthropic', 'model': 'claude-3-5-sonnet-20241022'},
        'anthropic_claude_haiku': {'provider': 'anthropic', 'model': 'claude-3-haiku-20240307'},
        'ollama_llama3': {'provider': 'ollama', 'model': 'llama3'},
        'ollama_mistral': {'provider': 'ollama', 'model': 'mistral'},
        'ollama_custom': {'provider': 'ollama', 'model': getattr(settings, 'OLLAMA_MODEL', 'llama3')},
    }

    def __init__(self, ai_model: str = 'ollama_llama3'):
        """
        Initialize parser with specified AI model.

        Args:
            ai_model: Key from AI_MODELS dict
        """
        if ai_model not in self.AI_MODELS:
            raise ValueError(f"Invalid AI model. Choose from: {list(self.AI_MODELS.keys())}")

        self.ai_model = ai_model
        model_config = self.AI_MODELS[ai_model]
        self.provider_type = model_config['provider']
        self.model_name = model_config['model']

        # Initialize provider
        self.provider = self._get_provider()

        # Fallback to basic OCR parser
        self.fallback_parser = InvoiceParser()

    def _get_provider(self):
        """Get the appropriate AI provider instance."""
        if self.provider_type == 'openai':
            api_key = getattr(settings, 'OPENAI_API_KEY', None)
            return OpenAIProvider(api_key=api_key, model=self.model_name)

        elif self.provider_type == 'anthropic':
            api_key = getattr(settings, 'ANTHROPIC_API_KEY', None)
            return AnthropicProvider(api_key=api_key, model=self.model_name)

        elif self.provider_type == 'ollama':
            base_url = getattr(settings, 'OLLAMA_URL', 'http://localhost:11434/api/generate')
            return OllamaProvider(base_url=base_url, model=self.model_name)

        else:
            raise ValueError(f"Unknown provider: {self.provider_type}")

    def _calculate_file_hash(self, file_bytes: bytes) -> str:
        """Calculate SHA256 hash of file for deduplication."""
        return hashlib.sha256(file_bytes).hexdigest()

    def _extract_with_provider(self, text: str) -> Dict[str, Any]:
        """
        Extract invoice data using the selected AI provider.
        """
        prompt = self._build_extraction_prompt(text)

        try:
            if self.provider_type == 'openai':
                response = self.provider.perform_task(
                    prompt=prompt,
                    response_format={"type": "json_object"},
                    temperature=0
                )
                return response

            elif self.provider_type == 'anthropic':
                response = self.provider.perform_task(
                    prompt=prompt,
                    temperature=0,
                    max_tokens=4096
                )
                # Parse JSON from response
                import json
                return json.loads(response.get('text', '{}'))

            elif self.provider_type == 'ollama':
                response = self.provider.perform_task(
                    prompt=prompt,
                    format='json'
                )
                return response

        except Exception as e:
            raise ValueError(f"AI extraction failed: {str(e)}")

    def _build_extraction_prompt(self, text: str) -> str:
        """Build the prompt for AI extraction."""
        return f"""You are a world-class AI assistant for invoice processing. Extract detailed, structured information from the provided OCR text of an invoice.

**Extraction Schema:**
Extract the following fields into a valid JSON object:
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
- When you see a number with a dot (.), like `20.00`, the dot is a DECIMAL SEPARATOR. The correct value is `20.00`, NOT `2000`.
- DO NOT convert `20.00` to `2000`.
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

    def parse_invoice(
        self,
        file_bytes: bytes,
        file_name: str,
        user=None,
        store_training_data: bool = True
    ) -> Dict[str, Any]:
        """
        Parse invoice and optionally store training data.

        Args:
            file_bytes: File bytes (image or PDF)
            file_name: Original filename
            user: User object for training data attribution
            store_training_data: Whether to store parsing attempt for training

        Returns:
            Structured invoice data with training metadata
        """
        start_time = time.time()
        file_hash = self._calculate_file_hash(file_bytes)
        file_size = len(file_bytes)

        result = {
            'file_name': file_name,
            'file_hash': file_hash,
            'ai_model_used': self.ai_model,
            'ai_provider': self.provider_type,
        }

        try:
            # Extract text using OCR
            text = self.fallback_parser.extract_text_from_image(file_bytes)
            result['raw_ocr_text'] = text[:1000]  # Store first 1000 chars

            if not text.strip():
                result['error'] = 'No text found in image'
                result['extraction_method'] = 'failed'
                return result

            # Extract structured data using AI
            extracted_data = self._extract_with_provider(text)

            # Post-process
            extracted_data = self.fallback_parser._post_process_llm_output(extracted_data)

            # Add metadata
            extracted_data['extraction_method'] = self.ai_model
            extracted_data['file_name'] = file_name
            extracted_data['document_type'] = 'invoice'

            # Convert to transaction format
            extracted_data['transactions'] = self.fallback_parser._convert_to_transactions(extracted_data)

            processing_time = int((time.time() - start_time) * 1000)
            result['processing_time_ms'] = processing_time
            result.update(extracted_data)

            # Store training data if enabled
            if store_training_data and user:
                self._store_parsing_attempt(
                    user=user,
                    file_name=file_name,
                    file_size=file_size,
                    file_hash=file_hash,
                    raw_text=text,
                    extracted_data=extracted_data,
                    processing_time=processing_time
                )

            return result

        except Exception as e:
            result['error'] = str(e)
            result['extraction_method'] = 'failed'

            # Try fallback to regex
            try:
                text = self.fallback_parser.extract_text_from_image(file_bytes)
                fallback_data = self.fallback_parser.extract_with_regex(text)
                result.update(fallback_data)
                result['extraction_method'] = 'regex_fallback'
            except:
                pass

            return result

    def _store_parsing_attempt(
        self,
        user,
        file_name: str,
        file_size: int,
        file_hash: str,
        raw_text: str,
        extracted_data: Dict,
        processing_time: int
    ):
        """Store parsing attempt for training data collection."""
        try:
            from finance.models import InvoiceParsingAttempt

            InvoiceParsingAttempt.objects.create(
                user=user,
                file_name=file_name,
                file_size=file_size,
                file_type=file_name.split('.')[-1].lower(),
                file_hash=file_hash,
                raw_ocr_text=raw_text[:5000],  # Store first 5000 chars
                ai_model_used=self.ai_model,
                ai_provider=self.provider_type,
                extraction_method=self.ai_model,
                processing_time_ms=processing_time,
                ai_extracted_data=extracted_data,
                status='pending_review'
            )
        except Exception as e:
            # Don't fail the whole parsing if training data storage fails
            print(f"Failed to store training data: {e}")

    @staticmethod
    def get_available_models() -> Dict[str, Dict[str, str]]:
        """
        Get list of available AI models with their details.

        Returns:
            Dict of model_key -> {provider, model, name, description}
        """
        return {
            'openai_gpt4': {
                'provider': 'openai',
                'model': 'gpt-4',
                'name': 'GPT-4',
                'description': 'Most capable OpenAI model, best accuracy',
                'requires_api_key': True
            },
            'openai_gpt4o': {
                'provider': 'openai',
                'model': 'gpt-4o',
                'name': 'GPT-4o',
                'description': 'Fast and capable multimodal model',
                'requires_api_key': True
            },
            'openai_gpt35': {
                'provider': 'openai',
                'model': 'gpt-3.5-turbo',
                'name': 'GPT-3.5 Turbo',
                'description': 'Fast and cost-effective',
                'requires_api_key': True
            },
            'anthropic_claude_opus': {
                'provider': 'anthropic',
                'model': 'claude-3-opus-20240229',
                'name': 'Claude 3 Opus',
                'description': 'Most capable Claude model',
                'requires_api_key': True
            },
            'anthropic_claude_sonnet': {
                'provider': 'anthropic',
                'model': 'claude-3-5-sonnet-20241022',
                'name': 'Claude 3.5 Sonnet',
                'description': 'Balanced performance and speed',
                'requires_api_key': True
            },
            'anthropic_claude_haiku': {
                'provider': 'anthropic',
                'model': 'claude-3-haiku-20240307',
                'name': 'Claude 3 Haiku',
                'description': 'Fast and efficient',
                'requires_api_key': True
            },
            'ollama_llama3': {
                'provider': 'ollama',
                'model': 'llama3',
                'name': 'Llama 3 (Local)',
                'description': 'Free local model via Ollama',
                'requires_api_key': False
            },
            'ollama_mistral': {
                'provider': 'ollama',
                'model': 'mistral',
                'name': 'Mistral (Local)',
                'description': 'Free local model via Ollama',
                'requires_api_key': False
            },
        }

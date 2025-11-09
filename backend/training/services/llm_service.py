"""
Configurable LLM service that supports multiple providers (Ollama, OpenAI, etc.)
"""

import json
import logging
import time
from typing import Dict, Any, Optional
import re
from decimal import Decimal
import requests
from django.conf import settings
from dateutil import parser as date_parser

logger = logging.getLogger(__name__)


class LLMService:
    """
    Configurable LLM service supporting multiple providers.
    Supports: Ollama, OpenAI, Anthropic, or any OpenAI-compatible API.
    """

    def __init__(self):
        self.provider = getattr(settings, 'LLM_PROVIDER', 'ollama')
        self.api_base = getattr(settings, 'LLM_API_BASE', 'http://localhost:11434')
        self.model = getattr(settings, 'LLM_MODEL', 'llama3.2')
        self.api_key = getattr(settings, 'LLM_API_KEY', None)
        self.timeout = getattr(settings, 'LLM_TIMEOUT', 60)
        self.max_retries = getattr(settings, 'LLM_MAX_RETRIES', 3)

    def call_llm(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.1,
        max_tokens: int = 2000,
    ) -> Dict[str, Any]:
        """
        Call the configured LLM provider.

        Args:
            prompt: User prompt
            system_prompt: System prompt (optional)
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate

        Returns:
            Dict with 'response' (str) and 'raw_response' (dict)
        """
        start_time = time.time()

        try:
            if self.provider == 'ollama':
                result = self._call_ollama(prompt, system_prompt, temperature)
            elif self.provider in ['openai', 'anthropic', 'openai-compatible']:
                result = self._call_openai_compatible(
                    prompt, system_prompt, temperature, max_tokens
                )
            else:
                raise ValueError(f"Unsupported LLM provider: {self.provider}")

            processing_time_ms = int((time.time() - start_time) * 1000)
            result['processing_time_ms'] = processing_time_ms

            return result

        except Exception as e:
            logger.error(f"LLM call failed: {e}", exc_info=True)
            raise

    def _call_ollama(
        self,
        prompt: str,
        system_prompt: Optional[str],
        temperature: float,
    ) -> Dict[str, Any]:
        """Call Ollama API"""
        url = f"{self.api_base}/api/generate"

        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": temperature,
            }
        }

        if system_prompt:
            payload["system"] = system_prompt

        for attempt in range(self.max_retries):
            try:
                response = requests.post(
                    url,
                    json=payload,
                    timeout=self.timeout
                )
                response.raise_for_status()
                data = response.json()

                return {
                    'response': data.get('response', '').strip(),
                    'raw_response': data,
                    'model': self.model,
                    'provider': self.provider,
                }

            except requests.exceptions.RequestException as e:
                logger.warning(
                    f"Ollama API call failed (attempt {attempt + 1}/{self.max_retries}): {e}"
                )
                if attempt == self.max_retries - 1:
                    raise
                time.sleep(2 ** attempt)  # Exponential backoff

    def _call_openai_compatible(
        self,
        prompt: str,
        system_prompt: Optional[str],
        temperature: float,
        max_tokens: int,
    ) -> Dict[str, Any]:
        """Call OpenAI-compatible API (OpenAI, Anthropic with adapter, etc.)"""
        url = f"{self.api_base}/v1/chat/completions"

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        for attempt in range(self.max_retries):
            try:
                response = requests.post(
                    url,
                    json=payload,
                    headers=headers,
                    timeout=self.timeout
                )
                response.raise_for_status()
                data = response.json()

                return {
                    'response': data['choices'][0]['message']['content'].strip(),
                    'raw_response': data,
                    'model': self.model,
                    'provider': self.provider,
                }

            except requests.exceptions.RequestException as e:
                logger.warning(
                    f"OpenAI-compatible API call failed (attempt {attempt + 1}/{self.max_retries}): {e}"
                )
                if attempt == self.max_retries - 1:
                    raise
                time.sleep(2 ** attempt)

    def extract_json_from_response(self, response: str) -> Optional[Dict]:
        """
        Extract JSON from LLM response, handling markdown code blocks.

        Args:
            response: LLM response text

        Returns:
            Parsed JSON dict or None if parsing fails
        """
        # Try to extract JSON from markdown code blocks
        if '```json' in response:
            start = response.find('```json') + 7
            end = response.find('```', start)
            if end != -1:
                response = response[start:end].strip()
        elif '```' in response:
            start = response.find('```') + 3
            end = response.find('```', start)
            if end != -1:
                response = response[start:end].strip()

        # Try to parse JSON
        try:
            return json.loads(response)
        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse JSON from LLM response: {e}")
            logger.debug(f"Response content: {response[:500]}")
            return None

    def _extract_json_like_block(self, text: str) -> Optional[str]:
        """
        Extract the first JSON object from text using json.JSONDecoder.

        Args:
            text: Source text that may contain a JSON object

        Returns:
            Substring representing the JSON block or None if not found
        """
        decoder = json.JSONDecoder()
        start = text.find('{')
        while start != -1:
            try:
                obj, end = decoder.raw_decode(text[start:])
                return text[start:start + end]
            except json.JSONDecodeError:
                # Advance to the next possible JSON object start
                start = text.find('{', start + 1)
        return None

    def _parse_structured_text_response(self, response: str) -> Optional[Dict[str, Any]]:
        """
        Parse markdown-like responses that include labelled sections instead of raw JSON.

        Args:
            response: Raw LLM response text

        Returns:
            Parsed dict or None if the structure does not match the expected pattern
        """
        label_match = re.search(r'\*\*Classification:\*\*\s*([A-Za-z _-]+)', response, re.IGNORECASE)
        if not label_match:
            return None

        result: Dict[str, Any] = {
            'label': label_match.group(1).strip().upper(),
        }

        confidence_match = re.search(r'\*\*Confidence:\*\*\s*([0-9]+(?:\.[0-9]+)?)', response)
        if confidence_match:
            try:
                result['confidence'] = float(confidence_match.group(1))
            except ValueError:
                result['confidence'] = 0.0
        else:
            result['confidence'] = 0.0

        tx_marker = re.search(r'\*\*Transaction Data:\*\*', response, re.IGNORECASE)
        if tx_marker:
            block = self._extract_json_like_block(response[tx_marker.end():])
            if block:
                cleaned_block = re.sub(r'//.*', '', block)
                try:
                    tx_json = json.loads(cleaned_block)
                    result['transaction_data'] = tx_json
                except json.JSONDecodeError:
                    logger.debug("Failed to decode transaction data block from markdown response.")

        return result

    def parse_extraction_response(self, response: str) -> Dict[str, Any]:
        """
        Parse and validate the LLM extraction response.

        Expected JSON schema:
        {
            "label": "TRANSACTION|OFFER|ALERT|STATEMENT|SPAM|OTHER",
            "confidence": 0.0-1.0,
            "transaction_data": {
                "transaction_type": "DEBIT|CREDIT|PAYMENT|REFUND",
                "amount": float,
                "currency": "INR",
                "account_number": "XXXX1234",
                "merchant": "Amazon",
                "transaction_date": "2024-01-15T10:30:00",
                "reference_id": "TXN123456",
                "source": "GMAIL|BANK_STATEMENT|SMS"
            }
        }
        """
        extracted = self.extract_json_from_response(response)

        if not extracted:
            extracted = self._parse_structured_text_response(response)

        if not extracted:
            return {
                'label': 'OTHER',
                'confidence': 0.0,
                'error': 'Failed to parse JSON response'
            }

        # Validate and normalize
        confidence_value = extracted.get('confidence', 0.0)
        try:
            confidence_float = float(confidence_value)
        except (TypeError, ValueError):
            confidence_float = 0.0

        result = {
            'label': extracted.get('label', 'OTHER').upper(),
            'confidence': confidence_float,
        }

        # Extract transaction data if present
        if 'transaction_data' in extracted and extracted['transaction_data']:
            tx_data = extracted['transaction_data']
            result['transaction_data'] = {}

            if tx_data.get('transaction_type'):
                result['transaction_data']['transaction_type'] = tx_data['transaction_type'].upper()

            if tx_data.get('amount'):
                try:
                    result['transaction_data']['amount'] = Decimal(str(tx_data['amount']))
                except (ValueError, TypeError):
                    logger.warning(f"Invalid amount: {tx_data.get('amount')}")

            if tx_data.get('currency'):
                result['transaction_data']['currency'] = tx_data['currency'].upper()

            if tx_data.get('merchant'):
                result['transaction_data']['merchant'] = str(tx_data['merchant']).strip()

            if tx_data.get('account_number'):
                result['transaction_data']['account_number'] = str(tx_data['account_number']).strip()

            if tx_data.get('reference_id'):
                result['transaction_data']['reference_id'] = str(tx_data['reference_id']).strip()

            if tx_data.get('transaction_date'):
                try:
                    result['transaction_data']['transaction_date'] = date_parser.parse(
                        tx_data['transaction_date']
                    )
                except (ValueError, TypeError) as e:
                    logger.warning(f"Invalid transaction_date: {tx_data.get('transaction_date')}: {e}")

            if tx_data.get('source'):
                result['transaction_data']['source'] = tx_data['source'].upper()

        # Extract statement data if present
        if 'statement_data' in extracted and extracted['statement_data']:
            stmt_data = extracted['statement_data']
            result['statement_data'] = {}

            if stmt_data.get('account_number'):
                result['statement_data']['account_number'] = str(stmt_data['account_number']).strip()

            if stmt_data.get('bank_name'):
                result['statement_data']['bank_name'] = str(stmt_data['bank_name']).strip()

            if stmt_data.get('currency'):
                result['statement_data']['currency'] = str(stmt_data['currency']).upper()

            for key in ('closing_balance', 'minimum_due', 'total_due'):
                if stmt_data.get(key) is not None:
                    try:
                        result['statement_data'][key] = Decimal(str(stmt_data[key]))
                    except (ValueError, TypeError):
                        logger.warning(f"Invalid {key}: {stmt_data.get(key)}")

            for date_key in ('due_date', 'statement_period_start', 'statement_period_end'):
                if stmt_data.get(date_key):
                    try:
                        result['statement_data'][date_key] = date_parser.parse(stmt_data[date_key])
                    except (ValueError, TypeError) as e:
                        logger.warning(f"Invalid {date_key}: {stmt_data.get(date_key)}: {e}")

        # Extract invoice data if present
        if 'invoice_data' in extracted and extracted['invoice_data']:
            inv_data = extracted['invoice_data']
            result['invoice_data'] = {}

            if inv_data.get('invoice_number'):
                result['invoice_data']['invoice_number'] = str(inv_data['invoice_number']).strip()

            if inv_data.get('vendor'):
                result['invoice_data']['vendor'] = str(inv_data['vendor']).strip()

            if inv_data.get('currency'):
                result['invoice_data']['currency'] = str(inv_data['currency']).upper()

            if inv_data.get('billing_period_start'):
                try:
                    result['invoice_data']['billing_period_start'] = date_parser.parse(inv_data['billing_period_start'])
                except (ValueError, TypeError) as e:
                    logger.warning(f"Invalid billing_period_start: {inv_data.get('billing_period_start')}: {e}")

            if inv_data.get('billing_period_end'):
                try:
                    result['invoice_data']['billing_period_end'] = date_parser.parse(inv_data['billing_period_end'])
                except (ValueError, TypeError) as e:
                    logger.warning(f"Invalid billing_period_end: {inv_data.get('billing_period_end')}: {e}")

            for money_key in ('amount_due',):
                if inv_data.get(money_key) is not None:
                    try:
                        result['invoice_data'][money_key] = Decimal(str(inv_data[money_key]))
                    except (ValueError, TypeError):
                        logger.warning(f"Invalid {money_key}: {inv_data.get(money_key)}")

            for date_key in ('due_date', 'invoice_date'):
                if inv_data.get(date_key):
                    try:
                        result['invoice_data'][date_key] = date_parser.parse(inv_data[date_key])
                    except (ValueError, TypeError) as e:
                        logger.warning(f"Invalid {date_key}: {inv_data.get(date_key)}: {e}")

        return result

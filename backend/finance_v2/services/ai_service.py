"""
AI/LLM service provider abstraction.

Supports multiple providers: Ollama, OpenAI, Anthropic.
Provides unified interface for all AI operations.
"""

import logging
from typing import Any, Dict, Optional, List
import json

from django.conf import settings

logger = logging.getLogger(__name__)


class LLMProvider:
    """
    Unified LLM provider interface.

    Auto-selects provider based on settings.LLM_PROVIDER.
    """

    def __init__(self, provider: Optional[str] = None):
        """
        Initialize LLM provider.

        Args:
            provider: Override provider ('ollama', 'openai', 'anthropic')
                     If None, uses settings.LLM_PROVIDER
        """
        self.provider_name = provider or getattr(settings, 'LLM_PROVIDER', 'ollama')
        self.provider = self._get_provider()

    def _get_provider(self):
        """Get the actual provider instance."""
        if self.provider_name == 'ollama':
            return OllamaProvider()
        elif self.provider_name == 'openai':
            return OpenAIProvider()
        elif self.provider_name == 'anthropic':
            return AnthropicProvider()
        else:
            logger.warning(f"Unknown provider '{self.provider_name}', falling back to Ollama")
            return OllamaProvider()

    def generate(
        self,
        prompt: str,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        system_prompt: Optional[str] = None
    ) -> str:
        """
        Generate text completion.

        Args:
            prompt: User prompt
            temperature: Sampling temperature (0.0 = deterministic, 1.0 = creative)
            max_tokens: Maximum tokens to generate
            system_prompt: System/context prompt

        Returns:
            Generated text
        """
        return self.provider.generate(
            prompt=prompt,
            temperature=temperature,
            max_tokens=max_tokens,
            system_prompt=system_prompt
        )

    def generate_json(
        self,
        prompt: str,
        temperature: float = 0.1,
        max_tokens: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Generate JSON response.

        Args:
            prompt: User prompt (should ask for JSON)
            temperature: Lower temperature for structured output
            max_tokens: Maximum tokens

        Returns:
            Parsed JSON dict
        """
        response = self.generate(
            prompt=prompt,
            temperature=temperature,
            max_tokens=max_tokens
        )

        # Try to parse JSON
        try:
            # Try direct parse
            return json.loads(response)
        except json.JSONDecodeError:
            # Try extracting from code blocks
            if '```json' in response:
                start = response.find('```json') + 7
                end = response.find('```', start)
                json_str = response[start:end].strip()
                return json.loads(json_str)
            elif '```' in response:
                start = response.find('```') + 3
                end = response.find('```', start)
                json_str = response[start:end].strip()
                return json.loads(json_str)
            elif '{' in response:
                # Try to extract JSON object
                start = response.find('{')
                end = response.rfind('}') + 1
                json_str = response[start:end]
                return json.loads(json_str)
            else:
                raise ValueError(f"Could not extract JSON from response: {response[:200]}")


class OllamaProvider:
    """Ollama provider (local LLM)."""

    def __init__(self):
        self.base_url = getattr(settings, 'OLLAMA_BASE_URL', 'http://localhost:11434')
        self.model = getattr(settings, 'OLLAMA_MODEL', 'llama2')

        try:
            import ollama
            self.client = ollama.Client(host=self.base_url)
        except ImportError:
            logger.error("ollama package not installed")
            self.client = None

    def generate(
        self,
        prompt: str,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        system_prompt: Optional[str] = None
    ) -> str:
        """Generate text using Ollama."""
        if not self.client:
            raise RuntimeError("Ollama client not available")

        messages = []

        if system_prompt:
            messages.append({
                'role': 'system',
                'content': system_prompt
            })

        messages.append({
            'role': 'user',
            'content': prompt
        })

        try:
            response = self.client.chat(
                model=self.model,
                messages=messages,
                options={
                    'temperature': temperature,
                    'num_predict': max_tokens or -1
                }
            )

            return response['message']['content']

        except Exception as e:
            logger.error(f"Ollama generation failed: {e}")
            raise


class OpenAIProvider:
    """OpenAI provider (GPT models)."""

    def __init__(self):
        self.api_key = getattr(settings, 'OPENAI_API_KEY', None)
        self.model = getattr(settings, 'OPENAI_MODEL', 'gpt-4')

        if not self.api_key:
            logger.warning("OPENAI_API_KEY not set in settings")

        try:
            import openai
            self.client = openai.OpenAI(api_key=self.api_key)
        except ImportError:
            logger.error("openai package not installed")
            self.client = None

    def generate(
        self,
        prompt: str,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        system_prompt: Optional[str] = None
    ) -> str:
        """Generate text using OpenAI."""
        if not self.client:
            raise RuntimeError("OpenAI client not available")

        messages = []

        if system_prompt:
            messages.append({
                'role': 'system',
                'content': system_prompt
            })

        messages.append({
            'role': 'user',
            'content': prompt
        })

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens
            )

            return response.choices[0].message.content

        except Exception as e:
            logger.error(f"OpenAI generation failed: {e}")
            raise


class AnthropicProvider:
    """Anthropic provider (Claude models)."""

    def __init__(self):
        self.api_key = getattr(settings, 'ANTHROPIC_API_KEY', None)
        self.model = getattr(settings, 'ANTHROPIC_MODEL', 'claude-3-sonnet-20240229')

        if not self.api_key:
            logger.warning("ANTHROPIC_API_KEY not set in settings")

        try:
            import anthropic
            self.client = anthropic.Anthropic(api_key=self.api_key)
        except ImportError:
            logger.error("anthropic package not installed")
            self.client = None

    def generate(
        self,
        prompt: str,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        system_prompt: Optional[str] = None
    ) -> str:
        """Generate text using Anthropic Claude."""
        if not self.client:
            raise RuntimeError("Anthropic client not available")

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=max_tokens or 4096,
                temperature=temperature,
                system=system_prompt or "You are a helpful AI assistant.",
                messages=[
                    {
                        'role': 'user',
                        'content': prompt
                    }
                ]
            )

            return response.content[0].text

        except Exception as e:
            logger.error(f"Anthropic generation failed: {e}")
            raise


# Convenience functions
def get_llm_provider(provider: Optional[str] = None) -> LLMProvider:
    """Get LLM provider instance."""
    return LLMProvider(provider=provider)


def generate_text(prompt: str, **kwargs) -> str:
    """Quick text generation using default provider."""
    provider = get_llm_provider()
    return provider.generate(prompt, **kwargs)


def generate_json(prompt: str, **kwargs) -> Dict[str, Any]:
    """Quick JSON generation using default provider."""
    provider = get_llm_provider()
    return provider.generate_json(prompt, **kwargs)

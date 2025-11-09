import openai
from typing import Dict, Any
from .base import BaseAIProvider


class OpenAIProvider(BaseAIProvider):
    """AI provider for OpenAI models."""

    def __init__(self, api_key: str, model: str = "gpt-3.5-turbo", **kwargs):
        super().__init__(api_key=api_key, model=model, **kwargs)
        self.client = openai.OpenAI(api_key=self.api_key)

    def perform_task(self, prompt: str, **kwargs) -> Dict[str, Any]:
        """Perform a task using the OpenAI API."""
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                **self.kwargs,  # Pass additional arguments like max_tokens, temperature
            )
            content = response.choices[0].message.content.strip()
            tokens_used = (
                response.usage.total_tokens if hasattr(response, "usage") else 0
            )
            return {"success": True, "content": content, "tokens_used": tokens_used}
        except Exception as e:
            return {"success": False, "error": str(e)}

import anthropic
from typing import Dict, Any
from .base import BaseAIProvider


class AnthropicProvider(BaseAIProvider):
    """AI provider for Anthropic models."""

    def __init__(self, api_key: str, model: str = "claude-2", **kwargs):
        super().__init__(api_key=api_key, model=model, **kwargs)
        self.client = anthropic.Anthropic(api_key=self.api_key)

    def perform_task(self, prompt: str, **kwargs) -> Dict[str, Any]:
        """Perform a task using the Anthropic API."""
        try:
            # Anthropic API expects messages format
            # For simple prompt, we can wrap it as a user message
            messages = [{"role": "user", "content": prompt}]

            response = self.client.messages.create(
                model=self.model,
                max_tokens=kwargs.get("max_tokens", 1024),  # Default max_tokens
                messages=messages,
                **{
                    k: v
                    for k, v in self.kwargs.items()
                    if k not in ["api_key", "model"]
                },  # Pass other kwargs
            )
            content = response.content[0].text.strip()
            tokens_used = response.usage.input_tokens + response.usage.output_tokens
            return {"success": True, "content": content, "tokens_used": tokens_used}
        except Exception as e:
            return {"success": False, "error": str(e)}

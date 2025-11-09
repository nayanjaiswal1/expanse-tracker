from mistralai.client import MistralClient
from mistralai.models import DeltaMessage  # Changed from ChatMessage
from typing import Dict, Any
from .base import BaseAIProvider


class MistralProvider(BaseAIProvider):
    """AI provider for Mistral AI models."""

    def __init__(self, api_key: str, model: str = "mistral-tiny", **kwargs):
        super().__init__(api_key=api_key, model=model, **kwargs)
        self.client = MistralClient(api_key=self.api_key)

    def perform_task(self, prompt: str, **kwargs) -> Dict[str, Any]:
        """Perform a task using the Mistral AI API."""
        try:
            # Mistral API expects messages format
            # For simple prompt, we can wrap it as a user message
            messages = [DeltaMessage(role="user", content=prompt)]  # Use DeltaMessage

            chat_response = self.client.chat(
                model=self.model,
                messages=messages,
                **{
                    k: v
                    for k, v in self.kwargs.items()
                    if k not in ["api_key", "model"]
                },  # Pass other kwargs
            )
            content = chat_response.choices[0].message.content.strip()
            tokens_used = chat_response.usage.total_tokens
            return {"success": True, "content": content, "tokens_used": tokens_used}
        except Exception as e:
            return {"success": False, "error": str(e)}

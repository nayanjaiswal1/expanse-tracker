import ollama
from typing import Dict, Any
from .base import BaseAIProvider


class OllamaProvider(BaseAIProvider):
    """AI provider for Ollama models."""

    def __init__(self, model: str = "llama2", host: str = None, **kwargs):
        super().__init__(model=model, **kwargs)
        self.client = ollama.Client(host=host)

    def perform_task(self, prompt: str, **kwargs) -> Dict[str, Any]:
        """Perform a task using the Ollama API."""
        try:
            response = self.client.generate(
                model=self.model,
                prompt=prompt,
                options=self.kwargs,  # Pass additional arguments like temperature
            )
            content = response["response"].strip()
            return {
                "success": True,
                "content": content,
                "tokens_used": 0,
            }  # Ollama doesn't provide token count
        except Exception as e:
            return {"success": False, "error": str(e)}

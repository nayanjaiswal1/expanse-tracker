import requests
from typing import Dict, Any
from .base import BaseAIProvider


class LocalLLMProvider(BaseAIProvider):
    """AI provider for local LLMs (e.g., running via a local server)."""

    def __init__(self, local_llm_url: str, model: str = None, **kwargs):
        super().__init__(model=model, **kwargs)
        self.local_llm_url = local_llm_url
        # No direct client initialization here, as it's a generic local endpoint

    def perform_task(self, prompt: str, **kwargs) -> Dict[str, Any]:
        """Perform a task using the local LLM via its HTTP endpoint."""
        try:
            # Assuming a simple POST request to the local LLM endpoint
            # The payload and response structure might vary greatly depending on the local LLM server
            payload = {"prompt": prompt, "model": self.model, **self.kwargs, **kwargs}
            response = requests.post(self.local_llm_url, json=payload)
            response.raise_for_status()  # Raise an exception for HTTP errors

            data = response.json()

            # Assuming the local LLM returns a 'content' field and optionally 'tokens_used'
            content = data.get("content", str(data))
            tokens_used = data.get("tokens_used", 0)

            return {"success": True, "content": content, "tokens_used": tokens_used}
        except requests.exceptions.RequestException as e:
            return {"success": False, "error": f"Local LLM API error: {e}"}
        except Exception as e:
            return {"success": False, "error": str(e)}

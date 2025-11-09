import requests
from typing import Dict, Any
from .base import BaseAIProvider


class CustomAPIProvider(BaseAIProvider):
    """AI provider for custom API endpoints."""

    def __init__(self, api_url: str, api_key: str = None, **kwargs):
        super().__init__(api_key=api_key, **kwargs)
        self.api_url = api_url
        self.headers = {"Content-Type": "application/json"}
        if self.api_key:
            self.headers["Authorization"] = f"Bearer {self.api_key}"

    def perform_task(self, prompt: str, **kwargs) -> Dict[str, Any]:
        """Perform a task using the custom API endpoint."""
        try:
            payload = {"prompt": prompt, **self.kwargs, **kwargs}
            response = requests.post(self.api_url, headers=self.headers, json=payload)
            response.raise_for_status()  # Raise an exception for HTTP errors

            data = response.json()

            # Assuming the custom API returns a 'content' field and optionally 'tokens_used'
            content = data.get("content", str(data))
            tokens_used = data.get("tokens_used", 0)

            return {"success": True, "content": content, "tokens_used": tokens_used}
        except requests.exceptions.RequestException as e:
            return {"success": False, "error": f"Custom API error: {e}"}
        except Exception as e:
            return {"success": False, "error": str(e)}

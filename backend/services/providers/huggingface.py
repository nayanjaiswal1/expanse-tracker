import requests
from typing import Dict, Any
from .base import BaseAIProvider


class HuggingFaceProvider(BaseAIProvider):
    """AI provider for Hugging Face models (via Inference API)."""

    API_URL = "https://api-inference.huggingface.co/models/"

    def __init__(self, api_key: str, model: str = "gpt2", **kwargs):
        super().__init__(api_key=api_key, model=model, **kwargs)
        self.headers = {"Authorization": f"Bearer {self.api_key}"}
        self.model_url = f"{self.API_URL}{self.model}"

    def perform_task(self, prompt: str, **kwargs) -> Dict[str, Any]:
        """Perform a task using the Hugging Face Inference API."""
        try:
            payload = {"inputs": prompt, **self.kwargs}
            response = requests.post(self.model_url, headers=self.headers, json=payload)
            response.raise_for_status()  # Raise an exception for HTTP errors

            data = response.json()

            # Hugging Face API response structure varies by model type
            # This is a generic attempt to get text generation output
            content = ""
            if isinstance(data, list) and len(data) > 0:
                if "generated_text" in data[0]:
                    content = data[0]["generated_text"]
                elif "summary_text" in data[0]:
                    content = data[0]["summary_text"]
                elif "translation_text" in data[0]:
                    content = data[0]["translation_text"]
                else:
                    content = str(data)  # Fallback
            else:
                content = str(data)  # Fallback for non-list responses

            # Hugging Face Inference API does not typically return token counts directly
            tokens_used = 0

            return {"success": True, "content": content, "tokens_used": tokens_used}
        except requests.exceptions.RequestException as e:
            return {"success": False, "error": f"Hugging Face API error: {e}"}
        except Exception as e:
            return {"success": False, "error": str(e)}

from .base import BaseAIProvider
from .openai import OpenAIProvider
from .ollama import OllamaProvider


PROVIDER_CLASSES = {
    "openai": OpenAIProvider,
    "ollama": OllamaProvider,
}


def get_provider(provider_name: str, **kwargs) -> BaseAIProvider:
    """Factory function to get an AI provider instance."""
    provider_class = PROVIDER_CLASSES.get(provider_name)
    if not provider_class:
        raise ValueError(f"Unsupported provider: {provider_name}")
    return provider_class(**kwargs)

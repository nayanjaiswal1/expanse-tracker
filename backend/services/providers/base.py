from abc import ABC, abstractmethod
from typing import Any, Dict


class BaseAIProvider(ABC):
    """Abstract base class for all AI providers."""

    def __init__(self, api_key: str = None, model: str = None, **kwargs):
        self.api_key = api_key
        self.model = model
        self.kwargs = kwargs

    @abstractmethod
    def perform_task(self, prompt: str, **kwargs) -> Dict[str, Any]:
        """Perform a task using the AI provider."""
        pass

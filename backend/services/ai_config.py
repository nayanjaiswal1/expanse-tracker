from decouple import config

OLLAMA_ENDPOINT = config("OLLAMA_ENDPOINT", default="http://localhost:11434")

AI_PROVIDERS = {
    "openai": {
        "class": "services.ai_providers.OpenAIProvider",
        "model": "gpt-3.5-turbo",
    },
    "ollama": {
        "class": "services.ai_providers.OllamaProvider",
        "model": "llama2",
        "host": OLLAMA_ENDPOINT,
    },
    "anthropic": {
        "class": "services.ai_providers.AnthropicProvider",
        "model": "claude-2",
    },
    "huggingface": {
        "class": "services.ai_providers.HuggingFaceProvider",
        "model": "gpt2",  # Example model
    },
    "mistral": {
        "class": "services.ai_providers.MistralProvider",
        "model": "mistral-tiny",
    },
    "custom_api": {
        "class": "services.ai_providers.CustomAPIProvider",
        "api_url": config(
            "CUSTOM_API_URL", default="http://localhost:5000/predict"
        ),  # Example URL
    },
    "local_llm": {
        "class": "services.ai_providers.LocalLLMProvider",
        "local_llm_url": config(
            "LOCAL_LLM_URL", default="http://localhost:11434/api/generate"
        ),  # Example URL
        "model": "llama2",
    },
}

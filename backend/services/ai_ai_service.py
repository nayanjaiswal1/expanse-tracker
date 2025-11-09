"""
AI Service for handling AI model integrations
Provides secure, credit-based AI functionality for finance tracking
"""

from typing import Dict, Tuple, Any
from django.conf import settings
from cryptography.fernet import Fernet
from django.contrib.auth import get_user_model
from users.models import UserProfile, ActivityLog
from .ai_operations import CategorizationOperation, InvoiceGenerationOperation
from .providers import get_provider, BaseAIProvider
from celery import shared_task

User = get_user_model()


class AIService:
    """Centralized AI service for all AI-powered features"""

    def __init__(self):
        encryption_key = getattr(settings, "AI_ENCRYPTION_KEY", None)
        if (
            not encryption_key
            or encryption_key == "your-encryption-key-here-change-in-production"
        ):
            # Generate a proper Fernet key
            encryption_key = Fernet.generate_key()
        elif isinstance(encryption_key, str):
            encryption_key = encryption_key.encode()

        self.cipher_suite = Fernet(encryption_key)

        # Default system API key for free tier users
        self.system_openai_key = getattr(settings, "OPENAI_API_KEY", "")
        self.system_ollama_endpoint = getattr(
            settings, "OLLAMA_ENDPOINT", "http://localhost:11434"
        )

        # Credit costs for different operations
        self.credit_costs = {
            "categorization": 1,
            "invoice_generation": 5,
            "data_analysis": 3,
            "suggestions": 2,
            "bill_parsing": 4,
        }

    def encrypt_api_key(self, api_key: str) -> str:
        """Encrypt user's API key for secure storage"""
        if not api_key:
            return ""
        return self.cipher_suite.encrypt(api_key.encode()).decode()

    def decrypt_api_key(self, encrypted_key: str) -> str:
        """Decrypt user's API key"""
        if not encrypted_key:
            return ""
        try:
            return self.cipher_suite.decrypt(encrypted_key.encode()).decode()
        except Exception:
            return ""

    def check_user_credits(self, user: User, operation_type: str) -> Tuple[bool, str]:
        """Check if user has enough credits for the operation"""
        try:
            profile = UserProfile.objects.get(user=user)
            credits_needed = self.credit_costs.get(operation_type, 1)

            if profile.ai_credits_remaining < credits_needed:
                return (
                    False,
                    f"Insufficient credits. Need {credits_needed}, have {profile.ai_credits_remaining}",
                )

            return True, "Credits available"
        except UserProfile.DoesNotExist:
            return False, "No profile found"

    def consume_credits(
        self, user: User, operation_type: str, credits_used: int = None
    ) -> bool:
        """Consume user credits for AI operation"""
        if credits_used is None:
            credits_used = self.credit_costs.get(operation_type, 1)

        try:
            profile = UserProfile.objects.get(user=user)
            if profile.ai_credits_remaining >= credits_used:
                profile.ai_credits_remaining -= credits_used
                profile.save()
                return True
            return False
        except UserProfile.DoesNotExist:
            return False

    def get_ai_provider(self, user: User) -> BaseAIProvider:
        """Get the appropriate AI provider for the user"""
        try:
            profile = UserProfile.objects.get(user=user)
        except UserProfile.DoesNotExist:
            profile = UserProfile.objects.create(user=user)

        provider_name = profile.preferred_ai_provider or "openai"
        if provider_name == "system":
            provider_name = "openai"

        # Get base provider config from settings
        provider_config = settings.AI_PROVIDERS.get(provider_name)
        if not provider_config:
            # Fallback to default if provider not in settings
            provider_config = settings.AI_PROVIDERS.get("openai")
            provider_name = "openai"

        # Prepare kwargs for provider instantiation
        provider_kwargs = provider_config.copy()
        provider_kwargs.pop("class")  # Remove class path before passing as kwargs

        # Get user provider settings
        user_provider_settings = profile.ai_provider_settings.get(provider_name, {})

        # User-specific overrides
        if provider_name == "openai":
            decrypted_api_key = self.decrypt_api_key(
                user_provider_settings.get("api_key", "")
            )
            provider_kwargs["api_key"] = decrypted_api_key or settings.OPENAI_API_KEY
            provider_kwargs["model"] = user_provider_settings.get(
                "model", provider_kwargs.get("model")
            )
        elif provider_name == "ollama":
            provider_kwargs["host"] = user_provider_settings.get(
                "host", provider_kwargs.get("host")
            )
            provider_kwargs["model"] = user_provider_settings.get(
                "model", provider_kwargs.get("model")
            )

        try:
            return get_provider(provider_name, **provider_kwargs)
        except (ValueError, Exception):
            # Fallback to system OpenAI
            if settings.OPENAI_API_KEY:
                return get_provider(
                    "openai", api_key=settings.OPENAI_API_KEY, model="gpt-3.5-turbo"
                )
            return None

    def log_usage(
        self,
        user: User,
        usage_type: str,
        provider: str,
        model: str,
        credits_consumed: int,
        success: bool,
        input_data: str = "",
        output_data: str = "",
        error_message: str = "",
        processing_time: float = 0.0,
        tokens_used: int = 0,
    ) -> ActivityLog:
        """Log AI usage for analytics and billing"""
        return ActivityLog.objects.create(
            user=user,
            activity_type="ai_usage",
            action=usage_type,
            activity_data={
                "provider": provider,
                "model": model,
                "credits_consumed": credits_consumed,
                "tokens_used": tokens_used,
                "input_data": input_data[:1000] if input_data else "",
                "output_data": output_data[:1000] if output_data else "",
                "success": success,
                "error_message": error_message[:500] if error_message else "",
                "processing_time": processing_time,
            },
        )

    def categorize_transaction(
        self, user: User, description: str, amount: float, merchant: str = ""
    ) -> Dict[str, Any]:
        """Use AI to categorize a transaction"""
        categorization_op = CategorizationOperation(self)
        categorization_op.set_user(user)
        return categorization_op.execute(description, amount, merchant)

    def generate_invoice(
        self, user: User, invoice_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate invoice content using AI"""
        invoice_op = InvoiceGenerationOperation(self)
        invoice_op.set_user(user)
        return invoice_op.execute(invoice_data)


# Global instance
ai_service = AIService()


@shared_task
def categorize_transaction_task(
    user_id: int, description: str, amount: float, merchant: str = ""
):
    from django.contrib.auth import get_user_model

    User = get_user_model()
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        # Log error or handle appropriately
        return

    # Re-instantiate AIService within the task
    ai_service_instance = AIService()
    categorization_op = CategorizationOperation(ai_service_instance)
    categorization_op.set_user(user)
    categorization_op.execute(description, amount, merchant)


@shared_task
def generate_invoice_task(user_id: int, invoice_data: Dict[str, Any]):
    from django.contrib.auth import get_user_model

    User = get_user_model()
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        # Log error or handle appropriately
        return

    # Re-instantiate AIService within the task
    ai_service_instance = AIService()
    invoice_op = InvoiceGenerationOperation(ai_service_instance)
    invoice_op.set_user(user)
    invoice_op.execute(invoice_data)

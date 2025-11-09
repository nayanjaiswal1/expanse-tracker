import json
import time
from abc import ABC, abstractmethod
from typing import Dict, Any, Tuple

from django.contrib.auth import get_user_model

from .providers import BaseAIProvider

User = get_user_model()


class BaseAIOperation(ABC):
    """Abstract base class for all AI operations."""

    def __init__(self, ai_service_instance):
        self.ai_service = ai_service_instance
        self.user = None
        self.operation_type = "default_operation"
        self.credit_cost = 0

    def set_user(self, user: User):
        self.user = user

    @abstractmethod
    def execute(self, *args, **kwargs) -> Dict[str, Any]:
        """Execute the AI operation."""
        pass

    def _get_ai_provider(self) -> BaseAIProvider:
        """Helper to get AI provider from AIService."""
        return self.ai_service.get_ai_provider(self.user)

    def _log_usage(self, **kwargs):
        """Helper to log usage from AIService."""
        self.ai_service.log_usage(
            user=self.user,
            usage_type=self.operation_type,
            credits_consumed=self.credit_cost,
            **kwargs,
        )

    def _check_and_consume_credits(self) -> Tuple[bool, str]:
        """Helper to check and consume credits from AIService."""
        has_credits, message = self.ai_service.check_user_credits(
            self.user, self.operation_type
        )
        if not has_credits:
            return False, message
        self.ai_service.consume_credits(
            self.user, self.operation_type, self.credit_cost
        )
        return True, "Credits consumed"


class CategorizationOperation(BaseAIOperation):
    """AI operation for categorizing financial transactions."""

    def __init__(self, ai_service_instance):
        super().__init__(ai_service_instance)
        self.operation_type = "categorization"
        self.credit_cost = self.ai_service.credit_costs.get(self.operation_type, 1)

    def execute(
        self, description: str, amount: float, merchant: str = ""
    ) -> Dict[str, Any]:
        if not self.user:
            return {"success": False, "error": "User not set for operation."}

        has_credits, message = self._check_and_consume_credits()
        if not has_credits:
            return {"success": False, "error": message}

        provider = self._get_ai_provider()
        if not provider:
            self._log_usage(
                provider="N/A",
                model="N/A",
                success=False,
                error_message="No AI provider available",
            )
            return {"success": False, "error": "No AI provider available"}

        start_time = time.time()
        input_data = (
            f"Description: {description}, Amount: {amount}, Merchant: {merchant}"
        )
        result = {"success": False, "error": "Unknown error"}

        try:
            prompt = self._build_prompt(description, amount, merchant)
            result = provider.perform_task(prompt)

            # Post-process the result if necessary
            if result.get("success"):
                # Basic parsing, can be improved
                content = result.get("content", "")
                category, confidence = self._parse_categorization_result(content)
                result["category"] = category
                result["confidence"] = confidence

            processing_time = time.time() - start_time
            self._log_usage(
                provider=provider.__class__.__name__,
                model=provider.model,
                success=result.get("success", False),
                input_data=input_data,
                output_data=str(result.get("category", "")),
                error_message=result.get("error", ""),
                processing_time=processing_time,
                tokens_used=result.get("tokens_used", 0),
            )
            return result

        except Exception as e:
            processing_time = time.time() - start_time
            self._log_usage(
                provider=provider.__class__.__name__,
                model=provider.model,
                success=False,
                input_data=input_data,
                error_message=str(e),
                processing_time=processing_time,
            )
            return {"success": False, "error": str(e)}

    def _build_prompt(self, description: str, amount: float, merchant: str) -> str:
        return f"""
        Categorize this financial transaction into one of these categories:
        - Food & Dining
        - Transportation
        - Shopping
        - Entertainment
        - Bills & Utilities
        - Healthcare
        - Education
        - Travel
        - Income
        - Transfer
        - Other

        Transaction details:
        Description: {description}
        Amount: ${amount}
        Merchant: {merchant}

        Respond with only the category name and a confidence score (0-100).
        Format: Category: [category], Confidence: [score]
        """

    def _parse_categorization_result(self, content: str) -> Tuple[str, int]:
        try:
            parts = content.split(",")
            category = parts[0].replace("Category:", "").strip()
            confidence = int(parts[1].replace("Confidence:", "").strip())
            return category, confidence
        except Exception:
            return "Other", 50


class InvoiceGenerationOperation(BaseAIOperation):
    """AI operation for generating invoice content."""

    def __init__(self, ai_service_instance):
        super().__init__(ai_service_instance)
        self.operation_type = "invoice_generation"
        self.credit_cost = self.ai_service.credit_costs.get(self.operation_type, 5)

    def execute(self, invoice_data: Dict[str, Any]) -> Dict[str, Any]:
        if not self.user:
            return {"success": False, "error": "User not set for operation."}

        has_credits, message = self._check_and_consume_credits()
        if not has_credits:
            return {"success": False, "error": message}

        provider = self._get_ai_provider()
        if not provider:
            self._log_usage(
                provider="N/A",
                model="N/A",
                success=False,
                error_message="No AI provider available",
            )
            return {"success": False, "error": "No AI provider available"}

        start_time = time.time()
        input_data = json.dumps(invoice_data, default=str)
        result = {"success": False, "error": "Unknown error"}

        try:
            prompt = self._build_prompt(invoice_data)
            result = provider.perform_task(prompt)

            processing_time = time.time() - start_time
            self._log_usage(
                provider=provider.__class__.__name__,
                model=provider.model,
                success=result.get("success", False),
                input_data=input_data,
                output_data=str(result.get("content", "")),
                error_message=result.get("error", ""),
                processing_time=processing_time,
                tokens_used=result.get("tokens_used", 0),
            )
            return result

        except Exception as e:
            processing_time = time.time() - start_time
            self._log_usage(
                provider=provider.__class__.__name__,
                model=provider.model,
                success=False,
                input_data=input_data,
                error_message=str(e),
                processing_time=processing_time,
            )
            return {"success": False, "error": str(e)}

    def _build_prompt(self, invoice_data: Dict[str, Any]) -> str:
        return f"""
        Generate a professional invoice based on this data:
        {json.dumps(invoice_data, indent=2)}

        Include:
        - Professional header with invoice number
        - Detailed description of services/products
        - Clear payment terms
        - Total amount calculation
        - Professional footer

        Format as HTML that can be converted to PDF.

        """

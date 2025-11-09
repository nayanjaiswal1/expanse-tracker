"""
AI configuration and management views.
"""

import json
import logging
from decimal import Decimal
from datetime import timedelta

from django.conf import settings
from django.db.models import Avg, Sum, Count, Q
from django.db.models.functions import TruncMonth, TruncWeek
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser

from finance.models import Transaction, Account, Goal, Budget, Category
from users.models import UserProfile, ActivityLog
from .ai_ai_service import AIService, ai_service
from .ai_document_processing_service import DocumentProcessingService

from typing import Any, Dict

logger = logging.getLogger(__name__)

class DocumentParsingView(APIView):
    """
    Enhanced endpoint to upload and intelligently parse documents.

    Supports:
    - Auto-detection of document type (bank statement, invoice, receipt)
    - Bank-specific parsers for ICICI, HDFC, SBI, BOM, Paytm
    - LLM-based invoice extraction with Ollama
    - Password-protected PDFs
    - Quality scoring and validation
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]

    def post(self, request, *args, **kwargs):
        if 'file' not in request.FILES:
            return Response(
                {"error": "No file provided."},
                status=status.HTTP_400_BAD_REQUEST
            )

        file_obj = request.FILES['file']
        password = request.data.get('password', None)
        force_type = request.data.get('document_type', None)  # Optional: 'statement', 'invoice', 'receipt'
        enhanced = request.data.get('enhanced', 'true').lower() == 'true'  # Default to enhanced parsing

        # Check file size (e.g., 50MB limit)
        if file_obj.size > 50 * 1024 * 1024:
            return Response(
                {"error": "File size exceeds 50MB limit."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            file_bytes = file_obj.read()
            service = DocumentProcessingService()

            parsed_data = service.parse_document(
                file_bytes=file_bytes,
                file_name=file_obj.name,
                password=password,
                force_type=force_type,
                enhanced=enhanced
            )

            # Check if password is required
            if parsed_data.get("password_required"):
                return Response(
                    {
                        "error": parsed_data.get("error", "Password required"),
                        "password_required": True
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Check for parsing errors
            if parsed_data.get("error") and not parsed_data.get("transactions"):
                return Response(
                    {"error": parsed_data.get("error")},
                    status=status.HTTP_400_BAD_REQUEST
                )

            return Response(parsed_data, status=status.HTTP_200_OK)

        except ValueError as e:
            logger.warning(f"Document parsing validation error: {str(e)}")
            error_message = str(e)
            # Check if it's a password-related error
            if "password" in error_message.lower() or "encrypted" in error_message.lower():
                return Response(
                    {"error": error_message, "password_required": True},
                    status=status.HTTP_400_BAD_REQUEST
                )
            return Response({"error": error_message}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error processing document: {str(e)}", exc_info=True)
            return Response(
                {"error": "An unexpected error occurred during document processing."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AIChatView(APIView):
    """Simple conversational endpoint that grounds responses in user financial data."""

    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        message = (request.data.get("message") or request.data.get("question") or "").strip()
        if not message:
            return Response(
                {"error": "Message is required to start the chat."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        timeframe = (request.data.get("timeframe") or "90d").lower()
        start_date, timeframe_label = self._resolve_timeframe(timeframe)

        context = self._build_context(request.user, start_date, timeframe_label)
        reply, used_ai = self._generate_reply(request.user, message, context, timeframe_label)

        return Response(
            {
                "reply": reply,
                "used_ai": used_ai,
                "timeframe": timeframe_label,
                "context": context,
            },
            status=status.HTTP_200_OK,
        )

    def _resolve_timeframe(self, timeframe: str):
        today = timezone.now().date()
        mapping = {
            "7d": (today - timedelta(days=7), "last 7 days"),
            "week": (today - timedelta(days=7), "last 7 days"),
            "30d": (today - timedelta(days=30), "last 30 days"),
            "month": (today - timedelta(days=30), "last 30 days"),
            "60d": (today - timedelta(days=60), "last 60 days"),
            "90d": (today - timedelta(days=90), "last 90 days"),
            "quarter": (today - timedelta(days=90), "last 90 days"),
            "180d": (today - timedelta(days=180), "last 180 days"),
            "half-year": (today - timedelta(days=180), "last 180 days"),
            "year": (today - timedelta(days=365), "last 12 months"),
            "365d": (today - timedelta(days=365), "last 12 months"),
        }
        return mapping.get(timeframe, mapping["90d"])

    def _build_context(self, user, start_date, timeframe_label: str):
        transactions = Transaction.objects.filter(user=user)
        if start_date:
            transactions = transactions.filter(date__gte=start_date)

        total_tx = transactions.count()
        total_income = transactions.filter(transaction_type="income").aggregate(
            total=Sum("amount")
        )["total"] or Decimal("0")
        total_expenses = transactions.filter(transaction_type="expense").aggregate(
            total=Sum("amount")
        )["total"] or Decimal("0")

        # Category breakdown (expenses)
        expense_categories = transactions.filter(
            transaction_type="expense", category__isnull=False
        ).values("category__name", "category__color").annotate(
            total=Sum("amount"), count=Count("id")
        ).order_by("-total")[:10]

        total_expense_amount = float(total_expenses) if total_expenses else 0.0
        category_breakdown = [
            {
                "category": entry["category__name"],
                "amount": float(entry["total"]),
                "count": entry["count"],
                "percentage": round(
                    (float(entry["total"]) / total_expense_amount) * 100, 2
                )
                if total_expense_amount
                else 0.0,
                "color": entry["category__color"],
            }
            for entry in expense_categories
        ]

        # Account summary
        accounts = Account.objects.filter(user=user).order_by("name")
        account_balances = [
            {
                "name": account.name,
                "balance": float(account.balance),
                "currency": account.currency,
                "icon": getattr(account, "icon", ""),
                "type": account.account_type,
            }
            for account in accounts
        ]

        # Merchant insights
        merchant_breakdown = transactions.exclude(merchant_name__isnull=True).exclude(
            merchant_name__exact=""
        ).values("merchant_name").annotate(
            total=Sum("amount"), count=Count("id")
        ).order_by("-total")[:10]

        merchants = [
            {
                "merchant": merchant["merchant_name"],
                "amount": float(merchant["total"]),
                "count": merchant["count"],
            }
            for merchant in merchant_breakdown
        ]

        # Timeline trends (month/week depending on span)
        if start_date and (timezone.now().date() - start_date).days <= 60:
            timeline = (
                transactions.annotate(period=TruncWeek("date"))
                .values("period")
                .annotate(
                    income=Sum(
                        "amount", filter=Q(transaction_type="income")
                    ),
                    expenses=Sum(
                        "amount", filter=Q(transaction_type="expense")
                    ),
                )
                .order_by("period")
            )
        else:
            timeline = (
                transactions.annotate(period=TruncMonth("date"))
                .values("period")
                .annotate(
                    income=Sum(
                        "amount", filter=Q(transaction_type="income")
                    ),
                    expenses=Sum(
                        "amount", filter=Q(transaction_type="expense")
                    ),
                )
                .order_by("period")
            )

        spending_trend = [
            {
                "period": entry["period"].date().isoformat()
                if entry["period"]
                else None,
                "income": float(entry["income"] or 0),
                "expenses": float(entry["expenses"] or 0),
                "net": float((entry["income"] or Decimal("0")) - (entry["expenses"] or Decimal("0"))),
            }
            for entry in timeline
        ]

        # Goals
        goals = Goal.objects.filter(user=user).order_by("target_date")
        goals_summary = [
            {
                "name": goal.name,
                "target_amount": float(goal.target_amount or 0),
                "current_amount": float(goal.current_amount or 0),
                "progress": float(goal.progress_percentage if hasattr(goal, "progress_percentage") else self._calculate_goal_progress(goal)),
                "status": goal.status,
            }
            for goal in goals
        ]

        # Budgets
        budgets = Budget.objects.filter(user=user, is_active=True)
        budgets_summary = [
            {
                "name": budget.name,
                "period": budget.period,
                "amount": float(budget.amount),
                "spent": float(getattr(budget, "spent_amount", 0)),
                "remaining": float(getattr(budget, "remaining_amount", budget.amount)),
                "category": budget.category.name if getattr(budget, "category", None) else None,
            }
            for budget in budgets
        ]

        return {
            "timeframe": timeframe_label,
            "total_transactions": total_tx,
            "total_income": float(total_income),
            "total_expenses": float(total_expenses),
            "net": float(total_income - total_expenses),
            "category_breakdown": category_breakdown,
            "accounts": account_balances,
            "top_merchants": merchants,
            "spending_trend": spending_trend,
            "goals": goals_summary,
            "budgets": budgets_summary,
        }

    def _calculate_goal_progress(self, goal: Goal) -> float:
        target = float(goal.target_amount or 0)
        current = float(goal.current_amount or 0)
        if target <= 0:
            return 0.0
        return round(min(current / target * 100, 100), 2)

    def _generate_reply(self, user, message: str, context: Dict[str, any], timeframe_label: str):
        provider = ai_service.get_ai_provider(user)
        context_json = json.dumps(context, default=str)
        prompt = (
            "You are Budgeton, a helpful personal finance assistant. "
            "Use the user's financial data to answer the question clearly and concisely. "
            "Highlight key insights, call out unusual patterns, and suggest actionable next steps when relevant.\n\n"
            f"User Question: {message}\n"
            f"Timeframe: {timeframe_label}\n"
            f"Financial Data (JSON): {context_json}\n\n"
            "Respond in 2-3 short paragraphs. Use bullet points if listing multiple insights."
        )

        if provider:
            try:
                result = provider.perform_task(prompt)
                if result.get("success") and result.get("content"):
                    ai_service.log_usage(
                        user=user,
                        usage_type="data_analysis",
                        provider=provider.__class__.__name__,
                        model=getattr(provider, "model", "unknown"),
                        credits_consumed=0,
                        success=True,
                        input_data=message,
                        output_data=result.get("content", "")[:500],
                        error_message="",
                        processing_time=result.get("processing_time", 0.0),
                        tokens_used=result.get("tokens_used", 0),
                    )
                    return result.get("content"), True
            except Exception as exc:
                logger.warning("AI chat fallback triggered: %s", exc)

        # Fallback deterministic summary
        fallback = self._build_fallback_response(message, context, timeframe_label)
        return fallback, False

    def _build_fallback_response(self, message: str, context: Dict[str, any], timeframe_label: str) -> str:
        income = context.get("total_income", 0)
        expenses = context.get("total_expenses", 0)
        net = context.get("net", 0)
        top_category = context.get("category_breakdown", [{}])
        top_category_name = top_category[0].get("category") if top_category else None
        top_category_amount = top_category[0].get("amount") if top_category else None

        parts = [
            f"Over {timeframe_label}, you logged {context.get('total_transactions', 0)} transactions with total income of {income:,.2f} and spending of {expenses:,.2f}.",
            f"Your net position for this period is {net:,.2f}.",
        ]

        if top_category_name:
            parts.append(
                f"The biggest spending category was {top_category_name} at {top_category_amount:,.2f}."
            )

        if context.get("accounts"):
            top_account = max(context["accounts"], key=lambda a: a["balance"])
            parts.append(
                f"{top_account['name']} currently holds the highest balance at {top_account['balance']:,.2f} {top_account['currency']}."
            )

        parts.append("Let me know if you'd like deeper analysis on a specific category, account, or timeframe.")
        return " ".join(parts)

class AIConfigurationViewSet(viewsets.ViewSet):
    """ViewSet for AI configuration management"""

    permission_classes = [IsAuthenticated]

    SETTINGS_DEFAULTS = {
        "preferred_provider": "openai",
        "openai_api_key": "",
        "openai_model": "gpt-3.5-turbo",
        "ollama_endpoint": "http://localhost:11434",
        "ollama_model": "llama2",
        "enable_categorization": True,
        "enable_transaction_parsing": True,
        "enable_receipt_ocr": True,
        "enable_monthly_reports": True,
        "confidence_threshold": 0.7,
        "max_monthly_usage": 1000,
        "auto_approve_high_confidence": False,
    }

    def get_user_profile(self):
        """Get or create user profile"""
        profile, created = UserProfile.objects.get_or_create(user=self.request.user)
        return profile

    @action(detail=False, methods=["get"])
    def settings(self, request):
        """Get current AI settings"""
        payload = self._build_settings_payload()
        return Response(payload)

    def _build_settings_payload(self) -> Dict[str, Any]:
        profile = self.get_user_profile()
        stored = profile.config.get("ai_settings", {}) if isinstance(profile.config, dict) else {}
        merged = {**self.SETTINGS_DEFAULTS, **(stored or {})}

        # Mask API key before returning to client
        if merged.get("openai_api_key"):
            merged["openai_api_key"] = "***masked***"

        return {
            "settings": merged,
            "credits_remaining": profile.ai_credits_remaining,
            "system_openai_available": bool(settings.OPENAI_API_KEY),
            "system_ollama_available": bool(settings.OLLAMA_ENDPOINT),
        }

    def _build_usage_payload(self, days: int) -> Dict[str, Any]:
        try:
            start_date = timezone.now() - timedelta(days=days)
            usage_activities = ActivityLog.objects.filter(
                user=self.request.user, activity_type="ai_usage", created_at__gte=start_date
            )

            total_requests = usage_activities.count()
            successful_requests = usage_activities.filter(
                activity_data__success=True
            ).count()

            total_credits = sum(
                activity.activity_data.get("credits_consumed", 0)
                for activity in usage_activities
            )

            total_tokens = sum(
                activity.activity_data.get("tokens_used", 0)
                for activity in usage_activities
            )

            avg_processing_time = (
                usage_activities.aggregate(avg_time=Avg("activity_data__processing_time"))[
                    "avg_time"
                ]
                or 0
            )

            provider_stats: Dict[str, Dict[str, Any]] = {}
            operation_stats: Dict[str, Dict[str, Any]] = {}

            for activity in usage_activities:
                provider = activity.activity_data.get("provider", "unknown")
                operation = activity.activity_data.get("operation", "general")

                provider_stats.setdefault(
                    provider,
                    {"requests": 0, "tokens": 0, "avg_time": 0, "success_rate": 0, "credits": 0},
                )
                record = provider_stats[provider]
                record["requests"] += 1
                record["tokens"] += activity.activity_data.get("tokens_used", 0)
                record["credits"] += activity.activity_data.get("credits_consumed", 0)
                record["avg_time"] += activity.activity_data.get("processing_time") or 0
                if activity.activity_data.get("success"):
                    record["success_rate"] += 1

                operation_stats.setdefault(
                    operation,
                    {"count": 0, "credits_used": 0, "success_rate": 0},
                )
                op_record = operation_stats[operation]
                op_record["count"] += 1
                op_record["credits_used"] += activity.activity_data.get("credits_consumed", 0)
                if activity.activity_data.get("success"):
                    op_record["success_rate"] += 1

            # Finalize averages
            for data in provider_stats.values():
                if data["requests"]:
                    data["avg_time"] = round(data["avg_time"] / data["requests"], 2)
                    data["success_rate"] = round((data["success_rate"] / data["requests"]) * 100, 2)
                else:
                    data["avg_time"] = 0
                    data["success_rate"] = 0

            for data in operation_stats.values():
                if data["count"]:
                    data["success_rate"] = round((data["success_rate"] / data["count"]) * 100, 2)
                else:
                    data["success_rate"] = 0

            daily_usage = []
            for i in range(days):
                day = (timezone.now() - timedelta(days=i)).date()
                day_activities = usage_activities.filter(created_at__date=day)
                daily_usage.append(
                    {
                        "date": day.isoformat(),
                        "requests": day_activities.count(),
                        "credits": sum(
                            activity.activity_data.get("credits_consumed", 0)
                            for activity in day_activities
                        ),
                    }
                )

            return {
                "total_requests": total_requests,
                "successful_requests": successful_requests,
                "success_rate": round((successful_requests / total_requests) * 100, 2)
                if total_requests
                else 0,
                "total_credits_used": total_credits,
                "total_tokens_used": total_tokens,
                "avg_processing_time": round(avg_processing_time, 2) if avg_processing_time else 0,
                "credits_remaining": self.get_user_profile().ai_credits_remaining,
                "provider_stats": provider_stats,
                "operation_stats": operation_stats,
                "daily_usage": list(reversed(daily_usage)),
            }
        except Exception as exc:  # pragma: no cover - defensive guard
            logger.exception("Failed to build AI usage payload: %s", exc)
            return {
                "total_requests": 0,
                "successful_requests": 0,
                "success_rate": 0,
                "total_credits_used": 0,
                "total_tokens_used": 0,
                "avg_processing_time": 0,
                "credits_remaining": self.get_user_profile().ai_credits_remaining,
                "provider_stats": {},
                "operation_stats": {},
                "daily_usage": [],
            }

    def _build_system_status_payload(self) -> Dict[str, Any]:
        profile = self.get_user_profile()
        payload = {
            "system_openai_status": "available" if settings.OPENAI_API_KEY else "unavailable",
            "system_ollama_status": "available" if settings.OLLAMA_ENDPOINT else "unavailable",
            "system_openai_endpoint": "https://api.openai.com" if settings.OPENAI_API_KEY else None,
            "system_ollama_endpoint": settings.OLLAMA_ENDPOINT or None,
            "credit_costs": getattr(ai_service, "credit_costs", {}),
            "user_credits_remaining": profile.ai_credits_remaining,
        }

        return payload

    @action(detail=False, methods=["get"])
    def bootstrap(self, request):
        """Return aggregated AI settings, usage, and system status."""
        days = int(request.query_params.get("days", 30))
        settings_payload = self._build_settings_payload()
        usage_payload = self._build_usage_payload(days)
        system_payload = self._build_system_status_payload()

        return Response(
            {
                "settings": settings_payload["settings"],
                "profile": {
                    "credits_remaining": settings_payload["credits_remaining"],
                    "system_openai_available": settings_payload["system_openai_available"],
                    "system_ollama_available": settings_payload["system_ollama_available"],
                },
                "usage": usage_payload,
                "system": system_payload,
            }
        )

    @action(detail=False, methods=["post"])
    def update_settings(self, request):
        """Update AI settings"""
        profile = self.get_user_profile()
        current_settings = profile.config.get("ai_settings", {})

        # Get new settings from request
        new_settings = request.data.get("settings", {})

        # Validate provider
        if "preferred_provider" in new_settings:
            if new_settings["preferred_provider"] not in ["openai", "ollama", "system"]:
                return Response(
                    {"error": "Invalid provider. Must be openai, ollama, or system"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Handle API key encryption
        if "openai_api_key" in new_settings and new_settings["openai_api_key"]:
            if new_settings["openai_api_key"] != "***masked***":
                # Encrypt the API key
                ai_service = AIService()
                encrypted_key = ai_service.encrypt_api_key(
                    new_settings["openai_api_key"]
                )
                new_settings["openai_api_key"] = encrypted_key
            else:
                # Keep existing key
                new_settings["openai_api_key"] = current_settings.get(
                    "openai_api_key", ""
                )

        # Validate numeric settings
        numeric_fields = ["confidence_threshold", "max_monthly_usage"]
        for field in numeric_fields:
            if field in new_settings:
                try:
                    float(new_settings[field])
                except (ValueError, TypeError):
                    return Response(
                        {"error": f"Invalid {field}. Must be a number"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

        # Validate confidence threshold
        if "confidence_threshold" in new_settings:
            threshold = float(new_settings["confidence_threshold"])
            if not 0.0 <= threshold <= 1.0:
                return Response(
                    {"error": "Confidence threshold must be between 0.0 and 1.0"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Update settings
        updated_settings = {**current_settings, **new_settings}
        profile.config["ai_settings"] = updated_settings
        profile.save()

        # Log the configuration change
        ActivityLog.objects.create(
            user=request.user,
            activity_type="user_action",
            action="ai_settings_updated",
            activity_data={
                "updated_fields": list(new_settings.keys()),
                "provider": updated_settings.get("preferred_provider", "openai"),
            },
        )

        return Response({"message": "Settings updated successfully"})

    @action(detail=False, methods=["post"])
    def test_connection(self, request):
        """Test AI provider connection"""

        try:
            ai_service = AIService()
            provider_type, client, model = ai_service.get_ai_client(request.user)

            if not client:
                return Response(
                    {
                        "success": False,
                        "error": "No AI client available. Please configure API keys.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Test with a simple prompt
            test_prompt = "Respond with 'OK' if you can understand this message."

            start_time = timezone.now()

            if provider_type == "openai":
                try:
                    response = client.chat.completions.create(
                        model=model,
                        messages=[{"role": "user", "content": test_prompt}],
                        max_tokens=10,
                    )
                    result = response.choices[0].message.content.strip()
                    tokens_used = response.usage.total_tokens if response.usage else 0
                except Exception as e:
                    return Response(
                        {"success": False, "error": f"OpenAI error: {str(e)}"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            elif provider_type == "ollama":
                try:
                    response = client.chat(
                        model=model, messages=[{"role": "user", "content": test_prompt}]
                    )
                    result = response["message"]["content"].strip()
                    tokens_used = 0  # Ollama doesn't provide token count
                except Exception as e:
                    return Response(
                        {"success": False, "error": f"Ollama error: {str(e)}"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            processing_time = (timezone.now() - start_time).total_seconds()

            # Log the test
            ai_service.log_usage(
                user=request.user,
                usage_type="connection_test",
                provider=provider_type,
                model=model,
                credits_consumed=0,  # Don't charge for tests
                success=True,
                input_data=test_prompt,
                output_data=result,
                processing_time=processing_time,
                tokens_used=tokens_used,
            )

            return Response(
                {
                    "success": True,
                    "provider": provider_type,
                    "model": model,
                    "response": result,
                    "processing_time": round(processing_time, 2),
                    "tokens_used": tokens_used,
                }
            )

        except Exception as e:
            logger.error(f"AI connection test failed: {str(e)}")
            return Response(
                {"success": False, "error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["get"])
    def usage_stats(self, request):
        """Get AI usage statistics"""
        days = int(request.query_params.get("days", 30))
        payload = self._build_usage_payload(days)
        payload["period_days"] = days
        return Response(payload)

    @action(detail=False, methods=["post"])
    def add_credits(self, request):
        """Add AI credits to user account"""
        # This would typically be handled by payment processing
        # For now, allow admins to add credits manually

        if not request.user.is_staff:
            return Response(
                {"error": "Only administrators can add credits"},
                status=status.HTTP_403_FORBIDDEN,
            )

        credits = request.data.get("credits", 0)
        reason = request.data.get("reason", "Manual addition")

        try:
            credits = int(credits)
            if credits <= 0:
                return Response(
                    {"error": "Credits must be a positive number"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except (ValueError, TypeError):
            return Response(
                {"error": "Invalid credits value"}, status=status.HTTP_400_BAD_REQUEST
            )

        profile = self.get_user_profile()
        old_credits = profile.ai_credits_remaining
        profile.ai_credits_remaining += credits
        profile.save()

        # Log the credit addition
        ActivityLog.objects.create(
            user=request.user,
            activity_type="system",
            action="credits_added",
            activity_data={
                "credits_added": credits,
                "old_balance": old_credits,
                "new_balance": profile.ai_credits_remaining,
                "reason": reason,
                "added_by": request.user.username,
            },
        )

        return Response(
            {
                "message": f"Successfully added {credits} credits",
                "old_balance": old_credits,
                "new_balance": profile.ai_credits_remaining,
            }
        )

    @action(detail=False, methods=["get"])
    def models(self, request):
        """Get available AI models"""
        return Response(
            {
                "openai_models": [
                    {
                        "id": "gpt-3.5-turbo",
                        "name": "GPT-3.5 Turbo",
                        "description": "Fast and cost-effective",
                    },
                    {
                        "id": "gpt-4",
                        "name": "GPT-4",
                        "description": "Most capable, higher cost",
                    },
                    {
                        "id": "gpt-4-turbo",
                        "name": "GPT-4 Turbo",
                        "description": "Latest GPT-4 with improvements",
                    },
                ],
                "ollama_models": [
                    {
                        "id": "llama2",
                        "name": "Llama 2",
                        "description": "Open source model",
                    },
                    {
                        "id": "codellama",
                        "name": "Code Llama",
                        "description": "Optimized for code",
                    },
                    {
                        "id": "mistral",
                        "name": "Mistral 7B",
                        "description": "Efficient and capable",
                    },
                    {
                        "id": "neural-chat",
                        "name": "Neural Chat",
                        "description": "Conversational model",
                    },
                ],
            }
        )

    @action(detail=False, methods=["get"])
    def system_status(self, request):
        """Get system AI status"""
        payload = self._build_system_status_payload()
        return Response(payload)

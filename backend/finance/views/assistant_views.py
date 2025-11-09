"""
Assistant conversation viewset for quick-add and invoice upload chats.
"""

import json
import logging
from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, List, Optional

from django.db import transaction as db_transaction
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from ..models import (
    Account,
    Category,
    FinanceAssistantConversation,
    FinanceAssistantMessage,
)
from ..serializers import (
    FinanceAssistantConversationSerializer,
    FinanceAssistantMessageSerializer,
    TransactionSerializer,
)
from ..services.quick_add_service import QuickAddService
from ..services.ai_chat_service import AIChatService

logger = logging.getLogger(__name__)


class FinanceAssistantConversationViewSet(viewsets.ModelViewSet):
    """
    Manage finance assistant conversations for quick-add and invoice upload chats.
    """

    serializer_class = FinanceAssistantConversationSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def get_queryset(self):
        queryset = (
            FinanceAssistantConversation.objects.filter(user=self.request.user)
            .prefetch_related("messages")
            .order_by("-updated_at")
        )
        assistant_type = self.request.query_params.get("assistant_type")
        if assistant_type:
            queryset = queryset.filter(assistant_type=assistant_type)
        return queryset

    def get_serializer_context(self):
        context = super().get_serializer_context()
        if getattr(self, "action", "") in {"retrieve", "create"}:
            context["include_messages"] = True
        return context

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        serializer_context = self.get_serializer_context()
        if page is not None:
            serializer = self.get_serializer(page, many=True, context=serializer_context)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True, context=serializer_context)
        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(
            instance,
            context={**self.get_serializer_context(), "include_messages": True},
        )
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        assistant_type = request.data.get("assistant_type")
        if assistant_type not in FinanceAssistantConversation.AssistantType.values:
            raise ValidationError(
                {"assistant_type": "Unsupported assistant type supplied."}
            )

        title = (request.data.get("title") or "").strip()
        metadata = self._coerce_dict(request.data.get("metadata"))

        with db_transaction.atomic():
            conversation = FinanceAssistantConversation.objects.create(
                user=request.user,
                assistant_type=assistant_type,
                title=title,
                metadata=metadata,
            )

            try:
                if request.data.get("message") or request.data.get("attachment") or request.data.get("file"):
                    self._handle_message(conversation, request)
            except ValidationError:
                conversation.delete()
                raise
            except Exception as exc:  # pragma: no cover - unexpected branch
                conversation.delete()
                logger.exception("Assistant conversation creation failed: %s", exc)
                raise ValidationError({"detail": "Failed to process message."})

        serializer = self.get_serializer(
            conversation,
            context={**self.get_serializer_context(), "include_messages": True},
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(
        detail=True,
        methods=["post"],
        url_path="messages",
        parser_classes=[JSONParser, FormParser, MultiPartParser],
    )
    def send_message(self, request, pk=None):
        conversation = self.get_object()
        self._handle_message(conversation, request)
        conversation.refresh_from_db()
        serializer = self.get_serializer(
            conversation,
            context={**self.get_serializer_context(), "include_messages": True},
        )
        last_message = conversation.messages.order_by("-created_at").first()
        return Response(
            {
                "conversation": serializer.data,
                "latest_message": FinanceAssistantMessageSerializer(last_message).data
                if last_message
                else None,
            },
            status=status.HTTP_200_OK,
        )

    # ------------------------------------------------------------------ #
    # Helpers
    # ------------------------------------------------------------------ #

    def _handle_message(
        self, conversation: FinanceAssistantConversation, request
    ) -> FinanceAssistantMessage:
        message_text = (request.data.get("message") or "").strip()
        intent = (request.data.get("intent") or "analyze").strip().lower()
        attachment = request.data.get("attachment") or request.data.get("file")

        message_payload: Dict[str, Any] = {}
        if attachment is not None:
            message_payload["attachment"] = {
                "name": getattr(attachment, "name", ""),
                "size": getattr(attachment, "size", None),
                "content_type": getattr(attachment, "content_type", None),
            }

        context_data = self._coerce_dict(request.data.get("context"))
        if context_data:
            message_payload["context"] = context_data

        user_message = FinanceAssistantMessage.objects.create(
            user=request.user,
            conversation=conversation,
            role=FinanceAssistantMessage.Role.USER,
            content=message_text,
            payload=message_payload,
        )

        try:
            if (
                conversation.assistant_type
                == FinanceAssistantConversation.AssistantType.QUICK_ADD
            ):
                return self._process_quick_add(
                    conversation, message_text, attachment, intent, request
                )
            if (
                conversation.assistant_type
                == FinanceAssistantConversation.AssistantType.INVOICE_UPLOAD
            ):
                return self._process_invoice_upload(
                    conversation, message_text, attachment, intent, request
                )
        except ValidationError as exc:
            # Extract error message
            error_detail = exc.detail if hasattr(exc, "detail") else str(exc)
            if isinstance(error_detail, dict):
                # Get first error message from dict
                error_msg = str(list(error_detail.values())[0])
            elif isinstance(error_detail, list):
                error_msg = str(error_detail[0]) if error_detail else "Unable to process request."
            else:
                error_msg = str(error_detail)

            # Create error message for user
            return FinanceAssistantMessage.objects.create(
                user=request.user,
                conversation=conversation,
                role=FinanceAssistantMessage.Role.ASSISTANT,
                content=f"Sorry, I couldn't process that.\n\n{error_msg}",
                payload={"error": getattr(exc, "detail", str(exc))},
                is_error=True,
            )
        except Exception as exc:  # pragma: no cover - unexpected branch
            logger.exception("Assistant message processing failed: %s", exc)
            return FinanceAssistantMessage.objects.create(
                user=request.user,
                conversation=conversation,
                role=FinanceAssistantMessage.Role.ASSISTANT,
                content="Sorry, something went wrong while processing that request.\n\nTry again or rephrase your message.",
                payload={"error": "unknown_error", "details": str(exc)},
                is_error=True,
            )

        error_message = "This assistant type is not yet supported."
        return FinanceAssistantMessage.objects.create(
            user=request.user,
            conversation=conversation,
            role=FinanceAssistantMessage.Role.ASSISTANT,
            content=error_message,
            payload={"error": "unsupported_handler"},
            is_error=True,
        )

    def _process_quick_add(
        self,
        conversation: FinanceAssistantConversation,
        message_text: str,
        attachment,
        intent: str,
        request,
    ) -> FinanceAssistantMessage:
        # Validate we have some input
        if not message_text and not attachment:
            raise ValidationError(
                {"message": "Please provide a message or attachment to get started."}
            )

        service = QuickAddService(request.user)

        if intent == "create" or intent == "create_transaction":
            transaction_payload = self._coerce_dict(request.data.get("transaction"))
            if not transaction_payload:
                raise ValidationError(
                    {"transaction": "Transaction details are required to save."}
                )

            # Ensure required defaults
            transaction_payload.setdefault("notes", message_text)
            transaction_payload.setdefault("tags", [])
            serializer = TransactionSerializer(
                data=transaction_payload, context={"request": request}
            )
            serializer.is_valid(raise_exception=True)
            transaction = serializer.save(user=request.user)

            conversation.metadata = {
                **(conversation.metadata or {}),
                "last_transaction_id": transaction.id,
                "last_transaction_type": transaction.transaction_type,
            }
            conversation.last_summary = (
                f"Logged {transaction.transaction_type} transaction "
                f"for {transaction.description} ({transaction.amount})."
            )
            conversation.save(update_fields=["metadata", "last_summary", "updated_at"])

            assistant_payload = {
                "type": "transaction_created",
                "transaction": serializer.data,
            }
            assistant_content = conversation.last_summary
        else:
            # Get previous suggestion from conversation metadata to maintain context
            previous_suggestion = conversation.metadata.get("last_suggestion") if conversation.metadata else None

            try:
                suggestion = service.build_suggestion(message_text, attachment, previous_suggestion)
            except Exception as e:
                logger.error(f"Failed to build suggestion: {e}", exc_info=True)
                raise ValidationError(
                    {"message": "Unable to parse transaction details. Please try rephrasing."}
                )

            # Try AI enhancement if available (optional - works without it)
            suggestion_dict = suggestion.as_dict()

            try:
                ai_service = AIChatService(request.user)
                conversation_messages = conversation.messages.order_by('-created_at')[:5]
                history = [
                    {"role": msg.role, "content": msg.content}
                    for msg in reversed(list(conversation_messages))
                ]

                ai_result = ai_service.enhance_suggestion(
                    message_text,
                    suggestion_dict,
                    history
                )

                # Use enhanced suggestion if available
                suggestion_dict = ai_result.get('suggestion', suggestion_dict)

                # Add AI metadata
                suggestion_dict['ai_enhanced'] = ai_result.get('enhanced', False)
                if ai_result.get('enhanced'):
                    suggestion_dict['ai_provider'] = ai_result.get('ai_provider')
                    suggestion_dict['credits_used'] = ai_result.get('credits_used', 0)
            except Exception as e:
                logger.info(f"AI enhancement skipped (user may not have profile or AI disabled): {e}")
                # Continue with basic suggestion - this is fine for non-premium users
                suggestion_dict['ai_enhanced'] = False
                suggestion_dict['ai_provider'] = 'none'
                suggestion_dict['credits_used'] = 0

            # Ensure all required fields are present
            suggestion_dict.setdefault('ai_enhanced', False)
            suggestion_dict.setdefault('upgrade_prompt', False)
            suggestion_dict.setdefault('credits_depleted', False)

            accounts = Account.objects.filter(user=request.user).order_by("name")
            categories = Category.objects.filter(user=request.user).order_by("name")

            assistant_payload = {
                "type": "quick_add_suggestion",
                "suggestion": suggestion_dict,
                "accounts": [
                    {
                        "id": account.id,
                        "name": account.name,
                        "icon": getattr(account, "icon", ""),
                    }
                    for account in accounts
                ],
                "categories": [
                    {
                        "id": str(category.id),
                        "name": category.name,
                        "color": getattr(category, "color", "#0066CC"),
                    }
                    for category in categories
                ],
            }

            try:
                conversation.metadata = {
                    **(conversation.metadata or {}),
                    "last_suggestion": assistant_payload["suggestion"],
                }
                conversation.last_summary = self._render_quick_add_summary(suggestion)
                conversation.save(update_fields=["metadata", "last_summary", "updated_at"])

                # Generate conversational response
                assistant_content = self._generate_conversational_response(suggestion)
            except Exception as e:
                logger.error(f"Failed to generate response: {e}", exc_info=True)
                # Fallback to simple response
                assistant_content = f"I found a transaction for {suggestion_dict.get('amount', 'unknown amount')}. Ready to add it?"
                conversation.last_summary = "Quick add suggestion"
                conversation.save(update_fields=["last_summary", "updated_at"])

        try:
            assistant_message = FinanceAssistantMessage.objects.create(
                user=request.user,
                conversation=conversation,
                role=FinanceAssistantMessage.Role.ASSISTANT,
                content=assistant_content,
                payload=assistant_payload,
            )
            return assistant_message
        except Exception as e:
            logger.error(f"Failed to create assistant message: {e}", exc_info=True)
            # Create simple error message
            return FinanceAssistantMessage.objects.create(
                user=request.user,
                conversation=conversation,
                role=FinanceAssistantMessage.Role.ASSISTANT,
                content="I processed your message but had trouble saving the response. Please try again.",
                payload={"error": "save_failed", "details": str(e)},
                is_error=True,
            )

    def _process_invoice_upload(
        self,
        conversation: FinanceAssistantConversation,
        message_text: str,
        attachment,
        intent: str,
        request,
    ) -> FinanceAssistantMessage:
        if attachment is None:
            raise ValidationError(
                {"attachment": "Upload an invoice or bill to start the chat."}
            )

        account = None
        account_id = request.data.get("account_id") or request.data.get("default_account_id")
        if account_id:
            try:
                account = Account.objects.get(user=request.user, pk=account_id)
            except Account.DoesNotExist as exc:
                raise ValidationError({"account_id": "Account not found."}) from exc

        attachment.seek(0)
        file_bytes = attachment.read()
        if not file_bytes:
            raise ValidationError({"attachment": "Uploaded file is empty."})

        # Lazy import to avoid circular dependency at module import.
        from services.ai_document_processing_service import DocumentProcessingService

        parser = DocumentProcessingService()
        parsed = parser.parse_document(
            file_bytes=file_bytes,
            file_name=getattr(attachment, "name", "upload"),
            enhanced=True,
        )

        extracted_transactions = parsed.get("extracted_transactions") or []
        created_transactions: List[Dict[str, Any]] = []
        for entry in extracted_transactions[:10]:
            tx_payload = self._transaction_payload_from_invoice_entry(
                entry, parsed, account, message_text
            )
            if not tx_payload:
                continue
            serializer = TransactionSerializer(
                data=tx_payload, context={"request": request}
            )
            try:
                serializer.is_valid(raise_exception=True)
            except ValidationError as exc:
                logger.warning("Invoice transaction validation skipped: %s", exc.detail)
                continue
            transaction = serializer.save(user=request.user)
            created_transactions.append(serializer.data)

        if not created_transactions:
            raise ValidationError(
                {
                    "attachment": "No transactions were detected in the uploaded document."
                }
            )

        document_summary = {
            "file_name": parsed.get("file_name"),
            "document_type": parsed.get("document_type"),
            "quality_score": parsed.get("quality_score"),
            "detection_confidence": parsed.get("detection_confidence"),
            "metadata": parsed.get("metadata", {}),
        }

        # Generate conversational invoice response
        invoice_response = self._generate_invoice_conversational_response(
            document_summary, created_transactions, extracted_transactions
        )

        conversation.metadata = {
            **(conversation.metadata or {}),
            "last_invoice": document_summary,
            "last_created_transaction_ids": [tx["id"] for tx in created_transactions],
        }

        # Use conversational response for assistant content
        assistant_content = invoice_response
        conversation.last_summary = assistant_content
        conversation.save(update_fields=["metadata", "last_summary", "updated_at"])

        # Generate parsed items for display
        parsed_items = []
        for entry in extracted_transactions[:10]:
            amount = entry.get("amount") or entry.get("total_amount")
            desc = entry.get("description") or entry.get("item_description") or "Item"
            if amount:
                parsed_items.append({
                    "description": desc,
                    "amount": str(amount),
                    "quantity": entry.get("quantity"),
                })

        assistant_payload = {
            "type": "invoice_upload_result",
            "document": document_summary,
            "created_transactions": created_transactions,
            "raw_transactions": extracted_transactions[:10],
            "parsed_items": parsed_items,
            "quick_actions": [
                {"label": "✓ Looks good", "action": "confirm_invoice"},
                {"label": "✏️ Edit transactions", "action": "edit_transactions"},
            ] if created_transactions else [],
        }

        assistant_message = FinanceAssistantMessage.objects.create(
            user=request.user,
            conversation=conversation,
            role=FinanceAssistantMessage.Role.ASSISTANT,
            content=assistant_content,
            payload=assistant_payload,
        )
        return assistant_message

    # ------------------------------------------------------------------ #
    # Utility helpers
    # ------------------------------------------------------------------ #

    @staticmethod
    def _coerce_dict(value: Any) -> Dict[str, Any]:
        if value is None or value == "":
            return {}
        if isinstance(value, dict):
            return value
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
                if isinstance(parsed, dict):
                    return parsed
            except json.JSONDecodeError:
                logger.debug("Failed to parse JSON dict from string payload.")
        return {}

    @staticmethod
    def _generate_conversational_response(suggestion) -> str:
        """Generate a WhatsApp-style conversational response based on parsed data."""
        missing_fields = suggestion.missing_fields or []

        if not missing_fields:
            # All fields present - ready to create
            parts = ["Got it! I have everything I need:"]
            if suggestion.amount:
                parts.append(f"• Amount: {suggestion.amount}")
            if suggestion.description:
                parts.append(f"• Description: {suggestion.description}")
            if suggestion.suggested_account:
                parts.append(f"• Account: {suggestion.suggested_account.name}")
            if suggestion.suggested_category:
                parts.append(f"• Category: {suggestion.suggested_category.name}")
            parts.append("\nShall I create this transaction?")
            return "\n".join(parts)

        # Missing fields - ask for them
        if "amount" in missing_fields:
            if suggestion.description:
                return f"I see '{suggestion.description}'. What's the amount?"
            return "I'd love to help! What's the amount for this transaction?"

        if "description" in missing_fields:
            if suggestion.amount:
                return f"Got {suggestion.amount}! What's this transaction for?"
            return "What's this transaction for?"

        if "account" in missing_fields:
            return f"Alright, {suggestion.amount} for {suggestion.description}. Which account should I use?"

        # Default response with all available info
        parts = ["Here's what I understood:"]
        if suggestion.amount:
            parts.append(f"• Amount: {suggestion.amount}")
        if suggestion.description:
            parts.append(f"• For: {suggestion.description}")
        if suggestion.merchant_name:
            parts.append(f"• Merchant: {suggestion.merchant_name}")

        parts.append(f"\nMissing: {', '.join(missing_fields)}. Can you provide these?")
        return "\n".join(parts)

    @staticmethod
    def _render_quick_add_summary(suggestion) -> str:
        parts: List[str] = []
        if suggestion.amount is not None:
            amount_display = f"{abs(suggestion.amount):.2f}"
            parts.append(
                f"{suggestion.transaction_type.title()} suggestion for {amount_display}"
            )
        else:
            parts.append(f"{suggestion.transaction_type.title()} suggestion")

        if suggestion.description:
            parts.append(f"{suggestion.description}")

        if suggestion.merchant_name:
            parts.append(f"merchant: {suggestion.merchant_name}")

        if suggestion.confidence:
            parts.append(f"confidence {int(suggestion.confidence * 100)}%")

        return " · ".join(parts)

    @staticmethod
    def _generate_invoice_conversational_response(
        document_summary: Dict[str, Any],
        created_transactions: List[Dict[str, Any]],
        extracted_transactions: List[Dict[str, Any]],
    ) -> str:
        """Generate WhatsApp-style response for invoice parsing."""
        num_created = len(created_transactions)
        file_name = document_summary.get("file_name", "your document")

        if num_created == 0:
            return f"I've scanned {file_name} but couldn't find any transactions. Try a clearer image?"

        if num_created == 1:
            tx = created_transactions[0]
            return f"Perfect! I found 1 transaction in {file_name}:\n\n💰 {tx['description']} - {tx['amount']} {tx.get('currency', 'USD')}\n\nTransaction has been added to your account."

        # Multiple transactions
        total = sum(float(tx.get('amount', 0)) for tx in created_transactions)
        currency = created_transactions[0].get('currency', 'USD') if created_transactions else 'USD'

        response = f"Great! I found {num_created} transactions in {file_name}:\n\n"
        for i, tx in enumerate(created_transactions[:5], 1):
            response += f"{i}. {tx['description']} - {tx['amount']} {tx.get('currency', currency)}\n"

        if num_created > 5:
            response += f"...and {num_created - 5} more.\n"

        response += f"\n💵 Total: {total:.2f} {currency}"
        response += "\n\nAll transactions have been added!"

        return response

    @staticmethod
    def _render_invoice_summary(
        document_summary: Dict[str, Any], created_transactions: List[Dict[str, Any]]
    ) -> str:
        total_transactions = len(created_transactions)
        total_amount = Decimal("0")
        currency = ""
        for tx in created_transactions:
            try:
                total_amount += Decimal(str(tx.get("amount", "0")))
            except (InvalidOperation, TypeError):
                continue
            currency = tx.get("currency") or currency

        summary_parts = [
            f"Parsed {total_transactions} transaction{'s' if total_transactions != 1 else ''} from {document_summary.get('file_name') or 'the upload'}."
        ]

        if total_amount:
            amount_display = f"{total_amount:.2f}"
            if currency:
                amount_display = f"{amount_display} {currency}"
            summary_parts.append(f"Total inserted amount: {amount_display}.")

        doc_type = document_summary.get("document_type")
        if doc_type:
            summary_parts.append(f"Detected document type: {doc_type}.")

        if document_summary.get("quality_score") is not None:
            summary_parts.append(
                f"Parsing quality score {document_summary['quality_score']}."
            )

        return " ".join(summary_parts)

    def _transaction_payload_from_invoice_entry(
        self,
        entry: Dict[str, Any],
        parsed_document: Dict[str, Any],
        account: Optional[Account],
        fallback_notes: str,
    ) -> Optional[Dict[str, Any]]:
        amount_value = (
            entry.get("amount")
            or entry.get("total_amount")
            or entry.get("total")
            or entry.get("parsed_amount")
        )
        if amount_value in (None, ""):
            return None
        try:
            amount_decimal = Decimal(str(amount_value))
        except (InvalidOperation, TypeError):
            return None

        description = (
            entry.get("description")
            or entry.get("item_description")
            or entry.get("parsed_description")
            or entry.get("merchant")
            or "Invoice transaction"
        )

        raw_date = (
            entry.get("date")
            or entry.get("transaction_date")
            or entry.get("charge_date")
            or entry.get("due_date")
            or entry.get("issue_date")
        )
        parsed_date_value = None
        if raw_date:
            parsed_date_value = parse_date(str(raw_date))
            if parsed_date_value is None:
                try:
                    parsed_date_value = datetime.fromisoformat(str(raw_date)).date()
                except (ValueError, TypeError):
                    parsed_date_value = None

        if parsed_date_value is None:
            parsed_date_value = timezone.now().date()

        transaction_type = entry.get("transaction_type") or entry.get("type")
        if not transaction_type:
            transaction_type = "income" if amount_decimal < 0 else "expense"
        transaction_type = str(transaction_type).lower()
        is_credit = transaction_type in ("income", "credit")

        currency = (
            entry.get("currency")
            or parsed_document.get("metadata", {}).get("currency")
            or "USD"
        )

        metadata = {
            "transaction_subtype": transaction_type,
            "source": "assistant_parser",
        }

        payload: Dict[str, Any] = {
            "amount": str(abs(amount_decimal)),
            "description": description,
            "date": parsed_date_value.isoformat(),
            "currency": currency,
            "notes": fallback_notes or entry.get("notes") or "",
            "merchant_name": entry.get("merchant_name") or entry.get("merchant"),
            "tags": [],
            "is_credit": is_credit,
            "metadata": metadata,
        }

        if account:
            payload["account_id"] = account.id

        category_name = entry.get("category") or entry.get("category_name")
        if category_name:
            category = Category.objects.filter(
                user=account.user if account else self.request.user,
                name__iexact=category_name,
            ).first()
            if category:
                payload["metadata"]["category_id"] = category.id

        return payload

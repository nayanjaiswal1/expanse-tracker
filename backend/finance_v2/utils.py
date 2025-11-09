"""Shared utilities for finance_v2."""

from __future__ import annotations

from typing import Dict, Set

from django.db import models

from .services.currency_helper import get_user_currency


class CurrencyDefaultsMixin:
    """Mixin providing helpers to populate currency/account defaults."""

    def ensure_currency(self, data: dict, user) -> None:
        if not data.get("currency"):
            data["currency"] = get_user_currency(user)

    def ensure_account(self, data: dict, user, account_queryset):
        if data.get("account"):
            return
        currency = data.get("currency")
        if not currency:
            return
        account = account_queryset.filter(user=user, currency=currency, is_active=True).first()
        if account:
            data["account"] = account


class UserOwnedQuerySetMixin:
    """Mixin that adds helpers for user-scoped querysets."""

    user_fields: Set[str] = {"user", "created_by"}

    def restrict_to_user(self, queryset, user):
        model = queryset.model
        if not model:
            return queryset
        field_names = {field.name for field in model._meta.fields}
        if "user" in field_names:
            queryset = queryset.filter(user=user)
        elif "created_by" in field_names:
            queryset = queryset.filter(created_by=user)

        if hasattr(model, "is_deleted"):
            queryset = queryset.filter(is_deleted=False)
        return queryset


class UserOwnedViewSetMixin(CurrencyDefaultsMixin):
    """Shared logic for DRF viewsets operating on user-owned models."""

    def get_default_queryset(self, queryset, request):
        model = queryset.model
        if not model:
            return queryset

        field_names = {field.name for field in model._meta.fields}
        if "user" in field_names:
            queryset = queryset.filter(user=request.user)
        elif "created_by" in field_names:
            queryset = queryset.filter(created_by=request.user)

        if hasattr(model, "is_deleted"):
            params = getattr(request, "query_params", {})
            include_deleted = params.get("include_deleted")
            explicit_deleted = params.get("is_deleted")
            if not (
                (include_deleted and include_deleted.lower() in {"1", "true", "yes"})
                or explicit_deleted is not None
            ):
                queryset = queryset.filter(is_deleted=False)
        return queryset

    def build_save_kwargs(self, model: models.Model, user) -> Dict[str, models.Model]:
        kwargs: Dict[str, models.Model] = {}
        field_names = {field.name for field in model._meta.fields}
        if "user" in field_names:
            kwargs["user"] = user
        if "created_by" in field_names:
            kwargs["created_by"] = user
        if "updated_by" in field_names:
            kwargs["updated_by"] = user
        return kwargs


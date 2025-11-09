"""Base service classes used across the project.

This provides a lightweight base with common helpers for user-scoped
querysets and simple patterns to keep business logic out of views.

All services should be stateless other than the provided `user`.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Generic, Optional, Type, TypeVar

from django.contrib.auth.models import AbstractBaseUser
from django.db.models import Model, QuerySet


T = TypeVar("T", bound=Model)


@dataclass
class BaseService(Generic[T]):
    """Base class for domain services.

    - Carries the current authenticated `user` context
    - Exposes helpers for user-scoped queryset access
    - Encourages separating business logic from views/serializers
    """

    user: AbstractBaseUser

    model: Optional[Type[T]] = None

    def get_queryset(self) -> QuerySet[T]:
        """Return a base queryset for the service's model.

        Subclasses can override this to prefetch/select related fields
        or apply default filters. If `model` is not set, subclasses
        must implement this method.
        """
        if self.model is None:
            raise NotImplementedError("Either set `model` or override get_queryset().")
        return self.model.objects.all()

    def get_user_queryset(self) -> QuerySet[T]:
        """Return queryset filtered by current user when `user` field exists.

        If the underlying model does not have a `user` ForeignKey, this
        falls back to `get_queryset()`.
        """
        qs = self.get_queryset()
        if hasattr(qs.model, "user"):
            return qs.filter(user=self.user)
        return qs

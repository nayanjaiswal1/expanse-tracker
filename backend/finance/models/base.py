"""
Base classes imported from core.models.base for finance models.
"""

# Import base classes from users app
from users.base_models import (
    TimestampedModel,
    UserOwnedModel,
    StatusMixin,
    MetadataMixin,
)

__all__ = [
    "TimestampedModel",
    "UserOwnedModel",
    "StatusMixin",
    "MetadataMixin",
]

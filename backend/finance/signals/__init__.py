"""
Finance app signals.
"""

from .transaction_signals import auto_detect_duplicate_transactions

__all__ = [
    'auto_detect_duplicate_transactions',
]

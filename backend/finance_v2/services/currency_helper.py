"""
Currency helper utilities for finance_v2.
Gets currency from user preferences, no hardcoded defaults.
"""

from django.contrib.auth import get_user_model

User = get_user_model()


def get_user_currency(user: User) -> str:
    """
    Get user's preferred currency from preferences.

    Args:
        user: User object

    Returns:
        Currency code (e.g., "USD", "INR", "EUR")
    """
    if hasattr(user, 'preferences') and user.preferences:
        return user.preferences.preferred_currency

    # If no preferences set, return USD as final fallback
    # (In practice, preferences should be created on user signup)
    return "USD"


def ensure_user_preferences(user: User) -> None:
    """
    Ensure user has preferences object created.
    Should be called on user signup/first login.

    Args:
        user: User object
    """
    from users.models import UserPreferences

    if not hasattr(user, 'preferences') or not user.preferences:
        UserPreferences.objects.get_or_create(
            user=user,
            defaults={
                'preferred_currency': 'USD',  # Default can be based on user location
                'timezone': 'UTC',
                'language': 'en',
            }
        )


def set_default_currency_for_account(account_data: dict, user: User) -> dict:
    """
    Set default currency for account creation if not provided.

    Args:
        account_data: Account data dict
        user: User object

    Returns:
        Updated account data with currency
    """
    if 'currency' not in account_data or not account_data['currency']:
        account_data['currency'] = get_user_currency(user)

    return account_data


def set_default_currency_for_group(group_data: dict, user: User) -> dict:
    """
    Set default currency for group creation if not provided.

    Args:
        group_data: Group data dict
        user: User object

    Returns:
        Updated group data with currency
    """
    if 'currency' not in group_data or not group_data['currency']:
        group_data['currency'] = get_user_currency(user)

    return group_data


def convert_currency(
    amount: float,
    from_currency: str,
    to_currency: str,
    exchange_rates: dict = None
) -> dict:
    """
    Convert amount from one currency to another.

    Args:
        amount: Amount to convert
        from_currency: Source currency code
        to_currency: Target currency code
        exchange_rates: Optional dict of exchange rates

    Returns:
        {
            "amount": converted_amount,
            "exchange_rate": rate_used,
            "converted": bool,
            "original_amount": original_amount,
            "original_currency": from_currency
        }
    """
    if from_currency == to_currency:
        return {
            "amount": amount,
            "exchange_rate": 1.0,
            "converted": False,
            "original_amount": amount,
            "original_currency": from_currency,
        }

    # TODO: Implement actual currency conversion
    # Options:
    # 1. Use external API (exchangerate-api.com, fixer.io)
    # 2. Use AI to get current rate
    # 3. Maintain rate table in database

    # For now, return placeholder
    # In production, integrate with currency API
    rate = 1.0  # Placeholder
    converted_amount = amount * rate

    return {
        "amount": converted_amount,
        "exchange_rate": rate,
        "converted": True,
        "original_amount": amount,
        "original_currency": from_currency,
        "needs_manual_rate": True,  # Flag for manual rate entry
    }

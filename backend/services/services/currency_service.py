"""
Currency service for exchange rates and currency conversion.
"""

import requests
from decimal import Decimal
from typing import Dict, List, Optional
from django.conf import settings
from django.core.cache import cache
from django.utils import timezone
from ..constants import SUPPORTED_CURRENCIES


class CurrencyService:
    """Service for currency exchange rates and conversion"""

    def __init__(self):
        self.api_key = getattr(settings, "CURRENCY_API_KEY", None)
        self.base_url = getattr(
            settings, "CURRENCY_API_URL", "https://api.exchangerate-api.com/v4"
        )
        self.cache_timeout = 3600  # 1 hour cache

    def get_exchange_rate(
        self, from_currency: str, to_currency: str
    ) -> Optional[Decimal]:
        """Get exchange rate between two currencies"""
        if from_currency == to_currency:
            return Decimal("1.0")

        # Check cache first
        cache_key = f"exchange_rate_{from_currency}_{to_currency}"
        cached_rate = cache.get(cache_key)
        if cached_rate:
            return Decimal(str(cached_rate))

        try:
            if self.api_key:
                rate = self._fetch_api_rate(from_currency, to_currency)
            else:
                rate = self._get_mock_rate(from_currency, to_currency)

            if rate:
                # Cache the rate
                cache.set(cache_key, float(rate), self.cache_timeout)
                return rate

        except Exception as e:
            print(f"Error fetching exchange rate {from_currency} to {to_currency}: {e}")

        return None

    def get_all_rates(self, base_currency: str = "USD") -> Dict[str, Decimal]:
        """Get all exchange rates for a base currency"""
        cache_key = f"all_rates_{base_currency}"
        cached_rates = cache.get(cache_key)
        if cached_rates:
            return {k: Decimal(str(v)) for k, v in cached_rates.items()}

        try:
            if self.api_key:
                rates = self._fetch_all_api_rates(base_currency)
            else:
                rates = self._get_mock_all_rates(base_currency)

            if rates:
                # Cache the rates
                cache.set(
                    cache_key,
                    {k: float(v) for k, v in rates.items()},
                    self.cache_timeout,
                )
                return rates

        except Exception as e:
            print(f"Error fetching all rates for {base_currency}: {e}")

        return {}

    def convert_amount(
        self, amount: Decimal, from_currency: str, to_currency: str
    ) -> Optional[Decimal]:
        """Convert amount from one currency to another"""
        if from_currency == to_currency:
            return amount

        rate = self.get_exchange_rate(from_currency, to_currency)
        if rate:
            return amount * rate

        return None

    def get_supported_currencies(self) -> List[Dict[str, str]]:
        """Get list of supported currencies"""
        from ..constants import SUPPORTED_CURRENCIES
        return SUPPORTED_CURRENCIES

    def get_historical_rate(
        self, from_currency: str, to_currency: str, date: str
    ) -> Optional[Decimal]:
        """Get historical exchange rate for a specific date"""
        if from_currency == to_currency:
            return Decimal("1.0")

        cache_key = f"historical_rate_{from_currency}_{to_currency}_{date}"
        cached_rate = cache.get(cache_key)
        if cached_rate:
            return Decimal(str(cached_rate))

        try:
            if self.api_key:
                rate = self._fetch_historical_rate(from_currency, to_currency, date)
            else:
                # Use current rate as fallback for mock data
                rate = self._get_mock_rate(from_currency, to_currency)

            if rate:
                # Cache historical rates for longer (24 hours)
                cache.set(cache_key, float(rate), 86400)
                return rate

        except Exception as e:
            print(f"Error fetching historical rate for {date}: {e}")

        return None

    def bulk_convert(self, amounts: List[Dict], target_currency: str) -> List[Dict]:
        """Convert multiple amounts to target currency"""
        results = []

        for item in amounts:
            original_amount = Decimal(str(item["amount"]))
            from_currency = item["currency"]

            converted_amount = self.convert_amount(
                original_amount, from_currency, target_currency
            )

            results.append(
                {
                    "original_amount": original_amount,
                    "original_currency": from_currency,
                    "converted_amount": converted_amount,
                    "target_currency": target_currency,
                    "exchange_rate": self.get_exchange_rate(
                        from_currency, target_currency
                    ),
                    "conversion_timestamp": timezone.now(),
                }
            )

        return results

    def _fetch_api_rate(
        self, from_currency: str, to_currency: str
    ) -> Optional[Decimal]:
        """Fetch exchange rate from API"""
        url = f"{self.base_url}/latest/{from_currency}"

        response = requests.get(url, timeout=10)
        response.raise_for_status()

        data = response.json()

        if "rates" in data and to_currency in data["rates"]:
            return Decimal(str(data["rates"][to_currency]))

        return None

    def _fetch_all_api_rates(self, base_currency: str) -> Dict[str, Decimal]:
        """Fetch all exchange rates from API"""
        url = f"{self.base_url}/latest/{base_currency}"

        response = requests.get(url, timeout=10)
        response.raise_for_status()

        data = response.json()

        if "rates" in data:
            return {k: Decimal(str(v)) for k, v in data["rates"].items()}

        return {}

    def _fetch_historical_rate(
        self, from_currency: str, to_currency: str, date: str
    ) -> Optional[Decimal]:
        """Fetch historical exchange rate from API"""
        # Note: Historical rates may require different API endpoints or paid plans
        url = f"{self.base_url}/historical/{date}/{from_currency}"

        response = requests.get(url, timeout=10)
        response.raise_for_status()

        data = response.json()

        if "rates" in data and to_currency in data["rates"]:
            return Decimal(str(data["rates"][to_currency]))

        return None

    def _get_mock_rate(self, from_currency: str, to_currency: str) -> Decimal:
        """Generate mock exchange rate for development"""
        # Simple mock rates based on common currency pairs
        mock_rates = {
            ("USD", "EUR"): Decimal("0.85"),
            ("EUR", "USD"): Decimal("1.18"),
            ("USD", "GBP"): Decimal("0.73"),
            ("GBP", "USD"): Decimal("1.37"),
            ("USD", "JPY"): Decimal("110.0"),
            ("JPY", "USD"): Decimal("0.009"),
            ("EUR", "GBP"): Decimal("0.86"),
            ("GBP", "EUR"): Decimal("1.16"),
        }

        rate = mock_rates.get((from_currency, to_currency))
        if rate:
            return rate

        # Generate a rate based on currency codes if not in mock data
        import hashlib

        hash_key = f"{from_currency}{to_currency}"
        seed = int(hashlib.md5(hash_key.encode()).hexdigest()[:8], 16)
        rate = Decimal(str(0.5 + (seed % 100) / 100))  # Rate between 0.5 and 1.5

        return rate

    def _get_mock_all_rates(self, base_currency: str) -> Dict[str, Decimal]:
        """Generate mock rates for all currencies"""
        currency_codes = [currency['code'] for currency in SUPPORTED_CURRENCIES]
        rates = {}

        for currency_code in currency_codes:
            if currency_code != base_currency:
                rates[currency_code] = self._get_mock_rate(base_currency, currency_code)

        return rates

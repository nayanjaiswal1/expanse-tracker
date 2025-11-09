"""
Stock price integration service for fetching real-time market data.
"""

import requests
from decimal import Decimal
from typing import Dict, List, Optional
from django.conf import settings
from django.utils import timezone
from finance.services import InvestmentService


class StockPriceService:
    """Service for fetching stock prices from external APIs"""

    def __init__(self):
        self.api_key = getattr(settings, "STOCK_API_KEY", None)
        self.base_url = getattr(
            settings, "STOCK_API_URL", "https://api.twelvedata.com/v1"
        )

    def fetch_stock_price(self, symbol: str) -> Optional[Dict]:
        """Fetch current stock price for a symbol"""
        if not self.api_key:
            # Return mock data for development
            return self._get_mock_data(symbol)

        try:
            url = f"{self.base_url}/price"
            params = {"symbol": symbol, "apikey": self.api_key}

            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()

            data = response.json()

            if "price" in data:
                return {
                    "symbol": symbol,
                    "price": Decimal(str(data["price"])),
                    "timestamp": timezone.now(),
                    "source": "api",
                }

        except Exception as e:
            print(f"Error fetching price for {symbol}: {e}")
            return None

        return None

    def fetch_batch_prices(self, symbols: List[str]) -> Dict[str, Dict]:
        """Fetch prices for multiple symbols"""
        if not self.api_key:
            # Return mock data for development
            return {symbol: self._get_mock_data(symbol) for symbol in symbols}

        prices = {}

        try:
            # Join symbols with comma for batch request
            symbol_string = ",".join(symbols)

            url = f"{self.base_url}/price"
            params = {"symbol": symbol_string, "apikey": self.api_key}

            response = requests.get(url, params=params, timeout=15)
            response.raise_for_status()

            data = response.json()

            # Handle both single and batch responses
            if isinstance(data, dict):
                if "price" in data:
                    # Single symbol response
                    prices[symbols[0]] = {
                        "symbol": symbols[0],
                        "price": Decimal(str(data["price"])),
                        "timestamp": timezone.now(),
                        "source": "api",
                    }
                else:
                    # Batch response
                    for symbol, price_data in data.items():
                        if "price" in price_data:
                            prices[symbol] = {
                                "symbol": symbol,
                                "price": Decimal(str(price_data["price"])),
                                "timestamp": timezone.now(),
                                "source": "api",
                            }

        except Exception as e:
            print(f"Error fetching batch prices: {e}")
            # Return mock data as fallback
            return {symbol: self._get_mock_data(symbol) for symbol in symbols}

        return prices

    def update_investment_prices(self, user, symbols: List[str] = None) -> Dict:
        """Update prices for user's investments"""
        investment_service = InvestmentService(user=user)

        if symbols:
            investments = investment_service.get_user_queryset().filter(
                symbol__in=symbols, auto_update_price=True, is_active=True
            )
        else:
            investments = investment_service.get_user_queryset().filter(
                auto_update_price=True, is_active=True
            )

        symbols_to_update = [inv.symbol for inv in investments]

        if not symbols_to_update:
            return {"updated": 0, "failed": 0, "message": "No investments to update"}

        price_data = self.fetch_batch_prices(symbols_to_update)

        updated_count = 0
        failed_count = 0

        for investment in investments:
            symbol = investment.symbol
            if symbol in price_data and price_data[symbol]:
                try:
                    new_price = price_data[symbol]["price"]
                    investment_service.update_investment_price(
                        investment.id, new_price, "api"
                    )
                    updated_count += 1
                except Exception as e:
                    print(f"Failed to update {symbol}: {e}")
                    failed_count += 1
            else:
                failed_count += 1

        return {
            "updated": updated_count,
            "failed": failed_count,
            "message": f"Updated {updated_count} investments, {failed_count} failed",
        }

    def get_stock_quote(self, symbol: str) -> Optional[Dict]:
        """Get detailed stock quote including additional metrics"""
        if not self.api_key:
            return self._get_mock_quote(symbol)

        try:
            url = f"{self.base_url}/quote"
            params = {"symbol": symbol, "apikey": self.api_key}

            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()

            data = response.json()

            return {
                "symbol": data.get("symbol", symbol),
                "name": data.get("name", ""),
                "price": Decimal(str(data.get("close", 0))),
                "open": Decimal(str(data.get("open", 0))),
                "high": Decimal(str(data.get("high", 0))),
                "low": Decimal(str(data.get("low", 0))),
                "volume": data.get("volume", 0),
                "previous_close": Decimal(str(data.get("previous_close", 0))),
                "change": Decimal(str(data.get("change", 0))),
                "percent_change": Decimal(str(data.get("percent_change", 0))),
                "timestamp": timezone.now(),
                "source": "api",
            }

        except Exception as e:
            print(f"Error fetching quote for {symbol}: {e}")
            return None

    def search_stocks(self, query: str) -> List[Dict]:
        """Search for stocks by symbol or name"""
        if not self.api_key:
            return self._get_mock_search_results(query)

        try:
            url = f"{self.base_url}/symbol_search"
            params = {"symbol": query, "apikey": self.api_key}

            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()

            data = response.json()

            results = []
            if "data" in data:
                for item in data["data"][:10]:  # Limit to 10 results
                    results.append(
                        {
                            "symbol": item.get("symbol", ""),
                            "name": item.get("instrument_name", ""),
                            "exchange": item.get("exchange", ""),
                            "country": item.get("country", ""),
                            "type": item.get("instrument_type", ""),
                        }
                    )

            return results

        except Exception as e:
            print(f"Error searching stocks with query '{query}': {e}")
            return []

    def _get_mock_data(self, symbol: str) -> Dict:
        """Generate mock price data for development"""
        # Simple mock data based on symbol hash
        import hashlib

        seed = int(hashlib.md5(symbol.encode()).hexdigest()[:8], 16)
        base_price = (seed % 1000) + 10  # Price between 10-1010

        return {
            "symbol": symbol,
            "price": Decimal(str(base_price + (seed % 10))),
            "timestamp": timezone.now(),
            "source": "mock",
        }

    def _get_mock_quote(self, symbol: str) -> Dict:
        """Generate mock quote data for development"""
        mock_data = self._get_mock_data(symbol)
        price = mock_data["price"]

        return {
            "symbol": symbol,
            "name": f"{symbol} Corp",
            "price": price,
            "open": price * Decimal("0.98"),
            "high": price * Decimal("1.05"),
            "low": price * Decimal("0.95"),
            "volume": 1000000,
            "previous_close": price * Decimal("0.99"),
            "change": price * Decimal("0.01"),
            "percent_change": Decimal("1.01"),
            "timestamp": timezone.now(),
            "source": "mock",
        }

    def _get_mock_search_results(self, query: str) -> List[Dict]:
        """Generate mock search results for development"""
        return [
            {
                "symbol": query.upper(),
                "name": f"{query.upper()} Corporation",
                "exchange": "NASDAQ",
                "country": "US",
                "type": "Common Stock",
            }
        ]

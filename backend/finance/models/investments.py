"""
Investment-related models for the finance tracker.
"""

from decimal import Decimal
from django.db import models

from .base import UserOwnedModel


class Investment(UserOwnedModel):
    """Investment tracking with portfolio support"""

    INVESTMENT_TYPES = [
        ("stock", "Stock"),
        ("bond", "Bond"),
        ("etf", "ETF"),
        ("mutual_fund", "Mutual Fund"),
        ("crypto", "Cryptocurrency"),
        ("commodity", "Commodity"),
        ("real_estate", "Real Estate"),
        ("other", "Other"),
    ]

    RISK_LEVELS = [
        ("low", "Low Risk"),
        ("moderate", "Moderate Risk"),
        ("high", "High Risk"),
        ("very_high", "Very High Risk"),
    ]

    # Basic information
    symbol = models.CharField(max_length=20)
    name = models.CharField(max_length=255)
    investment_type = models.CharField(max_length=20, choices=INVESTMENT_TYPES)
    sector = models.CharField(max_length=100, blank=True)

    # Pricing information
    current_price = models.DecimalField(max_digits=12, decimal_places=4, default=0)
    currency = models.CharField(max_length=3, default="USD")
    last_price_update = models.DateTimeField(null=True, blank=True)
    price_source = models.CharField(max_length=50, default="manual")
    auto_update_price = models.BooleanField(default=False)

    # Portfolio grouping (simplified - no separate Portfolio model)
    portfolio_name = models.CharField(max_length=255, default="Default")
    portfolio_weight = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    # Investment details
    description = models.TextField(blank=True)
    risk_level = models.CharField(
        max_length=20, choices=RISK_LEVELS, null=True, blank=True
    )
    dividend_yield = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True
    )

    # Market data (optional)
    market_cap = models.BigIntegerField(null=True, blank=True)
    pe_ratio = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True
    )
    beta = models.DecimalField(max_digits=6, decimal_places=3, null=True, blank=True)
    fifty_two_week_high = models.DecimalField(
        max_digits=12, decimal_places=4, null=True, blank=True
    )
    fifty_two_week_low = models.DecimalField(
        max_digits=12, decimal_places=4, null=True, blank=True
    )

    is_active = models.BooleanField(default=True)

    class Meta:
        app_label = "finance"
        unique_together = ["user", "symbol", "investment_type"]
        indexes = [
            models.Index(fields=["user", "is_active"]),
            models.Index(fields=["symbol", "investment_type"]),
            models.Index(fields=["portfolio_name"]),
            models.Index(fields=["sector"]),
        ]

    def __str__(self):
        return f"{self.symbol} - {self.name}"

    @property
    def transactions(self):
        """Return active transactions linked via metadata"""
        from .transactions import Transaction  # Local import to avoid circular dependency

        return Transaction.active_objects.filter(
            user=self.user,
            status="active",
            metadata__investment_id=self.id,
        )

    def _iter_transactions(self):
        """Return list of related transactions for calculations."""
        return list(self.transactions.order_by("date", "id"))

    @property
    def current_quantity(self):
        """Calculate current quantity from transactions"""
        transactions = self._iter_transactions()
        buy_quantity = sum(
            tx.quantity or Decimal("0")
            for tx in transactions
            if tx.transaction_subtype in ("buy", "investment_buy")
        )
        sell_quantity = sum(
            tx.quantity or Decimal("0")
            for tx in transactions
            if tx.transaction_subtype in ("sell", "investment_sell")
        )
        return buy_quantity - sell_quantity

    @property
    def current_value(self):
        """Calculate current market value"""
        return self.current_quantity * self.current_price

    @property
    def total_invested(self):
        """Calculate total amount invested (cost basis)"""
        transactions = self._iter_transactions()
        buy_total = sum(
            tx.amount for tx in transactions if tx.transaction_subtype in ("buy", "investment_buy")
        )
        sell_total = sum(
            tx.amount for tx in transactions if tx.transaction_subtype in ("sell", "investment_sell")
        )
        return buy_total - sell_total

    @property
    def total_gain_loss(self):
        """Calculate total gain/loss"""
        return self.current_value - self.total_invested

    @property
    def total_gain_loss_percentage(self):
        """Calculate gain/loss percentage"""
        if self.total_invested <= 0:
            return Decimal("0")
        return (self.total_gain_loss / self.total_invested) * 100

    @classmethod
    def get_portfolio_summary(cls, user, portfolio_name="Default"):
        """Get portfolio metrics without separate model"""
        investments = cls.objects.filter(
            user=user, portfolio_name=portfolio_name, is_active=True
        )

        total_value = sum(inv.current_value for inv in investments)
        total_invested = sum(inv.total_invested for inv in investments)
        total_gain_loss = total_value - total_invested

        return {
            "name": portfolio_name,
            "investments_count": investments.count(),
            "total_value": total_value,
            "total_invested": total_invested,
            "total_gain_loss": total_gain_loss,
            "total_gain_loss_percentage": (total_gain_loss / total_invested * 100)
            if total_invested > 0
            else 0,
            "top_performers": investments.order_by("-total_gain_loss_percentage")[:3],
            "worst_performers": investments.order_by("total_gain_loss_percentage")[:3],
        }

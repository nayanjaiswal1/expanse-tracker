"""
Investment service for handling investment business logic in the new metadata-based
transaction model.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Iterable, Optional, Sequence

from django.db import transaction as db_transaction
from django.utils import timezone

from finance.services.base import BaseService
from ..models import Account, Investment, Transaction
from ..models.transaction_details import TransactionDetail


class InvestmentService(BaseService):
    """Service for investment operations built on top of the streamlined Transaction model."""

    def get_queryset(self):
        return Investment.objects.all()

    # --------------------------------------------------------------------- #
    # Helpers                                                               #
    # --------------------------------------------------------------------- #

    def _resolve_account(self, account: Optional[Account] = None) -> Account:
        """Resolve an account instance (defaults to the user's first investment account)."""
        if isinstance(account, Account):
            return account

        if account:
            account_id = account.id if isinstance(account, Account) else account
            resolved = Account.objects.filter(user=self.user, id=account_id).first()
            if resolved:
                return resolved
            raise ValueError("Specified account not found or not accessible.")

        default_account = (
            Account.objects.filter(user=self.user, account_type="investment", is_active=True)
            .order_by("id")
            .first()
        )
        if default_account:
            return default_account

        raise ValueError(
            "An investment account is required. Provide account_id or create an active investment account."
        )

    def _coerce_decimal(self, value, field_name: str) -> Decimal:
        try:
            return Decimal(str(value))
        except Exception as exc:  # pragma: no cover - defensive
            raise ValueError(f"Invalid decimal value for {field_name}") from exc

    def _base_metadata(self, investment: Investment, subtype: str) -> dict:
        return {
            "transaction_category": "investment",
            "transaction_subtype": subtype,
            "investment_id": investment.id,
            "investment_symbol": investment.symbol,
            "source": "investment_service",
        }

    def _create_investment_detail(
        self,
        transaction: Transaction,
        investment: Investment,
        shares: Decimal,
        price_per_share: Decimal,
        fees: Decimal,
        action: str,
    ) -> TransactionDetail:
        return TransactionDetail.create_investment_detail(
            transaction=transaction,
            symbol=investment.symbol,
            shares=shares,
            price_per_share=price_per_share,
            fees=fees,
            metadata={
                "investment_id": investment.id,
                "action": action,
            },
        )

    # --------------------------------------------------------------------- #
    # CRUD                                                                  #
    # --------------------------------------------------------------------- #

    def create_investment(self, investment_data):
        """Create a new investment."""
        return Investment.objects.create(user=self.user, **investment_data)

    def buy_investment(
        self,
        investment_id,
        quantity,
        price_per_unit,
        *,
        account: Optional[Account] = None,
        fees=0,
        transaction_date=None,
    ) -> Transaction:
        """Record a buy transaction (cash out)."""
        investment = self.get_user_queryset().get(id=investment_id)
        quantity_decimal = self._coerce_decimal(quantity, "quantity")
        price_decimal = self._coerce_decimal(price_per_unit, "price_per_unit")
        fees_decimal = self._coerce_decimal(fees, "fees")
        account = self._resolve_account(account)
        transaction_date = transaction_date or timezone.now().date()

        total_amount = quantity_decimal * price_decimal + fees_decimal

        metadata = self._base_metadata(investment, subtype="buy")
        metadata.update(
            {
                "quantity": str(quantity_decimal),
                "price_per_unit": str(price_decimal),
                "fees": str(fees_decimal),
            }
        )

        with db_transaction.atomic():
            transaction = Transaction.objects.create(
                user=self.user,
                account=account,
                amount=total_amount,
                description=f"Buy {quantity_decimal} units of {investment.symbol}",
                date=transaction_date,
                is_credit=False,
                metadata=metadata,
            )
            self._create_investment_detail(
                transaction=transaction,
                investment=investment,
                shares=quantity_decimal,
                price_per_share=price_decimal,
                fees=fees_decimal,
                action="buy",
            )

            investment.current_price = price_decimal
            investment.last_price_update = timezone.now()
            investment.save(update_fields=["current_price", "last_price_update"])

            return transaction

    def sell_investment(
        self,
        investment_id,
        quantity,
        price_per_unit,
        *,
        account: Optional[Account] = None,
        fees=0,
        transaction_date=None,
    ) -> Transaction:
        """Record a sell transaction (cash in)."""
        investment = self.get_user_queryset().get(id=investment_id)
        quantity_decimal = self._coerce_decimal(quantity, "quantity")
        price_decimal = self._coerce_decimal(price_per_unit, "price_per_unit")
        fees_decimal = self._coerce_decimal(fees, "fees")
        account = self._resolve_account(account)
        transaction_date = transaction_date or timezone.now().date()

        if quantity_decimal > investment.current_quantity:
            raise ValueError(
                f"Cannot sell {quantity_decimal} units. Available quantity: {investment.current_quantity}."
            )

        total_amount = quantity_decimal * price_decimal - fees_decimal
        if total_amount <= 0:
            raise ValueError("Sell amount must be positive (price * quantity must exceed fees).")

        metadata = self._base_metadata(investment, subtype="sell")
        metadata.update(
            {
                "quantity": str(quantity_decimal),
                "price_per_unit": str(price_decimal),
                "fees": str(fees_decimal),
            }
        )

        with db_transaction.atomic():
            transaction = Transaction.objects.create(
                user=self.user,
                account=account,
                amount=total_amount,
                description=f"Sell {quantity_decimal} units of {investment.symbol}",
                date=transaction_date,
                is_credit=True,
                metadata=metadata,
            )
            self._create_investment_detail(
                transaction=transaction,
                investment=investment,
                shares=quantity_decimal,
                price_per_share=price_decimal,
                fees=fees_decimal,
                action="sell",
            )

            investment.current_price = price_decimal
            investment.last_price_update = timezone.now()
            investment.save(update_fields=["current_price", "last_price_update"])

            return transaction

    def record_dividend(self, investment_id, amount, *, account: Optional[Account] = None, payment_date=None) -> Transaction:
        """Record a dividend payment."""
        investment = self.get_user_queryset().get(id=investment_id)
        amount_decimal = self._coerce_decimal(amount, "amount")
        account = self._resolve_account(account)
        payment_date = payment_date or timezone.now().date()

        metadata = self._base_metadata(investment, subtype="dividend")

        transaction = Transaction.objects.create(
            user=self.user,
            account=account,
            amount=amount_decimal,
            description=f"Dividend received from {investment.symbol}",
            date=payment_date,
            is_credit=True,
            metadata=metadata,
        )

        return transaction

    # --------------------------------------------------------------------- #
    # Reporting helpers                                                     #
    # --------------------------------------------------------------------- #

    def bulk_update_prices(self, price_updates):
        """Bulk update prices for multiple investments."""
        updated_count = 0
        for symbol, price_data in price_updates.items():
            try:
                investment = self.get_user_queryset().get(symbol=symbol)
            except Investment.DoesNotExist:
                continue
            price = price_data.get("price")
            if price is None:
                continue
            self.update_investment_price(
                investment_id=investment.id,
                new_price=price,
                price_source=price_data.get("source", "api"),
            )
            updated_count += 1

        return updated_count

    def update_investment_price(self, investment_id, new_price, price_source="manual"):
        """Update current price for an investment."""
        investment = self.get_user_queryset().get(id=investment_id)
        investment.current_price = self._coerce_decimal(new_price, "new_price")
        investment.price_source = price_source
        investment.last_price_update = timezone.now()
        investment.save(update_fields=["current_price", "price_source", "last_price_update"])
        return investment

    def get_portfolio_performance(self, portfolio_name="Default"):
        """Get comprehensive portfolio performance metrics."""
        investments = self.get_user_queryset().filter(
            portfolio_name=portfolio_name,
            is_active=True,
        )

        metrics = {
            "total_value": Decimal("0"),
            "total_invested": Decimal("0"),
            "total_gain_loss": Decimal("0"),
            "total_gain_loss_percentage": Decimal("0"),
            "dividend_income": Decimal("0"),
            "investments": [],
        }

        for investment in investments:
            dividend_income = sum(
                (tx.amount for tx in investment._iter_transactions() if tx.transaction_subtype == "dividend" and tx.is_credit),
                start=Decimal("0"),
            )

            investment_data = {
                "symbol": investment.symbol,
                "name": investment.name,
                "current_quantity": investment.current_quantity,
                "current_price": investment.current_price,
                "current_value": investment.current_value,
                "total_invested": investment.total_invested,
                "total_gain_loss": investment.total_gain_loss,
                "total_gain_loss_percentage": investment.total_gain_loss_percentage,
                "dividend_income": dividend_income,
            }

            metrics["investments"].append(investment_data)
            metrics["total_value"] += investment.current_value
            metrics["total_invested"] += investment.total_invested
            metrics["dividend_income"] += dividend_income

        metrics["total_gain_loss"] = metrics["total_value"] - metrics["total_invested"]
        if metrics["total_invested"] > 0:
            metrics["total_gain_loss_percentage"] = (
                metrics["total_gain_loss"] / metrics["total_invested"] * Decimal("100")
            )

        metrics["sector_allocation"] = self._get_sector_allocation(investments)
        metrics["type_allocation"] = self._get_type_allocation(investments)
        return metrics

    def get_investment_history(self, investment_id, start_date=None, end_date=None):
        """Get transaction history for an investment."""
        investment = self.get_user_queryset().get(id=investment_id)
        transactions = investment.transactions
        if start_date:
            transactions = transactions.filter(date__gte=start_date)
        if end_date:
            transactions = transactions.filter(date__lte=end_date)
        return transactions.order_by("-date", "-created_at")

    def calculate_realized_gains(self, investment_id=None):
        """Calculate realized gains/losses via FIFO."""
        if investment_id:
            investments = [self.get_user_queryset().get(id=investment_id)]
        else:
            investments: Sequence[Investment] = self.get_user_queryset().filter(is_active=True)

        total_realized_gains = Decimal("0")
        investment_gains = {}

        for investment in investments:
            transactions = sorted(
                investment._iter_transactions(),
                key=lambda tx: (tx.date, tx.id),
            )
            buys = [tx for tx in transactions if tx.transaction_subtype == "buy"]
            sells = [tx for tx in transactions if tx.transaction_subtype == "sell"]
            realized_gain = self._calculate_fifo_gains(buys, sells)
            investment_gains[investment.symbol] = realized_gain
            total_realized_gains += realized_gain

        return {
            "total_realized_gains": total_realized_gains,
            "investment_gains": investment_gains,
        }

    def get_top_performers(self, limit=5):
        """Get top performing investments."""
        return (
            self.get_user_queryset()
            .filter(is_active=True)
            .order_by("-total_gain_loss_percentage")[:limit]
        )

    # --------------------------------------------------------------------- #
    # Internal analytics helpers                                            #
    # --------------------------------------------------------------------- #

    def _calculate_fifo_gains(
        self, buy_transactions: Iterable[Transaction], sell_transactions: Iterable[Transaction]
    ) -> Decimal:
        """FIFO realized gains calculator."""
        buy_queue = []

        for buy in buy_transactions:
            buy_queue.append(
                {
                    "quantity": buy.quantity or Decimal("0"),
                    "price": buy.price_per_unit or Decimal("0"),
                    "fees": buy.fees or Decimal("0"),
                }
            )

        realized_gain = Decimal("0")

        for sell in sell_transactions:
            sell_quantity = sell.quantity or Decimal("0")
            sell_price = sell.price_per_unit or Decimal("0")
            sell_fees = sell.fees or Decimal("0")

            while sell_quantity > 0 and buy_queue:
                buy = buy_queue[0]
                available = buy["quantity"]
                if available <= 0:
                    buy_queue.pop(0)
                    continue

                quantity_used = min(available, sell_quantity)
                buy_cost = quantity_used * buy["price"]
                if buy["fees"]:
                    buy_cost += buy["fees"] * quantity_used / available

                sell_proceeds = quantity_used * sell_price
                if sell_fees:
                    sell_proceeds -= sell_fees * quantity_used / sell_quantity

                realized_gain += sell_proceeds - buy_cost

                buy["quantity"] -= quantity_used
                sell_quantity -= quantity_used
                if buy["quantity"] <= 0:
                    buy_queue.pop(0)

            if sell_quantity > 0:
                # Remaining quantity without matching buy (should not happen often)
                realized_gain += sell_quantity * sell_price

        return realized_gain

    def _get_sector_allocation(self, investments: Iterable[Investment]):
        allocation = {}
        for investment in investments:
            sector = investment.sector or "Unspecified"
            allocation.setdefault(sector, Decimal("0"))
            allocation[sector] += investment.current_value
        return allocation

    def _get_type_allocation(self, investments: Iterable[Investment]):
        allocation = {}
        for investment in investments:
            inv_type = investment.investment_type or "other"
            allocation.setdefault(inv_type, Decimal("0"))
            allocation[inv_type] += investment.current_value
        return allocation

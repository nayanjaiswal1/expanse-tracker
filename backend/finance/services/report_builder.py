"""
Aggregate helpers for generating detailed financial reports.
"""

from datetime import timedelta
from decimal import Decimal
from typing import Dict, Any, Iterable, List

from django.db.models import Sum, Count, Max, Min, Q
from django.db.models.functions import TruncWeek, TruncMonth, TruncYear
from django.utils import timezone

from ..models import Transaction, Account, GroupExpense, Category


class FinancialReportBuilder:
    """Construct rich summary datasets for exportable financial reports."""

    def __init__(self, user):
        self.user = user

    def build(self, sections: Iterable[str] = None) -> Dict[str, Any]:
        sections = set(sections or {"weekly", "monthly", "yearly"})

        transactions = Transaction.objects.filter(user=self.user)
        active_transactions = transactions.filter(status="active")

        total_income = active_transactions.filter(is_credit=True).aggregate(
            total=Sum("amount")
        )["total"] or Decimal("0")
        total_expenses = active_transactions.filter(is_credit=False).aggregate(
            total=Sum("amount")
        )["total"] or Decimal("0")

        date_bounds = active_transactions.aggregate(
            start=Min("date"),
            end=Max("date"),
        )

        summary = {
            "overview": {
                "total_transactions": active_transactions.count(),
                "total_income": float(total_income),
                "total_expenses": float(total_expenses),
                "net_amount": float(total_income - total_expenses),
                "date_range": {
                    "start": date_bounds["start"].isoformat() if date_bounds["start"] else None,
                    "end": date_bounds["end"].isoformat() if date_bounds["end"] else None,
                },
                "average_daily_spend": self._average_daily_spend(active_transactions, total_expenses),
                "largest_expense": self._largest_transaction(active_transactions, "expense"),
                "largest_income": self._largest_transaction(active_transactions, "income"),
            },
            "category_breakdown": self._category_breakdown(active_transactions),
            "account_breakdown": self._account_breakdown(),
            "group_expenses": self._group_expense_summary(),
            "merchant_breakdown": self._merchant_breakdown(active_transactions),
        }

        if "weekly" in sections:
            summary["weekly_breakdown"] = self._periodic_breakdown(
                active_transactions,
                period="week",
                periods=12,
            )
        if "monthly" in sections:
            summary["monthly_breakdown"] = self._periodic_breakdown(
                active_transactions,
                period="month",
                periods=12,
            )
        if "yearly" in sections:
            summary["yearly_breakdown"] = self._periodic_breakdown(
                active_transactions,
                period="year",
                periods=5,
            )

        return summary

    def _average_daily_spend(self, queryset, total_expenses: Decimal) -> float:
        if queryset.count() == 0:
            return 0.0
        bounds = queryset.aggregate(start=Min("date"), end=Max("date"))
        if not bounds["start"] or not bounds["end"]:
            return 0.0
        days = max((bounds["end"] - bounds["start"]).days + 1, 1)
        return round(float(total_expenses) / days, 2)

    def _largest_transaction(self, queryset, tx_type: str) -> Dict[str, Any]:
        if tx_type == "income":
            filtered = queryset.filter(is_credit=True)
        elif tx_type == "expense":
            filtered = queryset.filter(is_credit=False)
        else:
            filtered = queryset

        record = (
            filtered.order_by("-amount")
            .values("amount", "description", "date", "transaction_group__name")
            .first()
        )
        if not record:
            return {}
        return {
            "amount": float(record["amount"]),
            "description": record["description"],
            "merchant": record.get("transaction_group__name"),
            "date": record["date"].isoformat() if record["date"] else None,
        }

    def _category_breakdown(self, queryset) -> List[Dict[str, Any]]:
        expenses = queryset.filter(is_credit=False)

        category_totals = (
            expenses.values("category_id")
            .annotate(total=Sum("amount"), count=Count("id"))
            .order_by("-total")
        )

        category_ids = [
            entry["category_id"]
            for entry in category_totals
            if entry["category_id"]
        ]

        if not category_ids:
            return []

        category_map = {
            category.id: category
            for category in Category.objects.filter(user=self.user, id__in=category_ids)
        }

        total_expense = sum(
            entry["total"]
            for entry in category_totals
            if entry["category_id"] in category_map
        )

        if total_expense == 0:
            return []

        breakdown = []
        for entry in category_totals:
            category_id = entry["category_id"]
            category = category_map.get(category_id)
            if not category:
                continue
            amount = entry["total"]
            breakdown.append(
                {
                    "category": category.name,
                    "amount": float(amount),
                    "count": entry["count"],
                    "color": getattr(category, "color", "#888888"),
                    "percentage": round(float(amount) / float(total_expense) * 100, 2),
                }
            )

        return breakdown

    def _account_breakdown(self) -> List[Dict[str, Any]]:
        accounts = Account.objects.filter(user=self.user).order_by("account_type", "name")
        return [
            {
                "name": account.name,
                "type": account.account_type,
                "balance": float(account.balance),
                "currency": account.currency,
                "icon": getattr(account, "icon", ""),
            }
            for account in accounts
        ]

    def _merchant_breakdown(self, queryset) -> List[Dict[str, Any]]:
        merchants = (
            queryset.filter(transaction_group__isnull=False)
            .values("transaction_group__name")
            .annotate(total=Sum("amount"), count=Count("id"))
            .order_by("-total")[:15]
        )
        return [
            {
                "merchant": entry["transaction_group__name"],
                "amount": float(entry["total"]),
                "count": entry["count"],
            }
            for entry in merchants
        ]

    def _group_expense_summary(self) -> List[Dict[str, Any]]:
        groups = (
            GroupExpense.objects.filter(created_by=self.user)
            .values("title", "group__name", "date", "total_amount", "currency")
            .order_by("-date")[:10]
        )
        return [
            {
                "title": entry["title"],
                "group": entry["group__name"],
                "amount": float(entry["total_amount"] or 0),
                "currency": entry["currency"],
                "date": entry["date"].isoformat() if entry["date"] else None,
            }
            for entry in groups
        ]

    def _periodic_breakdown(self, queryset, period: str, periods: int) -> List[Dict[str, Any]]:
        today = timezone.now().date()
        if period == "week":
            start = today - timedelta(weeks=periods)
            trunc = TruncWeek("date")
        elif period == "month":
            start = today - timedelta(days=30 * periods)
            trunc = TruncMonth("date")
        else:  # year
            start = today - timedelta(days=365 * periods)
            trunc = TruncYear("date")

        scoped = queryset.filter(date__gte=start)
        annotated = (
            scoped.annotate(period=trunc)
            .values("period")
            .annotate(
                income=Sum("amount", filter=Q(is_credit=True)),
                expenses=Sum("amount", filter=Q(is_credit=False)),
                count=Count("id"),
            )
            .order_by("period")
        )

        result = []
        for entry in annotated:
            period_value = entry["period"]
            if not period_value:
                continue
            income = entry["income"] or Decimal("0")
            expenses = entry["expenses"] or Decimal("0")
            result.append(
                {
                    "period": period_value.date().isoformat(),
                    "income": float(income),
                    "expenses": float(expenses),
                    "net": float(income - expenses),
                    "transaction_count": entry["count"],
                }
            )
        return result

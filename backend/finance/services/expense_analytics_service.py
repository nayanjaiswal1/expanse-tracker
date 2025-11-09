"""
Expense Analytics Service - Comprehensive transaction analysis and reporting.

Features:
- Time-based aggregations (daily, weekly, monthly, yearly, custom)
- Category-based breakdowns with hierarchical support
- Trend analysis and forecasting
- Merchant/vendor analysis
- Item-level analytics
- Budget vs actual comparisons
- Export capabilities
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, date
from decimal import Decimal
from typing import Dict, List, Optional, Tuple
from collections import defaultdict

from django.db.models import Sum, Count, Avg, Q, F, Case, When, DecimalField
from django.db.models.functions import TruncDate, TruncWeek, TruncMonth, TruncYear
from django.utils import timezone

logger = logging.getLogger(__name__)


class ExpenseAnalyticsService:
    """
    Comprehensive analytics service for transaction analysis.

    Provides aggregations, trends, and insights for expense tracking.
    """

    def __init__(self, user):
        """
        Initialize service for a specific user.

        Args:
            user: User instance
        """
        self.user = user

    def get_expense_summary(
        self,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        categories: Optional[List[int]] = None,
        accounts: Optional[List[int]] = None,
        include_pending: bool = False,
    ) -> Dict:
        """
        Get high-level expense summary with totals and breakdowns.

        Args:
            start_date: Filter from date (inclusive)
            end_date: Filter to date (inclusive)
            categories: Optional list of category IDs to filter
            accounts: Optional list of account IDs to filter
            include_pending: Whether to include pending transactions

        Returns:
            Dict with summary statistics
        """
        from finance.models import Transaction, TransactionDetail

        # Build queryset
        queryset = Transaction.active_objects.filter(user=self.user)

        # Apply filters
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
        if not include_pending:
            queryset = queryset.filter(status='active')
        if accounts:
            queryset = queryset.filter(account_id__in=accounts)

        # Get income and expense totals
        income_total = queryset.filter(is_credit=True).aggregate(
            total=Sum('amount'))['total'] or Decimal('0.00')

        expense_total = queryset.filter(is_credit=False).aggregate(
            total=Sum('amount'))['total'] or Decimal('0.00')

        # Transaction counts
        income_count = queryset.filter(is_credit=True).count()
        expense_count = queryset.filter(is_credit=False).count()

        # Average transaction amounts
        avg_income = queryset.filter(is_credit=True).aggregate(
            avg=Avg('amount'))['avg'] or Decimal('0.00')

        avg_expense = queryset.filter(is_credit=False).aggregate(
            avg=Avg('amount'))['avg'] or Decimal('0.00')

        # Net savings
        net_savings = income_total - expense_total

        # Get top categories
        top_expense_categories = self.get_top_categories(
            start_date=start_date,
            end_date=end_date,
            transaction_type='expense',
            limit=5
        )

        # Get top merchants
        top_merchants = self.get_top_merchants(
            start_date=start_date,
            end_date=end_date,
            limit=5
        )

        return {
            'period': {
                'start_date': str(start_date) if start_date else None,
                'end_date': str(end_date) if end_date else None,
            },
            'totals': {
                'income': float(income_total),
                'expenses': float(expense_total),
                'net_savings': float(net_savings),
                'savings_rate': float((net_savings / income_total * 100) if income_total > 0 else 0),
            },
            'counts': {
                'income_transactions': income_count,
                'expense_transactions': expense_count,
                'total_transactions': income_count + expense_count,
            },
            'averages': {
                'avg_income': float(avg_income),
                'avg_expense': float(avg_expense),
            },
            'top_expense_categories': top_expense_categories,
            'top_merchants': top_merchants,
        }

    def get_category_breakdown(
        self,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        transaction_type: Optional[str] = 'expense',
        include_subcategories: bool = True,
    ) -> List[Dict]:
        """
        Get expense/income breakdown by category.

        Args:
            start_date: Filter from date
            end_date: Filter to date
            transaction_type: 'expense', 'income', or 'all'
            include_subcategories: Whether to include subcategory details

        Returns:
            List of category breakdowns with amounts and percentages
        """
        from finance.models import Transaction, Category

        # Build queryset
        queryset = Transaction.active_objects.filter(
            user=self.user,
            status='active',
        )

        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)

        # Filter by transaction type
        if transaction_type == 'expense':
            queryset = queryset.filter(is_credit=False)
        elif transaction_type == 'income':
            queryset = queryset.filter(is_credit=True)

        # Get all transactions with their categories
        transactions = queryset.select_related('account')

        # Group by category
        category_totals = defaultdict(lambda: {'amount': Decimal('0.00'), 'count': 0})

        for transaction in transactions:
            category_id = transaction.category_id
            if category_id:
                category_totals[category_id]['amount'] += transaction.amount
                category_totals[category_id]['count'] += 1
            else:
                category_totals[None]['amount'] += transaction.amount
                category_totals[None]['count'] += 1

        # Calculate total for percentages
        total_amount = sum(cat['amount'] for cat in category_totals.values())

        # Build result with category details
        result = []

        # Get category objects
        category_ids = [cid for cid in category_totals.keys() if cid is not None]
        categories = {c.id: c for c in Category.objects.filter(id__in=category_ids, user=self.user)}

        for category_id, stats in category_totals.items():
            if category_id is None:
                category_name = 'Uncategorized'
                category_color = '#999999'
                category_icon = 'help_outline'
            else:
                category = categories.get(category_id)
                if not category:
                    continue
                category_name = category.name
                category_color = category.color
                category_icon = category.icon

            percentage = float((stats['amount'] / total_amount * 100) if total_amount > 0 else 0)

            result.append({
                'category_id': category_id,
                'category_name': category_name,
                'category_color': category_color,
                'category_icon': category_icon,
                'amount': float(stats['amount']),
                'transaction_count': stats['count'],
                'percentage': round(percentage, 2),
            })

        # Sort by amount descending
        result.sort(key=lambda x: x['amount'], reverse=True)

        return result

    def get_time_series_data(
        self,
        start_date: date,
        end_date: date,
        granularity: str = 'monthly',
        transaction_type: Optional[str] = 'expense',
        categories: Optional[List[int]] = None,
    ) -> Dict:
        """
        Get time series data for trend analysis.

        Args:
            start_date: Start date
            end_date: End date
            granularity: 'daily', 'weekly', 'monthly', 'yearly'
            transaction_type: 'expense', 'income', or 'all'
            categories: Optional category filter

        Returns:
            Dict with time series data and trend info
        """
        from finance.models import Transaction

        # Build queryset
        queryset = Transaction.active_objects.filter(
            user=self.user,
            status='active',
            date__gte=start_date,
            date__lte=end_date,
        )

        # Filter by transaction type
        if transaction_type == 'expense':
            queryset = queryset.filter(is_credit=False)
        elif transaction_type == 'income':
            queryset = queryset.filter(is_credit=True)

        # Filter by categories
        if categories:
            queryset = queryset.filter(category_id__in=categories)

        # Truncate by granularity
        trunc_function = {
            'daily': TruncDate,
            'weekly': TruncWeek,
            'monthly': TruncMonth,
            'yearly': TruncYear,
        }.get(granularity, TruncMonth)

        # Aggregate by period
        time_series = queryset.annotate(
            period=trunc_function('date')
        ).values('period').annotate(
            total_amount=Sum('amount'),
            transaction_count=Count('id'),
            avg_amount=Avg('amount'),
        ).order_by('period')

        # Convert to list
        data_points = []
        for point in time_series:
            data_points.append({
                'period': point['period'].isoformat(),
                'amount': float(point['total_amount'] or 0),
                'count': point['transaction_count'],
                'average': float(point['avg_amount'] or 0),
            })

        # Calculate trend
        if len(data_points) >= 2:
            amounts = [dp['amount'] for dp in data_points]
            trend_direction = 'increasing' if amounts[-1] > amounts[0] else 'decreasing'
            trend_percentage = ((amounts[-1] - amounts[0]) / amounts[0] * 100) if amounts[0] > 0 else 0
        else:
            trend_direction = 'stable'
            trend_percentage = 0

        return {
            'granularity': granularity,
            'data_points': data_points,
            'trend': {
                'direction': trend_direction,
                'percentage': round(trend_percentage, 2),
            },
            'summary': {
                'total_amount': sum(dp['amount'] for dp in data_points),
                'avg_per_period': sum(dp['amount'] for dp in data_points) / len(data_points) if data_points else 0,
                'total_transactions': sum(dp['count'] for dp in data_points),
            }
        }

    def get_top_categories(
        self,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        transaction_type: str = 'expense',
        limit: int = 10,
    ) -> List[Dict]:
        """Get top categories by spending."""
        breakdown = self.get_category_breakdown(
            start_date=start_date,
            end_date=end_date,
            transaction_type=transaction_type,
        )

        return breakdown[:limit]

    def get_top_merchants(
        self,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        limit: int = 10,
    ) -> List[Dict]:
        """Get top merchants by transaction volume."""
        from finance.models import Transaction, TransactionGroup

        queryset = Transaction.active_objects.filter(
            user=self.user,
            status='active',
            is_credit=False,  # Expenses only
            transaction_group__isnull=False,
        )

        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)

        # Aggregate by transaction group
        merchants = queryset.values(
            'transaction_group_id',
            'transaction_group__name',
        ).annotate(
            total_amount=Sum('amount'),
            transaction_count=Count('id'),
        ).order_by('-total_amount')[:limit]

        result = []
        for merchant in merchants:
            result.append({
                'merchant_id': merchant['transaction_group_id'],
                'merchant_name': merchant['transaction_group__name'],
                'total_amount': float(merchant['total_amount'] or 0),
                'transaction_count': merchant['transaction_count'],
            })

        return result

    def get_item_level_analytics(
        self,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        category_id: Optional[int] = None,
    ) -> Dict:
        """
        Get item-level analytics from TransactionDetails.

        Args:
            start_date: Filter from date
            end_date: Filter to date
            category_id: Optional category filter

        Returns:
            Dict with item-level insights
        """
        from finance.models import TransactionDetail

        queryset = TransactionDetail.objects.filter(
            user=self.user,
            detail_type='line_item',
        )

        # Join with transaction for date filtering
        if start_date:
            queryset = queryset.filter(transaction__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(transaction__date__lte=end_date)
        if category_id:
            queryset = queryset.filter(category_id=category_id)

        # Top items by total spending
        top_items = queryset.values('name').annotate(
            total_amount=Sum('amount'),
            total_quantity=Sum('quantity'),
            purchase_count=Count('id'),
            avg_price=Avg('unit_price'),
        ).order_by('-total_amount')[:20]

        # Top items by quantity
        top_by_quantity = queryset.values('name').annotate(
            total_quantity=Sum('quantity'),
            total_amount=Sum('amount'),
        ).order_by('-total_quantity')[:20]

        # Top items by frequency
        top_by_frequency = queryset.values('name').annotate(
            purchase_count=Count('id'),
            total_amount=Sum('amount'),
        ).order_by('-purchase_count')[:20]

        # Category breakdown at item level
        category_breakdown = queryset.filter(
            category__isnull=False
        ).values(
            'category_id',
            'category__name',
        ).annotate(
            total_amount=Sum('amount'),
            item_count=Count('id'),
        ).order_by('-total_amount')

        return {
            'top_items_by_spending': [
                {
                    'name': item['name'],
                    'total_spent': float(item['total_amount'] or 0),
                    'total_quantity': float(item['total_quantity'] or 0),
                    'purchase_count': item['purchase_count'],
                    'avg_price': float(item['avg_price'] or 0),
                }
                for item in top_items
            ],
            'top_items_by_quantity': [
                {
                    'name': item['name'],
                    'total_quantity': float(item['total_quantity'] or 0),
                    'total_spent': float(item['total_amount'] or 0),
                }
                for item in top_by_quantity
            ],
            'top_items_by_frequency': [
                {
                    'name': item['name'],
                    'purchase_count': item['purchase_count'],
                    'total_spent': float(item['total_amount'] or 0),
                }
                for item in top_by_frequency
            ],
            'category_breakdown': [
                {
                    'category_id': cat['category_id'],
                    'category_name': cat['category__name'],
                    'total_amount': float(cat['total_amount'] or 0),
                    'item_count': cat['item_count'],
                }
                for cat in category_breakdown
            ],
        }

    def get_spending_patterns(
        self,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> Dict:
        """
        Analyze spending patterns and habits.

        Returns:
            Dict with pattern insights
        """
        from finance.models import Transaction
        from django.db.models.functions import ExtractWeekDay, ExtractHour

        queryset = Transaction.active_objects.filter(
            user=self.user,
            is_credit=False,  # Expenses only
            status='active',
        )

        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)

        # Day of week pattern
        by_weekday = queryset.annotate(
            weekday=ExtractWeekDay('date')
        ).values('weekday').annotate(
            total_amount=Sum('amount'),
            transaction_count=Count('id'),
        ).order_by('weekday')

        weekday_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        weekday_pattern = []
        for day_data in by_weekday:
            # ExtractWeekDay returns 1=Sunday, 2=Monday, etc.
            day_index = (day_data['weekday'] + 5) % 7  # Convert to 0=Monday
            weekday_pattern.append({
                'day': weekday_names[day_index],
                'amount': float(day_data['total_amount'] or 0),
                'count': day_data['transaction_count'],
            })

        # Average spending by day of month
        total_amount = queryset.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        total_count = queryset.count()
        avg_transaction_amount = total_amount / total_count if total_count > 0 else Decimal('0.00')

        # Payment source distribution
        by_account = queryset.values(
            'account_id',
            'account__name',
            'account__account_type',
        ).annotate(
            total_amount=Sum('amount'),
            transaction_count=Count('id'),
        ).order_by('-total_amount')

        return {
            'by_weekday': weekday_pattern,
            'overall': {
                'avg_transaction_amount': float(avg_transaction_amount),
                'total_transactions': total_count,
            },
            'by_account': [
                {
                    'account_id': acc['account_id'],
                    'account_name': acc['account__name'],
                    'account_type': acc['account__account_type'],
                    'amount': float(acc['total_amount'] or 0),
                    'count': acc['transaction_count'],
                }
                for acc in by_account
            ],
        }

    def compare_periods(
        self,
        current_start: date,
        current_end: date,
        previous_start: date,
        previous_end: date,
    ) -> Dict:
        """
        Compare two time periods (e.g., this month vs last month).

        Args:
            current_start: Current period start
            current_end: Current period end
            previous_start: Previous period start
            previous_end: Previous period end

        Returns:
            Dict with comparison metrics
        """
        current_summary = self.get_expense_summary(
            start_date=current_start,
            end_date=current_end,
        )

        previous_summary = self.get_expense_summary(
            start_date=previous_start,
            end_date=previous_end,
        )

        # Calculate changes
        income_change = current_summary['totals']['income'] - previous_summary['totals']['income']
        expense_change = current_summary['totals']['expenses'] - previous_summary['totals']['expenses']

        income_change_pct = (income_change / previous_summary['totals']['income'] * 100) if previous_summary['totals']['income'] > 0 else 0
        expense_change_pct = (expense_change / previous_summary['totals']['expenses'] * 100) if previous_summary['totals']['expenses'] > 0 else 0

        return {
            'current_period': {
                'start': str(current_start),
                'end': str(current_end),
                'summary': current_summary,
            },
            'previous_period': {
                'start': str(previous_start),
                'end': str(previous_end),
                'summary': previous_summary,
            },
            'changes': {
                'income': {
                    'absolute': float(income_change),
                    'percentage': round(income_change_pct, 2),
                },
                'expenses': {
                    'absolute': float(expense_change),
                    'percentage': round(expense_change_pct, 2),
                },
            },
        }

    def export_analytics_data(
        self,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        format: str = 'json',
    ) -> Dict:
        """
        Export comprehensive analytics data for external use or ML training.

        Args:
            start_date: Filter from date
            end_date: Filter to date
            format: Export format ('json', 'csv')

        Returns:
            Dict with all analytics data
        """
        data = {
            'summary': self.get_expense_summary(start_date, end_date),
            'category_breakdown': self.get_category_breakdown(start_date, end_date),
            'monthly_trend': self.get_time_series_data(
                start_date or date.today() - timedelta(days=365),
                end_date or date.today(),
                granularity='monthly'
            ),
            'spending_patterns': self.get_spending_patterns(start_date, end_date),
            'item_analytics': self.get_item_level_analytics(start_date, end_date),
            'top_merchants': self.get_top_merchants(start_date, end_date, limit=20),
        }

        return data

"""
Enhanced analytics API views for item-level expense breakdown and insights.
"""

import logging
from datetime import datetime, timedelta, date
from typing import Dict, List
from decimal import Decimal

from rest_framework import views, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count, Avg, Q, F, DecimalField
from django.db.models.functions import TruncDate, TruncMonth, TruncWeek

from finance.models import Transaction, TransactionDetail, Category, TransactionDocument
from finance.services.expense_analytics_service import ExpenseAnalyticsService
from users.throttling import AnalyticsRateThrottle
from users.validators import DateRangeValidator, NumericValidator, CategoryValidator, AccountValidator


logger = logging.getLogger(__name__)


class ItemLevelAnalyticsView(views.APIView):
    """
    Get item-level expense breakdown and analytics.

    Query Parameters:
    - start_date: Start date (YYYY-MM-DD)
    - end_date: End date (YYYY-MM-DD)
    - category: Filter by category ID or name
    - group_by: day|week|month (default: month)
    - min_amount: Minimum amount filter
    - max_amount: Maximum amount filter
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        # Parse filters
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        category = request.query_params.get('category')
        group_by = request.query_params.get('group_by', 'month')
        min_amount = request.query_params.get('min_amount')
        max_amount = request.query_params.get('max_amount')

        # Build query
        items = TransactionDetail.objects.filter(
            transaction__user=user
        ).select_related('transaction', 'category')

        # Apply filters
        if start_date:
            items = items.filter(transaction__date__gte=start_date)
        if end_date:
            items = items.filter(transaction__date__lte=end_date)
        if category:
            if category.isdigit():
                items = items.filter(category_id=category)
            else:
                items = items.filter(category__name__icontains=category)
        if min_amount:
            items = items.filter(amount__gte=Decimal(min_amount))
        if max_amount:
            items = items.filter(amount__lte=Decimal(max_amount))

        # Calculate aggregations
        summary = items.aggregate(
            total_items=Count('id'),
            total_amount=Sum('amount'),
            avg_amount=Avg('amount'),
        )

        # Category breakdown
        category_breakdown = items.values(
            'category__name', 'category_id'
        ).annotate(
            count=Count('id'),
            total=Sum('amount'),
            avg=Avg('amount')
        ).order_by('-total')[:20]

        # Time-based breakdown
        if group_by == 'day':
            time_breakdown = items.annotate(
                period=TruncDate('transaction__date')
            ).values('period').annotate(
                count=Count('id'),
                total=Sum('amount')
            ).order_by('period')
        elif group_by == 'week':
            time_breakdown = items.annotate(
                period=TruncWeek('transaction__date')
            ).values('period').annotate(
                count=Count('id'),
                total=Sum('amount')
            ).order_by('period')
        else:  # month
            time_breakdown = items.annotate(
                period=TruncMonth('transaction__date')
            ).values('period').annotate(
                count=Count('id'),
                total=Sum('amount')
            ).order_by('period')

        # Top items by amount
        top_items = items.values(
            'name', 'category__name'
        ).annotate(
            count=Count('id'),
            total=Sum('amount'),
            avg=Avg('amount')
        ).order_by('-total')[:20]

        return Response({
            'summary': summary,
            'category_breakdown': list(category_breakdown),
            'time_breakdown': list(time_breakdown),
            'top_items': list(top_items),
            'filters_applied': {
                'start_date': start_date,
                'end_date': end_date,
                'category': category,
                'group_by': group_by,
            }
        })


class CategoryExpenseDetailView(views.APIView):
    """
    Get detailed expense breakdown for a specific category with items.

    Query Parameters:
    - category_id: Category ID (required)
    - start_date: Start date
    - end_date: End date
    - include_items: Include individual items (default: true)
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        category_id = request.query_params.get('category_id')

        if not category_id:
            return Response(
                {'error': 'category_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        include_items = request.query_params.get('include_items', 'true').lower() == 'true'

        try:
            category = Category.objects.get(id=category_id, user=user)
        except Category.DoesNotExist:
            return Response(
                {'error': 'Category not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get items in this category
        items = TransactionDetail.objects.filter(
            transaction__user=user,
            category=category
        ).select_related('transaction')

        if start_date:
            items = items.filter(transaction__date__gte=start_date)
        if end_date:
            items = items.filter(transaction__date__lte=end_date)

        # Summary
        summary = items.aggregate(
            total_items=Count('id'),
            total_amount=Sum('amount'),
            avg_amount=Avg('amount'),
        )

        # Monthly trend
        monthly_trend = items.annotate(
            month=TruncMonth('transaction__date')
        ).values('month').annotate(
            count=Count('id'),
            total=Sum('amount')
        ).order_by('month')

        response_data = {
            'category': {
                'id': category.id,
                'name': category.name,
                'icon': category.icon,
                'color': category.color,
            },
            'summary': summary,
            'monthly_trend': list(monthly_trend),
        }

        if include_items:
            item_list = items.values(
                'id', 'name', 'amount', 'quantity', 'unit_price',
                'transaction__id', 'transaction__description',
                'transaction__date'
            ).order_by('-transaction__date')[:100]
            response_data['items'] = list(item_list)

        return Response(response_data)


class ExpenseComparisonView(views.APIView):
    """
    Compare expenses across different time periods.

    Query Parameters:
    - period: month|quarter|year (default: month)
    - compare_count: Number of periods to compare (default: 3)
    - end_date: End date for comparison (default: today)
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        period = request.query_params.get('period', 'month')
        compare_count = int(request.query_params.get('compare_count', 3))
        end_date_str = request.query_params.get('end_date')

        if end_date_str:
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        else:
            end_date = datetime.now().date()

        # Calculate period ranges
        periods = []
        for i in range(compare_count):
            if period == 'month':
                delta = timedelta(days=30 * i)
                period_end = end_date - delta
                period_start = period_end - timedelta(days=30)
            elif period == 'quarter':
                delta = timedelta(days=90 * i)
                period_end = end_date - delta
                period_start = period_end - timedelta(days=90)
            else:  # year
                delta = timedelta(days=365 * i)
                period_end = end_date - delta
                period_start = period_end - timedelta(days=365)

            periods.append({
                'start': period_start,
                'end': period_end,
                'label': f"{period_start.strftime('%b %Y')} - {period_end.strftime('%b %Y')}"
            })

        # Get data for each period
        comparison_data = []
        for p in periods:
            # Transaction-level data
            transactions = Transaction.objects.filter(
                user=user,
                date__gte=p['start'],
                date__lte=p['end'],
                is_credit=False
            ).aggregate(
                total_amount=Sum('amount'),
                count=Count('id'),
                avg_amount=Avg('amount')
            )

            # Item-level data
            items = TransactionDetail.objects.filter(
                transaction__user=user,
                transaction__date__gte=p['start'],
                transaction__date__lte=p['end']
            ).aggregate(
                total_items=Count('id'),
                total_amount=Sum('amount')
            )

            # Category breakdown
            categories = TransactionDetail.objects.filter(
                transaction__user=user,
                transaction__date__gte=p['start'],
                transaction__date__lte=p['end']
            ).values('category__name').annotate(
                total=Sum('amount')
            ).order_by('-total')[:5]

            comparison_data.append({
                'period': p['label'],
                'start_date': p['start'],
                'end_date': p['end'],
                'transactions': transactions,
                'items': items,
                'top_categories': list(categories)
            })

        return Response({
            'period_type': period,
            'periods_compared': compare_count,
            'comparison': comparison_data
        })


class DocumentInsightsView(views.APIView):
    """
    Get insights from uploaded documents.

    Query Parameters:
    - start_date: Start date
    - end_date: End date
    - document_type: Filter by document type
    - verified_only: Only include verified documents
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        document_type = request.query_params.get('document_type')
        verified_only = request.query_params.get('verified_only', 'false').lower() == 'true'

        # Build query
        documents = TransactionDocument.objects.filter(
            user=user,
            processing_status='completed'
        )

        if start_date:
            documents = documents.filter(created_at__gte=start_date)
        if end_date:
            documents = documents.filter(created_at__lte=end_date)
        if document_type:
            documents = documents.filter(document_type=document_type)
        if verified_only:
            documents = documents.filter(user_verified=True)

        # Summary statistics
        summary = documents.aggregate(
            total_documents=Count('id'),
            avg_confidence=Avg('extraction_confidence'),
            verified_count=Count('id', filter=Q(user_verified=True)),
        )

        # Document type breakdown
        type_breakdown = documents.values('document_type').annotate(
            count=Count('id'),
            avg_confidence=Avg('extraction_confidence')
        ).order_by('-count')

        # Processing status
        status_breakdown = TransactionDocument.objects.filter(
            user=user
        ).values('processing_status').annotate(
            count=Count('id')
        )

        # AI model usage
        model_usage = documents.exclude(
            ai_model_used__isnull=True
        ).values('ai_model_used').annotate(
            count=Count('id'),
            avg_confidence=Avg('extraction_confidence')
        ).order_by('-count')

        # Confidence distribution
        confidence_ranges = {
            'high': documents.filter(extraction_confidence__gte=0.8).count(),
            'medium': documents.filter(
                extraction_confidence__gte=0.5,
                extraction_confidence__lt=0.8
            ).count(),
            'low': documents.filter(extraction_confidence__lt=0.5).count(),
        }

        return Response({
            'summary': summary,
            'type_breakdown': list(type_breakdown),
            'status_breakdown': list(status_breakdown),
            'model_usage': list(model_usage),
            'confidence_distribution': confidence_ranges,
        })


class ComprehensiveAnalyticsViewSet(viewsets.ViewSet):
    """
    Comprehensive analytics ViewSet using ExpenseAnalyticsService.

    Endpoints:
    - /api/analytics/summary/ - High-level summary
    - /api/analytics/category-breakdown/ - Category analysis
    - /api/analytics/time-series/ - Trend data
    - /api/analytics/merchants/ - Top merchants
    - /api/analytics/items-detailed/ - Item-level analytics
    - /api/analytics/patterns/ - Spending patterns
    - /api/analytics/compare/ - Period comparison
    - /api/analytics/export/ - Export data
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [AnalyticsRateThrottle]

    def _get_date_filters(self, request):
        """Extract and validate date filters from request."""
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')

        # Parse dates
        start_date = DateRangeValidator.parse_date(start_date_str)
        end_date = DateRangeValidator.parse_date(end_date_str)

        # Default to current month if not specified
        if not start_date and not end_date:
            today = date.today()
            start_date = date(today.year, today.month, 1)
            end_date = today

        # Validate date range
        start_date, end_date = DateRangeValidator.validate_date_range(
            start_date, end_date, max_days=365 * 2  # 2 years max
        )

        return start_date, end_date

    @action(detail=False, methods=['get'], url_path='summary')
    def get_summary(self, request):
        """
        GET /api/analytics/summary/

        Get high-level expense summary with totals and breakdowns.
        """
        start_date, end_date = self._get_date_filters(request)

        # Parse and validate optional filters
        categories = NumericValidator.validate_integer_list(
            request.query_params.get('categories'), 'categories'
        )
        if categories:
            categories = CategoryValidator.validate_category_ids(categories, request.user)

        accounts = NumericValidator.validate_integer_list(
            request.query_params.get('accounts'), 'accounts'
        )
        if accounts:
            accounts = AccountValidator.validate_account_ids(accounts, request.user)

        include_pending = request.query_params.get('include_pending', 'false').lower() == 'true'

        # Get analytics
        service = ExpenseAnalyticsService(user=request.user)
        summary = service.get_expense_summary(
            start_date=start_date,
            end_date=end_date,
            categories=categories,
            accounts=accounts,
            include_pending=include_pending,
        )

        return Response(summary)

    @action(detail=False, methods=['get'], url_path='category-breakdown')
    def category_breakdown(self, request):
        """
        GET /api/analytics/category-breakdown/

        Get expense/income breakdown by category.
        """
        start_date, end_date = self._get_date_filters(request)
        transaction_type = request.query_params.get('type', 'expense')

        service = ExpenseAnalyticsService(user=request.user)
        breakdown = service.get_category_breakdown(
            start_date=start_date,
            end_date=end_date,
            transaction_type=transaction_type,
        )

        return Response(breakdown)

    @action(detail=False, methods=['get'], url_path='time-series')
    def time_series(self, request):
        """
        GET /api/analytics/time-series/

        Get time series data for trend analysis.
        """
        start_date, end_date = self._get_date_filters(request)

        if not start_date or not end_date:
            return Response(
                {'error': 'start_date and end_date are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        granularity = request.query_params.get('granularity', 'monthly')
        transaction_type = request.query_params.get('type', 'expense')

        categories = None
        if request.query_params.get('categories'):
            categories = [int(c) for c in request.query_params.get('categories').split(',')]

        service = ExpenseAnalyticsService(user=request.user)
        time_series = service.get_time_series_data(
            start_date=start_date,
            end_date=end_date,
            granularity=granularity,
            transaction_type=transaction_type,
            categories=categories,
        )

        return Response(time_series)

    @action(detail=False, methods=['get'], url_path='merchants')
    def top_merchants(self, request):
        """
        GET /api/analytics/merchants/

        Get top merchants by transaction volume.
        """
        start_date, end_date = self._get_date_filters(request)
        limit = int(request.query_params.get('limit', 10))

        service = ExpenseAnalyticsService(user=request.user)
        merchants = service.get_top_merchants(
            start_date=start_date,
            end_date=end_date,
            limit=limit,
        )

        return Response(merchants)

    @action(detail=False, methods=['get'], url_path='items-detailed')
    def item_analytics(self, request):
        """
        GET /api/analytics/items-detailed/

        Get item-level analytics from TransactionDetails.
        """
        start_date, end_date = self._get_date_filters(request)
        category_id = request.query_params.get('category_id')

        if category_id:
            category_id = int(category_id)

        service = ExpenseAnalyticsService(user=request.user)
        item_analytics = service.get_item_level_analytics(
            start_date=start_date,
            end_date=end_date,
            category_id=category_id,
        )

        return Response(item_analytics)

    @action(detail=False, methods=['get'], url_path='patterns')
    def spending_patterns(self, request):
        """
        GET /api/analytics/patterns/

        Analyze spending patterns and habits.
        """
        start_date, end_date = self._get_date_filters(request)

        service = ExpenseAnalyticsService(user=request.user)
        patterns = service.get_spending_patterns(
            start_date=start_date,
            end_date=end_date,
        )

        return Response(patterns)

    @action(detail=False, methods=['get'], url_path='compare')
    def compare_periods(self, request):
        """
        GET /api/analytics/compare/

        Compare two time periods.
        """
        period = request.query_params.get('period')

        if period:
            # Use period shortcuts
            today = date.today()

            if period == 'this_month':
                current_start = date(today.year, today.month, 1)
                current_end = today

                # Previous month
                first_of_month = current_start
                previous_end = first_of_month - timedelta(days=1)
                previous_start = date(previous_end.year, previous_end.month, 1)

            elif period == 'last_month':
                # Last month
                first_of_month = date(today.year, today.month, 1)
                current_end = first_of_month - timedelta(days=1)
                current_start = date(current_end.year, current_end.month, 1)

                # Month before last
                previous_end = current_start - timedelta(days=1)
                previous_start = date(previous_end.year, previous_end.month, 1)

            elif period == 'this_year':
                current_start = date(today.year, 1, 1)
                current_end = today
                previous_start = date(today.year - 1, 1, 1)
                previous_end = date(today.year - 1, 12, 31)

            else:
                return Response(
                    {'error': 'Invalid period. Use: this_month, last_month, this_year'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            # Parse manual dates
            current_start = self._parse_date(request.query_params.get('current_start'))
            current_end = self._parse_date(request.query_params.get('current_end'))
            previous_start = self._parse_date(request.query_params.get('previous_start'))
            previous_end = self._parse_date(request.query_params.get('previous_end'))

            if not all([current_start, current_end, previous_start, previous_end]):
                return Response(
                    {'error': 'All date parameters are required or use period shortcut'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        service = ExpenseAnalyticsService(user=request.user)
        comparison = service.compare_periods(
            current_start=current_start,
            current_end=current_end,
            previous_start=previous_start,
            previous_end=previous_end,
        )

        return Response(comparison)

    @action(detail=False, methods=['get'], url_path='export')
    def export_data(self, request):
        """
        GET /api/analytics/export/

        Export comprehensive analytics data.
        """
        start_date, end_date = self._get_date_filters(request)
        format = request.query_params.get('format', 'json')

        service = ExpenseAnalyticsService(user=request.user)
        data = service.export_analytics_data(
            start_date=start_date,
            end_date=end_date,
            format=format,
        )

        return Response(data)

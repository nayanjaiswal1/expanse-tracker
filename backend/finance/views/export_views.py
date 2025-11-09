"""
Views for exporting financial data
"""
from rest_framework import views, permissions, status
from rest_framework.response import Response
from django.db.models import Q
from datetime import datetime

from ..models import (
    Transaction,
    Account,
    Goal,
    Budget,
    GroupExpense,
    Investment
)
from ..services.export_service import ExportService
from ..services.report_builder import FinancialReportBuilder
from services.ai_report_generation_service import report_generation_service


class ExportDataView(views.APIView):
    """
    Unified endpoint for exporting financial data
    Supports multiple data types and formats
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """
        Get export options (available data types, formats, fields)
        GET /api/export/
        """
        data_types = ExportService.get_available_data_types()

        return Response({
            'data_types': data_types,
            'formats': [
                {'value': 'csv', 'label': 'CSV'},
                {'value': 'excel', 'label': 'Excel (XLSX)'},
                {'value': 'json', 'label': 'JSON'},
                {'value': 'xml', 'label': 'XML'},
            ]
        })

    def post(self, request):
        """
        Export data based on parameters
        POST /api/export/
        Body: {
            "data_type": "transactions",
            "format": "csv",
            "fields": ["id", "date", "description", "amount"],  // optional, null = all
            "filters": {
                "date_from": "2024-01-01",  // optional
                "date_to": "2024-12-31",    // optional
                "accounts": [1, 2, 3],       // optional
                "categories": [1, 2],        // optional
                "transaction_type": "expense",  // optional
                "status": "active"           // optional
            }
        }
        """
        data_type = request.data.get('data_type')
        format_type = request.data.get('format', 'csv')
        selected_fields = request.data.get('fields')  # None = all fields
        filters = request.data.get('filters', {})

        # Validate data type
        if not data_type or data_type not in ExportService.EXPORT_SCHEMAS:
            return Response({
                'error': 'Invalid data_type',
                'available_types': list(ExportService.EXPORT_SCHEMAS.keys())
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validate format
        if format_type not in ['csv', 'excel', 'xlsx', 'json', 'xml']:
            return Response({
                'error': 'Invalid format',
                'available_formats': ['csv', 'excel', 'json', 'xml']
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Get queryset based on data type
            queryset = self._get_queryset(data_type, filters, request.user)

            # Export data
            export_service = ExportService(request.user)
            response = export_service.export_data(
                data_type=data_type,
                format_type=format_type,
                queryset=queryset,
                selected_fields=selected_fields
            )

            return response

        except Exception as e:
            return Response({
                'error': 'Export failed',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _get_queryset(self, data_type: str, filters: dict, user):
        """Get filtered queryset based on data type and filters"""

        if data_type == 'transactions':
            queryset = Transaction.objects.filter(user=user).select_related(
                'category', 'account'
            ).prefetch_related('tag_links__tag')

            # Apply filters
            if filters.get('date_from'):
                queryset = queryset.filter(date__gte=filters['date_from'])
            if filters.get('date_to'):
                queryset = queryset.filter(date__lte=filters['date_to'])
            if filters.get('accounts'):
                queryset = queryset.filter(account_id__in=filters['accounts'])
            if filters.get('categories'):
                queryset = queryset.filter(category_id__in=filters['categories'])
            if filters.get('transaction_type'):
                queryset = queryset.filter(transaction_type=filters['transaction_type'])
            if filters.get('min_amount'):
                queryset = queryset.filter(amount__gte=filters['min_amount'])
            if filters.get('max_amount'):
                queryset = queryset.filter(amount__lte=filters['max_amount'])

        elif data_type == 'accounts':
            queryset = Account.objects.filter(user=user)

            if filters.get('account_type'):
                queryset = queryset.filter(account_type=filters['account_type'])
            if filters.get('is_active') is not None:
                queryset = queryset.filter(is_active=filters['is_active'])
            if filters.get('currency'):
                queryset = queryset.filter(currency=filters['currency'])

        elif data_type == 'goals':
            queryset = Goal.objects.filter(user=user)

            if filters.get('status'):
                queryset = queryset.filter(status=filters['status'])
            if filters.get('goal_type'):
                queryset = queryset.filter(goal_type=filters['goal_type'])
            if filters.get('date_from'):
                queryset = queryset.filter(target_date__gte=filters['date_from'])
            if filters.get('date_to'):
                queryset = queryset.filter(target_date__lte=filters['date_to'])

        elif data_type == 'budgets':
            queryset = Budget.objects.filter(user=user)

            if filters.get('is_active') is not None:
                queryset = queryset.filter(is_active=filters['is_active'])
            if filters.get('budget_type'):
                queryset = queryset.filter(budget_type=filters['budget_type'])
            if filters.get('period'):
                queryset = queryset.filter(period=filters['period'])

        elif data_type == 'group_expenses':
            queryset = GroupExpense.objects.filter(
                Q(group__owner=user) | Q(created_by=user)
            ).select_related('group', 'created_by', 'paid_by')

            if filters.get('status'):
                queryset = queryset.filter(status=filters['status'])
            if filters.get('date_from'):
                queryset = queryset.filter(date__gte=filters['date_from'])
            if filters.get('date_to'):
                queryset = queryset.filter(date__lte=filters['date_to'])
            if filters.get('groups'):
                queryset = queryset.filter(group_id__in=filters['groups'])

        elif data_type == 'investments':
            queryset = Investment.objects.filter(user=user)

            if filters.get('investment_type'):
                queryset = queryset.filter(investment_type=filters['investment_type'])
            if filters.get('status'):
                queryset = queryset.filter(status=filters['status'])

        else:
            queryset = Transaction.objects.none()

        # Order by most recent
        if hasattr(queryset.model, 'created_at'):
            queryset = queryset.order_by('-created_at')
        elif hasattr(queryset.model, 'date'):
            queryset = queryset.order_by('-date')

        return queryset


class FinancialReportExportView(views.APIView):
    """Generate downloadable financial reports (weekly, monthly, yearly)."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        frequency = request.data.get("frequency", ["weekly", "monthly", "yearly"])
        if isinstance(frequency, str):
            frequency = [frequency]

        sections = {item.lower() for item in frequency}
        invalid = sections - {"weekly", "monthly", "yearly"}
        if invalid:
            return Response(
                {"error": f"Unsupported frequency values: {', '.join(invalid)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        format_type = request.data.get("format", "pdf").lower()

        builder = FinancialReportBuilder(request.user)
        summary_data = builder.build(sections)

        if format_type in {"pdf", "html"}:
            return report_generation_service.generate_financial_summary_report(
                request.user,
                summary_data=summary_data,
                format=format_type,
            )

        if format_type == "json":
            return Response(
                {"summary_data": summary_data},
                status=status.HTTP_200_OK,
            )

        return Response(
            {"error": "Unsupported format. Choose pdf, html, or json."},
            status=status.HTTP_400_BAD_REQUEST,
        )

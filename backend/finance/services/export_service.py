"""
Unified export service for all financial data
Supports CSV, Excel (XLSX), JSON, and XML formats
"""
import io
import csv
import json
import logging
from datetime import datetime
from decimal import Decimal
from typing import List, Dict, Any, Optional
from django.http import HttpResponse
from django.utils import timezone
import xlsxwriter
import xml.etree.ElementTree as ET
import xml.dom.minidom as minidom


logger = logging.getLogger(__name__)


class ExportService:
    """
    Service for exporting financial data in various formats
    Supports: Transactions, Accounts, Goals, Budgets, Group Expenses, Investments
    """

    # Define exportable data types and their fields
    EXPORT_SCHEMAS = {
        'transactions': {
            'fields': [
                'id', 'date', 'description', 'amount', 'transaction_type',
                'category', 'account', 'merchant', 'notes', 'tags',
                'created_at', 'updated_at'
            ],
            'display_name': 'Transactions'
        },
        'accounts': {
            'fields': [
                'id', 'name', 'account_type', 'currency', 'balance',
                'is_active', 'institution', 'account_number_last_4',
                'created_at', 'updated_at'
            ],
            'display_name': 'Accounts'
        },
        'goals': {
            'fields': [
                'id', 'name', 'goal_type', 'target_amount', 'current_amount',
                'target_date', 'start_date', 'status', 'currency',
                'progress_percentage', 'created_at', 'updated_at'
            ],
            'display_name': 'Goals'
        },
        'budgets': {
            'fields': [
                'id', 'name', 'budget_type', 'amount', 'period',
                'start_date', 'end_date', 'category', 'is_active',
                'spent_amount', 'remaining_amount', 'created_at', 'updated_at'
            ],
            'display_name': 'Budgets'
        },
        'group_expenses': {
            'fields': [
                'id', 'title', 'description', 'total_amount', 'currency',
                'split_method', 'date', 'status', 'group_name',
                'created_by', 'paid_by', 'created_at', 'updated_at'
            ],
            'display_name': 'Group Expenses'
        },
        'investments': {
            'fields': [
                'id', 'name', 'investment_type', 'amount', 'quantity',
                'purchase_price', 'current_price', 'purchase_date',
                'currency', 'status', 'created_at', 'updated_at'
            ],
            'display_name': 'Investments'
        },
    }

    def __init__(self, user):
        """Initialize export service for a user"""
        self.user = user

    def export_data(
        self,
        data_type: str,
        format_type: str,
        queryset: Any,
        selected_fields: Optional[List[str]] = None,
        date_range: Optional[Dict[str, str]] = None
    ) -> HttpResponse:
        """
        Export data in specified format

        Args:
            data_type: Type of data (transactions, accounts, etc.)
            format_type: Export format (csv, excel, json, xml)
            queryset: Django queryset of data to export
            selected_fields: List of fields to include (None = all)
            date_range: Optional date range filter

        Returns:
            HttpResponse with exported data
        """
        if data_type not in self.EXPORT_SCHEMAS:
            raise ValueError(f"Unsupported data type: {data_type}")

        # Get schema and fields
        schema = self.EXPORT_SCHEMAS[data_type]
        fields = selected_fields if selected_fields else schema['fields']

        # Convert queryset to list of dicts
        data = self._queryset_to_dicts(queryset, fields, data_type)

        # Export based on format
        if format_type == 'csv':
            return self._export_csv(data, fields, data_type)
        elif format_type == 'excel' or format_type == 'xlsx':
            return self._export_excel(data, fields, data_type)
        elif format_type == 'json':
            return self._export_json(data, fields, data_type)
        elif format_type == 'xml':
            return self._export_xml(data, fields, data_type)
        else:
            raise ValueError(f"Unsupported format: {format_type}")

    def _queryset_to_dicts(
        self,
        queryset: Any,
        fields: List[str],
        data_type: str
    ) -> List[Dict[str, Any]]:
        """Convert Django queryset to list of dictionaries"""
        data = []

        for obj in queryset:
            row = {}
            for field in fields:
                value = self._get_field_value(obj, field, data_type)
                row[field] = value
            data.append(row)

        return data

    def _get_field_value(self, obj: Any, field: str, data_type: str) -> Any:
        """Get field value from object with special handling for different types"""
        try:
            # Handle special fields based on data type
            if data_type == 'transactions':
                if field == 'category':
                    return obj.category.name if obj.category else ''
                elif field == 'account':
                    return obj.account.name if obj.account else ''
                elif field == 'merchant':
                    return obj.merchant_name or ''
                elif field == 'tags':
                    return ', '.join(getattr(obj, 'tag_names', []))

            elif data_type == 'budgets':
                if field == 'category':
                    return obj.category.name if hasattr(obj, 'category') and obj.category else ''
                elif field == 'spent_amount':
                    return getattr(obj, 'spent_amount', 0)
                elif field == 'remaining_amount':
                    return getattr(obj, 'remaining_amount', 0)

            elif data_type == 'group_expenses':
                if field == 'group_name':
                    return obj.group.name if obj.group else ''
                elif field == 'created_by':
                    return obj.created_by.username if obj.created_by else ''
                elif field == 'paid_by':
                    return obj.paid_by.username if hasattr(obj, 'paid_by') and obj.paid_by else ''

            elif data_type == 'goals':
                if field == 'progress_percentage':
                    return obj.progress_percentage if hasattr(obj, 'progress_percentage') else 0

            # Standard field access
            value = getattr(obj, field, None)

            # Convert special types
            if isinstance(value, Decimal):
                return float(value)
            elif isinstance(value, (datetime, timezone.datetime)):
                return value.isoformat()
            elif value is None:
                return ''

            return value

        except Exception as e:
            logger.warning(f"Error getting field {field} from {data_type}: {str(e)}")
            return ''

    def _export_csv(
        self,
        data: List[Dict],
        fields: List[str],
        data_type: str
    ) -> HttpResponse:
        """Export data as CSV"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"{data_type}_export_{timestamp}.csv"

        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'

        # Add BOM for Excel compatibility with UTF-8
        response.write('\ufeff')

        writer = csv.DictWriter(response, fieldnames=fields)
        writer.writeheader()

        for row in data:
            # Ensure all values are strings for CSV
            csv_row = {k: str(v) if v is not None else '' for k, v in row.items()}
            writer.writerow(csv_row)

        return response

    def _export_excel(
        self,
        data: List[Dict],
        fields: List[str],
        data_type: str
    ) -> HttpResponse:
        """Export data as Excel (XLSX)"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"{data_type}_export_{timestamp}.xlsx"

        output = io.BytesIO()
        workbook = xlsxwriter.Workbook(output, {'in_memory': True})
        worksheet = workbook.add_worksheet(self.EXPORT_SCHEMAS[data_type]['display_name'])

        # Define formats
        header_format = workbook.add_format({
            'bold': True,
            'bg_color': '#4F46E5',
            'font_color': 'white',
            'border': 1
        })

        date_format = workbook.add_format({'num_format': 'yyyy-mm-dd'})
        datetime_format = workbook.add_format({'num_format': 'yyyy-mm-dd hh:mm:ss'})
        currency_format = workbook.add_format({'num_format': '$#,##0.00'})
        number_format = workbook.add_format({'num_format': '#,##0.00'})

        # Write header
        for col, field in enumerate(fields):
            worksheet.write(0, col, field.replace('_', ' ').title(), header_format)

        # Write data
        for row_idx, row in enumerate(data, start=1):
            for col_idx, field in enumerate(fields):
                value = row.get(field, '')

                # Apply appropriate format
                if field in ['date', 'start_date', 'end_date', 'target_date', 'purchase_date']:
                    worksheet.write(row_idx, col_idx, value, date_format)
                elif field in ['created_at', 'updated_at']:
                    worksheet.write(row_idx, col_idx, value, datetime_format)
                elif field in ['amount', 'balance', 'target_amount', 'current_amount', 'total_amount']:
                    worksheet.write(row_idx, col_idx, value, currency_format)
                elif isinstance(value, (int, float)):
                    worksheet.write(row_idx, col_idx, value, number_format)
                else:
                    worksheet.write(row_idx, col_idx, value)

        # Auto-fit columns
        for col_idx, field in enumerate(fields):
            max_length = max(
                len(str(field)),
                max([len(str(row.get(field, ''))) for row in data] or [0])
            )
            worksheet.set_column(col_idx, col_idx, min(max_length + 2, 50))

        workbook.close()
        output.seek(0)

        response = HttpResponse(
            output.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="{filename}"'

        return response

    def _export_json(
        self,
        data: List[Dict],
        fields: List[str],
        data_type: str
    ) -> HttpResponse:
        """Export data as JSON"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"{data_type}_export_{timestamp}.json"

        export_data = {
            'exported_at': timezone.now().isoformat(),
            'data_type': data_type,
            'total_records': len(data),
            'fields': fields,
            'data': data
        }

        response = HttpResponse(
            json.dumps(export_data, indent=2, default=str),
            content_type='application/json'
        )
        response['Content-Disposition'] = f'attachment; filename="{filename}"'

        return response

    def _export_xml(
        self,
        data: List[Dict],
        fields: List[str],
        data_type: str
    ) -> HttpResponse:
        """Export data as XML"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"{data_type}_export_{timestamp}.xml"

        # Create root element
        root = ET.Element('export')
        metadata = ET.SubElement(root, 'metadata')
        ET.SubElement(metadata, 'exported_at').text = timezone.now().isoformat()
        ET.SubElement(metadata, 'data_type').text = data_type
        ET.SubElement(metadata, 'total_records').text = str(len(data))

        # Add data
        data_element = ET.SubElement(root, 'data')

        for row in data:
            item = ET.SubElement(data_element, data_type[:-1] if data_type.endswith('s') else data_type)
            for field in fields:
                value = row.get(field, '')
                ET.SubElement(item, field).text = str(value) if value else ''

        # Pretty print XML
        xml_str = minidom.parseString(ET.tostring(root)).toprettyxml(indent="  ")

        response = HttpResponse(xml_str, content_type='application/xml')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'

        return response

    @classmethod
    def get_available_fields(cls, data_type: str) -> List[str]:
        """Get available fields for a data type"""
        if data_type not in cls.EXPORT_SCHEMAS:
            return []
        return cls.EXPORT_SCHEMAS[data_type]['fields']

    @classmethod
    def get_available_data_types(cls) -> List[Dict[str, str]]:
        """Get list of available data types for export"""
        return [
            {
                'value': key,
                'label': schema['display_name'],
                'fields': schema['fields']
            }
            for key, schema in cls.EXPORT_SCHEMAS.items()
        ]

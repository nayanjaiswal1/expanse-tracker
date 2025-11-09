"""
Transaction-related views for the finance app.
"""

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.filters import OrderingFilter
from django.db.models import Sum, Q, Count
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.http import HttpResponse
from django_filters.rest_framework import DjangoFilterBackend
import csv
import json
import io
import xlsxwriter
from datetime import datetime, timedelta

from ..models import Transaction, Account, Category
from ..serializers import TransactionSerializer
from ..filters import TransactionFilter
from ..services.quick_add_service import QuickAddService
from users.pagination import CustomPageNumberPagination

User = get_user_model()


class TransactionViewSet(viewsets.ModelViewSet):
    """ViewSet for transaction management with backend pagination, search, and filtering"""

    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = TransactionFilter
    pagination_class = CustomPageNumberPagination
    ordering_fields = ["date", "amount", "description", "status", "created_at"]
    ordering = ["-date", "-created_at"]

    def get_queryset(self):
        queryset = Transaction.objects.filter(user=self.request.user).select_related(
            'account', 'transaction_group'
        ).prefetch_related('tag_links__tag')

        # Support limit parameter for backward compatibility (used by some specific endpoints)
        # But pagination will be handled by DRF's pagination class for list views
        limit = self.request.query_params.get('limit')
        if limit and limit.isdigit() and self.action != 'list':
            queryset = queryset[:int(limit)]

        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["post"], url_path='quick-add')
    def quick_add(self, request):
        """
        Quick-add endpoint for easy transaction creation from UI.

        Simplifies transaction creation by:
        - Auto-selecting default account if not provided
        - Using today's date if not provided
        - Finding category by name (not just ID)
        - Setting is_credit based on type ("expense" or "income")

        Request:
        {
            "type": "expense",  // or "income"
            "amount": 50.00,
            "description": "Coffee",
            "category": "Food",  // Optional - name or ID
            "account_id": 1,  // Optional - uses default if not provided
            "date": "2025-11-05",  // Optional - uses today if not provided
            "notes": "Quick coffee break"  // Optional
        }
        """
        from datetime import date

        # Extract data
        transaction_type = request.data.get('type', 'expense').lower()
        amount = request.data.get('amount')
        description = request.data.get('description')
        category_input = request.data.get('category')
        account_id = request.data.get('account_id')
        transaction_date = request.data.get('date')
        notes = request.data.get('notes', '')

        # Validate required fields
        if not amount:
            return Response(
                {'error': 'amount is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not description:
            return Response(
                {'error': 'description is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if transaction_type not in ['expense', 'income']:
            return Response(
                {'error': 'type must be "expense" or "income"'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Auto-select account if not provided
        if not account_id:
            default_account = Account.objects.filter(
                user=request.user,
                is_active=True
            ).order_by('-is_default', 'created_at').first()

            if not default_account:
                return Response(
                    {'error': 'No active account found. Please create an account first.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            account_id = default_account.id

        # Auto-set date if not provided
        if not transaction_date:
            transaction_date = date.today().isoformat()

        # Find category by name or ID if provided
        category_id = None
        if category_input:
            if isinstance(category_input, int) or (isinstance(category_input, str) and category_input.isdigit()):
                # Category ID provided
                category_id = int(category_input)
            else:
                # Category name provided - find it
                category = Category.objects.filter(
                    user=request.user,
                    name__iexact=category_input,
                    is_active=True
                ).first()

                if category:
                    category_id = category.id
                else:
                    # Create category if it doesn't exist
                    category = Category.objects.create(
                        user=request.user,
                        name=category_input.title(),
                        category_type='expense' if transaction_type == 'expense' else 'income',
                        color='#0066CC',
                        icon='💰'
                    )
                    category_id = category.id

        # Build transaction data
        transaction_data = {
            'account_id': account_id,
            'amount': amount,
            'description': description,
            'date': transaction_date,
            'is_credit': transaction_type == 'income',
            'category_id': category_id,
            'notes': notes,
            'source': 'manual',
            'status': 'active',
            'transaction_subtype': transaction_type
        }

        # Create transaction using serializer
        serializer = self.get_serializer(data=transaction_data)
        if serializer.is_valid():
            transaction = serializer.save(user=request.user)
            return Response(
                {
                    'success': True,
                    'message': f'{transaction_type.title()} added successfully',
                    'transaction': self.get_serializer(transaction).data
                },
                status=status.HTTP_201_CREATED
            )
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["get"])
    def summary(self, request):
        """Get comprehensive transactions summary"""
        transactions = self.get_queryset()

        # Filter by date range if provided
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        if start_date:
            transactions = transactions.filter(date__gte=start_date)
        if end_date:
            transactions = transactions.filter(date__lte=end_date)

        income = transactions.filter(is_credit=True).aggregate(
            total=Sum("amount")
        )["total"] or Decimal("0")
        expenses = transactions.filter(is_credit=False).aggregate(
            total=Sum("amount")
        )["total"] or Decimal("0")

        # Category breakdown (top 5)
        category_totals = transactions.filter(
            is_credit=False,
            category_id__isnull=False,
        ).values("category_id").annotate(
            total=Sum("amount"),
            count=Count("id")
        ).order_by("-total")[:5]

        category_ids = [
            entry["category_id"]
            for entry in category_totals
            if entry["category_id"]
        ]
        categories = Category.objects.filter(user=request.user, id__in=category_ids)
        category_name_map = {category.id: category.name for category in categories}

        top_categories = [
            {
                "category": category_name_map.get(entry["category_id"], "Uncategorized"),
                "total": float(entry["total"]),
                "count": entry["count"],
            }
            for entry in category_totals
        ]

        # Account breakdown
        account_summary = transactions.values('account__name').annotate(
            income=Sum('amount', filter=Q(is_credit=True)),
            expenses=Sum('amount', filter=Q(is_credit=False)),
            count=Count('id')
        ).order_by('-count')[:5]

        # Recent activity (last 7 days)
        last_week = timezone.now().date() - timedelta(days=7)
        recent_transactions = transactions.filter(date__gte=last_week).count()

        summary = {
            "total_transactions": transactions.count(),
            "total_income": float(income),
            "total_expenses": float(expenses),
            "net_amount": float(income - expenses),
            "income_transactions": transactions.filter(is_credit=True).count(),
            "expense_transactions": transactions.filter(is_credit=False).count(),
            "transfer_transactions": transactions.filter(
                metadata__transaction_subtype="transfer"
            ).count(),
            "top_categories": top_categories,
            "account_summary": [
                {
                    "account": acc['account__name'],
                    "income": float(acc['income'] or 0),
                    "expenses": float(acc['expenses'] or 0),
                    "count": acc['count']
                } for acc in account_summary
            ],
            "recent_transactions_count": recent_transactions,
            "avg_daily_expenses": float(expenses / 30) if expenses > 0 else 0,
        }

        return Response(summary, status=status.HTTP_200_OK)

    @action(
        detail=False,
        methods=["post"],
        url_path="quick-add",
        parser_classes=[MultiPartParser, FormParser, JSONParser],
    )
    def quick_add(self, request):
        """Generate a quick-add suggestion from text and optional attachment."""
        message = request.data.get("message", "")
        attachment = request.data.get("attachment") or request.data.get("file")

        if not message and not attachment:
            return Response(
                {"error": "Provide either a message or an attachment to analyse."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        service = QuickAddService(request.user)
        suggestion = service.build_suggestion(message, attachment)

        accounts = Account.objects.filter(user=request.user).order_by("name")
        categories = Category.objects.filter(user=request.user).order_by("name")

        return Response(
            {
                "suggestion": suggestion.as_dict(),
                "accounts": [
                    {
                        "id": account.id,
                        "name": account.name,
                        "icon": getattr(account, "icon", ""),
                    }
                    for account in accounts
                ],
                "categories": [
                    {
                        "id": str(category.id),
                        "name": category.name,
                        "color": getattr(category, "color", "#0066CC"),
                    }
                    for category in categories
                ],
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"])
    def toggle_verified(self, request, pk=None):
        """Toggle transaction verified status"""
        transaction = self.get_object()
        transaction.verified = not transaction.verified
        transaction.save()

        return Response(
            {
                "message": "Transaction verification status updated",
                "verified": transaction.verified,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"])
    def lending(self, request):
        """Get all lending transactions (both lent and borrowed)"""
        lending_transactions = self.get_queryset().filter(
            metadata__transaction_category="lending"
        )

        # Filter by transaction type if specified
        transaction_type = request.query_params.get("transaction_type")
        if transaction_type in ["lend", "borrow", "repayment"]:
            lending_transactions = lending_transactions.filter(
                metadata__transaction_subtype=transaction_type
            )

        # Filter by contact if specified
        contact_id = request.query_params.get("contact_id")
        if contact_id:
            try:
                contact_user = User.objects.get(id=contact_id)
                lending_transactions = lending_transactions.filter(
                    contact_user=contact_user
                )
            except User.DoesNotExist:
                return Response(
                    {"detail": "Contact not found"},
                    status=status.HTTP_404_NOT_FOUND
                )

        serializer = self.get_serializer(lending_transactions, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"])
    def lending_summary(self, request):
        """Get lending summary for the user"""
        lending_transactions = self.get_queryset().filter(
            metadata__transaction_category="lending"
        )

        # Calculate totals
        total_lent = lending_transactions.filter(
            metadata__transaction_subtype="lend"
        ).aggregate(total=Sum("amount"))["total"] or Decimal("0")

        total_borrowed = lending_transactions.filter(
            metadata__transaction_subtype="borrow"
        ).aggregate(total=Sum("amount"))["total"] or Decimal("0")

        total_repayments_received = lending_transactions.filter(
            metadata__transaction_subtype="repayment",
            amount__gt=0  # Positive amounts are repayments received
        ).aggregate(total=Sum("amount"))["total"] or Decimal("0")

        total_repayments_made = lending_transactions.filter(
            metadata__transaction_subtype="repayment",
            amount__lt=0  # Negative amounts are repayments made
        ).aggregate(total=Sum("amount"))["total"] or Decimal("0")

        # Calculate outstanding amounts
        outstanding_lent = total_lent - total_repayments_received
        outstanding_borrowed = total_borrowed - abs(total_repayments_made)

        # Count overdue transactions (where due_date is past and not fully repaid)
        overdue_count = lending_transactions.filter(
            metadata__due_date__lt=timezone.now().date(),
            metadata__transaction_subtype__in=["lend", "borrow"]
        ).count()

        summary = {
            "total_lent": total_lent,
            "total_borrowed": total_borrowed,
            "outstanding_lent": outstanding_lent,
            "outstanding_borrowed": outstanding_borrowed,
            "total_repayments_received": total_repayments_received,
            "total_repayments_made": abs(total_repayments_made),
            "overdue_count": overdue_count,
            "net_lending_position": outstanding_lent - outstanding_borrowed,
        }

        return Response(summary, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"])
    def create_lending(self, request):
        """Create a new lending transaction"""
        data = request.data.copy()
        data["transaction_category"] = "lending"
        data["user"] = request.user.id

        # Normalize subtype input (accept legacy transaction_type key)
        subtype = data.get("transaction_subtype") or data.get("transaction_type")
        if subtype:
            data["transaction_subtype"] = subtype
        data.pop("transaction_type", None)
        # Validate required fields for lending
        required_fields = ["contact_user", "amount", "transaction_subtype", "description"]
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            return Response(
                {"detail": f"Missing required fields: {', '.join(missing_fields)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate transaction type
        if data["transaction_subtype"] not in ["lend", "borrow"]:
            return Response(
                {"detail": "transaction_subtype must be 'lend' or 'borrow'"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate contact exists
        try:
            contact_user = User.objects.get(id=data["contact_user"])
        except User.DoesNotExist:
            return Response(
                {"detail": "Contact user not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = self.get_serializer(data=data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def record_repayment(self, request, pk=None):
        """Record a repayment for a lending transaction"""
        lending_transaction = self.get_object()

        # Validate this is a lending transaction
        if lending_transaction.transaction_category != "lending":
            return Response(
                {"detail": "This is not a lending transaction"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if lending_transaction.transaction_type not in ["lend", "borrow"]:
            return Response(
                {"detail": "Can only record repayments for lend/borrow transactions"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get repayment amount
        repayment_amount = request.data.get("amount")
        if not repayment_amount:
            return Response(
                {"detail": "Repayment amount is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            repayment_amount = Decimal(repayment_amount)
        except:
            return Response(
                {"detail": "Invalid repayment amount"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create repayment transaction
        repayment_data = {
            "transaction_category": "lending",
            "transaction_subtype": "repayment",
            "amount": repayment_amount if lending_transaction.transaction_type == "borrow" else -repayment_amount,
            "description": f"Repayment for: {lending_transaction.description}",
            "date": request.data.get("date", timezone.now().date()),
            "contact_user": lending_transaction.contact_user,
            "account": lending_transaction.account,
            "notes": request.data.get("notes", ""),
        }

        repayment_serializer = self.get_serializer(data=repayment_data)
        if repayment_serializer.is_valid():
            repayment_serializer.save(user=request.user)
            return Response(
                {
                    "message": "Repayment recorded successfully",
                    "repayment": repayment_serializer.data
                },
                status=status.HTTP_201_CREATED
            )
        return Response(repayment_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["get"])
    def group_expenses(self, request):
        """Get all group expense transactions"""
        group_expenses = self.get_queryset().filter(
            metadata__transaction_category="group_expense"
        )

        # Filter by group if specified
        group_id = request.query_params.get("group_id")
        if group_id:
            group_expenses = group_expenses.filter(
                group_expense__group_id=group_id
            )

        serializer = self.get_serializer(group_expenses, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"])
    def export(self, request):
        """Export transactions in various formats"""
        format_type = request.query_params.get('format', 'json').lower()

        # Get transactions for the user
        queryset = self.get_queryset()

        # Apply filters if provided
        start_date = request.query_params.get('dateFrom')
        end_date = request.query_params.get('dateTo')
        transaction_ids = request.query_params.get('transaction_ids')

        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
        if transaction_ids:
            ids = [int(id.strip()) for id in transaction_ids.split(',') if id.strip().isdigit()]
            queryset = queryset.filter(id__in=ids)

        transactions = queryset

        if format_type == 'csv':
            return self._export_csv(transactions)
        elif format_type == 'excel':
            return self._export_excel(transactions)
        elif format_type == 'pdf':
            return self._export_pdf(transactions)
        else:  # Default to JSON
            return self._export_json(transactions)

    def _export_json(self, transactions):
        """Export transactions as JSON"""
        serializer = self.get_serializer(transactions, many=True)

        export_data = {
            'exported_at': timezone.now().isoformat(),
            'total_transactions': transactions.count(),
            'transactions': serializer.data
        }

        response = HttpResponse(
            json.dumps(export_data, indent=2, default=str),
            content_type='application/json'
        )
        filename = f"transactions_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    def _export_csv(self, transactions):
        """Export transactions as CSV"""
        response = HttpResponse(content_type='text/csv')
        filename = f"transactions_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'

        writer = csv.writer(response)

        # Write headers
        headers = [
            'Date', 'Description', 'Amount', 'Type', 'Category',
            'Account', 'Tags', 'Notes', 'Verified', 'Created'
        ]
        writer.writerow(headers)

        # Write data
        for transaction in transactions:
            row = [
                transaction.date,
                transaction.description,
                str(transaction.amount),
                transaction.transaction_type,
                getattr(transaction.category, 'name', '') if transaction.category else '',
                getattr(transaction.account, 'name', '') if transaction.account else '',
                ', '.join(transaction.tag_names),
                transaction.notes or '',
                transaction.verified,
                transaction.created_at.strftime('%Y-%m-%d %H:%M:%S')
            ]
            writer.writerow(row)

        return response

    def _export_excel(self, transactions):
        """Export transactions as Excel"""
        output = io.BytesIO()
        workbook = xlsxwriter.Workbook(output, {'in_memory': True})
        worksheet = workbook.add_worksheet('Transactions')

        # Add headers
        headers = [
            'Date', 'Description', 'Amount', 'Type', 'Category',
            'Account', 'Tags', 'Notes', 'Verified', 'Created'
        ]

        # Write headers with formatting
        header_format = workbook.add_format({'bold': True, 'bg_color': '#D7E4BC'})
        for col, header in enumerate(headers):
            worksheet.write(0, col, header, header_format)

        # Write data
        for row, transaction in enumerate(transactions, 1):
            worksheet.write(row, 0, transaction.date.strftime('%Y-%m-%d'))
            worksheet.write(row, 1, transaction.description)
            worksheet.write(row, 2, float(transaction.amount))
            worksheet.write(row, 3, transaction.transaction_type)
            worksheet.write(row, 4, getattr(transaction.category, 'name', '') if transaction.category else '')
            worksheet.write(row, 5, getattr(transaction.account, 'name', '') if transaction.account else '')
            worksheet.write(row, 6, ', '.join(transaction.tag_names))
            worksheet.write(row, 7, transaction.notes or '')
            worksheet.write(row, 8, transaction.verified)
            worksheet.write(row, 9, transaction.created_at.strftime('%Y-%m-%d %H:%M:%S'))

        # Auto-adjust column widths
        for col in range(len(headers)):
            worksheet.set_column(col, col, 15)

        workbook.close()
        output.seek(0)

        response = HttpResponse(
            output.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        filename = f"transactions_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'

        return response

    def _export_pdf(self, transactions):
        """Export transactions as PDF - simplified version"""
        # For now, return JSON with a note about PDF implementation
        response_data = {
            'message': 'PDF export not yet implemented',
            'suggested_alternative': 'Please use Excel or CSV format for now',
            'total_transactions': transactions.count()
        }
        return Response(response_data, status=status.HTTP_501_NOT_IMPLEMENTED)

    @action(detail=False, methods=["post"], url_path="import")
    def import_transactions(self, request):
        """Import transactions from uploaded file"""
        if 'file' not in request.FILES:
            return Response(
                {'detail': 'No file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        uploaded_file = request.FILES['file']
        format_type = request.query_params.get('format', 'json').lower()

        try:
            if format_type == 'csv':
                result = self._import_csv(uploaded_file)
            elif format_type == 'excel':
                result = self._import_excel(uploaded_file)
            else:  # Default to JSON
                result = self._import_json(uploaded_file)

            return Response(result, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {'detail': f'Import failed: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    def _import_json(self, file):
        """Import transactions from JSON file"""
        try:
            content = file.read().decode('utf-8')
            data = json.loads(content)

            # Handle both direct array and object with transactions key
            transactions_data = data.get('transactions', data) if isinstance(data, dict) else data

            imported_count = 0
            errors = []

            for item in transactions_data:
                try:
                    # Remove user field if present and set current user
                    item.pop('user', None)
                    item.pop('id', None)  # Remove ID to create new

                    serializer = self.get_serializer(data=item)
                    if serializer.is_valid():
                        serializer.save(user=self.request.user)
                        imported_count += 1
                    else:
                        errors.append(f"Row {imported_count + 1}: {serializer.errors}")
                except Exception as e:
                    errors.append(f"Row {imported_count + 1}: {str(e)}")

            return {
                'success': True,
                'imported_count': imported_count,
                'errors': errors[:10]  # Limit errors to first 10
            }

        except json.JSONDecodeError as e:
            raise Exception(f"Invalid JSON format: {str(e)}")

    def _import_csv(self, file):
        """Import transactions from CSV file"""
        try:
            content = file.read().decode('utf-8')
            csv_reader = csv.DictReader(io.StringIO(content))

            imported_count = 0
            errors = []

            for row_num, row in enumerate(csv_reader, 1):
                try:
                    # Map CSV fields to model fields
                    transaction_data = {
                        'date': row.get('Date', ''),
                        'description': row.get('Description', ''),
                        'amount': row.get('Amount', ''),
                        'transaction_type': row.get('Type', 'expense'),
                        'notes': row.get('Notes', ''),
                        'verified': row.get('Verified', 'false').lower() == 'true'
                    }

                    serializer = self.get_serializer(data=transaction_data)
                    if serializer.is_valid():
                        serializer.save(user=self.request.user)
                        imported_count += 1
                    else:
                        errors.append(f"Row {row_num}: {serializer.errors}")

                except Exception as e:
                    errors.append(f"Row {row_num}: {str(e)}")

            return {
                'success': True,
                'imported_count': imported_count,
                'errors': errors[:10]  # Limit errors to first 10
            }

        except Exception as e:
            raise Exception(f"CSV processing error: {str(e)}")

    @action(detail=False, methods=["patch"], url_path="bulk-update")
    def bulk_update(self, request):
        """
        Bulk update multiple transactions
        Expected payload:
        {
            "updates": [
                {
                    "id": 1,
                    "category": 5,
                    "account": 3,
                    "description": "Updated description",
                    "amount": "100.50",
                    "tags": [1, 2, 3]
                    // ... other fields
                },
                {
                    "id": 2,
                    "category": 6,
                    // ... other fields
                }
            ]
        }
        """
        updates = request.data.get('updates', [])

        if not updates:
            return Response(
                {'detail': 'No updates provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        updated_transactions = []
        errors = []

        # Process each update
        for update_data in updates:
            transaction_id = update_data.get('id')
            if not transaction_id:
                errors.append({'error': 'Missing transaction ID', 'data': update_data})
                continue

            try:
                # Get the transaction (ensure it belongs to the user)
                transaction = self.get_queryset().get(id=transaction_id)

                # Update the transaction using the serializer for validation
                serializer = self.get_serializer(transaction, data=update_data, partial=True)

                if serializer.is_valid():
                    serializer.save()
                    updated_transactions.append(serializer.data)
                else:
                    errors.append({
                        'id': transaction_id,
                        'errors': serializer.errors
                    })

            except Transaction.DoesNotExist:
                errors.append({
                    'id': transaction_id,
                    'error': 'Transaction not found or access denied'
                })
            except Exception as e:
                errors.append({
                    'id': transaction_id,
                    'error': str(e)
                })

        response_data = {
            'updated_count': len(updated_transactions),
            'updated_transactions': updated_transactions,
            'errors': errors
        }

        if errors and not updated_transactions:
            return Response(response_data, status=status.HTTP_400_BAD_REQUEST)

        return Response(response_data, status=status.HTTP_200_OK)

    def _import_excel(self, file):
        """Import transactions from Excel file"""
        try:
            import pandas as pd

            df = pd.read_excel(file)
            imported_count = 0
            errors = []

            for index, row in df.iterrows():
                try:
                    transaction_data = {
                        'date': row.get('Date', ''),
                        'description': row.get('Description', ''),
                        'amount': row.get('Amount', ''),
                        'transaction_type': row.get('Type', 'expense'),
                        'notes': row.get('Notes', ''),
                        'verified': str(row.get('Verified', 'false')).lower() == 'true'
                    }

                    serializer = self.get_serializer(data=transaction_data)
                    if serializer.is_valid():
                        serializer.save(user=self.request.user)
                        imported_count += 1
                    else:
                        errors.append(f"Row {index + 1}: {serializer.errors}")

                except Exception as e:
                    errors.append(f"Row {index + 1}: {str(e)}")

            return {
                'success': True,
                'imported_count': imported_count,
                'errors': errors[:10]  # Limit errors to first 10
            }

        except ImportError:
            raise Exception("pandas library not available for Excel import")
        except Exception as e:
            raise Exception(f"Excel processing error: {str(e)}")

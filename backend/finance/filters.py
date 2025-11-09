"""
Filters for finance app models using django-filter library.
Provides reusable filtering, searching, and ordering capabilities.

Usage examples:
    GET /api/transactions/?search=coffee&start_date=2024-01-01&transaction_type=expense&ordering=-date
    GET /api/accounts/?search=bank&status=active&ordering=name
    GET /api/goals/?status=active&ordering=-deadline&page=1&page_size=25
    GET /api/budgets/?search=monthly&is_active=true&ordering=name
"""
import django_filters
from django.db.models import Q, Count
from .models import (
    Transaction, Account, Category, Goal, Budget,
    Investment, ExpenseGroup
)


class TransactionFilter(django_filters.FilterSet):
    """
    Comprehensive filter for Transaction model.

    Query parameters:
        search: Search in description, notes, and merchant
        start_date: Filter transactions from this date (YYYY-MM-DD)
        end_date: Filter transactions until this date (YYYY-MM-DD)
        account_ids: Comma-separated account IDs
        category_ids: Comma-separated category IDs
        statuses: Comma-separated statuses (active, cancelled, pending, failed)
        transaction_type: Transaction type (income, expense, transfer)
        verified: Filter by verification status (true/false)
        amount_min: Minimum transaction amount
        amount_max: Maximum transaction amount
    """

    # Date range filters
    start_date = django_filters.DateFilter(field_name='date', lookup_expr='gte')
    end_date = django_filters.DateFilter(field_name='date', lookup_expr='lte')

    # Multiple choice filters (comma-separated)
    account_ids = django_filters.CharFilter(method='filter_account_ids')
    category_ids = django_filters.CharFilter(method='filter_category_ids')
    statuses = django_filters.CharFilter(method='filter_statuses')

    # Amount range filters
    amount_min = django_filters.NumberFilter(field_name='amount', lookup_expr='gte')
    amount_max = django_filters.NumberFilter(field_name='amount', lookup_expr='lte')

    # Search across multiple fields
    search = django_filters.CharFilter(method='filter_search')

    # Transaction type
    transaction_type = django_filters.ChoiceFilter(
        choices=[
            ('income', 'Income'),
            ('expense', 'Expense'),
            ('transfer', 'Transfer'),
        ],
        method='filter_transaction_type'
    )

    # Verified status
    verified = django_filters.BooleanFilter(method='filter_verified')

    class Meta:
        model = Transaction
        fields = [
            'start_date',
            'end_date',
            'account_ids',
            'category_ids',
            'statuses',
            'search',
            'transaction_type',
            'verified',
            'amount_min',
            'amount_max',
        ]

    def filter_account_ids(self, queryset, name, value):
        """Filter by multiple account IDs (comma-separated)"""
        if not value:
            return queryset

        account_list = [aid.strip() for aid in value.split(',') if aid.strip()]
        if account_list:
            return queryset.filter(account_id__in=account_list)
        return queryset

    def filter_category_ids(self, queryset, name, value):
        """Filter by multiple category IDs (comma-separated)"""
        if not value:
            return queryset

        category_list = [cid.strip() for cid in value.split(',') if cid.strip()]
        if category_list:
            normalized_ids = []
            for raw_value in category_list:
                try:
                    normalized_ids.append(int(raw_value))
                except (TypeError, ValueError):
                    continue
            if normalized_ids:
                return queryset.filter(category_id__in=normalized_ids)
        return queryset

    def filter_statuses(self, queryset, name, value):
        """Filter by multiple statuses (comma-separated)"""
        if not value:
            return queryset

        status_list = [s.strip() for s in value.split(',') if s.strip()]
        if status_list:
            return queryset.filter(status__in=status_list)
        return queryset

    def filter_search(self, queryset, name, value):
        """Search in description, notes, and merchant_name"""
        if not value:
            return queryset

        return queryset.filter(
            Q(description__icontains=value) |
            Q(notes__icontains=value) |
            Q(transaction_group__name__icontains=value) |
            Q(metadata__original_description__icontains=value)
        )

    def filter_transaction_type(self, queryset, name, value):
        """Filter by transaction type using metadata or credit/debit flags"""
        if not value:
            return queryset

        normalized = str(value).lower()
        if normalized == 'income':
            return queryset.filter(is_credit=True)
        if normalized == 'expense':
            return queryset.filter(is_credit=False)
        return queryset.filter(metadata__transaction_subtype=normalized)

    def filter_verified(self, queryset, name, value):
        """Filter by verified flag stored in metadata"""
        if value is None:
            return queryset
        return queryset.filter(metadata__verified=value)


# ============================================================================
# ACCOUNT FILTERS
# ============================================================================

class AccountFilter(django_filters.FilterSet):
    """
    Filter for Account model.

    Query parameters:
        search: Search by account name
        status: Filter by status (active, inactive, closed, frozen, pending)
        account_type: Filter by type (checking, savings, credit, investment, loan, cash, other)
        currency: Filter by currency (USD, EUR, etc.)
        balance_min: Minimum balance
        balance_max: Maximum balance
    """

    search = django_filters.CharFilter(method='filter_search')
    status = django_filters.ChoiceFilter(
        choices=[
            ('active', 'Active'),
            ('inactive', 'Inactive'),
            ('closed', 'Closed'),
            ('frozen', 'Frozen'),
            ('pending', 'Pending'),
        ]
    )
    account_type = django_filters.ChoiceFilter(
        choices=[
            ('checking', 'Checking'),
            ('savings', 'Savings'),
            ('credit', 'Credit Card'),
            ('investment', 'Investment'),
            ('loan', 'Loan'),
            ('cash', 'Cash'),
            ('other', 'Other'),
        ]
    )
    currency = django_filters.CharFilter()
    balance_min = django_filters.NumberFilter(field_name='balance', lookup_expr='gte')
    balance_max = django_filters.NumberFilter(field_name='balance', lookup_expr='lte')

    class Meta:
        model = Account
        fields = ['search', 'status', 'account_type', 'currency', 'balance_min', 'balance_max']

    def filter_search(self, queryset, name, value):
        """Search by account name and description"""
        if not value:
            return queryset
        return queryset.filter(
            Q(name__icontains=value) |
            Q(description__icontains=value)
        )


# ============================================================================
# CATEGORY FILTERS
# ============================================================================

class CategoryFilter(django_filters.FilterSet):
    """
    Filter for Category model.

    Query parameters:
        search: Search by category name
        category_type: Filter by type (income, expense, both)
        is_active: Filter by active status (true/false)
    """

    search = django_filters.CharFilter(method='filter_search')
    category_type = django_filters.ChoiceFilter(
        choices=[
            ('income', 'Income'),
            ('expense', 'Expense'),
            ('both', 'Both'),
        ]
    )
    is_active = django_filters.BooleanFilter()

    class Meta:
        model = Category
        fields = ['search', 'category_type', 'is_active']

    def filter_search(self, queryset, name, value):
        """Search by category name"""
        if not value:
            return queryset
        return queryset.filter(name__icontains=value)


# ============================================================================
# GOAL FILTERS
# ============================================================================

class GoalFilter(django_filters.FilterSet):
    """
    Filter for Goal model.

    Query parameters:
        search: Search by goal name
        status: Filter by status (active, completed, paused, cancelled)
        currency: Filter by currency
        target_amount_min: Minimum target amount
        target_amount_max: Maximum target amount
        deadline_before: Goals with deadline before this date
        deadline_after: Goals with deadline after this date
    """

    search = django_filters.CharFilter(method='filter_search')
    status = django_filters.ChoiceFilter(
        choices=[
            ('active', 'Active'),
            ('completed', 'Completed'),
            ('paused', 'Paused'),
            ('cancelled', 'Cancelled'),
        ]
    )
    currency = django_filters.CharFilter()
    target_amount_min = django_filters.NumberFilter(field_name='target_amount', lookup_expr='gte')
    target_amount_max = django_filters.NumberFilter(field_name='target_amount', lookup_expr='lte')
    deadline_before = django_filters.DateFilter(field_name='deadline', lookup_expr='lte')
    deadline_after = django_filters.DateFilter(field_name='deadline', lookup_expr='gte')

    class Meta:
        model = Goal
        fields = ['search', 'status', 'currency', 'target_amount_min', 'target_amount_max',
                  'deadline_before', 'deadline_after']

    def filter_search(self, queryset, name, value):
        """Search by goal name"""
        if not value:
            return queryset
        return queryset.filter(name__icontains=value)


# ============================================================================
# BUDGET FILTERS
# ============================================================================

class BudgetFilter(django_filters.FilterSet):
    """
    Filter for Budget model.

    Query parameters:
        search: Search by budget name
        is_active: Filter by active status (true/false)
        period: Filter by budget period
        start_date_after: Budgets starting after this date
        start_date_before: Budgets starting before this date
    """

    search = django_filters.CharFilter(method='filter_search')
    is_active = django_filters.BooleanFilter()
    period = django_filters.CharFilter()
    start_date_after = django_filters.DateFilter(field_name='start_date', lookup_expr='gte')
    start_date_before = django_filters.DateFilter(field_name='start_date', lookup_expr='lte')

    class Meta:
        model = Budget
        fields = ['search', 'is_active', 'period', 'start_date_after', 'start_date_before']

    def filter_search(self, queryset, name, value):
        """Search by budget name"""
        if not value:
            return queryset
        return queryset.filter(name__icontains=value)


# ============================================================================
# INVESTMENT FILTERS
# ============================================================================

class InvestmentFilter(django_filters.FilterSet):
    """
    Filter for Investment model.

    Query parameters:
        search: Search by investment name or symbol
        asset_type: Filter by asset type
        currency: Filter by currency
        value_min: Minimum investment value
        value_max: Maximum investment value
    """

    search = django_filters.CharFilter(method='filter_search')
    asset_type = django_filters.CharFilter()
    currency = django_filters.CharFilter()
    value_min = django_filters.NumberFilter(field_name='value', lookup_expr='gte')
    value_max = django_filters.NumberFilter(field_name='value', lookup_expr='lte')

    class Meta:
        model = Investment
        fields = ['search', 'asset_type', 'currency', 'value_min', 'value_max']

    def filter_search(self, queryset, name, value):
        """Search by investment name or symbol"""
        if not value:
            return queryset
        return queryset.filter(
            Q(name__icontains=value)
        )


# ============================================================================
# EXPENSE GROUP FILTERS
# ============================================================================

class ExpenseGroupFilter(django_filters.FilterSet):
    """
    Filter for ExpenseGroup model.

    Query parameters:
        search: Search by group name
        status: Filter by status (active, settled, archived)
    """

    search = django_filters.CharFilter(method='filter_search')
    status = django_filters.CharFilter()

    class Meta:
        model = ExpenseGroup
        fields = ['search', 'status']

    def filter_search(self, queryset, name, value):
        """Search by group name"""
        if not value:
            return queryset
        return queryset.filter(name__icontains=value)


# ============================================================================
# INVOICE FILTERS
# ============================================================================

class InvoiceFilter(django_filters.FilterSet):
    """
    Filter for Invoice model.

    Query parameters:
        search: Search by invoice number or description
        status: Filter by status (paid, unpaid, overdue, etc.)
        date_after: Invoices from this date onwards
        date_before: Invoices before this date
        amount_min: Minimum invoice amount
        amount_max: Maximum invoice amount
    """

    search = django_filters.CharFilter(method='filter_search')
    status = django_filters.CharFilter()
    date_after = django_filters.DateFilter(field_name='date', lookup_expr='gte')
    date_before = django_filters.DateFilter(field_name='date', lookup_expr='lte')
    amount_min = django_filters.NumberFilter(field_name='amount', lookup_expr='gte')
    amount_max = django_filters.NumberFilter(field_name='amount', lookup_expr='lte')

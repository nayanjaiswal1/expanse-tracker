"""
Pagination utilities for DRF with support for multiple pagination strategies.
Includes Page Number Pagination and Cursor-Based Pagination.
"""

from rest_framework.pagination import PageNumberPagination, CursorPagination
from rest_framework.response import Response


class CustomPageNumberPagination(PageNumberPagination):
    """
    Enhanced page number pagination with custom page size support.

    Query parameters:
        ?page=1 - Page number (starts at 1)
        ?page_size=50 - Items per page (max 1000)

    Example:
        GET /api/transactions/?page=2&page_size=25
    """
    page_size = 50
    page_size_query_param = 'page_size'
    page_size_query_description = 'Number of results to return per page.'
    max_page_size = 1000

    def get_paginated_response(self, data):
        """Enhanced response with comprehensive metadata"""
        return Response({
            'count': self.page.paginator.count,
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'page': self.page.number,
            'page_size': self.page_size,
            'total_pages': self.page.paginator.num_pages,
            'has_next': self.page.has_next(),
            'has_previous': self.page.has_previous(),
            'results': data
        })


class CustomCursorPagination(CursorPagination):
    """
    Cursor-based pagination for efficient pagination of large datasets.
    More efficient than page-based for very large datasets.

    Query parameters:
        ?cursor=cD0yMDE5LTA0LTA3OjE0 - Cursor position
        ?page_size=50 - Items per page (optional)

    Features:
        - Efficient for large datasets
        - Prevents data duplication issues
        - Cannot jump to arbitrary pages
        - Better for real-time data

    Example:
        GET /api/transactions/?cursor=cD0yMDE5LTA0LTA3OjE0&page_size=25

    Usage:
        Use for endpoints with high-volume, real-time data:
        - Transactions list
        - Activity feeds
        - Real-time updates
    """
    page_size = 50
    page_size_query_param = 'page_size'
    page_size_query_description = 'Number of results to return per page.'
    max_page_size = 1000

    # Ordering must be set on the ViewSet for cursor pagination to work
    ordering_fields = []  # Will be set per viewset
    ordering = '-created_at'  # Default ordering

    def get_paginated_response(self, data):
        """Cursor pagination response with metadata"""
        return Response({
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'page_size': self.page_size,
            'results': data
        })


# ============================================================================
# PAGINATION STRATEGY SELECTION HELPER
# ============================================================================

PAGINATION_CHOICES = {
    'page': CustomPageNumberPagination,
    'cursor': CustomCursorPagination,
}


def get_pagination_class(pagination_type='page'):
    """
    Get pagination class based on type.

    Args:
        pagination_type (str): 'page' for page-based, 'cursor' for cursor-based

    Returns:
        Pagination class

    Example:
        In settings.py:
        "DEFAULT_PAGINATION_CLASS": "core.pagination.get_pagination_class()",
    """
    return PAGINATION_CHOICES.get(pagination_type, CustomPageNumberPagination)

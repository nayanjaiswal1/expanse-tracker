"""
Input validation utilities for API endpoints.

Provides centralized validation logic for common patterns like date ranges,
file uploads, and numeric inputs.
"""

from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation
from typing import Optional, Tuple
from django.core.exceptions import ValidationError
from rest_framework.exceptions import ValidationError as DRFValidationError


class DateRangeValidator:
    """
    Validates date range inputs for analytics and reports.

    Prevents:
    - Start date after end date
    - Excessively large date ranges (> 2 years)
    - Invalid date formats
    """

    MAX_DAYS = 365 * 2  # Maximum 2 years

    @staticmethod
    def validate_date_range(
        start_date: Optional[date],
        end_date: Optional[date],
        max_days: int = MAX_DAYS,
    ) -> Tuple[Optional[date], Optional[date]]:
        """
        Validate date range inputs.

        Args:
            start_date: Start date
            end_date: End date
            max_days: Maximum allowed days in range

        Returns:
            Tuple of validated (start_date, end_date)

        Raises:
            ValidationError: If validation fails
        """
        if start_date and end_date:
            if start_date > end_date:
                raise DRFValidationError({
                    'date_range': 'start_date must be before or equal to end_date'
                })

            delta = end_date - start_date
            if delta.days > max_days:
                raise DRFValidationError({
                    'date_range': f'Date range cannot exceed {max_days} days ({max_days // 365} years)'
                })

        return start_date, end_date

    @staticmethod
    def parse_date(date_str: Optional[str]) -> Optional[date]:
        """
        Parse date string to date object.

        Args:
            date_str: Date string in YYYY-MM-DD format

        Returns:
            date object or None

        Raises:
            ValidationError: If date format is invalid
        """
        if not date_str:
            return None

        try:
            return datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            raise DRFValidationError({
                'date': f'Invalid date format: {date_str}. Expected YYYY-MM-DD'
            })


class NumericValidator:
    """Validates numeric inputs like amounts, quantities, etc."""

    @staticmethod
    def validate_positive_amount(
        amount: any,
        field_name: str = 'amount',
    ) -> Decimal:
        """
        Validate amount is positive number.

        Args:
            amount: Amount to validate
            field_name: Field name for error message

        Returns:
            Decimal amount

        Raises:
            ValidationError: If validation fails
        """
        try:
            decimal_amount = Decimal(str(amount))
        except (InvalidOperation, ValueError, TypeError):
            raise DRFValidationError({
                field_name: f'Invalid number format: {amount}'
            })

        if decimal_amount < 0:
            raise DRFValidationError({
                field_name: f'{field_name} must be positive'
            })

        return decimal_amount

    @staticmethod
    def validate_integer_list(
        value: Optional[str],
        field_name: str = 'ids',
    ) -> Optional[list[int]]:
        """
        Validate comma-separated list of integers.

        Args:
            value: Comma-separated string like "1,2,3"
            field_name: Field name for error message

        Returns:
            List of integers or None

        Raises:
            ValidationError: If any value is not an integer
        """
        if not value:
            return None

        try:
            return [int(x.strip()) for x in value.split(',')]
        except (ValueError, AttributeError):
            raise DRFValidationError({
                field_name: f'Invalid format for {field_name}. Expected comma-separated integers like "1,2,3"'
            })


class FileValidator:
    """Validates file uploads for size, type, and security."""

    # File size limits (in bytes)
    MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB
    MAX_PDF_SIZE = 20 * 1024 * 1024    # 20MB

    # Allowed MIME types
    ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif']
    ALLOWED_DOCUMENT_TYPES = ['application/pdf']
    ALLOWED_TYPES = ALLOWED_IMAGE_TYPES + ALLOWED_DOCUMENT_TYPES

    @staticmethod
    def validate_file_size(file_path: str, max_size: int = MAX_IMAGE_SIZE):
        """
        Validate file size.

        Args:
            file_path: Path to file
            max_size: Maximum size in bytes

        Raises:
            ValidationError: If file too large
        """
        import os

        if not os.path.exists(file_path):
            raise DRFValidationError({'file': 'File not found'})

        size = os.path.getsize(file_path)
        if size > max_size:
            size_mb = size / (1024 * 1024)
            max_mb = max_size / (1024 * 1024)
            raise DRFValidationError({
                'file': f'File too large ({size_mb:.1f}MB). Maximum allowed: {max_mb:.1f}MB'
            })

    @staticmethod
    def validate_file_type(file_path: str, allowed_types: list[str] = None):
        """
        Validate file type using magic bytes.

        Args:
            file_path: Path to file
            allowed_types: List of allowed MIME types

        Raises:
            ValidationError: If file type not allowed
        """
        if allowed_types is None:
            allowed_types = FileValidator.ALLOWED_TYPES

        try:
            import magic
            mime = magic.from_file(file_path, mime=True)
        except ImportError:
            # Fallback to extension-based check if python-magic not installed
            import mimetypes
            mime, _ = mimetypes.guess_type(file_path)

        if mime not in allowed_types:
            raise DRFValidationError({
                'file': f'Invalid file type: {mime}. Allowed types: {", ".join(allowed_types)}'
            })

    @staticmethod
    def validate_filename(filename: str):
        """
        Validate filename for security.

        Prevents:
        - Path traversal attacks (../)
        - Null bytes
        - Excessively long names

        Args:
            filename: Original filename

        Raises:
            ValidationError: If filename unsafe
        """
        if not filename:
            raise DRFValidationError({'file': 'Filename cannot be empty'})

        # Check for path traversal
        if '..' in filename or '/' in filename or '\\' in filename:
            raise DRFValidationError({
                'file': 'Invalid filename: contains path separators'
            })

        # Check for null bytes
        if '\x00' in filename:
            raise DRFValidationError({
                'file': 'Invalid filename: contains null bytes'
            })

        # Check length
        if len(filename) > 255:
            raise DRFValidationError({
                'file': 'Filename too long (max 255 characters)'
            })


class CategoryValidator:
    """Validates category-related inputs."""

    @staticmethod
    def validate_category_ids(category_ids: Optional[list[int]], user) -> Optional[list[int]]:
        """
        Validate category IDs belong to user.

        Args:
            category_ids: List of category IDs
            user: User instance

        Returns:
            Validated list of category IDs

        Raises:
            ValidationError: If any category doesn't belong to user
        """
        if not category_ids:
            return None

        from finance.models import Category

        # Check all categories exist and belong to user
        valid_count = Category.objects.filter(
            id__in=category_ids,
            user=user
        ).count()

        if valid_count != len(category_ids):
            raise DRFValidationError({
                'categories': 'One or more category IDs are invalid or do not belong to you'
            })

        return category_ids


class AccountValidator:
    """Validates account-related inputs."""

    @staticmethod
    def validate_account_ids(account_ids: Optional[list[int]], user) -> Optional[list[int]]:
        """
        Validate account IDs belong to user.

        Args:
            account_ids: List of account IDs
            user: User instance

        Returns:
            Validated list of account IDs

        Raises:
            ValidationError: If any account doesn't belong to user
        """
        if not account_ids:
            return None

        from finance.models import Account

        # Check all accounts exist and belong to user
        valid_count = Account.objects.filter(
            id__in=account_ids,
            user=user
        ).count()

        if valid_count != len(account_ids):
            raise DRFValidationError({
                'accounts': 'One or more account IDs are invalid or do not belong to you'
            })

        return account_ids

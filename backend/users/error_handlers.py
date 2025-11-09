"""
Standardized error handling for BUDGETON API
"""

from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ValidationError
from django.db import IntegrityError
import logging

logger = logging.getLogger(__name__)


class APIErrorCodes:
    """Standardized error codes for the API"""

    # Authentication & Authorization
    UNAUTHORIZED = 'UNAUTHORIZED'
    FORBIDDEN = 'FORBIDDEN'
    INVALID_TOKEN = 'INVALID_TOKEN'

    # Validation
    VALIDATION_ERROR = 'VALIDATION_ERROR'
    INVALID_DATA = 'INVALID_DATA'
    MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD'

    # Resources
    NOT_FOUND = 'NOT_FOUND'
    ALREADY_EXISTS = 'ALREADY_EXISTS'

    # Business Logic
    INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS'
    DUPLICATE_TRANSACTION = 'DUPLICATE_TRANSACTION'
    INVALID_OPERATION = 'INVALID_OPERATION'

    # System
    SERVER_ERROR = 'SERVER_ERROR'
    DATABASE_ERROR = 'DATABASE_ERROR'
    EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR'


class StandardizedError:
    """Standardized error response structure"""

    def __init__(self, code: str, message: str, details: dict = None, status_code: int = None):
        self.code = code
        self.message = message
        self.details = details or {}
        self.status_code = status_code or status.HTTP_400_BAD_REQUEST

    def to_response(self) -> Response:
        """Convert to DRF Response object"""
        response_data = {
            'error': {
                'code': self.code,
                'message': self.message,
                'details': self.details
            }
        }
        return Response(response_data, status=self.status_code)


def custom_exception_handler(exc, context):
    """
    Custom exception handler that returns standardized error responses
    """
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)

    if response is not None:
        # Log the error
        logger.error(f"API Error: {exc.__class__.__name__}: {str(exc)}")

        # Standardize the error response
        error_code = _get_error_code(exc)
        error_message = _get_error_message(exc)
        error_details = _get_error_details(exc, response.data)

        standardized_response = {
            'error': {
                'code': error_code,
                'message': error_message,
                'details': error_details
            }
        }

        response.data = standardized_response

    return response


def _get_error_code(exc) -> str:
    """Determine the appropriate error code for an exception"""
    from rest_framework.exceptions import (
        ValidationError as DRFValidationError,
        NotFound,
        PermissionDenied,
        AuthenticationFailed,
        NotAuthenticated
    )

    if isinstance(exc, NotAuthenticated):
        return APIErrorCodes.UNAUTHORIZED
    elif isinstance(exc, AuthenticationFailed):
        return APIErrorCodes.INVALID_TOKEN
    elif isinstance(exc, PermissionDenied):
        return APIErrorCodes.FORBIDDEN
    elif isinstance(exc, NotFound):
        return APIErrorCodes.NOT_FOUND
    elif isinstance(exc, (DRFValidationError, ValidationError)):
        return APIErrorCodes.VALIDATION_ERROR
    elif isinstance(exc, IntegrityError):
        return APIErrorCodes.ALREADY_EXISTS
    else:
        return APIErrorCodes.SERVER_ERROR


def _get_error_message(exc) -> str:
    """Get a user-friendly error message"""
    from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

    if isinstance(exc, NotFound):
        return "The requested resource was not found."
    elif isinstance(exc, PermissionDenied):
        return "You do not have permission to perform this action."
    elif isinstance(exc, IntegrityError):
        return "This resource already exists or violates a constraint."
    elif isinstance(exc, ValidationError):
        # Handle validation errors properly
        if hasattr(exc, 'detail'):
            if isinstance(exc.detail, dict):
                # Check for non_field_errors first
                if 'non_field_errors' in exc.detail:
                    return exc.detail['non_field_errors'][0] if exc.detail['non_field_errors'] else "Validation failed."
                # Otherwise, get the first field error
                for field, errors in exc.detail.items():
                    if isinstance(errors, list) and errors:
                        return errors[0]
                    elif isinstance(errors, str):
                        return errors
                return "Validation failed."
            elif isinstance(exc.detail, list) and exc.detail:
                return exc.detail[0]
            else:
                return str(exc.detail)
        return "Validation failed."
    else:
        return str(exc) if str(exc) else "An error occurred while processing your request."


def _get_error_details(exc, original_data) -> dict:
    """Extract detailed error information"""
    details = {}

    # Include field-specific errors for validation errors
    if hasattr(exc, 'detail'):
        if isinstance(exc.detail, dict):
            details['field_errors'] = exc.detail
        elif isinstance(exc.detail, list):
            details['errors'] = exc.detail

    # Include original error data if useful, but extract only the string message
    if original_data and isinstance(original_data, dict):
        # Extract just the error message string from nested error objects
        if 'error' in original_data:
            error_value = original_data['error']
            if isinstance(error_value, str):
                details['detail'] = error_value
            elif isinstance(error_value, dict) and 'message' in error_value:
                details['detail'] = error_value['message']
        # For other types of data, include selectively
        elif 'detail' in original_data:
            details['detail'] = str(original_data['detail'])
        elif 'message' in original_data:
            details['detail'] = str(original_data['message'])
        # Handle validation error fields
        elif any(field in original_data for field in ['non_field_errors'] + list(original_data.keys())):
            # This is likely a validation error response
            if not details.get('field_errors'):
                details['field_errors'] = original_data

    return details


class ErrorResponseMixin:
    """Mixin to provide standardized error responses in views"""

    def error_response(self, code: str, message: str, details: dict = None, status_code: int = None):
        """Return a standardized error response"""
        error = StandardizedError(code, message, details, status_code)
        return error.to_response()

    def validation_error(self, message: str, field_errors: dict = None):
        """Return a validation error response"""
        details = {'field_errors': field_errors} if field_errors else {}
        return self.error_response(
            APIErrorCodes.VALIDATION_ERROR,
            message,
            details,
            status.HTTP_400_BAD_REQUEST
        )

    def not_found_error(self, resource: str = "Resource"):
        """Return a not found error response"""
        return self.error_response(
            APIErrorCodes.NOT_FOUND,
            f"{resource} not found.",
            {},
            status.HTTP_404_NOT_FOUND
        )

    def permission_error(self, message: str = "Permission denied"):
        """Return a permission error response"""
        return self.error_response(
            APIErrorCodes.FORBIDDEN,
            message,
            {},
            status.HTTP_403_FORBIDDEN
        )

    def server_error(self, message: str = "Internal server error"):
        """Return a server error response"""
        return self.error_response(
            APIErrorCodes.SERVER_ERROR,
            message,
            {},
            status.HTTP_500_INTERNAL_SERVER_ERROR
        )
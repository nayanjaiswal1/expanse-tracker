"""
Standardized error response utilities for consistent error handling across the application.
"""
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler
from django.http import JsonResponse
import logging

logger = logging.getLogger(__name__)


def create_error_response(message: str, details: dict = None, status_code: int = status.HTTP_400_BAD_REQUEST):
    """
    Create a standardized error response format.
    
    Args:
        message (str): Human-readable error message
        details (dict, optional): Additional error details
        status_code (int): HTTP status code
        
    Returns:
        Response: DRF Response object with standardized error format
    """
    error_data = {
        "error": {
            "code": get_error_code_from_status(status_code),
            "message": message,
        }
    }
    
    if details:
        error_data["error"]["details"] = details
        
    return Response(error_data, status=status_code)


def get_error_code_from_status(status_code: int) -> str:
    """Convert HTTP status code to error code string."""
    status_codes = {
        400: "VALIDATION_ERROR",
        401: "AUTHENTICATION_ERROR", 
        403: "PERMISSION_ERROR",
        404: "NOT_FOUND_ERROR",
        429: "RATE_LIMIT_ERROR",
        500: "INTERNAL_SERVER_ERROR",
    }
    return status_codes.get(status_code, "UNKNOWN_ERROR")


def create_validation_error_response(field_errors: dict = None, non_field_errors: list = None):
    """
    Create a standardized validation error response.
    
    Args:
        field_errors (dict): Field-specific errors
        non_field_errors (list): General validation errors
        
    Returns:
        Response: DRF Response object with validation error format
    """
    details = {}
    
    if field_errors:
        details["field_errors"] = field_errors
        
    if non_field_errors:
        details["field_errors"] = details.get("field_errors", {})
        details["field_errors"]["non_field_errors"] = non_field_errors
    
    # Use the first error as the main message
    main_message = "Validation failed"
    if non_field_errors:
        main_message = non_field_errors[0]
    elif field_errors:
        first_field_errors = next(iter(field_errors.values()))
        if isinstance(first_field_errors, list) and first_field_errors:
            main_message = first_field_errors[0]
    
    return create_error_response(
        message=main_message,
        details=details,
        status_code=status.HTTP_400_BAD_REQUEST
    )


def custom_exception_handler(exc, context):
    """
    Custom exception handler that returns standardized error responses.
    """
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)
    
    if response is not None:
        custom_response_data = {
            "error": {
                "code": get_error_code_from_status(response.status_code),
                "message": "An error occurred",
            }
        }
        
        # Handle different types of errors
        if hasattr(response, 'data') and response.data:
            if isinstance(response.data, dict):
                # Handle validation errors
                if 'non_field_errors' in response.data:
                    custom_response_data["error"]["message"] = response.data['non_field_errors'][0] if response.data['non_field_errors'] else "Validation failed"
                    custom_response_data["error"]["details"] = {"field_errors": response.data}
                elif any(key in ['detail', 'message'] for key in response.data.keys()):
                    # Handle detail/message errors
                    custom_response_data["error"]["message"] = response.data.get('detail') or response.data.get('message', 'An error occurred')
                else:
                    # Handle field-specific errors
                    field_errors = {}
                    main_message = "Validation failed"
                    for field, errors in response.data.items():
                        if isinstance(errors, list):
                            field_errors[field] = errors
                            if not main_message or main_message == "Validation failed":
                                main_message = errors[0] if errors else "Validation failed"
                        else:
                            field_errors[field] = [str(errors)]
                            if not main_message or main_message == "Validation failed":
                                main_message = str(errors)
                    
                    custom_response_data["error"]["message"] = main_message
                    if field_errors:
                        custom_response_data["error"]["details"] = {"field_errors": field_errors}
            elif isinstance(response.data, list):
                custom_response_data["error"]["message"] = response.data[0] if response.data else "An error occurred"
            else:
                custom_response_data["error"]["message"] = str(response.data)
        
        response.data = custom_response_data
    
    return response
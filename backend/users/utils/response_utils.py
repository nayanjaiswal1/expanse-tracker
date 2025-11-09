from rest_framework import status
from rest_framework.response import Response

def create_response(
    data=None, 
    status_code=status.HTTP_200_OK, 
    message=None,
    errors=None
):
    """
    Standard API response format
    """
    response_data = {}
    
    if message is not None:
        response_data['message'] = message
        
    if data is not None:
        response_data['data'] = data
        
    if errors is not None:
        response_data['errors'] = errors
    
    return Response(response_data, status=status_code)

def error_response(
    message="An error occurred",
    status_code=status.HTTP_400_BAD_REQUEST,
    errors=None
):
    """
    Standard error response format
    """
    return create_response(
        message=message,
        status_code=status_code,
        errors=errors
    )

def not_found_response(message="Resource not found"):
    """
    Standard 404 response
    """
    return error_response(
        message=message,
        status_code=status.HTTP_404_NOT_FOUND
    )

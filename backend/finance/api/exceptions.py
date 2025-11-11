"""
Custom API Exceptions
"""

from rest_framework import status
from rest_framework.exceptions import APIException


class ServiceUnavailable(APIException):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = 'Service temporarily unavailable, try again later.'
    default_code = 'service_unavailable'


class AIProviderError(APIException):
    status_code = status.HTTP_502_BAD_GATEWAY
    default_detail = 'AI provider returned an error.'
    default_code = 'ai_provider_error'


class FileProcessingError(APIException):
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    default_detail = 'Unable to process the uploaded file.'
    default_code = 'file_processing_error'


class DuplicateResourceError(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = 'A duplicate resource already exists.'
    default_code = 'duplicate_resource'

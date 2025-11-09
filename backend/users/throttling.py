"""
Throttle classes for rate limiting API endpoints.

Prevents abuse and ensures fair usage of analytics and resource-intensive endpoints.
"""

from rest_framework.throttling import UserRateThrottle, AnonRateThrottle


class AnalyticsRateThrottle(UserRateThrottle):
    """
    Rate limit for analytics endpoints.

    Allows 100 requests per hour for authenticated users.
    Analytics queries can be expensive, so we limit them.
    """
    rate = '100/hour'
    scope = 'analytics'


class DocumentUploadRateThrottle(UserRateThrottle):
    """
    Rate limit for document uploads.

    Allows 20 uploads per hour to prevent abuse and manage OCR costs.
    """
    rate = '20/hour'
    scope = 'document_upload'


class MLExportRateThrottle(UserRateThrottle):
    """
    Rate limit for ML data exports.

    Allows 10 exports per hour as these can be very large.
    """
    rate = '10/hour'
    scope = 'ml_export'


class BurstRateThrottle(UserRateThrottle):
    """
    Burst rate limit for all authenticated endpoints.

    Allows 60 requests per minute to prevent rapid-fire requests.
    """
    rate = '60/min'
    scope = 'burst'


class SustainedRateThrottle(UserRateThrottle):
    """
    Sustained rate limit for all authenticated endpoints.

    Allows 1000 requests per day for normal usage.
    """
    rate = '1000/day'
    scope = 'sustained'

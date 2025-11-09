"""
Custom middleware for secure authentication and rate limiting
"""

import logging
import time
import json
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser

User = get_user_model()

# Loggers
logger = logging.getLogger(__name__)
request_logger = logging.getLogger('django.request')
auth_logger = logging.getLogger('users.auth')


class CookieJWTAuthentication(MiddlewareMixin):
    """
    Custom middleware to authenticate users using JWT tokens from httpOnly cookies
    """

    def process_request(self, request):
        # Skip for certain paths
        skip_paths = [
            "/admin/",
            "/static/",
            "/media/",
            "/api/auth/login/",
            "/api/auth/register/",
            "/api/auth/refresh/",
        ]
        if any(request.path.startswith(path) for path in skip_paths):
            return None

        auth_logger.debug(f"Processing authentication for {request.path}")

        # Get token from cookie
        token = request.COOKIES.get("access_token")
        auth_logger.debug(f"Token present: {bool(token)}")

        if token:
            try:
                # Validate token
                UntypedToken(token)

                # Decode token to get user info
                from rest_framework_simplejwt.tokens import AccessToken

                access_token = AccessToken(token)
                user_id = access_token["user_id"]
                auth_logger.debug(f"Decoded user_id from token: {user_id}")

                # Get user
                try:
                    user = User.objects.get(id=user_id)
                    request.user = user
                    auth_logger.info(f"User authenticated: {user.email} (ID: {user.id})")
                except User.DoesNotExist:
                    request.user = AnonymousUser()
                    auth_logger.warning(f"User ID {user_id} from token not found in database")

            except (InvalidToken, TokenError) as e:
                request.user = AnonymousUser()
                auth_logger.warning(f"Invalid token: {str(e)}")
        else:
            request.user = AnonymousUser()
            auth_logger.debug("No authentication token provided")

        return None


class SecurityHeadersMiddleware(MiddlewareMixin):
    """
    Add security headers to all responses
    """

    def process_response(self, request, response):
        # Security headers
        response["X-Content-Type-Options"] = "nosniff"
        response["X-Frame-Options"] = "DENY"
        response["X-XSS-Protection"] = "1; mode=block"
        response["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"

        # CORS headers for development
        if request.method == "OPTIONS":
            # Use the origin from the request if it's allowed
            origin = request.META.get("HTTP_ORIGIN", "")
            allowed_origins = [
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:5174",
                "http://127.0.0.1:5174",
                "http://localhost:5175",
                "http://127.0.0.1:5175",
            ]

            if origin in allowed_origins:
                response["Access-Control-Allow-Origin"] = origin
            else:
                response["Access-Control-Allow-Origin"] = (
                    "http://localhost:5175"  # Default to current frontend
                )

            response["Access-Control-Allow-Methods"] = (
                "GET, POST, PUT, PATCH, DELETE, OPTIONS"
            )
            response["Access-Control-Allow-Headers"] = (
                "Content-Type, Authorization, X-Requested-With"
            )
            response["Access-Control-Allow-Credentials"] = "true"
            response["Access-Control-Max-Age"] = "86400"

        return response


class SubscriptionLimitMiddleware(MiddlewareMixin):
    """
    Enforce subscription limits on API usage
    """

    def process_request(self, request):
        # Skip for non-API paths
        if not request.path.startswith("/api/"):
            return None

        # Skip for authentication endpoints
        auth_paths = ["/api/auth/", "/api/subscription-plans/"]
        if any(request.path.startswith(path) for path in auth_paths):
            return None

        # Only check for authenticated users
        if hasattr(request, "user") and request.user.is_authenticated:
            try:
                # Try to get the user's subscription
                if hasattr(request.user, "subscription"):
                    subscription = request.user.subscription
                else:
                    # If no subscription exists, skip the checks for now
                    return None

                # Check if subscription is active
                if subscription.status not in ["active", "trial"]:
                    return JsonResponse(
                        {
                            "error": "Subscription expired or inactive",
                            "code": "SUBSCRIPTION_INACTIVE",
                        },
                        status=402,
                    )

                # Check transaction limits for transaction creation
                if (
                    request.path.startswith("/api/transactions/")
                    and request.method == "POST"
                ):
                    if (
                        subscription.transactions_this_month
                        >= subscription.plan.max_transactions_per_month
                    ):
                        return JsonResponse(
                            {
                                "error": "Monthly transaction limit exceeded",
                                "code": "TRANSACTION_LIMIT_EXCEEDED",
                                "limit": subscription.plan.max_transactions_per_month,
                            },
                            status=429,
                        )

                # Check account limits for account creation
                if (
                    request.path.startswith("/api/accounts/")
                    and request.method == "POST"
                ):
                    account_count = request.user.accounts.filter(is_active=True).count()
                    if account_count >= subscription.plan.max_accounts:
                        return JsonResponse(
                            {
                                "error": "Maximum accounts limit reached",
                                "code": "ACCOUNT_LIMIT_EXCEEDED",
                                "limit": subscription.plan.max_accounts,
                            },
                            status=429,
                        )

            except Exception:
                # If no subscription exists, create a free trial
                from .models import SubscriptionPlan, UserSubscription

                try:
                    free_plan = SubscriptionPlan.objects.get(plan_type="free")
                    UserSubscription.objects.create(
                        user=request.user,
                        plan=free_plan,
                        ai_credits_remaining=free_plan.ai_credits_per_month,
                    )
                except Exception:
                    pass

        return None


class APILoggingMiddleware(MiddlewareMixin):
    """
    Log API usage for analytics and billing
    """

    def process_response(self, request, response):
        # Only log API requests
        if not request.path.startswith("/api/"):
            return response

        # Skip logging for certain endpoints
        skip_paths = ["/api/auth/", "/api/ai-usage/"]
        if any(request.path.startswith(path) for path in skip_paths):
            return response

        # Log successful requests from authenticated users
        if (
            hasattr(request, "user")
            and request.user.is_authenticated
            and 200 <= response.status_code < 300
        ):
            # Update transaction count for POST requests to transactions
            if (
                request.path.startswith("/api/transactions/")
                and request.method == "POST"
            ):
                try:
                    subscription = request.user.subscription
                    subscription.transactions_this_month += 1
                    subscription.save()
                except Exception:
                    pass

        return response


class RequestResponseLoggingMiddleware(MiddlewareMixin):
    """
    Industry-level request/response logging middleware
    Logs all incoming requests and outgoing responses with timing information
    """

    def process_request(self, request):
        # Store request start time
        request._request_start_time = time.time()

        # Get client IP
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')

        # Get user info
        user_info = "Anonymous"
        if hasattr(request, 'user') and request.user.is_authenticated:
            user_info = f"{request.user.email} (ID: {request.user.id})"

        # Log request details
        request_logger.info(
            f"REQUEST | {request.method} {request.path} | "
            f"User: {user_info} | IP: {ip} | "
            f"User-Agent: {request.META.get('HTTP_USER_AGENT', 'Unknown')[:100]}"
        )

        # Log request body for POST/PUT/PATCH (excluding sensitive endpoints)
        if request.method in ['POST', 'PUT', 'PATCH']:
            sensitive_paths = ['/api/auth/login/', '/api/auth/register/', '/api/auth/']
            if not any(request.path.startswith(path) for path in sensitive_paths):
                try:
                    if hasattr(request, 'body') and request.body:
                        body = request.body.decode('utf-8')
                        if len(body) < 1000:  # Only log small bodies
                            request_logger.debug(f"REQUEST BODY | {request.path} | {body}")
                except Exception:
                    pass

    def process_response(self, request, response):
        # Calculate request duration
        duration = 0
        if hasattr(request, '_request_start_time'):
            duration = time.time() - request._request_start_time

        # Get user info
        user_info = "Anonymous"
        if hasattr(request, 'user') and request.user.is_authenticated:
            user_info = f"{request.user.email} (ID: {request.user.id})"

        # Get client IP
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')

        # Log level based on status code
        log_level = logging.INFO
        if response.status_code >= 500:
            log_level = logging.ERROR
        elif response.status_code >= 400:
            log_level = logging.WARNING

        # Log response
        request_logger.log(
            log_level,
            f"RESPONSE | {request.method} {request.path} | "
            f"Status: {response.status_code} | "
            f"Duration: {duration:.3f}s | "
            f"User: {user_info} | IP: {ip}"
        )

        # Log error responses with more detail
        if response.status_code >= 400:
            try:
                if hasattr(response, 'content') and response.content:
                    content = response.content.decode('utf-8')
                    if len(content) < 1000:  # Only log small responses
                        request_logger.warning(
                            f"ERROR RESPONSE | {request.path} | "
                            f"Status: {response.status_code} | "
                            f"Content: {content}"
                        )
            except Exception:
                pass

        return response

    def process_exception(self, request, exception):
        # Log exceptions
        user_info = "Anonymous"
        if hasattr(request, 'user') and request.user.is_authenticated:
            user_info = f"{request.user.email} (ID: {request.user.id})"

        request_logger.error(
            f"EXCEPTION | {request.method} {request.path} | "
            f"User: {user_info} | "
            f"Exception: {type(exception).__name__}: {str(exception)}",
            exc_info=True
        )

        return None

import logging
import time
from functools import wraps
from typing import Callable, Type, Tuple, Optional
import socket

import httplib2
from googleapiclient.errors import HttpError


logger = logging.getLogger(__name__)


class NetworkError(Exception):
    """Raised when network-related errors occur"""
    pass


class ServiceUnavailableError(Exception):
    """Raised when external service is temporarily unavailable"""
    pass


def is_transient_error(exception: Exception) -> bool:
    """
    Determine if an error is transient and should be retried.

    Transient errors include:
    - Network connectivity issues (socket errors, DNS failures)
    - Server errors (5xx status codes)
    - Rate limiting (429)
    - Temporary service unavailability
    """
    # Network-level errors
    if isinstance(exception, (socket.gaierror, socket.timeout, httplib2.error.ServerNotFoundError)):
        return True

    # Connection errors
    if isinstance(exception, (ConnectionError, ConnectionRefusedError, ConnectionResetError)):
        return True

    # HTTP errors from Google API
    if isinstance(exception, HttpError):
        # Retry on server errors (5xx) and rate limiting (429)
        status_code = exception.resp.status
        return status_code >= 500 or status_code == 429

    # Check error message for common transient patterns
    error_msg = str(exception).lower()
    transient_patterns = [
        'timeout',
        'timed out',
        'connection refused',
        'connection reset',
        'unable to find the server',
        'server not found',
        'network is unreachable',
        'temporary failure',
        'service unavailable',
    ]

    return any(pattern in error_msg for pattern in transient_patterns)


def retry_with_backoff(
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    exponential_base: float = 2.0,
    exceptions: Tuple[Type[Exception], ...] = (Exception,),
    on_retry: Optional[Callable[[Exception, int, float], None]] = None,
):
    """
    Decorator that retries a function with exponential backoff.

    Args:
        max_retries: Maximum number of retry attempts
        base_delay: Initial delay in seconds
        max_delay: Maximum delay between retries
        exponential_base: Base for exponential backoff calculation
        exceptions: Tuple of exception types to catch and retry
        on_retry: Optional callback function(exception, attempt, delay) called before each retry

    Returns:
        Decorated function with retry logic
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None

            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except exceptions as exc:
                    last_exception = exc

                    # Don't retry if this is not a transient error
                    if not is_transient_error(exc):
                        logger.warning(
                            "Non-transient error in %s: %s - not retrying",
                            func.__name__,
                            exc
                        )
                        raise

                    # Don't retry if we've exhausted attempts
                    if attempt >= max_retries:
                        logger.error(
                            "Max retries (%s) exceeded for %s: %s",
                            max_retries,
                            func.__name__,
                            exc
                        )
                        break

                    # Calculate delay with exponential backoff
                    delay = min(base_delay * (exponential_base ** attempt), max_delay)

                    logger.warning(
                        "Transient error in %s (attempt %s/%s): %s - retrying in %.2fs",
                        func.__name__,
                        attempt + 1,
                        max_retries,
                        exc,
                        delay
                    )

                    # Call on_retry callback if provided
                    if on_retry:
                        try:
                            on_retry(exc, attempt + 1, delay)
                        except Exception as callback_exc:
                            logger.warning("Error in retry callback: %s", callback_exc)

                    time.sleep(delay)

            # All retries exhausted, raise the last exception
            if last_exception:
                raise ServiceUnavailableError(
                    f"Service unavailable after {max_retries} retries: {last_exception}"
                ) from last_exception

        return wrapper
    return decorator


class CircuitBreaker:
    """
    Circuit breaker pattern implementation to prevent cascading failures.

    States:
    - CLOSED: Normal operation, requests pass through
    - OPEN: Too many failures, requests fail immediately
    - HALF_OPEN: Testing if service recovered, limited requests pass through
    """

    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: float = 60.0,
        expected_exception: Type[Exception] = Exception,
    ):
        """
        Args:
            failure_threshold: Number of failures before opening circuit
            recovery_timeout: Seconds to wait before attempting recovery
            expected_exception: Exception type to count as failure
        """
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.expected_exception = expected_exception

        self.failure_count = 0
        self.last_failure_time = None
        self.state = 'CLOSED'  # CLOSED, OPEN, HALF_OPEN

    def call(self, func: Callable, *args, **kwargs):
        """Execute function with circuit breaker protection"""
        if self.state == 'OPEN':
            # Check if we should attempt recovery
            if self._should_attempt_reset():
                self.state = 'HALF_OPEN'
                logger.info("Circuit breaker entering HALF_OPEN state for %s", func.__name__)
            else:
                time_until_retry = self.recovery_timeout - (time.time() - self.last_failure_time)
                raise ServiceUnavailableError(
                    f"Circuit breaker is OPEN for {func.__name__}. "
                    f"Retry in {time_until_retry:.1f}s"
                )

        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except self.expected_exception as exc:
            self._on_failure()
            raise

    def _should_attempt_reset(self) -> bool:
        """Check if enough time has passed to attempt recovery"""
        return (
            self.last_failure_time is not None and
            time.time() - self.last_failure_time >= self.recovery_timeout
        )

    def _on_success(self):
        """Reset failure count on success"""
        if self.state == 'HALF_OPEN':
            logger.info("Circuit breaker recovered, transitioning to CLOSED")
        self.failure_count = 0
        self.state = 'CLOSED'

    def _on_failure(self):
        """Increment failure count and potentially open circuit"""
        self.failure_count += 1
        self.last_failure_time = time.time()

        if self.state == 'HALF_OPEN':
            # Failed during recovery attempt, reopen circuit
            self.state = 'OPEN'
            logger.warning("Circuit breaker failed during recovery, reopening")
        elif self.failure_count >= self.failure_threshold:
            # Too many failures, open circuit
            self.state = 'OPEN'
            logger.error(
                "Circuit breaker opened after %s failures (threshold: %s)",
                self.failure_count,
                self.failure_threshold
            )

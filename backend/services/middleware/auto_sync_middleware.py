"""
Middleware to automatically trigger email sync when user visits any page.
Uses throttling to prevent excessive API calls.
"""

import logging
from django.core.cache import cache
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger(__name__)


class AutoEmailSyncMiddleware(MiddlewareMixin):
    """
    Automatically triggers throttled email sync when authenticated user makes a request.

    The sync is:
    - Non-blocking (runs in background)
    - Throttled (won't run too frequently)
    - Only for authenticated users
    - Only for specific endpoints (transactions, dashboard, etc.)
    """

    # Paths that should trigger auto-sync
    SYNC_TRIGGER_PATHS = (
        '/api/transactions/',
        '/api/finance/',
        '/api/dashboard/',
        '/api/accounts/',
    )
    
    # Cache key template for middleware throttling
    CACHE_KEY_MIDDLEWARE_THROTTLE = "auto_sync_trigger_{user_id}"
    MIDDLEWARE_THROTTLE_SECONDS = 60  # Don't trigger more than once per minute

    def process_request(self, request):
        """
        Called before the view is executed.
        Triggers background email sync if conditions are met.
        """
        # Fast path: early returns for non-eligible requests
        if not self._should_process_request(request):
            return None

        try:
            # Run sync in background (non-blocking)
            self._trigger_background_sync(request.user)
        except Exception as e:
            # Don't break the request if sync fails
            logger.error(f"Auto-sync middleware error for user {request.user.id}: {e}")

        return None
    
    def _should_process_request(self, request):
        """Check if request should trigger sync"""
        # Only process for authenticated users
        if not request.user or not request.user.is_authenticated:
            return False

        # Only trigger on GET requests (not POST/PUT/DELETE)
        if request.method != 'GET':
            return False

        # Check if this path should trigger sync
        return request.path.startswith(self.SYNC_TRIGGER_PATHS)

    def _trigger_background_sync(self, user):
        """Trigger sync in background using Celery"""
        from services.models import GmailAccount
        from services.tasks import auto_sync_user_emails
        
        # Middleware-level throttle to prevent excessive task queueing
        cache_key = self.CACHE_KEY_MIDDLEWARE_THROTTLE.format(user_id=user.id)
        if cache.get(cache_key):
            logger.debug(f"Auto-sync recently triggered for user {user.id}, skipping")
            return
        
        # Check if user has any Gmail accounts before querying
        # Use cache to avoid repeated DB queries
        gmail_cache_key = f"user_has_gmail_{user.id}"
        has_gmail = cache.get(gmail_cache_key)
        
        if has_gmail is None:
            has_gmail = GmailAccount.objects.filter(user=user).exists()
            # Cache for 5 minutes
            cache.set(gmail_cache_key, has_gmail, timeout=300)
        
        if not has_gmail:
            logger.debug(f"Skipping auto-sync for user {user.id}: No Gmail accounts configured")
            return

        # Queue the task (non-blocking)
        auto_sync_user_emails.delay(user.id)
        
        # Set middleware throttle
        cache.set(cache_key, True, timeout=self.MIDDLEWARE_THROTTLE_SECONDS)
        
        logger.debug(f"Auto-sync queued for user {user.id}")

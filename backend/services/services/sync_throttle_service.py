"""
Throttling service for email sync operations
Prevents excessive API calls to Gmail when users visit transaction pages
"""

from datetime import timedelta
from django.utils import timezone
from django.core.cache import cache
from django.db.models import Q, Count
from services.models import GmailAccount
from services.services.email_sync_service import EmailSyncService
from services.services.email_processor_service import EmailProcessorService
import logging

logger = logging.getLogger(__name__)


class SyncThrottleService:
    """
    Manages throttled email sync operations.
    Ensures we don't fetch emails too frequently for the same user.
    """

    # Default throttle periods (in minutes)
    DEFAULT_FETCH_INTERVAL = 15  # Fetch new emails every 15 minutes
    DEFAULT_PROCESS_INTERVAL = 5  # Process pending emails every 5 minutes
    
    # Cache key templates
    CACHE_KEY_FETCH = "email_fetch_{account_id}"
    CACHE_KEY_PROCESS = "email_process_{user_id}"

    def __init__(self, user):
        self.user = user
        self.email_sync_service = EmailSyncService()
        self.email_processor_service = EmailProcessorService(user)
        self._gmail_accounts_cache = None

    def _get_cache_key(self, key_type, identifier=None):
        """Generate cache key for throttling"""
        if key_type == 'fetch':
            return self.CACHE_KEY_FETCH.format(account_id=identifier)
        elif key_type == 'process':
            return self.CACHE_KEY_PROCESS.format(user_id=identifier or self.user.id)
        raise ValueError(f"Invalid key_type: {key_type}")
    
    def _get_active_gmail_accounts(self):
        """Get and cache user's active Gmail accounts"""
        if self._gmail_accounts_cache is None:
            self._gmail_accounts_cache = list(
                GmailAccount.objects.filter(user=self.user, is_active=True)
                .select_related('user')
                .only('id', 'email', 'last_sync_at', 'user_id')
            )
        return self._gmail_accounts_cache
    
    def _is_throttled(self, cache_key, last_time, interval_minutes):
        """Generic throttle check"""
        # Check cache first (faster)
        if cache.get(cache_key):
            return True
        
        # Check database time if available
        if last_time:
            time_since = timezone.now() - last_time
            if time_since < timedelta(minutes=interval_minutes):
                return True
        
        return False

    def should_fetch_emails(self, gmail_account):
        """Check if enough time has passed since last fetch"""
        cache_key = self._get_cache_key('fetch', gmail_account.id)
        return not self._is_throttled(
            cache_key, 
            gmail_account.last_sync_at, 
            self.DEFAULT_FETCH_INTERVAL
        )

    def should_process_emails(self):
        """Check if enough time has passed since last processing"""
        cache_key = self._get_cache_key('process')
        return not self._is_throttled(cache_key, None, self.DEFAULT_PROCESS_INTERVAL)

    def _mark_completed(self, key_type, identifier=None, interval_minutes=None):
        """Generic method to mark operation as completed"""
        cache_key = self._get_cache_key(key_type, identifier)
        timeout = (interval_minutes or self.DEFAULT_FETCH_INTERVAL) * 60
        cache.set(cache_key, timezone.now().isoformat(), timeout=timeout)

    def mark_fetch_completed(self, gmail_account):
        """Mark that we just fetched emails for this account"""
        self._mark_completed('fetch', gmail_account.id, self.DEFAULT_FETCH_INTERVAL)

    def mark_process_completed(self):
        """Mark that we just processed emails for this user"""
        self._mark_completed('process', interval_minutes=self.DEFAULT_PROCESS_INTERVAL)

    def sync_and_process(self, force=False, email_limit=50):
        """
        Throttled sync and process operation.
        This is the main method to call when user visits transactions page.

        Args:
            force: If True, bypass throttling
            email_limit: Maximum number of emails to fetch per account

        Returns:
            dict with sync results and status
        """
        results = {
            "fetch": {"attempted": False, "accounts": []},
            "process": {"attempted": False, "results": None},
            "throttled": False,
            "message": "",
        }

        # Get user's active Gmail accounts with optimized query
        gmail_accounts = self._get_active_gmail_accounts()
        
        if not gmail_accounts:
            return self._handle_no_active_accounts(results)

        # STAGE 1: Fetch emails (if not throttled)
        self._fetch_emails_stage(gmail_accounts, force, email_limit, results)

        # STAGE 2: Process pending emails (if not throttled)
        self._process_emails_stage(force, email_limit, results)
        
        # Build final message
        self._build_result_message(results)
        
        return results
    
    def _handle_no_active_accounts(self, results):
        """Handle case when user has no active Gmail accounts"""
        # Single optimized query to get all accounts and check for inactive ones
        all_accounts = GmailAccount.objects.filter(user=self.user).values('email', 'is_active')
        inactive_accounts = [acc['email'] for acc in all_accounts if not acc['is_active']]
        
        logger.info(f"User {self.user.id} has {len(all_accounts)} total, {len(inactive_accounts)} inactive Gmail accounts")
        
        if inactive_accounts:
            inactive_emails = ", ".join(inactive_accounts)
            results["message"] = f"No active Gmail accounts found. Found {len(inactive_accounts)} inactive account(s): {inactive_emails}"
            logger.warning(f"User {self.user.id} has inactive Gmail account(s): {inactive_emails}")
        else:
            results["message"] = "No Gmail accounts found"
            logger.debug(f"User {self.user.id} has no Gmail accounts")
        
        return results
    
    def _fetch_emails_stage(self, gmail_accounts, force, email_limit, results):
        """Stage 1: Fetch emails from Gmail accounts"""
        fetch_needed = False
        
        for account in gmail_accounts:
            if not (force or self.should_fetch_emails(account)):
                continue
            
            fetch_needed = True
            results["fetch"]["attempted"] = True
            
            try:
                logger.info(f"Fetching emails for account {account.id} ({account.email})")
                fetch_result = self.email_sync_service.sync_account_emails(
                    account, limit=email_limit
                )
                
                results["fetch"]["accounts"].append({
                    "account_id": account.id,
                    "email": account.email,
                    "result": fetch_result
                })
                
                self.mark_fetch_completed(account)
                
            except Exception as e:
                logger.error(f"Error fetching emails for account {account.id}: {e}", exc_info=True)
                results["fetch"]["accounts"].append({
                    "account_id": account.id,
                    "email": account.email,
                    "error": str(e)
                })
        
        if not fetch_needed and not force:
            results["throttled"] = True
            results["message"] = f"Email fetch throttled. Next fetch in {self.DEFAULT_FETCH_INTERVAL} minutes."
    
    def _process_emails_stage(self, force, email_limit, results):
        """Stage 2: Process pending emails"""
        if not (force or self.should_process_emails()):
            if not results["throttled"]:
                results["throttled"] = True
                results["message"] = f"Email processing throttled. Next process in {self.DEFAULT_PROCESS_INTERVAL} minutes."
            return
        
        try:
            logger.info(f"Processing pending emails for user {self.user.id}")
            process_result = self.email_processor_service.process_pending_emails(
                limit=email_limit, max_attempts=3
            )
            
            results["process"]["attempted"] = True
            results["process"]["results"] = process_result
            
            self.mark_process_completed()
            
        except Exception as e:
            logger.error(f"Error processing emails for user {self.user.id}: {e}", exc_info=True)
            results["process"]["error"] = str(e)
    
    def _build_result_message(self, results):
        """Build final result message based on operation results"""
        if not (results["fetch"]["attempted"] or results["process"]["attempted"]):
            return
        
        fetch_count = sum(
            acc.get("result", {}).get("stored", 0)
            for acc in results["fetch"]["accounts"]
        )
        process_count = results["process"].get("results", {}).get("created", 0)
        
        results["message"] = f"Fetched {fetch_count} emails, created {process_count} transactions"

    def get_next_sync_time(self):
        """Get the time when next sync will be allowed"""
        gmail_accounts = self._get_active_gmail_accounts()
        
        if not gmail_accounts:
            return None
        
        # Find earliest next sync time across all accounts
        next_sync_times = [
            account.last_sync_at + timedelta(minutes=self.DEFAULT_FETCH_INTERVAL)
            for account in gmail_accounts
            if account.last_sync_at
        ]
        
        return min(next_sync_times) if next_sync_times else None

    def get_sync_status(self):
        """Get current sync status for user"""
        from training.models import RawEmail

        gmail_accounts = self._get_active_gmail_accounts()

        status = {
            "can_fetch": False,
            "can_process": self.should_process_emails(),
            "next_fetch_time": None,
            "accounts": [],
            "pending_emails": 0,
            "failed_emails": 0
        }

        # Build account status
        for account in gmail_accounts:
            can_fetch = self.should_fetch_emails(account)
            status["can_fetch"] = status["can_fetch"] or can_fetch

            status["accounts"].append({
                "id": account.id,
                "email": account.email,
                "last_sync": account.last_sync_at.isoformat() if account.last_sync_at else None,
                "can_fetch": can_fetch
            })

        # Single optimized query for email counts
        email_counts = RawEmail.objects.filter(
            user=self.user,
            processing_status__in=['pending', 'failed']
        ).values('processing_status').annotate(count=Count('id'))
        
        count_dict = {item['processing_status']: item['count'] for item in email_counts}
        status['pending_emails'] = count_dict.get('pending', 0)
        status['failed_emails'] = count_dict.get('failed', 0)

        # Get next fetch time
        status["next_fetch_time"] = self.get_next_sync_time()
        if status["next_fetch_time"]:
            status["next_fetch_time"] = status["next_fetch_time"].isoformat()

        return status

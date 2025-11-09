from celery import shared_task
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.conf import settings
from services.models import GmailAccount
from services.services.email_sync_service import EmailSyncService
import logging

User = get_user_model()

# Configure logging
logger = logging.getLogger(__name__)


@shared_task
def sync_gmail_account(account_id):
    """Sync emails for a specific Gmail account"""
    try:
        gmail_account = GmailAccount.objects.get(id=account_id, is_active=True)
        sync_service = EmailSyncService()
        limit = settings.EMAIL_FETCH_LIMIT
        result = sync_service.sync_account_emails(gmail_account, limit=limit)

        logger.info(f"Email sync completed for account {account_id}: {result}")
        return result
    except GmailAccount.DoesNotExist:
        logger.error(f"Gmail account {account_id} not found or inactive")
        return {"error": "Account not found or inactive"}
    except Exception as e:
        logger.error(f"Error syncing Gmail account {account_id}: {str(e)}")
        return {"error": str(e)}


@shared_task
def sync_all_gmail_accounts():
    """
    Periodic task to sync emails for all active Gmail accounts.
    This is STAGE 1 - stores raw emails only.
    """
    active_accounts = GmailAccount.objects.filter(is_active=True)

    if not active_accounts.exists():
        logger.info("No active Gmail accounts found for email sync")
        return {"message": "No active accounts", "accounts_processed": 0}

    logger.info(f"Starting email sync for {active_accounts.count()} active Gmail accounts")

    results = {"accounts_processed": 0, "accounts_failed": 0}

    for account in active_accounts:
        try:
            logger.info(f"Triggering email sync for account {account.id} ({account.email})")
            sync_gmail_account.delay(account.id)
            results["accounts_processed"] += 1
        except Exception as e:
            logger.error(f"Failed to trigger email sync for account {account.id}: {e}")
            results["accounts_failed"] += 1

    logger.info(f"Email sync tasks queued: {results}")
    return results


@shared_task(
    bind=True,
    max_retries=2,
    default_retry_delay=300,  # 5 minutes
    autoretry_for=(Exception,),
    retry_backoff=True,
)
def auto_sync_user_emails(self, user_id):
    """
    Auto-sync emails for a user with throttling.
    Called automatically when user visits transaction pages.
    This is non-blocking and respects throttle limits.

    Args:
        user_id: User ID to sync emails for
        
    Returns:
        dict: Sync results with fetch/process status
    """
    from services.services.sync_throttle_service import SyncThrottleService

    try:
        # Use select_related to optimize user fetch if needed
        user = User.objects.select_related().get(id=user_id)
        throttle_service = SyncThrottleService(user)

        # Run throttled sync (will skip if too recent)
        result = throttle_service.sync_and_process(
            force=False,  # Respect throttling
            email_limit=50  # Limit emails per sync
        )

        # Log at appropriate level based on result
        log_level = logger.info if result.get('fetch', {}).get('attempted') or result.get('process', {}).get('attempted') else logger.debug
        log_level(f"Auto-sync completed for user {user_id}: {result.get('message', 'No message')}")

        if any(
            (account.get("result") or {}).get("stored", 0) > 0
            for account in result.get("fetch", {}).get("accounts", [])
        ):
            try:
                from training.tasks import refresh_email_training_artifacts

                refresh_email_training_artifacts.delay()
            except Exception as task_err:  # pragma: no cover - best effort
                logger.warning(
                    "Failed to enqueue training refresh after sync for user %s: %s",
                    user_id,
                    task_err,
                )

        return result

    except User.DoesNotExist:
        logger.error(f"User {user_id} not found for auto-sync")
        return {"error": "User not found", "user_id": user_id}
    except Exception as e:
        logger.error(f"Auto-sync failed for user {user_id}: {e}", exc_info=True)
        # Re-raise to trigger Celery retry
        raise

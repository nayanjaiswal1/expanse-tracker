from __future__ import annotations

import logging
from typing import Dict, Optional, Sequence

from django.db.models import QuerySet

from services.models import GmailAccount
from services.services.email_sync_service import EmailSyncService
from services.services.sync_throttle_service import SyncThrottleService

logger = logging.getLogger(__name__)


class EmailIngestionCoordinator:
    """
    Orchestrates Gmail email fetching with throttle awareness.

    Centralising this logic makes ingestion reusable across Celery tasks,
    REST views, and training pipelines without duplicating throttling rules.
    """

    def __init__(
        self,
        limit: int = 200,
        force: bool = False,
        sync_service: Optional[EmailSyncService] = None,
    ) -> None:
        self.limit = limit
        self.force = force
        self.sync_service = sync_service or EmailSyncService()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def sync_accounts(
        self,
        account_ids: Optional[Sequence[int]] = None,
    ) -> Dict[str, object]:
        """
        Fetch emails for the specified accounts (or all active ones).
        """
        accounts_qs = self._get_accounts_queryset(account_ids)
        results = self._init_results()

        for account in accounts_qs:
            account_result = self._sync_single_account(account)
            results["accounts"].append(account_result)

            if account_result.get("stored"):
                results["total_stored"] += account_result["stored"]
            if account_result.get("error"):
                results["errors"].append(account_result["error"])

        return results

    def sync_user_accounts(
        self,
        user,
        force: Optional[bool] = None,
    ) -> Dict[str, object]:
        """
        Fetch emails for a user's active Gmail accounts.
        """
        accounts_qs = GmailAccount.objects.filter(user=user, is_active=True)
        results = self._init_results()

        for account in accounts_qs:
            account_result = self._sync_single_account(account, force_override=force)
            results["accounts"].append(account_result)

            if account_result.get("stored"):
                results["total_stored"] += account_result["stored"]
            if account_result.get("error"):
                results["errors"].append(account_result["error"])

        return results

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    def _get_accounts_queryset(
        self,
        account_ids: Optional[Sequence[int]],
    ) -> QuerySet:
        qs = GmailAccount.objects.filter(is_active=True)
        if account_ids:
            qs = qs.filter(id__in=account_ids)
        return qs.select_related("user")

    def _sync_single_account(
        self,
        account: GmailAccount,
        force_override: Optional[bool] = None,
    ) -> Dict[str, object]:
        throttling_forced = self.force if force_override is None else force_override

        coordinator_result: Dict[str, object] = {
            "account_id": account.id,
            "email": account.email,
            "stored": 0,
            "skipped": 0,
            "throttled": False,
            "reason": None,
            "error": None,
        }

        throttle = SyncThrottleService(account.user)
        if not throttling_forced and not throttle.should_fetch_emails(account):
            coordinator_result["throttled"] = True
            coordinator_result["reason"] = "throttled"
            return coordinator_result

        try:
            response = self.sync_service.sync_account_emails(account, limit=self.limit)
            coordinator_result["stored"] = response.get("stored", 0)
            coordinator_result["skipped"] = response.get("skipped", 0)
            coordinator_result["reason"] = response.get("reason")
            if not throttling_forced:
                throttle.mark_fetch_completed(account)
            logger.info(
                "Email ingestion completed for account %s (%s): %s",
                account.id,
                account.email,
                response,
            )
        except Exception as exc:  # pragma: no cover - defensive logging
            logger.exception("Failed to sync Gmail account %s", account.id)
            coordinator_result["error"] = {
                "account_id": account.id,
                "email": account.email,
                "message": str(exc),
            }
            coordinator_result["reason"] = "error"

        return coordinator_result

    @staticmethod
    def _init_results() -> Dict[str, object]:
        return {
            "accounts": [],
            "total_stored": 0,
            "errors": [],
        }

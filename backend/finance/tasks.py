"""
Celery tasks for finance app background processing.
"""

from celery import shared_task
from django.contrib.auth import get_user_model
from django.db import transaction

from .models import UploadSession
from .services.upload_service import UploadService

User = get_user_model()


@shared_task(bind=True, max_retries=2, default_retry_delay=60)
def process_upload_session_task(self, upload_session_id: int, user_id: int, password: str | None = None):
    """
    Background task to process an upload session.

    Args:
        upload_session_id: The UploadSession id to process
        user_id: The user id who owns the session
        password: Optional password for PDF decryption
    Returns:
        Dict with processing summary
    """
    try:
        user = User.objects.get(id=user_id)
        session = UploadSession.objects.get(id=upload_session_id, user=user)

        service = UploadService(user)
        result = service.process_upload_session(session, password=password)
        return result
    except Exception as exc:
        # Retry transient errors
        try:
            self.retry(exc=exc)
        except self.MaxRetriesExceededError:
            return {"success": False, "error": str(exc)}

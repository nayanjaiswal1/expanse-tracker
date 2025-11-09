"""
Transaction signals for automatic deduplication and data quality.

Automatically detects and handles duplicate transactions when they are created.
"""

import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings

from finance.models import Transaction
from finance.services.transaction_deduplication_service import TransactionDeduplicationService

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Transaction)
def auto_detect_duplicate_transactions(sender, instance, created, **kwargs):
    """
    Automatically detect and handle duplicate transactions after creation.

    When a new transaction is created:
    1. Check for potential duplicates
    2. If high-confidence duplicate found (≥95%), log a warning
    3. Store duplicate info in metadata for user review

    Note: We don't auto-merge to avoid false positives. Users can review and
    merge duplicates via the UI or run auto-merge explicitly.
    """
    # Only run for newly created transactions
    if not created:
        return

    # Skip if already soft-deleted
    if instance.is_deleted:
        return

    # Skip if auto-deduplication is disabled in settings
    if not getattr(settings, 'AUTO_DETECT_DUPLICATES', True):
        return

    try:
        dedup_service = TransactionDeduplicationService()

        # Find potential duplicates
        duplicates = dedup_service.find_duplicates_for_transaction(instance)

        if duplicates:
            # Get the highest confidence duplicate
            best_duplicate, confidence, reasons = duplicates[0]

            # Log for monitoring
            logger.info(
                f"Potential duplicate detected for Transaction {instance.id}: "
                f"matches Transaction {best_duplicate.id} with confidence {confidence:.2f}"
            )

            # Store duplicate info in metadata for user review
            metadata = instance.metadata or {}
            duplicate_info = {
                'potential_duplicate_detected': True,
                'duplicate_transaction_id': best_duplicate.id,
                'duplicate_confidence': float(confidence),
                'duplicate_reasons': reasons,
                'requires_user_review': True
            }

            # If very high confidence (≥98%), mark as likely duplicate
            if confidence >= 0.98:
                duplicate_info['likely_duplicate'] = True
                logger.warning(
                    f"High-confidence duplicate detected for Transaction {instance.id} "
                    f"(confidence: {confidence:.2f}). User should review and merge."
                )

            metadata['duplicate_detection'] = duplicate_info

            # Update transaction metadata without triggering signal again
            Transaction.objects.filter(id=instance.id).update(metadata=metadata)

    except Exception as e:
        # Don't fail transaction creation if deduplication fails
        logger.error(
            f"Error in automatic duplicate detection for Transaction {instance.id}: {str(e)}",
            exc_info=True
        )

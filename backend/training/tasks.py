from __future__ import annotations

import logging
from typing import Optional

from celery import shared_task
from django.contrib.auth import get_user_model

from .pipeline.email_training_pipeline import EmailTrainingPipeline
from training.models import RawEmail, AILabel, UnifiedTransaction
from training.services.label_extract_service import LabelAndExtractService
from training.services.merge_service import MergeService
from training.services.retraining_service import RetrainingService

User = get_user_model()
logger = logging.getLogger(__name__)


@shared_task
def refresh_email_training_artifacts(limit: Optional[int] = None, train: bool = False) -> dict:
    """
    Build the latest RawEmail dataset and optionally train the baseline classifier.

    Args:
        limit: Optional cap on number of records to include.
        train: When True, train the baseline classifier after exporting the dataset.

    Returns:
        Dict summarising dataset size, artifact path, and optional training metrics.
    """
    pipeline = EmailTrainingPipeline()

    dataset = pipeline.build_dataset(limit=limit, include_html=False)
    artifact_path = pipeline.export_dataset(dataset=dataset)

    response = {
        "records": len(dataset),
        "artifact_path": str(artifact_path),
        "trained": False,
        "metrics": None,
    }

    if train:
        result = pipeline.train_baseline_classifier(dataset=dataset, persist_model=True)
        response["trained"] = True
        response["metrics"] = result.metrics
        response["model_path"] = str(result.model_path) if result.model_path else None

    return response


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=300,
    autoretry_for=(Exception,),
    retry_backoff=True,
)
def process_pending_emails(self, limit: int = 100, user_id: int = None) -> dict:
    """
    Process pending RawEmails: classify and extract transaction data using LLM.

    Args:
        limit: Maximum number of emails to process
        user_id: Optional user ID to filter emails

    Returns:
        Dict with processing statistics
    """
    logger.info(f"Starting AI email processing (limit={limit}, user_id={user_id})")

    service = LabelAndExtractService()

    # Build queryset
    queryset = RawEmail.objects.filter(
        processing_status='pending',
        ai_label__isnull=True
    )

    if user_id:
        queryset = queryset.filter(user_id=user_id)

    # Process emails
    stats = service.batch_process_emails(
        queryset=queryset,
        limit=limit,
        skip_processed=True
    )

    logger.info(f"AI email processing complete: {stats}")
    return stats


@shared_task
def process_single_email(email_id: int, force: bool = False) -> dict:
    """
    Process a single RawEmail with AI labeling.

    Args:
        email_id: RawEmail ID to process
        force: Force reprocessing even if already labeled

    Returns:
        Dict with processing result
    """
    try:
        raw_email = RawEmail.objects.get(id=email_id)
        service = LabelAndExtractService()

        ai_label = service.process_email(raw_email, force=force)

        if ai_label:
            return {
                'success': True,
                'email_id': email_id,
                'label': ai_label.label,
                'confidence': float(ai_label.label_confidence),
                'is_transaction': ai_label.is_transaction()
            }
        else:
            return {
                'success': False,
                'email_id': email_id,
                'error': 'Processing failed'
            }

    except RawEmail.DoesNotExist:
        logger.error(f"RawEmail {email_id} not found")
        return {
            'success': False,
            'email_id': email_id,
            'error': 'Email not found'
        }
    except Exception as e:
        logger.error(f"Failed to process email {email_id}: {e}", exc_info=True)
        return {
            'success': False,
            'email_id': email_id,
            'error': str(e)
        }


@shared_task
def merge_user_transactions(user_id: int, limit: int = None) -> dict:
    """
    Merge related transaction AILabels into UnifiedTransactions for a user.

    Args:
        user_id: User ID to process
        limit: Optional limit on number of labels to process

    Returns:
        Dict with merge statistics
    """
    try:
        user = User.objects.get(id=user_id)
        service = MergeService()

        stats = service.merge_user_transactions(user=user, limit=limit)

        logger.info(f"Merged transactions for user {user_id}: {stats}")
        return stats

    except User.DoesNotExist:
        logger.error(f"User {user_id} not found")
        return {'error': 'User not found', 'user_id': user_id}
    except Exception as e:
        logger.error(f"Failed to merge transactions for user {user_id}: {e}", exc_info=True)
        return {'error': str(e), 'user_id': user_id}


@shared_task
def merge_all_user_transactions(limit_per_user: int = None) -> dict:
    """
    Merge transactions for all users with pending AILabels.

    Args:
        limit_per_user: Optional limit on labels per user

    Returns:
        Dict with overall statistics
    """
    logger.info("Starting bulk transaction merge for all users")

    service = MergeService()
    overall_stats = {
        'users_processed': 0,
        'total_labels': 0,
        'total_unified': 0,
        'total_merged': 0,
    }

    # Find users with unmerged transaction labels
    user_ids = AILabel.objects.filter(
        label='TRANSACTION',
        unified_transactions__isnull=True
    ).values_list('raw_email__user_id', flat=True).distinct()

    for user_id in user_ids:
        try:
            user = User.objects.get(id=user_id)
            stats = service.merge_user_transactions(user=user, limit=limit_per_user)

            overall_stats['users_processed'] += 1
            overall_stats['total_labels'] += stats.get('total_labels', 0)
            overall_stats['total_unified'] += stats.get('new_unified', 0)
            overall_stats['total_merged'] += stats.get('merged_to_existing', 0)

        except Exception as e:
            logger.error(f"Failed to merge for user {user_id}: {e}")

    logger.info(f"Bulk merge complete: {overall_stats}")
    return overall_stats


@shared_task
def generate_training_dataset(
    name: str,
    version: str,
    description: str = "",
    min_confidence: float = 0.7,
    user_verified_only: bool = False
) -> dict:
    """
    Generate a training dataset from labeled emails.

    Args:
        name: Dataset name
        version: Version string (e.g., "v1.0.0")
        description: Dataset description
        min_confidence: Minimum confidence score
        user_verified_only: Only include user-verified labels

    Returns:
        Dict with dataset info
    """
    try:
        service = RetrainingService()

        dataset = service.generate_dataset(
            name=name,
            version=version,
            description=description,
            min_confidence=min_confidence,
            user_verified_only=user_verified_only
        )

        return {
            'success': True,
            'dataset_id': dataset.id,
            'version': dataset.version,
            'total_samples': dataset.total_samples,
            'transaction_samples': dataset.transaction_samples,
            'non_transaction_samples': dataset.non_transaction_samples,
            'training_file': dataset.training_file_path,
            'validation_file': dataset.validation_file_path,
        }

    except Exception as e:
        logger.error(f"Failed to generate training dataset: {e}", exc_info=True)
        return {
            'success': False,
            'error': str(e)
        }


@shared_task
def periodic_training_dataset_generation() -> dict:
    """
    Periodic task to generate updated training datasets.
    Run daily or weekly to capture new labeled data.

    Returns:
        Dict with generation result
    """
    from datetime import datetime

    version = f"auto_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

    return generate_training_dataset(
        name="automated_dataset",
        version=version,
        description="Automatically generated training dataset",
        min_confidence=0.75,
        user_verified_only=False
    )

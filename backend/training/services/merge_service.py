"""
Service for merging related AILabels into UnifiedTransactions.

Merge Algorithm:
----------------
Two transactions are considered mergeable if they match on:
1. Amount (exact or very close, within 1% tolerance)
2. Date (within ±2 days)
3. Merchant (fuzzy string matching)
4. Reference ID (exact match if present)

Scoring:
- Exact amount + exact date + exact merchant + reference match = 1.0 (perfect match)
- Exact amount + date match + fuzzy merchant = 0.85
- Amount match + date match = 0.70
- Reference ID match alone = 0.95 (strong signal)

Minimum merge threshold: 0.75
"""

import logging
from typing import List, Dict, Optional, Tuple
from decimal import Decimal
from datetime import timedelta
from difflib import SequenceMatcher

from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from training.models import AILabel, UnifiedTransaction

logger = logging.getLogger(__name__)


class MergeService:
    """
    Service to merge related AILabels into UnifiedTransactions.
    """

    # Merge scoring thresholds
    MERGE_THRESHOLD = 0.75
    AMOUNT_TOLERANCE_PERCENT = 0.01  # 1% tolerance for amount matching
    DATE_WINDOW_DAYS = 2  # ±2 days for date matching
    MERCHANT_SIMILARITY_THRESHOLD = 0.7  # Fuzzy string match threshold

    def __init__(self):
        self.merge_threshold = getattr(
            settings, 'TRANSACTION_MERGE_THRESHOLD', self.MERGE_THRESHOLD
        )

    def merge_user_transactions(self, user, limit: int = None) -> Dict:
        """
        Process all transaction AILabels for a user and merge related ones.

        Args:
            user: User instance
            limit: Optional limit on number of labels to process

        Returns:
            Dict with merge statistics
        """
        # Get all transaction labels for this user that haven't been unified
        queryset = AILabel.objects.filter(
            raw_email__user=user,
            label='TRANSACTION',
            amount__isnull=False,
            transaction_date__isnull=False
        ).select_related('raw_email').order_by('-transaction_date')

        if limit:
            queryset = queryset[:limit]

        stats = {
            'total_labels': 0,
            'new_unified': 0,
            'merged_to_existing': 0,
            'skipped': 0,
        }

        for ai_label in queryset:
            stats['total_labels'] += 1

            # Check if already part of a unified transaction
            if ai_label.unified_transactions.exists():
                stats['skipped'] += 1
                continue

            # Find potential matches
            unified_tx = self._find_or_create_unified_transaction(ai_label)

            if unified_tx:
                # Check if this is a new unified transaction
                if unified_tx.source_ai_labels.count() == 1:
                    stats['new_unified'] += 1
                else:
                    stats['merged_to_existing'] += 1

        logger.info(f"Merge complete for user {user.id}: {stats}")
        return stats

    def _find_or_create_unified_transaction(
        self,
        ai_label: AILabel
    ) -> Optional[UnifiedTransaction]:
        """
        Find a matching unified transaction or create a new one.

        Args:
            ai_label: AILabel to merge

        Returns:
            UnifiedTransaction instance
        """
        user = ai_label.raw_email.user

        # Find potential matches
        candidates = self._find_merge_candidates(ai_label, user)

        best_match = None
        best_score = 0.0

        for candidate, score in candidates:
            if score >= self.merge_threshold and score > best_score:
                best_match = candidate
                best_score = score

        if best_match:
            # Merge into existing unified transaction
            logger.info(
                f"Merging AILabel {ai_label.id} into UnifiedTransaction {best_match.id} "
                f"(confidence: {best_score:.2f})"
            )
            self._merge_into_transaction(ai_label, best_match, best_score)
            return best_match
        else:
            # Create new unified transaction
            logger.info(f"Creating new UnifiedTransaction from AILabel {ai_label.id}")
            return self._create_unified_transaction(ai_label)

    def _find_merge_candidates(
        self,
        ai_label: AILabel,
        user
    ) -> List[Tuple[UnifiedTransaction, float]]:
        """
        Find candidate unified transactions for merging.

        Args:
            ai_label: AILabel to find matches for
            user: User instance

        Returns:
            List of (UnifiedTransaction, confidence_score) tuples
        """
        # Date window for searching
        date_start = ai_label.transaction_date - timedelta(days=self.DATE_WINDOW_DAYS)
        date_end = ai_label.transaction_date + timedelta(days=self.DATE_WINDOW_DAYS)

        # Amount tolerance
        amount_min = ai_label.amount * (1 - Decimal(str(self.AMOUNT_TOLERANCE_PERCENT)))
        amount_max = ai_label.amount * (1 + Decimal(str(self.AMOUNT_TOLERANCE_PERCENT)))

        # Find candidates with similar amount and date
        candidates_qs = UnifiedTransaction.objects.filter(
            user=user,
            amount__gte=amount_min,
            amount__lte=amount_max,
            transaction_date__gte=date_start,
            transaction_date__lte=date_end,
            is_duplicate=False
        )

        # Also search by reference ID if available
        if ai_label.reference_id:
            ref_candidates = UnifiedTransaction.objects.filter(
                user=user,
                reference_ids__contains=[ai_label.reference_id],
                is_duplicate=False
            )
            # Combine querysets
            candidates_qs = (candidates_qs | ref_candidates).distinct()

        candidates = []

        for unified_tx in candidates_qs:
            score = self._calculate_merge_score(ai_label, unified_tx)
            if score > 0:
                candidates.append((unified_tx, score))

        # Sort by score descending
        candidates.sort(key=lambda x: x[1], reverse=True)

        return candidates

    def _calculate_merge_score(
        self,
        ai_label: AILabel,
        unified_tx: UnifiedTransaction
    ) -> float:
        """
        Calculate merge confidence score between AILabel and UnifiedTransaction.

        Scoring algorithm:
        - Reference ID exact match: +0.95 (very strong signal)
        - Amount exact match: +0.30
        - Amount within tolerance: +0.20
        - Date exact match (same day): +0.25
        - Date within window: +0.15
        - Merchant exact match: +0.25
        - Merchant fuzzy match (>0.7 similarity): +0.15
        - Transaction type match: +0.10

        Args:
            ai_label: AILabel to score
            unified_tx: UnifiedTransaction to compare against

        Returns:
            Confidence score (0.0 to 1.0)
        """
        score = 0.0
        reasons = []

        # 1. Reference ID match (strongest signal)
        if ai_label.reference_id:
            if ai_label.reference_id in unified_tx.get_all_reference_ids():
                score += 0.95
                reasons.append("reference_id_exact_match")
                # If reference matches, this is almost certainly the same transaction
                return min(score, 1.0)

        # 2. Amount matching
        if ai_label.amount == unified_tx.amount:
            score += 0.30
            reasons.append("amount_exact_match")
        else:
            # Check tolerance
            diff_percent = abs(
                (ai_label.amount - unified_tx.amount) / unified_tx.amount
            )
            if diff_percent <= Decimal(str(self.AMOUNT_TOLERANCE_PERCENT)):
                score += 0.20
                reasons.append("amount_within_tolerance")

        # 3. Date matching
        if ai_label.transaction_date.date() == unified_tx.transaction_date.date():
            score += 0.25
            reasons.append("date_exact_match")
        else:
            date_diff = abs(
                (ai_label.transaction_date - unified_tx.transaction_date).days
            )
            if date_diff <= self.DATE_WINDOW_DAYS:
                score += 0.15
                reasons.append(f"date_within_window({date_diff}days)")

        # 4. Merchant matching
        if ai_label.merchant and unified_tx.merchant:
            merchant_similarity = self._string_similarity(
                ai_label.merchant.lower(),
                unified_tx.merchant.lower()
            )

            if merchant_similarity >= 0.95:
                score += 0.25
                reasons.append("merchant_exact_match")
            elif merchant_similarity >= self.MERCHANT_SIMILARITY_THRESHOLD:
                score += 0.15
                reasons.append(f"merchant_fuzzy_match({merchant_similarity:.2f})")

            # Also check against merchant variants
            for variant in unified_tx.get_all_merchant_variants():
                variant_similarity = self._string_similarity(
                    ai_label.merchant.lower(),
                    variant.lower()
                )
                if variant_similarity >= 0.95:
                    score += 0.10
                    reasons.append("merchant_variant_match")
                    break

        # 5. Transaction type match
        if ai_label.transaction_type == unified_tx.transaction_type:
            score += 0.10
            reasons.append("transaction_type_match")

        logger.debug(
            f"Merge score for AILabel {ai_label.id} vs UnifiedTx {unified_tx.id}: "
            f"{score:.2f} ({', '.join(reasons)})"
        )

        return min(score, 1.0)

    def _string_similarity(self, str1: str, str2: str) -> float:
        """
        Calculate similarity ratio between two strings.

        Args:
            str1: First string
            str2: Second string

        Returns:
            Similarity ratio (0.0 to 1.0)
        """
        return SequenceMatcher(None, str1, str2).ratio()

    @transaction.atomic
    def _create_unified_transaction(self, ai_label: AILabel) -> UnifiedTransaction:
        """
        Create a new UnifiedTransaction from an AILabel.

        Args:
            ai_label: AILabel to create from

        Returns:
            Created UnifiedTransaction
        """
        unified_tx = UnifiedTransaction.objects.create(
            user=ai_label.raw_email.user,
            transaction_type=ai_label.transaction_type or 'DEBIT',
            amount=ai_label.amount,
            currency=ai_label.currency,
            merchant=ai_label.merchant or 'Unknown',
            merchant_variants=[ai_label.merchant] if ai_label.merchant else [],
            account_number=ai_label.account_number,
            reference_ids=[ai_label.reference_id] if ai_label.reference_id else [],
            transaction_date=ai_label.transaction_date,
            primary_source=ai_label.source,
            merge_confidence=Decimal('1.0'),
            merge_reason="Initial transaction creation from single source",
            merge_metadata={
                'source_ai_label_id': ai_label.id,
                'created_from': 'single_source'
            }
        )

        # Link the AI label
        unified_tx.source_ai_labels.add(ai_label)

        logger.info(f"Created UnifiedTransaction {unified_tx.id} from AILabel {ai_label.id}")
        return unified_tx

    @transaction.atomic
    def _merge_into_transaction(
        self,
        ai_label: AILabel,
        unified_tx: UnifiedTransaction,
        merge_score: float
    ):
        """
        Merge an AILabel into an existing UnifiedTransaction.

        Args:
            ai_label: AILabel to merge
            unified_tx: Target UnifiedTransaction
            merge_score: Confidence score for this merge
        """
        # Add this AILabel as a source
        unified_tx.add_source(ai_label)

        # Update merge confidence (average of existing and new)
        new_confidence = (unified_tx.merge_confidence + Decimal(str(merge_score))) / 2
        unified_tx.merge_confidence = new_confidence

        # Append to merge reason
        existing_reason = unified_tx.merge_reason or ""
        new_reason = (
            f"{existing_reason}\n"
            f"Merged AILabel {ai_label.id} with confidence {merge_score:.2f}"
        ).strip()
        unified_tx.merge_reason = new_reason

        # Update merge metadata
        metadata = unified_tx.merge_metadata or {}
        merged_labels = metadata.get('merged_ai_label_ids', [])
        merged_labels.append(ai_label.id)
        metadata['merged_ai_label_ids'] = merged_labels
        metadata['last_merge_score'] = merge_score
        metadata['last_merged_at'] = timezone.now().isoformat()
        unified_tx.merge_metadata = metadata

        unified_tx.save()

        logger.info(
            f"Merged AILabel {ai_label.id} into UnifiedTransaction {unified_tx.id}"
        )


from django.conf import settings

"""
Transaction Deduplication Service

Finds and merges duplicate transactions from multiple sources (email, bank statements,
manual entry, receipts, etc.) to maintain data quality and avoid double-counting.

Deduplication Algorithm:
-----------------------
Two transactions are considered duplicates if they match on:
1. Amount (exact or within 1% tolerance)
2. Date (same day or within ±1 day)
3. Description/Merchant (fuzzy string matching ≥ 80% similarity)
4. Account (same account)
5. External ID (exact match if present - strongest signal)

Scoring:
- External ID match = 1.0 (perfect match, same source)
- Exact amount + same date + same account + high description similarity (≥95%) = 0.95
- Exact amount + same date + same account + good description similarity (≥80%) = 0.85
- Exact amount + nearby date (±1 day) + same account + good description similarity = 0.75
- Amount within tolerance + same date + same account + description similarity = 0.70

Minimum merge threshold: 0.75 (configurable)
"""

import logging
from typing import List, Dict, Optional, Tuple
from decimal import Decimal
from datetime import timedelta
from difflib import SequenceMatcher

from django.db import transaction as db_transaction
from django.db.models import Q
from django.utils import timezone
from django.conf import settings

from finance.models import Transaction, TransactionDetail

logger = logging.getLogger(__name__)


class TransactionDeduplicationService:
    """
    Service to detect and merge duplicate transactions.
    """

    # Deduplication thresholds
    MERGE_THRESHOLD = 0.75
    AMOUNT_TOLERANCE_PERCENT = 0.01  # 1% tolerance for amount matching
    DATE_WINDOW_DAYS = 1  # ±1 day for date matching
    DESCRIPTION_SIMILARITY_THRESHOLD = 0.80  # 80% similarity for description matching

    def __init__(self):
        self.merge_threshold = getattr(
            settings, 'TRANSACTION_MERGE_THRESHOLD', self.MERGE_THRESHOLD
        )
        self.amount_tolerance = getattr(
            settings, 'AMOUNT_TOLERANCE_PERCENT', self.AMOUNT_TOLERANCE_PERCENT
        )
        self.date_window = getattr(
            settings, 'DATE_WINDOW_DAYS', self.DATE_WINDOW_DAYS
        )

    def find_duplicates_for_user(
        self,
        user,
        limit: int = None,
        start_date = None,
        end_date = None
    ) -> Dict:
        """
        Find all potential duplicate transactions for a user.

        Args:
            user: User instance
            limit: Optional limit on number of transactions to process
            start_date: Optional start date filter
            end_date: Optional end date filter

        Returns:
            Dict with duplicate groups and statistics
        """
        # Get all active transactions for this user
        queryset = Transaction.active_objects.filter(
            user=user,
            status='active'
        ).order_by('-date', '-created_at')

        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
        if limit:
            queryset = queryset[:limit]

        duplicate_groups = []
        processed_ids = set()
        stats = {
            'total_transactions': queryset.count(),
            'duplicate_groups_found': 0,
            'total_duplicates': 0,
            'potential_savings': Decimal('0.00')
        }

        for transaction in queryset:
            if transaction.id in processed_ids:
                continue

            # Find duplicates for this transaction
            duplicates = self.find_duplicates_for_transaction(transaction)

            if duplicates:
                # Group this transaction with its duplicates
                group = {
                    'primary': self._serialize_transaction(transaction),
                    'duplicates': [
                        {
                            'transaction': self._serialize_transaction(dup),
                            'confidence': score,
                            'reasons': reasons
                        }
                        for dup, score, reasons in duplicates
                    ]
                }
                duplicate_groups.append(group)

                # Mark all as processed
                processed_ids.add(transaction.id)
                for dup, _, _ in duplicates:
                    processed_ids.add(dup.id)

                # Update stats
                stats['duplicate_groups_found'] += 1
                stats['total_duplicates'] += len(duplicates)

                # Calculate potential savings (avoid counting same amount multiple times)
                for dup, _, _ in duplicates:
                    if dup.amount:
                        stats['potential_savings'] += dup.amount

        logger.info(f"Duplicate detection complete for user {user.id}: {stats}")
        return {
            'stats': stats,
            'duplicate_groups': duplicate_groups
        }

    def find_duplicates_for_transaction(
        self,
        transaction: Transaction
    ) -> List[Tuple[Transaction, float, List[str]]]:
        """
        Find potential duplicate transactions for a given transaction.

        Args:
            transaction: Transaction to find duplicates for

        Returns:
            List of (duplicate_transaction, confidence_score, reasons) tuples
        """
        # Date window for searching
        date_start = transaction.date - timedelta(days=self.date_window)
        date_end = transaction.date + timedelta(days=self.date_window)

        # Amount tolerance
        amount_min = transaction.amount * (Decimal('1') - Decimal(str(self.amount_tolerance)))
        amount_max = transaction.amount * (Decimal('1') + Decimal(str(self.amount_tolerance)))

        # Find potential candidates
        candidates_qs = Transaction.active_objects.filter(
            user=transaction.user,
            account=transaction.account,  # Same account
            amount__gte=amount_min,
            amount__lte=amount_max,
            date__gte=date_start,
            date__lte=date_end,
            status='active'
        ).exclude(
            id=transaction.id  # Exclude self
        )

        # Also search by external_id if available (strongest signal)
        if transaction.external_id:
            external_id_matches = Transaction.active_objects.filter(
                user=transaction.user,
                external_id=transaction.external_id,
                status='active'
            ).exclude(id=transaction.id)

            # Combine querysets
            candidates_qs = (candidates_qs | external_id_matches).distinct()

        duplicates = []

        for candidate in candidates_qs:
            score, reasons = self._calculate_duplicate_score(transaction, candidate)

            if score >= self.merge_threshold:
                duplicates.append((candidate, score, reasons))

        # Sort by confidence score descending
        duplicates.sort(key=lambda x: x[1], reverse=True)

        return duplicates

    def _calculate_duplicate_score(
        self,
        transaction1: Transaction,
        transaction2: Transaction
    ) -> Tuple[float, List[str]]:
        """
        Calculate duplicate confidence score between two transactions.

        Args:
            transaction1: First transaction
            transaction2: Second transaction

        Returns:
            Tuple of (confidence_score, reasons_list)
        """
        score = 0.0
        reasons = []

        # 1. External ID match (strongest signal - same source system)
        if transaction1.external_id and transaction2.external_id:
            if transaction1.external_id == transaction2.external_id:
                score = 1.0
                reasons.append("external_id_exact_match")
                return (min(score, 1.0), reasons)

        # 2. Amount matching
        if transaction1.amount == transaction2.amount:
            score += 0.35
            reasons.append("amount_exact_match")
        else:
            # Check tolerance
            if transaction2.amount != 0:
                diff_percent = abs(
                    (transaction1.amount - transaction2.amount) / transaction2.amount
                )
                if diff_percent <= Decimal(str(self.amount_tolerance)):
                    score += 0.25
                    reasons.append("amount_within_tolerance")

        # 3. Date matching
        if transaction1.date == transaction2.date:
            score += 0.30
            reasons.append("date_exact_match")
        else:
            date_diff = abs((transaction1.date - transaction2.date).days)
            if date_diff <= self.date_window:
                score += 0.15
                reasons.append(f"date_within_window_{date_diff}d")

        # 4. Account matching (already filtered, but add to score)
        if transaction1.account_id == transaction2.account_id:
            score += 0.10
            reasons.append("same_account")

        # 5. Description/Merchant matching
        desc1 = transaction1.description.lower() if transaction1.description else ""
        desc2 = transaction2.description.lower() if transaction2.description else ""

        if desc1 and desc2:
            desc_similarity = self._string_similarity(desc1, desc2)

            if desc_similarity >= 0.95:
                score += 0.20
                reasons.append("description_exact_match")
            elif desc_similarity >= self.DESCRIPTION_SIMILARITY_THRESHOLD:
                score += 0.15
                reasons.append(f"description_similar_{int(desc_similarity*100)}%")

        # 6. Transaction type/subtype matching
        if transaction1.is_credit == transaction2.is_credit:
            score += 0.05
            reasons.append("same_transaction_type")

        # 7. Category matching (if both have categories)
        if transaction1.category_id and transaction2.category_id:
            if transaction1.category_id == transaction2.category_id:
                score += 0.05
                reasons.append("same_category")

        # 8. Source matching
        source1 = transaction1.source
        source2 = transaction2.source

        if source1 and source2 and source1 != source2:
            # Different sources is a strong signal for duplicates
            # (e.g., same transaction from email + bank statement)
            score += 0.10
            reasons.append(f"different_sources_{source1}+{source2}")

        logger.debug(
            f"Duplicate score for Transaction {transaction1.id} vs {transaction2.id}: "
            f"{score:.2f} ({', '.join(reasons)})"
        )

        return (min(score, 1.0), reasons)

    def _string_similarity(self, str1: str, str2: str) -> float:
        """
        Calculate similarity ratio between two strings.

        Args:
            str1: First string
            str2: Second string

        Returns:
            Similarity ratio (0.0 to 1.0)
        """
        if not str1 or not str2:
            return 0.0
        return SequenceMatcher(None, str1, str2).ratio()

    @db_transaction.atomic
    def merge_transactions(
        self,
        primary_transaction: Transaction,
        duplicate_transactions: List[Transaction],
        merge_strategy: str = 'keep_primary'
    ) -> Dict:
        """
        Merge duplicate transactions into a single transaction.

        Args:
            primary_transaction: The transaction to keep
            duplicate_transactions: List of transactions to merge/delete
            merge_strategy: How to merge data:
                - 'keep_primary': Keep all data from primary, soft-delete duplicates
                - 'merge_details': Merge transaction details from all transactions
                - 'merge_metadata': Merge metadata fields

        Returns:
            Dict with merge results
        """
        if not duplicate_transactions:
            return {'status': 'no_duplicates', 'merged_count': 0}

        merged_count = 0
        merged_ids = []

        for duplicate in duplicate_transactions:
            # Validate they're duplicates (safety check)
            score, reasons = self._calculate_duplicate_score(primary_transaction, duplicate)

            if score < self.merge_threshold:
                logger.warning(
                    f"Skipping merge of Transaction {duplicate.id} - "
                    f"score {score:.2f} below threshold {self.merge_threshold}"
                )
                continue

            # Merge based on strategy
            if merge_strategy == 'merge_details':
                # Copy all transaction details from duplicate to primary
                for detail in duplicate.details.all():
                    detail.transaction = primary_transaction
                    detail.save()

            elif merge_strategy == 'merge_metadata':
                # Merge metadata fields
                duplicate_metadata = duplicate.metadata or {}
                primary_metadata = primary_transaction.metadata or {}

                # Merge, preferring non-empty values
                for key, value in duplicate_metadata.items():
                    if value and not primary_metadata.get(key):
                        primary_metadata[key] = value

                # Add merge history
                merge_history = primary_metadata.get('merge_history', [])
                merge_history.append({
                    'merged_transaction_id': duplicate.id,
                    'merged_at': timezone.now().isoformat(),
                    'merge_score': float(score),
                    'merge_reasons': reasons
                })
                primary_metadata['merge_history'] = merge_history

                primary_transaction.metadata = primary_metadata
                primary_transaction.save()

            # Soft delete the duplicate
            duplicate.delete(soft=True)

            merged_count += 1
            merged_ids.append(duplicate.id)

            logger.info(
                f"Merged Transaction {duplicate.id} into {primary_transaction.id} "
                f"(confidence: {score:.2f}, strategy: {merge_strategy})"
            )

        return {
            'status': 'success',
            'primary_transaction_id': primary_transaction.id,
            'merged_count': merged_count,
            'merged_transaction_ids': merged_ids
        }

    def auto_merge_high_confidence_duplicates(
        self,
        user,
        confidence_threshold: float = 0.95,
        limit: int = None
    ) -> Dict:
        """
        Automatically merge high-confidence duplicate transactions.
        Only merges duplicates with confidence ≥ 95% to avoid false positives.

        Args:
            user: User instance
            confidence_threshold: Minimum confidence score for auto-merge (default 0.95)
            limit: Optional limit on transactions to process

        Returns:
            Dict with merge statistics
        """
        result = self.find_duplicates_for_user(user, limit=limit)

        stats = {
            'groups_processed': 0,
            'transactions_merged': 0,
            'groups_skipped_low_confidence': 0
        }

        for group in result['duplicate_groups']:
            primary_id = group['primary']['id']
            primary_transaction = Transaction.active_objects.get(id=primary_id)

            # Only merge duplicates with high confidence
            high_confidence_duplicates = [
                dup_data
                for dup_data in group['duplicates']
                if dup_data['confidence'] >= confidence_threshold
            ]

            if not high_confidence_duplicates:
                stats['groups_skipped_low_confidence'] += 1
                continue

            # Get transaction objects
            duplicate_transactions = [
                Transaction.active_objects.get(id=dup['transaction']['id'])
                for dup in high_confidence_duplicates
            ]

            # Merge with metadata strategy (preserves all data)
            merge_result = self.merge_transactions(
                primary_transaction,
                duplicate_transactions,
                merge_strategy='merge_metadata'
            )

            stats['groups_processed'] += 1
            stats['transactions_merged'] += merge_result['merged_count']

        logger.info(f"Auto-merge complete for user {user.id}: {stats}")
        return stats

    def _serialize_transaction(self, transaction: Transaction) -> Dict:
        """Helper to serialize transaction for API response."""
        return {
            'id': transaction.id,
            'amount': float(transaction.amount),
            'description': transaction.description,
            'date': transaction.date.isoformat(),
            'account_id': transaction.account_id,
            'category_id': transaction.category_id,
            'source': transaction.source,
            'external_id': transaction.external_id,
            'created_at': transaction.created_at.isoformat()
        }

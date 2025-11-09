"""
Deduplication service for detecting and merging duplicate transactions.

This service handles scenarios where the same transaction appears from multiple sources:
- Bank notification email
- Merchant confirmation email
- Delivery notification email
- Manual entry
- Statement import

Uses AI to intelligently detect duplicates and merge them.
"""

from decimal import Decimal
from datetime import timedelta
from typing import Dict, List, Optional, Tuple
import json

from django.db.models import Q
from django.utils import timezone

from ..models import PendingTransaction, Transaction
from .ai_service import LLMProvider


class DeduplicationService:
    """Service for detecting and merging duplicate transactions."""

    def __init__(self):
        self.llm_provider = LLMProvider()

    def check_and_handle_duplicates(
        self,
        new_pending: PendingTransaction,
        auto_merge_threshold: float = 0.85,
        flag_threshold: float = 0.6
    ) -> Optional[PendingTransaction]:
        """
        Check for duplicates and handle them automatically.

        Args:
            new_pending: New pending transaction to check
            auto_merge_threshold: Confidence level to auto-merge (default 0.85)
            flag_threshold: Confidence level to flag for review (default 0.6)

        Returns:
            The primary transaction (either new_pending or the one it was merged into)
        """
        # Find similar pending transactions
        candidates = self._find_duplicate_candidates(new_pending)

        if not candidates.exists():
            return new_pending

        # Check each candidate with AI
        for candidate in candidates:
            result = self.ai_check_if_same_transaction(new_pending, candidate)

            if result['is_duplicate'] and result['confidence'] >= auto_merge_threshold:
                # HIGH CONFIDENCE - Auto-merge
                primary = self.merge_pending_transactions(candidate, new_pending)
                return primary

            elif result['confidence'] >= flag_threshold:
                # MEDIUM CONFIDENCE - Flag for user review
                metadata = new_pending.metadata or {}
                metadata['possible_duplicate_of'] = candidate.id
                metadata['duplicate_confidence'] = result['confidence']
                metadata['duplicate_reason'] = result['reason']
                new_pending.metadata = metadata
                new_pending.save(update_fields=['metadata'])

        return new_pending

    def _find_duplicate_candidates(
        self,
        pending: PendingTransaction,
        date_range_days: int = 2,
        amount_tolerance: float = 0.01  # 1% tolerance
    ) -> 'QuerySet[PendingTransaction]':
        """
        Find potential duplicate candidates based on heuristics.

        Args:
            pending: Transaction to find duplicates for
            date_range_days: How many days before/after to search
            amount_tolerance: Percentage tolerance for amount matching (0.01 = 1%)

        Returns:
            QuerySet of potential duplicate candidates
        """
        # Date range
        date_min = pending.date - timedelta(days=date_range_days)
        date_max = pending.date + timedelta(days=date_range_days)

        # Amount range (±1%)
        amount_min = pending.amount * Decimal(str(1.0 - amount_tolerance))
        amount_max = pending.amount * Decimal(str(1.0 + amount_tolerance))

        # Find similar transactions
        candidates = PendingTransaction.objects.filter(
            user=pending.user,
            status='pending',  # Only check pending
            date__range=[date_min, date_max],
            amount__range=[amount_min, amount_max],
            is_expense=pending.is_expense  # Same direction
        ).exclude(id=pending.id)

        return candidates

    def ai_check_if_same_transaction(
        self,
        txn1: PendingTransaction,
        txn2: PendingTransaction
    ) -> Dict:
        """
        Use AI to determine if two transactions are the same.

        Args:
            txn1: First transaction
            txn2: Second transaction

        Returns:
            {
                "is_duplicate": bool,
                "confidence": float (0-1),
                "reason": str
            }
        """
        prompt = f"""Are these two transactions the same real-world transaction?

Transaction 1:
- Date: {txn1.date}
- Amount: {txn1.amount} {txn1.currency}
- Description: {txn1.description}
- Source: {txn1.source} (ID: {txn1.source_id})
- Account: {txn1.account.name if txn1.account else 'None'}
- Entity: {txn1.entity.name if txn1.entity else 'None'}
- Metadata: {json.dumps(txn1.metadata or {}, indent=2)}

Transaction 2:
- Date: {txn2.date}
- Amount: {txn2.amount} {txn2.currency}
- Description: {txn2.description}
- Source: {txn2.source} (ID: {txn2.source_id})
- Account: {txn2.account.name if txn2.account else 'None'}
- Entity: {txn2.entity.name if txn2.entity else 'None'}
- Metadata: {json.dumps(txn2.metadata or {}, indent=2)}

Look for:
1. Same amount and date (or very close)
2. Same merchant/entity or related (e.g., "AMZN" and "Amazon")
3. Same order ID in metadata
4. Related sources (e.g., bank alert + merchant email for same purchase)
5. Complementary information (one has items, other has account details)

Return ONLY valid JSON in this exact format:
{{
    "is_duplicate": true,
    "confidence": 0.95,
    "reason": "Same amount (500), same date (2024-01-15), same merchant (Amazon), order ID #402-1234567-8901234 found in both. Bank alert + merchant email for same purchase."
}}"""

        try:
            response = self.llm_provider.generate(prompt)

            # Parse JSON response
            if isinstance(response, str):
                result = json.loads(response)
            else:
                result = response

            # Validate response format
            if not all(k in result for k in ['is_duplicate', 'confidence', 'reason']):
                raise ValueError("Invalid AI response format")

            return {
                'is_duplicate': bool(result['is_duplicate']),
                'confidence': float(result['confidence']),
                'reason': str(result['reason'])
            }

        except Exception as e:
            # Fallback to heuristic if AI fails
            return self._heuristic_duplicate_check(txn1, txn2)

    def _heuristic_duplicate_check(
        self,
        txn1: PendingTransaction,
        txn2: PendingTransaction
    ) -> Dict:
        """
        Fallback heuristic duplicate detection if AI fails.

        Args:
            txn1: First transaction
            txn2: Second transaction

        Returns:
            Duplicate check result dict
        """
        confidence = 0.0
        reasons = []

        # Check amount (exact match)
        if txn1.amount == txn2.amount:
            confidence += 0.4
            reasons.append(f"Same amount ({txn1.amount})")

        # Check date (exact match)
        if txn1.date == txn2.date:
            confidence += 0.3
            reasons.append(f"Same date ({txn1.date})")

        # Check entity
        if txn1.entity and txn2.entity and txn1.entity == txn2.entity:
            confidence += 0.2
            reasons.append(f"Same entity ({txn1.entity.name})")

        # Check order ID in metadata
        order1 = (txn1.metadata or {}).get('order_id')
        order2 = (txn2.metadata or {}).get('order_id')
        if order1 and order2 and order1 == order2:
            confidence += 0.3
            reasons.append(f"Same order ID ({order1})")

        # Check description similarity (simple contains check)
        desc1 = (txn1.description or '').lower()
        desc2 = (txn2.description or '').lower()
        if desc1 and desc2 and (desc1 in desc2 or desc2 in desc1):
            confidence += 0.1
            reasons.append("Similar descriptions")

        is_duplicate = confidence >= 0.7
        reason = "; ".join(reasons) if reasons else "No significant matches"

        return {
            'is_duplicate': is_duplicate,
            'confidence': min(confidence, 1.0),
            'reason': f"Heuristic check: {reason}"
        }

    def merge_pending_transactions(
        self,
        primary: PendingTransaction,
        secondary: PendingTransaction
    ) -> PendingTransaction:
        """
        Merge secondary transaction into primary, combining best data from both.

        Strategy:
        - Keep primary as base
        - Fill in missing fields from secondary
        - Combine metadata
        - Merge items lists
        - Mark secondary as merged

        Args:
            primary: Transaction to merge into (kept)
            secondary: Transaction to merge from (marked as merged)

        Returns:
            Updated primary transaction
        """
        # Combine metadata
        primary_meta = primary.metadata or {}
        secondary_meta = secondary.metadata or {}

        merged_metadata = {**primary_meta, **secondary_meta}

        # Track merge history
        merged_from = merged_metadata.get('merged_from', [])
        if isinstance(merged_from, str):
            merged_from = [merged_from]
        merged_from.extend([
            primary.source_id,
            secondary.source_id
        ])
        merged_metadata['merged_from'] = list(set(merged_from))  # Deduplicate
        merged_metadata['merge_timestamp'] = timezone.now().isoformat()

        # Take best account (prefer one with actual account set)
        if not primary.account and secondary.account:
            primary.account = secondary.account

        # Take best entity (prefer one with entity set)
        if not primary.entity and secondary.entity:
            primary.entity = secondary.entity

        # Take best category (prefer one with category set)
        if not primary.suggested_category and secondary.suggested_category:
            primary.suggested_category = secondary.suggested_category

        # Combine descriptions if different
        if secondary.description and secondary.description != primary.description:
            if not primary.description:
                primary.description = secondary.description
            elif secondary.description not in primary.description:
                # Append secondary description
                combined = f"{primary.description} | {secondary.description}"
                if len(combined) <= 500:
                    primary.description = combined
                else:
                    # Store in metadata if too long
                    merged_metadata['additional_description'] = secondary.description

        # Merge items
        primary_items = primary.items or []
        secondary_items = secondary.items or []

        if secondary_items and not primary_items:
            primary.items = secondary_items
        elif secondary_items and primary_items:
            # Combine unique items
            all_items = primary_items + secondary_items
            # Simple dedup by item name
            seen_names = set()
            unique_items = []
            for item in all_items:
                name = item.get('name', '').lower()
                if name and name not in seen_names:
                    seen_names.add(name)
                    unique_items.append(item)
            primary.items = unique_items

        # Update primary with merged data
        primary.metadata = merged_metadata
        primary.save()

        # Mark secondary as merged
        secondary.status = 'merged'
        secondary_meta = secondary.metadata or {}
        secondary_meta['merged_into'] = primary.id
        secondary_meta['merged_at'] = timezone.now().isoformat()
        secondary.metadata = secondary_meta
        secondary.save()

        return primary

    def find_transaction_duplicates(
        self,
        transaction: Transaction,
        date_range_days: int = 3,
        amount_tolerance: float = 0.01
    ) -> List[Transaction]:
        """
        Find potential duplicate transactions in the ledger.
        Useful for cleanup after import.

        Args:
            transaction: Transaction to find duplicates for
            date_range_days: Days before/after to search
            amount_tolerance: Percentage tolerance for amount

        Returns:
            List of potential duplicate transactions
        """
        date_min = transaction.date - timedelta(days=date_range_days)
        date_max = transaction.date + timedelta(days=date_range_days)

        amount_min = transaction.amount * Decimal(str(1.0 - amount_tolerance))
        amount_max = transaction.amount * Decimal(str(1.0 + amount_tolerance))

        candidates = Transaction.objects.filter(
            user=transaction.user,
            date__range=[date_min, date_max],
            amount__range=[amount_min, amount_max],
            is_expense=transaction.is_expense
        ).exclude(id=transaction.id)

        # Use AI to verify each candidate
        duplicates = []
        for candidate in candidates:
            # Convert to dict for AI check (similar structure to PendingTransaction)
            result = self._check_transaction_similarity(transaction, candidate)
            if result['is_duplicate'] and result['confidence'] >= 0.75:
                duplicates.append(candidate)

        return duplicates

    def _check_transaction_similarity(
        self,
        txn1: Transaction,
        txn2: Transaction
    ) -> Dict:
        """
        Check if two finalized transactions are duplicates.
        Similar to ai_check_if_same_transaction but for Transaction model.
        """
        # Use heuristic for now (can add AI later if needed)
        confidence = 0.0

        if txn1.amount == txn2.amount:
            confidence += 0.4
        if txn1.date == txn2.date:
            confidence += 0.3
        if txn1.entity and txn2.entity and txn1.entity == txn2.entity:
            confidence += 0.2
        if txn1.account and txn2.account and txn1.account == txn2.account:
            confidence += 0.1

        return {
            'is_duplicate': confidence >= 0.75,
            'confidence': confidence,
            'reason': f"Transaction similarity score: {confidence}"
        }

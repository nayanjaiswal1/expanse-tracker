"""
Service for matching email transactions to accounts using learned patterns
"""

from typing import Dict, Optional, Tuple, List
from django.db.models import Q
from decimal import Decimal
from finance.models import Account, Transaction
from services.models import EmailAccountPattern


class AccountMatcherService:
    """
    Intelligent service for matching transactions to accounts
    Uses machine learning-like pattern recognition to improve over time
    """

    def __init__(self, user):
        self.user = user

    def find_account(self, account_info: Dict, sender: str = None, merchant_name: str = None) -> Tuple[Optional[Account], List[Dict], str]:
        """
        Find the best matching account for the given email data
        Returns: (account, suggestions_list, match_reason)
        """
        # STEP 1: Check learned patterns (highest priority)
        learned_account, match_reason = self._match_from_learned_patterns(account_info, sender, merchant_name)
        if learned_account:
            return learned_account, [], f"Learned pattern: {match_reason}"

        # STEP 2: Try exact matches
        exact_account, suggestions = self._match_exact(account_info)
        if exact_account:
            return exact_account, suggestions, "Exact match"

        # STEP 3: Return suggestions if any
        if suggestions:
            return None, suggestions, "Multiple suggestions"

        return None, [], "No match"

    def _match_from_learned_patterns(self, account_info: Dict, sender: str = None, merchant_name: str = None) -> Tuple[Optional[Account], str]:
        """
        Find account using previously learned patterns
        Returns: (account, match_reason)
        """
        if not sender and not account_info:
            return None, ""

        # Extract sender domain
        _, sender_domain = self._extract_email_and_domain(sender)

        # Build query to find matching patterns
        query = Q(user=self.user)
        pattern_queries = []
        match_reasons = []

        # Match by sender domain (very reliable)
        if sender_domain:
            pattern_queries.append(Q(sender_domain=sender_domain))
            match_reasons.append(f"domain:{sender_domain}")

        # Match by last digits (reliable)
        if account_info.get('last_digits'):
            pattern_queries.append(Q(last_digits=account_info['last_digits']))
            match_reasons.append(f"digits:{account_info['last_digits']}")

        # Match by UPI ID (very reliable)
        if account_info.get('upi_id'):
            pattern_queries.append(Q(upi_id=account_info['upi_id']))
            match_reasons.append(f"upi:{account_info['upi_id']}")

        # Match by institution name (moderately reliable)
        if account_info.get('institution_name'):
            pattern_queries.append(Q(institution_name__icontains=account_info['institution_name']))
            match_reasons.append(f"bank:{account_info['institution_name']}")

        # Match by merchant name (less reliable)
        if merchant_name:
            pattern_queries.append(Q(merchant_name__icontains=merchant_name))
            match_reasons.append(f"merchant:{merchant_name}")

        # Match by wallet name (reliable)
        if account_info.get('wallet_name'):
            pattern_queries.append(Q(wallet_name__icontains=account_info['wallet_name']))
            match_reasons.append(f"wallet:{account_info['wallet_name']}")

        if not pattern_queries:
            return None, ""

        # Combine queries with OR
        combined_query = pattern_queries[0]
        for q in pattern_queries[1:]:
            combined_query |= q

        # Find matching patterns ordered by confidence and usage
        patterns = EmailAccountPattern.objects.filter(
            query & combined_query
        ).select_related('account').order_by('-confidence_score', '-usage_count')

        if patterns.exists():
            best_pattern = patterns.first()
            # Increment usage count
            best_pattern.increment_usage()

            # Build match reason
            reason_parts = []
            if best_pattern.sender_domain:
                reason_parts.append(f"domain:{best_pattern.sender_domain}")
            if best_pattern.last_digits:
                reason_parts.append(f"digits:{best_pattern.last_digits}")
            if best_pattern.upi_id:
                reason_parts.append(f"upi:{best_pattern.upi_id}")
            reason = ", ".join(reason_parts) if reason_parts else "pattern match"

            return best_pattern.account, reason

        return None, ""

    def _match_exact(self, account_info: Dict) -> Tuple[Optional[Account], List[Dict]]:
        """
        Find exact matches based on account information
        Returns: (account, suggestions)
        """
        suggestions = []

        # Match by last 4 digits
        if account_info.get('last_digits'):
            accounts_by_digits = Account.objects.filter(
                user=self.user,
                account_number__endswith=account_info['last_digits'],
                is_active=True
            )
            if accounts_by_digits.count() == 1:
                return accounts_by_digits.first(), []
            elif accounts_by_digits.count() > 1:
                for acc in accounts_by_digits:
                    suggestions.append({
                        'id': acc.id,
                        'name': acc.name,
                        'account_type': acc.account_type,
                        'last_4': acc.account_number_masked,
                        'match_reason': f'Last 4 digits match: {account_info["last_digits"]}',
                        'confidence': 0.9
                    })

        # Match by institution name
        if account_info.get('institution_name'):
            accounts_by_institution = Account.objects.filter(
                user=self.user,
                institution__icontains=account_info['institution_name'],
                is_active=True
            )
            for acc in accounts_by_institution:
                if not any(s['id'] == acc.id for s in suggestions):
                    suggestions.append({
                        'id': acc.id,
                        'name': acc.name,
                        'account_type': acc.account_type,
                        'institution': acc.institution,
                        'match_reason': f'Institution matches: {account_info["institution_name"]}',
                        'confidence': 0.7
                    })

        # Match by wallet name
        if account_info.get('wallet_name'):
            accounts_by_wallet = Account.objects.filter(
                user=self.user,
                name__icontains=account_info['wallet_name'],
                is_active=True
            ) | Account.objects.filter(
                user=self.user,
                account_type='other',
                description__icontains=account_info['wallet_name'],
                is_active=True
            )
            for acc in accounts_by_wallet:
                if not any(s['id'] == acc.id for s in suggestions):
                    suggestions.append({
                        'id': acc.id,
                        'name': acc.name,
                        'account_type': acc.account_type,
                        'match_reason': f'Wallet name matches: {account_info["wallet_name"]}',
                        'confidence': 0.8
                    })

        # Sort by confidence
        suggestions.sort(key=lambda x: x['confidence'], reverse=True)

        # Return top match if confidence is high enough
        if suggestions and suggestions[0]['confidence'] >= 0.9:
            account = Account.objects.get(id=suggestions[0]['id'])
            return account, suggestions[1:]

        return None, suggestions

    def learn_pattern(self, transaction: Transaction, account: Account) -> EmailAccountPattern:
        """
        Learn a pattern from manually linked transaction to account
        This is called when a user manually sets/updates the account for a transaction
        """
        # Extract pattern information from transaction metadata
        metadata = transaction.metadata or {}
        account_info = metadata.get('account_info', {})
        sender = metadata.get('sender', '')

        # Extract sender domain
        sender_email, sender_domain = self._extract_email_and_domain(sender)

        # Check if we already have a similar pattern
        pattern_filters = {'user': self.user, 'account': account}

        # Prioritize most specific patterns
        if account_info.get('upi_id'):
            pattern_filters['upi_id'] = account_info['upi_id']
        elif account_info.get('last_digits'):
            pattern_filters['last_digits'] = account_info['last_digits']
        elif sender_domain:
            pattern_filters['sender_domain'] = sender_domain

        # Try to find existing pattern
        existing_pattern = EmailAccountPattern.objects.filter(**pattern_filters).first()

        if existing_pattern:
            # Update existing pattern
            existing_pattern.increment_usage()
            return existing_pattern

        # Create new pattern
        pattern = EmailAccountPattern.objects.create(
            user=self.user,
            account=account,
            sender_email=sender_email,
            sender_domain=sender_domain,
            merchant_name=transaction.merchant_name,
            institution_name=account_info.get('institution_name'),
            last_digits=account_info.get('last_digits'),
            upi_id=account_info.get('upi_id'),
            wallet_name=account_info.get('wallet_name'),
            confidence_score=Decimal('0.80'),  # Start with good confidence
            pattern_data=account_info,
        )

        return pattern

    def _extract_email_and_domain(self, sender: Optional[str]) -> Tuple[Optional[str], Optional[str]]:
        if not sender:
            return None, None

        candidate = sender.strip()
        if "<" in candidate and ">" in candidate:
            candidate = candidate[candidate.find("<") + 1:candidate.find(">")]

        candidate = candidate.strip().lower()
        if "@" not in candidate:
            return None, None

        _, domain = candidate.split("@", 1)
        domain = domain.strip()
        return candidate if candidate else None, domain or None

    def get_learned_patterns(self, account_id: int = None) -> List[EmailAccountPattern]:
        """
        Get all learned patterns for the user, optionally filtered by account
        """
        query = EmailAccountPattern.objects.filter(user=self.user)

        if account_id:
            query = query.filter(account_id=account_id)

        return query.select_related('account').order_by('-confidence_score', '-usage_count')

    def delete_pattern(self, pattern_id: int) -> bool:
        """
        Delete a learned pattern
        """
        try:
            pattern = EmailAccountPattern.objects.get(id=pattern_id, user=self.user)
            pattern.delete()
            return True
        except EmailAccountPattern.DoesNotExist:
            return False

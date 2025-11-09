"""
Signal handlers for services app
"""

from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from finance.models import Transaction
from services.services.account_matcher_service import AccountMatcherService
from training.models import RawEmail


@receiver(pre_save, sender=Transaction)
def track_account_change(sender, instance, **kwargs):
    """Track if account field is being changed"""
    if instance.pk:
        try:
            old_instance = Transaction.objects.get(pk=instance.pk)
            instance._old_account_id = old_instance.account_id
            instance._raw_message_old_state = {
                'verified': old_instance.verified,
                'amount': str(old_instance.amount),
                'date': old_instance.date.isoformat() if old_instance.date else None,
                'description': old_instance.description,
                'metadata': old_instance.metadata or {},
            }
        except Transaction.DoesNotExist:
            instance._old_account_id = None
            instance._raw_message_old_state = None
    else:
        instance._old_account_id = None
        instance._raw_message_old_state = None


@receiver(post_save, sender=Transaction)
def learn_from_account_update(sender, instance, created, **kwargs):
    """
    Automatically learn pattern when user manually updates transaction account
    This creates a pattern so similar future transactions are automatically linked
    """
    # Only learn if:
    # 1. Transaction has gmail_message_id (it's from email import)
    # 2. Account is set
    # 3. Account was changed (not just created or other field updates)

    if not instance.gmail_message_id or not instance.account:
        return

    # Check if account was actually changed
    old_account_id = getattr(instance, '_old_account_id', None)

    # Learn pattern if:
    # - New transaction with account set (created=True and account exists)
    # - Account was changed (old != new)
    should_learn = (
        (created and instance.account_id) or
        (not created and old_account_id != instance.account_id and instance.account_id is not None)
    )

    if should_learn:
        # Create the pattern
        matcher = AccountMatcherService(instance.user)
        matcher.learn_pattern(instance, instance.account)


@receiver(post_save, sender=Transaction)
def record_transaction_feedback(sender, instance, created, **kwargs):
    """
    Persist user verification/edits back into the raw payload record for training.
    """
    if not instance.gmail_message_id:
        return

    try:
        raw_email = RawEmail.objects.get(
            user=instance.user,
            message_id=instance.gmail_message_id
        )
    except RawEmail.DoesNotExist:
        return

    old_state = getattr(instance, '_raw_message_old_state', None)
    if created:
        # Initial creation already logged during processing; nothing to record.
        return

    updates = {}
    if old_state is not None:
        if old_state.get('verified') != instance.verified:
            updates['verified'] = {
                'from': old_state.get('verified'),
                'to': instance.verified,
            }
        if old_state.get('amount') != str(instance.amount):
            updates['amount'] = {
                'from': old_state.get('amount'),
                'to': str(instance.amount),
            }
        if old_state.get('date') != (instance.date.isoformat() if instance.date else None):
            updates['date'] = {
                'from': old_state.get('date'),
                'to': instance.date.isoformat() if instance.date else None,
            }
        if old_state.get('description') != instance.description:
            updates['description'] = {
                'from': old_state.get('description'),
                'to': instance.description,
            }

    if not updates:
        return

    action = 'transaction_verified' if list(updates.keys()) == ['verified'] and updates['verified']['to'] else 'transaction_updated'
    raw_email.record_user_feedback(
        action,
        {
            'transaction_id': instance.id,
            'updates': updates,
        }
    )

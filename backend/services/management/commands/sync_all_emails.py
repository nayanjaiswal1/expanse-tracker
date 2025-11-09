from django.core.management.base import BaseCommand
from django.utils import timezone
from services.models import GoogleAccount
from services.tasks import fetch_emails_from_gmail
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Sync emails for all users with connected Google accounts'

    def add_arguments(self, parser):
        parser.add_argument(
            '--user-id',
            type=int,
            help='Sync emails for specific user ID only',
        )
        parser.add_argument(
            '--async',
            action='store_true',
            help='Run tasks asynchronously via Celery',
        )

    def handle(self, *args, **options):
        user_id = options.get('user_id')
        use_async = options.get('async', False)

        if user_id:
            # Sync specific user
            try:
                google_account = GoogleAccount.objects.get(user_id=user_id)
                self.stdout.write(f"Syncing emails for user {google_account.user.username} ({user_id})")

                if use_async:
                    fetch_emails_from_gmail.delay(user_id)
                    self.stdout.write("Task queued for async execution")
                else:
                    fetch_emails_from_gmail(user_id)
                    self.stdout.write("Sync completed")

            except GoogleAccount.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f"No Google account found for user {user_id}")
                )
                return
        else:
            # Sync all users with Google accounts
            google_accounts = GoogleAccount.objects.all()

            if not google_accounts:
                self.stdout.write("No Google accounts found")
                return

            self.stdout.write(f"Found {google_accounts.count()} Google accounts to sync")

            for account in google_accounts:
                self.stdout.write(f"Syncing emails for {account.user.username} ({account.user.id})")

                try:
                    if use_async:
                        fetch_emails_from_gmail.delay(account.user.id)
                        self.stdout.write("  Task queued for async execution")
                    else:
                        fetch_emails_from_gmail(account.user.id)
                        self.stdout.write("  Sync completed")

                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f"  Error syncing for {account.user.username}: {e}")
                    )
                    logger.error(f"Email sync error for user {account.user.id}: {e}")

        self.stdout.write(
            self.style.SUCCESS("Email sync process completed")
        )
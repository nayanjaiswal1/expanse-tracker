from django.core.management.base import BaseCommand
from services.services.email_sync_service import EmailSyncService

class Command(BaseCommand):
    help = 'Syncs emails for all active Gmail accounts and creates transactions.'

    def handle(self, *args, **options):
        self.stdout.write("Starting email sync process...")
        sync_service = EmailSyncService()
        result = sync_service.sync_all_active_accounts()
        self.stdout.write(self.style.SUCCESS("Email sync process finished."))
        self.stdout.write(str(result))

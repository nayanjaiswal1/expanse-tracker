"""
Management command to start AI email processing system.
"""

import subprocess
import sys
import time
import requests
from django.core.management.base import BaseCommand
from django.utils import timezone
from training.models import RawEmail, AILabel, UnifiedTransaction


class Command(BaseCommand):
    help = 'Start automatic AI email processing system'

    def add_arguments(self, parser):
        parser.add_argument(
            '--process-now',
            action='store_true',
            help='Process emails immediately before starting scheduler',
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=50,
            help='Number of emails to process immediately (default: 50)',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('=' * 80))
        self.stdout.write(self.style.SUCCESS('  AI Email Processing System'))
        self.stdout.write(self.style.SUCCESS('=' * 80))
        self.stdout.write('')

        # Check Ollama
        self.stdout.write('Checking Ollama...')
        try:
            response = requests.get('http://localhost:11434/api/tags', timeout=2)
            if response.status_code == 200:
                self.stdout.write(self.style.SUCCESS('✓ Ollama is running'))
            else:
                self.stdout.write(self.style.ERROR('✗ Ollama returned error'))
                sys.exit(1)
        except requests.exceptions.RequestException:
            self.stdout.write(self.style.ERROR('✗ Ollama is not running!'))
            self.stdout.write(self.style.WARNING('Please start Ollama: ollama serve'))
            sys.exit(1)

        self.stdout.write('')

        # Show current status
        self.stdout.write('Current Status:')
        total_emails = RawEmail.objects.count()
        labeled = AILabel.objects.count()
        pending = RawEmail.objects.filter(processing_status='pending', ai_label__isnull=True).count()
        unified = UnifiedTransaction.objects.count()

        self.stdout.write(f'  Total emails: {total_emails}')
        self.stdout.write(f'  Labeled: {labeled}')
        self.stdout.write(f'  Pending: {pending}')
        self.stdout.write(f'  Unified transactions: {unified}')
        self.stdout.write('')

        # Process immediately if requested
        if options['process_now'] and pending > 0:
            self.stdout.write(self.style.WARNING(f'Processing {options["limit"]} emails now...'))
            from training.services import LabelAndExtractService, MergeService

            # Process emails
            service = LabelAndExtractService()
            stats = service.batch_process_emails(limit=options['limit'])

            self.stdout.write(f'  Processed: {stats["processed"]}/{stats["total"]}')
            self.stdout.write(f'  Failed: {stats["failed"]}')
            if stats['labels']:
                for label, count in stats['labels'].items():
                    self.stdout.write(f'    {label}: {count}')

            # Merge transactions
            if stats.get('labels', {}).get('TRANSACTION', 0) > 0:
                self.stdout.write('')
                self.stdout.write('Merging transactions...')
                merge_service = MergeService()
                from django.contrib.auth import get_user_model
                User = get_user_model()

                for user in User.objects.all():
                    merge_stats = merge_service.merge_user_transactions(user=user)
                    if merge_stats['total_labels'] > 0:
                        self.stdout.write(
                            f'  User {user.email}: '
                            f'{merge_stats["new_unified"]} new, '
                            f'{merge_stats["merged_to_existing"]} merged'
                        )

            self.stdout.write('')

        # Show schedule
        self.stdout.write(self.style.SUCCESS('Automatic Processing Schedule:'))
        self.stdout.write('  • Every 30 minutes: Process 100 pending emails')
        self.stdout.write('  • Every 2 hours: Merge related transactions')
        self.stdout.write('  • Weekly Sunday 2 AM: Generate training dataset')
        self.stdout.write('')

        self.stdout.write(self.style.WARNING('To start automatic processing, run:'))
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('  # Terminal 1:'))
        self.stdout.write('  celery -A app_settings worker --loglevel=info --pool=solo')
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('  # Terminal 2:'))
        self.stdout.write('  celery -A app_settings beat --loglevel=info')
        self.stdout.write('')
        self.stdout.write('Or use: start_ai_processing.bat (Windows)')
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('System ready!'))

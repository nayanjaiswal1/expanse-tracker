"""
Django management command to clean HTML from existing emails in the database.
Converts stored HTML to clean text to save storage space.

Usage:
    python manage.py clean_email_html --dry-run  # Preview changes
    python manage.py clean_email_html             # Apply changes
    python manage.py clean_email_html --batch-size 100  # Custom batch size
"""
import logging
from typing import Dict

from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Q

from training.models import RawEmail
from services.services.html_cleaner import html_to_clean_text, estimate_size_reduction


logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Clean HTML from existing emails and convert to plain text'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview changes without actually modifying the database',
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=100,
            help='Number of emails to process in each batch (default: 100)',
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=None,
            help='Limit total number of emails to process',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        batch_size = options['batch_size']
        limit = options['limit']

        mode = "DRY RUN" if dry_run else "LIVE"
        self.stdout.write(self.style.WARNING(f'\n{"="*60}'))
        self.stdout.write(self.style.WARNING(f'HTML CLEANING TOOL - {mode} MODE'))
        self.stdout.write(self.style.WARNING(f'{"="*60}\n'))

        if dry_run:
            self.stdout.write(self.style.NOTICE(
                'Running in DRY RUN mode - no changes will be made to the database'
            ))

        # Find emails with HTML content
        emails_with_html = RawEmail.objects.filter(
            Q(body_html__isnull=False) & ~Q(body_html='')
        )

        if limit:
            emails_with_html = emails_with_html[:limit]

        total_count = emails_with_html.count()

        if total_count == 0:
            self.stdout.write(self.style.SUCCESS('\nNo emails with HTML content found!'))
            return

        self.stdout.write(f'Found {total_count:,} emails with HTML content\n')

        # Statistics
        stats = {
            'total': total_count,
            'processed': 0,
            'cleaned': 0,
            'errors': 0,
            'bytes_before': 0,
            'bytes_after': 0,
        }

        # Process in batches
        processed = 0
        for batch_start in range(0, total_count, batch_size):
            batch_emails = list(emails_with_html[batch_start:batch_start + batch_size])

            if not batch_emails:
                break

            if dry_run:
                self._process_batch_dry_run(batch_emails, stats)
            else:
                self._process_batch_live(batch_emails, stats)

            processed += len(batch_emails)
            self._print_progress(processed, total_count, stats)

        # Final summary
        self._print_summary(stats, dry_run)

    def _process_batch_dry_run(self, batch_emails, stats):
        """Process batch in dry-run mode (no database changes)"""
        for email in batch_emails:
            stats['processed'] += 1

            if email.body_html:
                stats['bytes_before'] += len(email.body_html)

                try:
                    clean_text = html_to_clean_text(email.body_html)
                    stats['bytes_after'] += len(clean_text)
                    stats['cleaned'] += 1
                except Exception as e:
                    logger.error(f"Error cleaning email {email.id}: {e}")
                    stats['errors'] += 1

    def _process_batch_live(self, batch_emails, stats):
        """Process batch with actual database updates"""
        with transaction.atomic():
            emails_to_update = []

            for email in batch_emails:
                stats['processed'] += 1

                if email.body_html:
                    stats['bytes_before'] += len(email.body_html)

                    try:
                        clean_text = html_to_clean_text(email.body_html)
                        stats['bytes_after'] += len(clean_text)

                        # Update body_text if it's empty or HTML version has more content
                        if not email.body_text or len(clean_text) > len(email.body_text):
                            email.body_text = clean_text

                        # Clear body_html to save space
                        email.body_html = ""

                        emails_to_update.append(email)
                        stats['cleaned'] += 1

                    except Exception as e:
                        logger.error(f"Error cleaning email {email.id}: {e}")
                        stats['errors'] += 1

            # Bulk update
            if emails_to_update:
                RawEmail.objects.bulk_update(
                    emails_to_update,
                    ['body_text', 'body_html'],
                    batch_size=100
                )

    def _print_progress(self, processed, total, stats):
        """Print progress update"""
        percent = (processed / total * 100) if total > 0 else 0
        bytes_saved = stats['bytes_before'] - stats['bytes_after']
        mb_saved = bytes_saved / (1024 * 1024)

        self.stdout.write(
            f'Progress: {processed:,}/{total:,} ({percent:.1f}%) | '
            f'Cleaned: {stats["cleaned"]:,} | '
            f'Saved: {mb_saved:.2f} MB',
            ending='\r'
        )

    def _print_summary(self, stats: Dict, dry_run: bool):
        """Print final summary"""
        bytes_saved = stats['bytes_before'] - stats['bytes_after']
        mb_saved = bytes_saved / (1024 * 1024)
        reduction_percent = (bytes_saved / stats['bytes_before'] * 100) if stats['bytes_before'] > 0 else 0

        self.stdout.write('\n\n' + '='*60)
        self.stdout.write(self.style.SUCCESS('SUMMARY'))
        self.stdout.write('='*60)

        self.stdout.write(f'Total emails processed: {stats["processed"]:,}')
        self.stdout.write(f'Successfully cleaned:   {stats["cleaned"]:,}')
        self.stdout.write(f'Errors:                 {stats["errors"]:,}')
        self.stdout.write(f'\nStorage before:         {stats["bytes_before"]/1024/1024:.2f} MB')
        self.stdout.write(f'Storage after:          {stats["bytes_after"]/1024/1024:.2f} MB')
        self.stdout.write(self.style.SUCCESS(
            f'Storage saved:          {mb_saved:.2f} MB ({reduction_percent:.1f}% reduction)'
        ))

        if dry_run:
            self.stdout.write('\n' + self.style.WARNING(
                'This was a DRY RUN - no changes were made to the database'
            ))
            self.stdout.write(self.style.NOTICE(
                'Run without --dry-run to apply these changes'
            ))
        else:
            self.stdout.write('\n' + self.style.SUCCESS(
                'Changes have been saved to the database!'
            ))

        self.stdout.write('='*60 + '\n')

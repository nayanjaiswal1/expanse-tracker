"""
Management command to re-encrypt API keys from old SECRET_KEY-based encryption
to new dedicated ENCRYPTION_KEY-based encryption.

Usage:
    python manage.py reencrypt_api_keys [--dry-run] [--old-key OLD_KEY]

Options:
    --dry-run: Don't actually update the database, just show what would be done
    --old-key: Specify the old encryption key (if different from current SECRET_KEY)
"""

import base64
import logging

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from users.models import UserProfile
from users.encryption import encrypt_value


logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Re-encrypt API keys from old SECRET_KEY-based encryption to new ENCRYPTION_KEY'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help="Don't actually update the database, just show what would be done",
        )
        parser.add_argument(
            '--old-key',
            type=str,
            help='The old encryption key (defaults to SECRET_KEY[:44] + "==")',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        old_key_str = options.get('old_key')

        # Get the old encryption key
        if old_key_str:
            try:
                old_key = old_key_str.encode()
            except Exception as e:
                raise CommandError(f"Invalid old key format: {e}")
        else:
            # Default: use the old SECRET_KEY-based derivation
            try:
                old_key = settings.SECRET_KEY[:44].encode() + b"=="
                Fernet(old_key)  # Validate the key
            except Exception as e:
                raise CommandError(
                    f"Failed to create old encryption key from SECRET_KEY: {e}. "
                    "Use --old-key to specify the old key explicitly."
                )

        # Check that new encryption key is configured
        if not hasattr(settings, 'ENCRYPTION_KEY') or not settings.ENCRYPTION_KEY:
            raise CommandError(
                "ENCRYPTION_KEY is not configured. Please set it in your environment "
                "before running this command."
            )

        self.stdout.write(self.style.WARNING(
            f"{'[DRY RUN] ' if dry_run else ''}Re-encrypting API keys..."
        ))

        # Get all profiles with API keys
        profiles_with_keys = UserProfile.objects.exclude(
            openai_api_key__exact=''
        ).exclude(
            openai_api_key__isnull=True
        )

        total = profiles_with_keys.count()
        if total == 0:
            self.stdout.write(self.style.SUCCESS(
                "No profiles with API keys found. Nothing to do."
            ))
            return

        self.stdout.write(f"Found {total} profiles with API keys")

        success_count = 0
        error_count = 0
        skipped_count = 0

        with transaction.atomic():
            for profile in profiles_with_keys:
                try:
                    # Try to decrypt with old key
                    old_fernet = Fernet(old_key)
                    encrypted_value = profile.openai_api_key

                    try:
                        # Decrypt with old key
                        plaintext = old_fernet.decrypt(encrypted_value.encode()).decode()

                        # Re-encrypt with new key
                        new_encrypted = encrypt_value(plaintext)

                        if not dry_run:
                            profile.openai_api_key = new_encrypted
                            profile.save(update_fields=['openai_api_key', 'updated_at'])

                        self.stdout.write(self.style.SUCCESS(
                            f"{'[DRY RUN] ' if dry_run else ''}✓ Re-encrypted API key for user: {profile.user.username}"
                        ))
                        success_count += 1

                    except InvalidToken:
                        # The key might already be encrypted with the new key or is plaintext
                        # Try to decrypt with new key to check
                        try:
                            from users.encryption import decrypt_value
                            decrypted = decrypt_value(encrypted_value)
                            if decrypted:
                                self.stdout.write(self.style.WARNING(
                                    f"⊘ Already encrypted with new key: {profile.user.username}"
                                ))
                                skipped_count += 1
                            else:
                                raise ValueError("Could not decrypt with either key")
                        except Exception:
                            # Might be plaintext - try to encrypt it
                            self.stdout.write(self.style.WARNING(
                                f"⚠ Possibly plaintext key for user {profile.user.username}, encrypting..."
                            ))
                            new_encrypted = encrypt_value(encrypted_value)
                            if not dry_run:
                                profile.openai_api_key = new_encrypted
                                profile.save(update_fields=['openai_api_key', 'updated_at'])
                            success_count += 1

                except Exception as e:
                    self.stdout.write(self.style.ERROR(
                        f"✗ Error processing user {profile.user.username}: {e}"
                    ))
                    error_count += 1
                    logger.error(f"Failed to re-encrypt API key for user {profile.user.username}: {e}")

            if dry_run:
                # Roll back the transaction in dry-run mode
                transaction.set_rollback(True)
                self.stdout.write(self.style.WARNING(
                    "\n[DRY RUN] No changes were saved to the database"
                ))

        # Summary
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write(self.style.SUCCESS(
            f"{'[DRY RUN] ' if dry_run else ''}Re-encryption complete!"
        ))
        self.stdout.write(f"Total profiles: {total}")
        self.stdout.write(self.style.SUCCESS(f"Successfully re-encrypted: {success_count}"))
        self.stdout.write(self.style.WARNING(f"Skipped (already encrypted): {skipped_count}"))
        self.stdout.write(self.style.ERROR(f"Errors: {error_count}"))

        if error_count > 0:
            self.stdout.write(self.style.ERROR(
                "\nSome profiles failed to re-encrypt. Check the logs for details."
            ))

        if dry_run:
            self.stdout.write(self.style.WARNING(
                "\nThis was a dry run. Run without --dry-run to apply changes."
            ))

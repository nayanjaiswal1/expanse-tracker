"""
Encryption utilities for sensitive data storage.
Uses dedicated encryption key from environment variables.
"""

import base64
import logging
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings


logger = logging.getLogger(__name__)


class EncryptionError(Exception):
    """Raised when encryption/decryption operations fail"""
    pass


def get_encryption_key() -> bytes:
    """
    Get the encryption key from settings.

    Returns:
        bytes: The encryption key

    Raises:
        EncryptionError: If the encryption key is not configured properly
    """
    encryption_key = getattr(settings, 'ENCRYPTION_KEY', None)

    if not encryption_key:
        raise EncryptionError(
            "ENCRYPTION_KEY not configured. Please set ENCRYPTION_KEY in your environment variables."
        )

    try:
        # Ensure the key is properly formatted as bytes
        if isinstance(encryption_key, str):
            encryption_key = encryption_key.encode()

        # Validate the key format by trying to create a Fernet instance
        Fernet(encryption_key)
        return encryption_key
    except Exception as e:
        raise EncryptionError(
            f"Invalid ENCRYPTION_KEY format. Key must be a valid Fernet key (32 url-safe base64-encoded bytes). "
            f"Generate one with: python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'"
        ) from e


def encrypt_value(plaintext: str) -> Optional[str]:
    """
    Encrypt a plaintext string.

    Args:
        plaintext: The plaintext string to encrypt

    Returns:
        str: The encrypted string (base64-encoded), or None on error
    """
    if not plaintext:
        return None

    try:
        key = get_encryption_key()
        fernet = Fernet(key)
        encrypted_bytes = fernet.encrypt(plaintext.encode())
        return encrypted_bytes.decode()
    except EncryptionError:
        logger.error("Encryption key not configured properly")
        raise
    except Exception as e:
        logger.error(f"Encryption failed: {e}")
        raise EncryptionError(f"Failed to encrypt value: {e}") from e


def decrypt_value(encrypted: str) -> Optional[str]:
    """
    Decrypt an encrypted string.

    Args:
        encrypted: The encrypted string (base64-encoded)

    Returns:
        str: The decrypted plaintext, or None if decryption fails
    """
    if not encrypted:
        return None

    try:
        key = get_encryption_key()
        fernet = Fernet(key)
        decrypted_bytes = fernet.decrypt(encrypted.encode())
        return decrypted_bytes.decode()
    except EncryptionError:
        logger.error("Encryption key not configured properly")
        raise
    except InvalidToken:
        logger.warning("Failed to decrypt value - invalid token or wrong key")
        # Return None for invalid tokens to allow graceful fallback
        return None
    except Exception as e:
        logger.error(f"Decryption failed: {e}")
        return None


def generate_encryption_key() -> str:
    """
    Generate a new Fernet encryption key.

    Returns:
        str: A new encryption key (base64-encoded)
    """
    return Fernet.generate_key().decode()


def migrate_encrypted_field(old_encrypted: str, old_key: bytes) -> Optional[str]:
    """
    Re-encrypt a value that was encrypted with an old key.

    Args:
        old_encrypted: The value encrypted with the old key
        old_key: The old encryption key

    Returns:
        str: The value re-encrypted with the current key, or None on error
    """
    if not old_encrypted:
        return None

    try:
        # Decrypt with old key
        old_fernet = Fernet(old_key)
        plaintext = old_fernet.decrypt(old_encrypted.encode()).decode()

        # Re-encrypt with new key
        return encrypt_value(plaintext)
    except Exception as e:
        logger.error(f"Failed to migrate encrypted field: {e}")
        return None

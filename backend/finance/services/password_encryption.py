"""
Password encryption service for securely storing PDF passwords.
Uses Fernet (symmetric encryption) from cryptography library.
"""

from cryptography.fernet import Fernet
from django.conf import settings
import base64
import hashlib


class PasswordEncryptionService:
    """Service for encrypting and decrypting PDF passwords"""

    def __init__(self):
        # Generate encryption key from Django SECRET_KEY
        # In production, use a dedicated encryption key stored securely
        key = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
        self.cipher = Fernet(base64.urlsafe_b64encode(key))

    def encrypt_password(self, password: str) -> bytes:
        """
        Encrypt a password for storage.

        Args:
            password: Plain text password

        Returns:
            Encrypted password as bytes
        """
        if not password:
            return b''

        password_bytes = password.encode('utf-8')
        encrypted = self.cipher.encrypt(password_bytes)
        return encrypted

    def decrypt_password(self, encrypted_password: bytes) -> str:
        """
        Decrypt a stored password.

        Args:
            encrypted_password: Encrypted password bytes

        Returns:
            Decrypted password as string
        """
        if not encrypted_password:
            return ''

        try:
            decrypted = self.cipher.decrypt(encrypted_password)
            return decrypted.decode('utf-8')
        except Exception as e:
            # If decryption fails (corrupted data, wrong key, etc.)
            raise ValueError(f"Failed to decrypt password: {str(e)}")

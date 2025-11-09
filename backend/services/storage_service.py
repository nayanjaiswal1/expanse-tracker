"""
Storage abstraction service for handling file uploads to S3 or local storage.
Automatically selects backend based on STORAGE_BACKEND setting.
"""

import os
import uuid
from datetime import datetime
from typing import BinaryIO, Optional, Tuple
from io import BytesIO

from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile


class StorageService:
    """
    Unified storage service that abstracts S3 and local storage.
    Automatically uses the configured backend (STORAGE_BACKEND setting).
    """

    def __init__(self):
        self.backend = settings.STORAGE_BACKEND
        self.media_root = settings.MEDIA_ROOT
        self.media_url = settings.MEDIA_URL

    def _generate_unique_filename(self, original_filename: str, folder: str = "") -> str:
        """
        Generate a unique filename to prevent collisions.

        Args:
            original_filename: The original file name
            folder: Optional folder path (e.g., 'invoices/2024/01')

        Returns:
            Unique file path
        """
        # Extract file extension
        _, ext = os.path.splitext(original_filename)

        # Generate unique ID
        unique_id = uuid.uuid4().hex[:12]

        # Create timestamp-based folder structure
        now = datetime.now()
        date_folder = f"{now.year}/{now.month:02d}"

        # Combine folder paths
        if folder:
            full_folder = f"{folder}/{date_folder}"
        else:
            full_folder = date_folder

        # Create final filename
        filename = f"{unique_id}{ext}"

        return f"{full_folder}/{filename}"

    def save_file(
        self,
        file_content: BinaryIO,
        filename: str,
        folder: str = "documents",
        content_type: Optional[str] = None,
    ) -> Tuple[str, str]:
        """
        Save a file to storage (S3 or local).

        Args:
            file_content: File content as binary stream
            filename: Original filename
            folder: Folder to save in (e.g., 'invoices', 'receipts', 'statements')
            content_type: Optional MIME type

        Returns:
            Tuple of (file_path, public_url)
        """
        # Generate unique path
        file_path = self._generate_unique_filename(filename, folder)

        # Read content
        if hasattr(file_content, 'read'):
            content = file_content.read()
        else:
            content = file_content

        # Save using Django's storage backend
        saved_path = default_storage.save(file_path, ContentFile(content))

        # Generate public URL
        if self.backend == "s3":
            # For S3, use the full URL
            public_url = default_storage.url(saved_path)
        else:
            # For local, use relative URL
            public_url = f"{self.media_url}{saved_path}"

        return saved_path, public_url

    def save_uploaded_file(
        self,
        uploaded_file,
        folder: str = "documents",
    ) -> Tuple[str, str]:
        """
        Save a Django UploadedFile to storage.

        Args:
            uploaded_file: Django UploadedFile object
            folder: Folder to save in

        Returns:
            Tuple of (file_path, public_url)
        """
        return self.save_file(
            uploaded_file,
            uploaded_file.name,
            folder,
            uploaded_file.content_type,
        )

    def get_file(self, file_path: str) -> BytesIO:
        """
        Retrieve a file from storage.

        Args:
            file_path: Path to the file

        Returns:
            File content as BytesIO
        """
        if default_storage.exists(file_path):
            file_obj = default_storage.open(file_path, 'rb')
            content = file_obj.read()
            file_obj.close()
            return BytesIO(content)
        else:
            raise FileNotFoundError(f"File not found: {file_path}")

    def delete_file(self, file_path: str) -> bool:
        """
        Delete a file from storage.

        Args:
            file_path: Path to the file

        Returns:
            True if deleted, False if file didn't exist
        """
        if default_storage.exists(file_path):
            default_storage.delete(file_path)
            return True
        return False

    def get_file_url(self, file_path: str, expires_in: int = 3600) -> str:
        """
        Get a public URL for a file (with expiration for S3).

        Args:
            file_path: Path to the file
            expires_in: Seconds until URL expires (S3 only)

        Returns:
            Public URL
        """
        if self.backend == "s3":
            # Generate signed URL for S3
            return default_storage.url(file_path)
        else:
            # For local, return simple URL
            return f"{self.media_url}{file_path}"

    def file_exists(self, file_path: str) -> bool:
        """
        Check if a file exists in storage.

        Args:
            file_path: Path to the file

        Returns:
            True if exists, False otherwise
        """
        return default_storage.exists(file_path)

    def get_file_size(self, file_path: str) -> int:
        """
        Get file size in bytes.

        Args:
            file_path: Path to the file

        Returns:
            Size in bytes
        """
        if default_storage.exists(file_path):
            return default_storage.size(file_path)
        return 0

    def save_from_bytes(
        self,
        content: bytes,
        filename: str,
        folder: str = "documents",
    ) -> Tuple[str, str]:
        """
        Save bytes content as a file.

        Args:
            content: File content as bytes
            filename: Desired filename
            folder: Folder to save in

        Returns:
            Tuple of (file_path, public_url)
        """
        return self.save_file(BytesIO(content), filename, folder)


# Global instance
storage_service = StorageService()

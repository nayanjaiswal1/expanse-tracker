"""
Image processing utilities for profile photos.
Handles image optimization, resizing, and format conversion.
"""

import io
import os
from PIL import Image, ImageOps
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.conf import settings


class ProfilePhotoProcessor:
    """Handles profile photo processing and optimization"""

    # Image constraints
    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB initial limit, will optimize to smaller size
    PROFILE_SIZE = (400, 400)  # Main profile photo size
    THUMBNAIL_SIZE = (150, 150)  # Thumbnail size
    ALLOWED_FORMATS = ['JPEG', 'PNG', 'WEBP']
    OUTPUT_FORMAT = 'JPEG'
    OUTPUT_QUALITY = 85

    @classmethod
    def process_profile_photo(cls, image_file, filename_prefix="profile"):
        """
        Process uploaded image for profile photo use.
        Returns tuple: (main_image_file, thumbnail_file, errors)
        """
        errors = []

        try:
            # Validate file size (more generous limit, we'll optimize anyway)
            if image_file.size > cls.MAX_FILE_SIZE:
                errors.append(f"File too large. Maximum size is {cls.MAX_FILE_SIZE // (1024*1024)}MB")
                return None, None, errors

            # Open and validate image
            image = Image.open(image_file)

            # Convert to RGB if necessary
            if image.mode in ('RGBA', 'LA', 'P'):
                # Create white background for transparent images
                background = Image.new('RGB', image.size, (255, 255, 255))
                if image.mode == 'P':
                    image = image.convert('RGBA')
                background.paste(image, mask=image.split()[-1] if image.mode in ('RGBA', 'LA') else None)
                image = background
            elif image.mode != 'RGB':
                image = image.convert('RGB')

            # Auto-orient image based on EXIF data
            image = ImageOps.exif_transpose(image)

            # Create main profile photo
            main_image = cls._resize_and_crop(image, cls.PROFILE_SIZE)
            main_file = cls._image_to_file(main_image, f"{filename_prefix}_main.jpg")

            # Create thumbnail
            thumbnail_image = cls._resize_and_crop(image, cls.THUMBNAIL_SIZE)
            thumbnail_file = cls._image_to_file(thumbnail_image, f"{filename_prefix}_thumb.jpg")

            return main_file, thumbnail_file, errors

        except Exception as e:
            errors.append(f"Error processing image: {str(e)}")
            return None, None, errors

    @classmethod
    def _resize_and_crop(cls, image, target_size):
        """Resize and crop image to target size maintaining aspect ratio"""
        # Calculate dimensions for center crop
        original_width, original_height = image.size
        target_width, target_height = target_size

        # Calculate scaling factor to fill the target size
        scale_x = target_width / original_width
        scale_y = target_height / original_height
        scale = max(scale_x, scale_y)

        # Resize image maintaining aspect ratio
        new_width = int(original_width * scale)
        new_height = int(original_height * scale)
        image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)

        # Calculate crop box for center crop
        left = (new_width - target_width) // 2
        top = (new_height - target_height) // 2
        right = left + target_width
        bottom = top + target_height

        # Crop to target size
        image = image.crop((left, top, right, bottom))

        return image

    @classmethod
    def _image_to_file(cls, image, filename):
        """Convert PIL Image to Django ContentFile"""
        buffer = io.BytesIO()
        image.save(buffer, format=cls.OUTPUT_FORMAT, quality=cls.OUTPUT_QUALITY, optimize=True)
        buffer.seek(0)

        return ContentFile(buffer.getvalue(), name=filename)

    @classmethod
    def validate_image_file(cls, image_file):
        """Validate uploaded image file"""
        errors = []

        # Check file size
        if image_file.size > cls.MAX_FILE_SIZE:
            errors.append(f"File too large. Maximum size is {cls.MAX_FILE_SIZE // (1024*1024)}MB")

        # Check if it's a valid image
        try:
            image = Image.open(image_file)
            image.verify()  # Verify it's a valid image

            # Reset file pointer after verify()
            image_file.seek(0)

            # Check format
            if image.format not in cls.ALLOWED_FORMATS:
                errors.append(f"Unsupported format. Allowed formats: {', '.join(cls.ALLOWED_FORMATS)}")

        except Exception as e:
            errors.append(f"Invalid image file: {str(e)}")

        return errors

    @classmethod
    def delete_profile_photos(cls, profile_photo_path, thumbnail_path):
        """Delete profile photo files from storage"""
        try:
            if profile_photo_path and default_storage.exists(profile_photo_path):
                default_storage.delete(profile_photo_path)

            if thumbnail_path and default_storage.exists(thumbnail_path):
                default_storage.delete(thumbnail_path)

        except Exception as e:
            # Log error but don't raise - this is cleanup
            print(f"Error deleting profile photos: {e}")


def cleanup_old_profile_photos(user_profile):
    """Clean up old profile photos when new ones are uploaded"""
    if user_profile.profile_photo:
        try:
            old_path = user_profile.profile_photo.path
            if os.path.exists(old_path):
                os.remove(old_path)
        except:
            pass

    if user_profile.profile_photo_thumbnail:
        try:
            old_path = user_profile.profile_photo_thumbnail.path
            if os.path.exists(old_path):
                os.remove(old_path)
        except:
            pass
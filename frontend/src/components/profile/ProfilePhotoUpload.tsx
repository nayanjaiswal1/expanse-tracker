import React, { useState, useRef, useCallback } from 'react';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import { Camera, Upload, X, Trash2, Check } from 'lucide-react';
import { Button } from '../ui/Button';
import { FlexBetween, FlexStart, HStack } from '../ui/Layout';
import 'react-image-crop/dist/ReactCrop.css';

interface ProfilePhotoUploadProps {
  currentPhotoUrl?: string;
  currentThumbnailUrl?: string;
  hasCustomPhoto?: boolean;
  onPhotoUpdated: (photoData: {
    profile_photo_url?: string;
    profile_photo_thumbnail_url?: string;
    has_custom_photo: boolean;
  }) => void;
  onError?: (error: string) => void;
}

const ProfilePhotoUpload: React.FC<ProfilePhotoUploadProps> = ({
  currentPhotoUrl,
  currentThumbnailUrl,
  hasCustomPhoto = false,
  onPhotoUpdated,
  onError,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [showCropModal, setShowCropModal] = useState(false);
  const [originalFile, setOriginalFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Initialize crop with aspect ratio 1:1 for square profile photos
  const initializeCrop = useCallback((imageWidth: number, imageHeight: number): Crop => {
    return centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 80,
        },
        1,
        imageWidth,
        imageHeight
      ),
      imageWidth,
      imageHeight
    );
  }, []);

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { width, height } = e.currentTarget;
      setCrop(initializeCrop(width, height));
    },
    [initializeCrop]
  );

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (50MB max, will be optimized server-side)
    if (file.size > 50 * 1024 * 1024) {
      onError?.('File too large. Maximum size is 50MB.');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      onError?.('Please select a valid image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
      setOriginalFile(file);
      setShowCropModal(true);
    };
    reader.onerror = () => {};
    reader.readAsDataURL(file);
  };

  const getCroppedCanvas = useCallback(() => {
    if (!imageRef.current || !completedCrop) return null;

    const image = imageRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = completedCrop.width * scaleX;
    canvas.height = completedCrop.height * scaleY;

    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );

    return canvas;
  }, [completedCrop]);

  const handleCropConfirm = async () => {
    if (!originalFile || !completedCrop) return;

    try {
      setIsUploading(true);

      // Get cropped canvas
      const canvas = getCroppedCanvas();
      if (!canvas) {
        throw new Error('Failed to crop image');
      }

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob from canvas'));
            }
          },
          'image/jpeg',
          0.85
        );
      });

      // Create form data with cropped image
      const formData = new FormData();
      formData.append('profile_photo', blob, originalFile.name);

      // Upload to backend
      const response = await fetch('/api/users/upload_profile_photo/', {
        method: 'POST',
        body: formData,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload profile photo');
      }

      const data = await response.json();

      // Update parent component
      onPhotoUpdated({
        profile_photo_url: data.profile_photo_url,
        profile_photo_thumbnail_url: data.profile_photo_thumbnail_url,
        has_custom_photo: data.has_custom_photo,
      });

      // Close modal and reset state
      setShowCropModal(false);
      setSelectedImage(null);
      setOriginalFile(null);
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to upload profile photo';
      onError?.(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!hasCustomPhoto) {
      return;
    }

    try {
      setIsUploading(true);

      const response = await fetch('/api/users/delete_profile_photo/', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete profile photo');
      }

      const data = await response.json();

      // Update parent component
      onPhotoUpdated({
        profile_photo_url: data.profile_photo_url,
        profile_photo_thumbnail_url: data.profile_photo_thumbnail_url,
        has_custom_photo: data.has_custom_photo,
      });
    } catch (error) {
      console.error('Error deleting profile photo:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to delete profile photo';
      onError?.(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCropCancel = () => {
    setShowCropModal(false);
    setSelectedImage(null);
    setOriginalFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Current Profile Photo Display */}
      <HStack gap={4}>
        <div className="relative">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 border-2 border-gray-300">
            {currentPhotoUrl ? (
              <img
                src={currentThumbnailUrl || currentPhotoUrl}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Camera className="w-8 h-8 text-gray-400" />
              </div>
            )}
          </div>
          {hasCustomPhoto && (
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
              <Check className="w-3 h-3 text-white" />
            </div>
          )}
        </div>

        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-900">Profile Photo</h3>
          <p className="text-xs text-gray-500">
            {hasCustomPhoto
              ? 'Using your uploaded photo'
              : currentPhotoUrl
                ? 'Using Google account photo'
                : 'No photo uploaded'}
          </p>
        </div>
      </HStack>

      {/* Upload/Delete Buttons */}
      <HStack gap={3}>
        <Button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          variant="primary"
          size="none"
          className="flex items-center space-x-2 rounded-md px-4 py-2 text-sm font-medium shadow-none disabled:bg-blue-400"
        >
          <Upload className="w-4 h-4" />
          <span>{isUploading ? 'Uploading...' : 'Upload Photo'}</span>
        </Button>

        {hasCustomPhoto && (
          <Button
            type="button"
            onClick={handleDeletePhoto}
            disabled={isUploading}
            variant="danger"
            size="none"
            className="flex items-center space-x-2 rounded-md px-4 py-2 text-sm font-medium shadow-none disabled:bg-red-400"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete</span>
          </Button>
        )}
      </HStack>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Crop Modal */}
      {showCropModal && selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[95vh] overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-700">
            {/* Header */}
            <FlexBetween className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Crop Your Photo
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Adjust the crop area to frame your profile photo perfectly
                </p>
              </div>
              <Button
                type="button"
                onClick={handleCropCancel}
                disabled={isUploading}
                variant="icon-soft"
                size="none"
                className="rounded-lg p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </Button>
            </FlexBetween>

            {/* Crop Area */}
            <div className="p-6 bg-gray-50 dark:bg-gray-900">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-inner">
                <div className="flex justify-center">
                  <div className="relative max-w-2xl max-h-96 overflow-hidden rounded-lg">
                    <ReactCrop
                      crop={crop}
                      onChange={(_, percentCrop) => setCrop(percentCrop)}
                      onComplete={(c) => setCompletedCrop(c)}
                      aspect={1}
                      circularCrop
                      className="max-w-full"
                    >
                      <img
                        ref={imageRef}
                        src={selectedImage}
                        alt="Crop preview"
                        onLoad={onImageLoad}
                        className="max-w-full h-auto rounded-lg"
                        style={{ maxHeight: '400px' }}
                      />
                    </ReactCrop>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <FlexStart gap={3}>
                  <div className="flex-shrink-0 w-5 h-5 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center mt-0.5">
                    <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      How to crop
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      Drag the corners to resize the crop area, or drag the center to move it. Your
                      photo will be automatically cropped to a perfect circle for your profile.
                    </p>
                  </div>
                </FlexStart>
              </div>
            </div>

            {/* Footer */}
            <FlexBetween className="p-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Preview shows how your photo will appear
              </div>
              <HStack gap={3}>
                <Button
                  type="button"
                  onClick={handleCropCancel}
                  disabled={isUploading}
                  variant="outline-neutral-lg"
                  size="none"
                  className="px-5 py-2.5 font-medium"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleCropConfirm}
                  disabled={isUploading || !completedCrop}
                  variant="primary-elevated"
                  size="none"
                  className="flex items-center space-x-2 rounded-lg px-6 py-2.5 font-medium shadow-sm disabled:bg-blue-400 disabled:shadow-none"
                >
                  {isUploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <span>Upload Photo</span>
                    </>
                  )}
                </Button>
              </HStack>
            </FlexBetween>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePhotoUpload;

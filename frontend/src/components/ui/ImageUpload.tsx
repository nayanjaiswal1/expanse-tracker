import React, { useState, useRef } from 'react';
import { Upload, X, Plus } from 'lucide-react';
import { Button } from './Button';

interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  caption?: string;
}

interface ImageUploadProps {
  images: UploadedImage[];
  onImagesChange: (images: UploadedImage[]) => void;
  maxImages?: number;
  className?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  images,
  onImagesChange,
  maxImages = 5,
  className = '',
}) => {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (files: File[]) => {
    const remainingSlots = maxImages - images.length;
    const filesToProcess = files.slice(0, remainingSlots);

    const newImages: UploadedImage[] = [];

    filesToProcess.forEach((file) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const newImage: UploadedImage = {
            id: `${Date.now()}-${Math.random()}`,
            file,
            preview: e.target?.result as string,
          };
          newImages.push(newImage);

          if (newImages.length === filesToProcess.length) {
            onImagesChange([...images, ...newImages]);
          }
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const removeImage = (id: string) => {
    const updatedImages = images.filter((img) => img.id !== id);
    onImagesChange(updatedImages);
  };

  const updateCaption = (id: string, caption: string) => {
    const updatedImages = images.map((img) => (img.id === id ? { ...img, caption } : img));
    onImagesChange(updatedImages);
  };

  const onButtonClick = () => {
    inputRef.current?.click();
  };

  return (
    <div className={className}>
      <div className="space-y-4">
        {/* Upload Area */}
        {images.length < maxImages && (
          <div
            className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
              dragActive
                ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleChange}
              className="hidden"
            />

            <div className="text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <Button
                    type="button"
                    onClick={onButtonClick}
                    variant="link-primary"
                    size="none"
                    className="font-medium"
                  >
                    Upload images
                  </Button>
                  {' or drag and drop'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  PNG, JPG, GIF up to 10MB ({maxImages - images.length} remaining)
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Image Preview Grid */}
        {images.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {images.map((image) => (
              <div key={image.id} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                  <img
                    src={image.preview}
                    alt="Goal image"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Remove button */}
                <Button
                  type="button"
                  onClick={() => removeImage(image.id)}
                  variant="danger"
                  size="none"
                  className="absolute -top-2 -right-2 rounded-full p-1 shadow-none"
                  aria-label="Remove image"
                >
                  <X className="h-3 w-3" />
                </Button>

                {/* Caption input */}
                <input
                  type="text"
                  placeholder="Add caption..."
                  value={image.caption || ''}
                  onChange={(e) => updateCaption(image.id, e.target.value)}
                  className="mt-2 w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
            ))}

            {/* Add more button */}
            {images.length < maxImages && (
              <Button type="button" onClick={onButtonClick} variant="dashed-upload" size="none">
                <Plus className="h-8 w-8 text-gray-400" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

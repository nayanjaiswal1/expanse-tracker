import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Target,
  Calendar,
  Coins,
  TrendingUp,
  Edit2,
  Trash2,
  Play,
  Pause,
  CheckCircle,
  Eye,
  EyeOff,
  Image as ImageIcon,
  ZoomIn,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../utils/preferences';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import type { Goal } from '../../types';
import { FlexBetween, HStack } from '../../components/ui/Layout';

interface GoalDetailProps {
  goal: Goal;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onUpdateProgress: () => void;
  onToggleStatus: (status: 'active' | 'paused') => void;
  showAmounts: boolean;
  onToggleAmounts: () => void;
}

export const GoalDetail: React.FC<GoalDetailProps> = ({
  goal,
  onBack,
  onEdit,
  onDelete,
  onUpdateProgress,
  onToggleStatus,
  showAmounts,
  onToggleAmounts,
}) => {
  const { t } = useTranslation('finance');
  const { state: authState } = useAuth();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const progressPercent = Math.min(goal.progress_percentage, 100);
  const images = goal.images || [];
  const statusKey = goal.status
    ? `goals.detail.status.${goal.status}`
    : 'goals.detail.status.unknown';
  const statusLabel = t(statusKey);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'completed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-6 pb-12">
      {/* Header */}
      <FlexBetween>
        <Button onClick={onBack} variant="ghost-inline" size="none" className="flex items-center">
          <ArrowLeft className="h-4 w-4" />
          {t('goals.detail.back')}
        </Button>

        <HStack gap={2}>
          <Button onClick={onToggleAmounts} variant="ghost" size="sm">
            {showAmounts ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          <Button onClick={onEdit} variant="ghost" size="sm">
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button onClick={onDelete} variant="ghost" size="sm">
            <Trash2 className="h-4 w-4" />
          </Button>
        </HStack>
      </FlexBetween>

      {/* Goal Info Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg p-8">
        <FlexBetween className="mb-6 items-start">
          <HStack gap={3}>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
              <Target className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{goal.name}</h1>
              <HStack gap={3} className="mt-1">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(goal.status)}`}
                >
                  {statusLabel}
                </span>
                {goal.goal_type && (
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {goal.goal_type.replace('_', ' ')}
                  </span>
                )}
              </HStack>
            </div>
          </HStack>

          <HStack gap={2}>
            {goal.status === 'active' && (
              <>
                <Button onClick={onUpdateProgress} size="sm">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  {t('goals.detail.actions.updateProgress')}
                </Button>
                <Button onClick={() => onToggleStatus('paused')} variant="outline" size="sm">
                  <Pause className="h-4 w-4 mr-2" />
                  {t('goals.detail.actions.pause')}
                </Button>
              </>
            )}
            {goal.status === 'paused' && (
              <Button onClick={() => onToggleStatus('active')} variant="outline" size="sm">
                <Play className="h-4 w-4 mr-2" />
                {t('goals.detail.actions.resume')}
              </Button>
            )}
          </HStack>
        </FlexBetween>

        {goal.description && (
          <p className="text-gray-600 dark:text-gray-400 mb-4">{goal.description}</p>
        )}

        {/* Progress Section */}
        <div className="space-y-3 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('goals.detail.progress.label')}
            </span>
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              {progressPercent.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div
              className="h-3 rounded-full bg-blue-500 transition-all duration-500"
              style={{
                width: `${progressPercent}%`,
                backgroundColor: goal.color || '#3B82F6',
              }}
            />
          </div>
        </div>

        {/* Financial Details */}
        {showAmounts && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-5 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                {t('goals.detail.progress.current')}
              </div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(parseFloat(goal.current_amount), authState.user)}
              </div>
            </div>
            <div className="text-center p-5 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                {t('goals.detail.progress.target')}
              </div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(parseFloat(goal.target_amount), authState.user)}
              </div>
            </div>
            <div className="text-center p-5 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
              <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-2">
                {t('goals.detail.progress.remaining')}
              </div>
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                {formatCurrency(parseFloat(goal.remaining_amount), authState.user)}
              </div>
            </div>
          </div>
        )}

        {/* Date Info */}
        <HStack gap={6} className="text-sm text-gray-600 dark:text-gray-400">
          {goal.start_date && (
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              {t('goals.detail.dates.started', {
                date: new Date(goal.start_date).toLocaleDateString(),
              })}
            </div>
          )}
          {goal.target_date && (
            <div className="flex items-center">
              <Target className="h-4 w-4 mr-2" />
              {t('goals.detail.dates.target', {
                date: new Date(goal.target_date).toLocaleDateString(),
              })}
            </div>
          )}
        </HStack>
      </div>

      {/* Image Gallery */}
      {images.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg p-8">
          <FlexBetween className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <ImageIcon className="h-5 w-5 mr-2" />
              {t('goals.detail.images.title', { count: images.length })}
            </h2>
          </FlexBetween>

          {images.length === 1 ? (
            <div className="relative">
              <img
                src={images[0].image_url}
                alt={t('goals.detail.images.alt')}
                className="w-full max-h-96 object-cover rounded-lg cursor-pointer"
                onClick={() => setSelectedImage(images[0].image_url)}
              />
              {images[0].caption && (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{images[0].caption}</p>
              )}
              <Button
                onClick={() => setSelectedImage(images[0].image_url)}
                variant="overlay"
                className="absolute top-4 right-4"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              {/* Main Image */}
              <div className="relative mb-4">
                <img
                  src={images[currentImageIndex].image_url}
                  alt={t('goals.detail.images.numberedAlt', {
                    index: currentImageIndex + 1,
                  })}
                  className="w-full max-h-96 object-cover rounded-lg cursor-pointer"
                  onClick={() => setSelectedImage(images[currentImageIndex].image_url)}
                />
                {images[currentImageIndex].caption && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {images[currentImageIndex].caption}
                  </p>
                )}

                {/* Navigation buttons */}
                <Button
                  onClick={prevImage}
                  variant="overlay"
                  className="absolute left-4 top-1/2 -translate-y-1/2"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Button
                  onClick={nextImage}
                  variant="overlay"
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                >
                  <ArrowLeft className="h-4 w-4 rotate-180" />
                </Button>

                <Button
                  onClick={() => setSelectedImage(images[currentImageIndex].image_url)}
                  variant="overlay"
                  className="absolute top-4 right-4"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>

              {/* Thumbnail Navigation */}
              <HStack gap={2} className="overflow-x-auto pb-2">
                {images.map((image, index) => (
                  <Button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    variant={index === currentImageIndex ? 'thumbnail-active' : 'thumbnail'}
                    className="flex-shrink-0 w-16 h-16"
                  >
                    <img
                      src={image.thumbnail_url || image.image_url}
                      alt={t('goals.detail.images.thumbnailAlt', {
                        index: index + 1,
                      })}
                      className="w-full h-full object-cover"
                    />
                  </Button>
                ))}
              </HStack>
            </>
          )}
        </div>
      )}

      {/* Full Screen Image Modal */}
      <Modal
        isOpen={selectedImage !== null}
        onClose={() => setSelectedImage(null)}
        size="full"
        className="bg-black/90"
      >
        <div className="relative w-full h-full flex items-center justify-center p-4">
          <Button
            onClick={() => setSelectedImage(null)}
            variant="overlay"
            className="absolute top-4 right-4 z-10"
          >
            <X className="h-6 w-6" />
          </Button>
          {selectedImage && (
            <img
              src={selectedImage}
              alt={t('goals.detail.images.fullscreenAlt')}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          )}
        </div>
      </Modal>
    </div>
  );
};

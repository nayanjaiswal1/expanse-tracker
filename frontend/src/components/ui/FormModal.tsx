import React, { type ReactNode, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { Button } from './Button';
import { Modal } from './Modal';

interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'large';
  closeOnBackdrop?: boolean;
  showFullscreenToggle?: boolean;
}

export const FormModal: React.FC<FormModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closeOnBackdrop = true,
  showFullscreenToggle = false,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size={size}
      density="compact"
      variant={isFullscreen ? 'fullscreen' : 'modal'}
      closeOnBackdrop={closeOnBackdrop}
      headerActions={
        showFullscreenToggle && (
          <Button
            onClick={() => setIsFullscreen((f) => !f)}
            variant="icon-soft"
            size="none"
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </Button>
        )
      }
    >
      <div className={isFullscreen ? 'overflow-y-auto px-5 py-4 h-[calc(100vh-140px)]' : ''}>
        {children}
      </div>
    </Modal>
  );
};

import React from 'react';
import { ArrowUp } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

interface ScrollToTopButtonProps {
  isVisible: boolean;
  onClick: () => void;
}

export const ScrollToTopButton: React.FC<ScrollToTopButtonProps> = ({ isVisible, onClick }) => {
  if (!isVisible) return null;

  return (
    <Button
      onClick={onClick}
      variant="fab"
      className="fixed bottom-6 right-6 z-50"
      title="Scroll to top"
    >
      <ArrowUp className="w-4 h-4" />
    </Button>
  );
};

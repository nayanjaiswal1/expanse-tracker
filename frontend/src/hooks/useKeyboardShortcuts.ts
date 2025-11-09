import { useEffect } from 'react';

interface KeyboardShortcutsOptions {
  onUndo?: () => void;
  onRedo?: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts({ onUndo, onRedo, enabled = true }: KeyboardShortcutsOptions) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if user is typing in an input/textarea
      const target = event.target as HTMLElement;
      const isTyping = ['INPUT', 'TEXTAREA'].includes(target.tagName);

      // Don't trigger shortcuts when typing (except in our editable cells)
      if (isTyping && !target.classList.contains('editable-cell-input')) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? event.metaKey : event.ctrlKey;

      // Undo: Ctrl+Z (Windows/Linux) or Cmd+Z (Mac)
      if (cmdOrCtrl && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        onUndo?.();
      }

      // Redo: Ctrl+Y (Windows/Linux) or Cmd+Shift+Z (Mac) or Ctrl+Shift+Z
      if ((cmdOrCtrl && event.key === 'y') || (cmdOrCtrl && event.shiftKey && event.key === 'z')) {
        event.preventDefault();
        onRedo?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onUndo, onRedo, enabled]);
}

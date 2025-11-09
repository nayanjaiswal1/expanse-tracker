import { useState, useEffect, useRef, useCallback } from 'react';
import type { Row } from '@tanstack/react-table';

export function useSelectionMode<T>(
  hasSelection: boolean,
  enableRowSelection: boolean,
  onVisibilityChange?: (visible: boolean) => void
) {
  const [selectionMode, setSelectionMode] = useState(false);
  const [longPressActive, setLongPressActive] = useState(false);
  const longPressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);

  const isActive = selectionMode || longPressActive || hasSelection;

  // Toggle selection mode with Ctrl/Meta; exit with Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.repeat && (e.key === 'Control' || e.key === 'Meta')) {
        setSelectionMode((v) => !v);
      }
      if (e.key === 'Escape') {
        setSelectionMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Keep latest visibility change handler in a ref to avoid effect loops on identity changes
  const visibilityChangeRef = useRef<typeof onVisibilityChange>(onVisibilityChange);
  useEffect(() => {
    visibilityChangeRef.current = onVisibilityChange;
  }, [onVisibilityChange]);

  // Notify parent when visibility should change (only when the boolean changes)
  useEffect(() => {
    if (enableRowSelection && visibilityChangeRef.current) {
      visibilityChangeRef.current(isActive);
    }
  }, [isActive, enableRowSelection]);

  const startLongPress = useCallback((row?: Row<T>) => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
    }
    longPressTimeoutRef.current = setTimeout(() => {
      setLongPressActive(true);
      longPressTriggeredRef.current = true;
      if (row && !row.getIsSelected()) {
        row.toggleSelected();
      }
    }, 500);
  }, []);

  const endLongPress = useCallback(() => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
    setLongPressActive(false);
  }, []);

  useEffect(() => {
    return () => {
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
      }
    };
  }, []);

  return {
    isSelectionModeActive: isActive,
    longPressTriggered: longPressTriggeredRef,
    startLongPress,
    endLongPress,
  };
}

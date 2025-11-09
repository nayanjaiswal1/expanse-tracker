import { useState, useCallback, useRef, useEffect } from 'react';

interface MenuState {
  openRowId: string | null;
  position: { top: number; left: number };
}

export function useActionMenu() {
  const [menuState, setMenuState] = useState<MenuState>({
    openRowId: null,
    position: { top: 0, left: 0 },
  });
  const menuButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const menuContainerRef = useRef<HTMLDivElement | null>(null);

  const toggleMenu = useCallback(
    (rowId: string, buttonElement: HTMLButtonElement | null) => {
      if (menuState.openRowId === rowId) {
        setMenuState({ openRowId: null, position: { top: 0, left: 0 } });
      } else if (buttonElement) {
        requestAnimationFrame(() => {
          const rect = buttonElement.getBoundingClientRect();
          setMenuState({
            openRowId: rowId,
            position: {
              top: rect.bottom + window.scrollY + 4,
              left: rect.right + window.scrollX - 192,
            },
          });
        });
      }
    },
    [menuState.openRowId]
  );

  const closeMenu = useCallback(() => {
    setMenuState({ openRowId: null, position: { top: 0, left: 0 } });
  }, []);

  // Close menu on click outside
  useEffect(() => {
    if (!menuState.openRowId) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      const button = menuButtonRefs.current.get(menuState.openRowId!);
      const menu = menuContainerRef.current;
      const clickedInsideButton = !!(button && button.contains(target));
      const clickedInsideMenu = !!(menu && menu.contains(target));
      if (!clickedInsideButton && !clickedInsideMenu) {
        closeMenu();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeMenu();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuState.openRowId, closeMenu]);

  return {
    menuState,
    menuButtonRefs,
    menuContainerRef,
    toggleMenu,
    closeMenu,
  };
}

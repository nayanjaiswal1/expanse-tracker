import { createPortal } from 'react-dom';
import type React from 'react';

interface MenuAction {
  label: string;
  action: string;
  icon?: React.ReactNode;
}

interface ActionMenuProps {
  isOpen: boolean;
  position: { top: number; left: number };
  actions: MenuAction[];
  onActionClick: (action: string) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function ActionMenu({
  isOpen,
  position,
  actions,
  onActionClick,
  containerRef,
}: ActionMenuProps) {
  if (!isOpen) return null;

  return createPortal(
    <div
      ref={containerRef}
      className="fixed w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-[9999]"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      {actions.map((action) => (
        <button
          key={action.action}
          onClick={(e) => {
            e.stopPropagation();
            onActionClick(action.action);
          }}
          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-2 transition-colors first:rounded-t-lg last:rounded-b-lg"
        >
          {action.icon}
          <span className="text-gray-700 dark:text-gray-300">{action.label}</span>
        </button>
      ))}
    </div>,
    document.body
  );
}

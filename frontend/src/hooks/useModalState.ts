/**
 * useModalState - Standardized modal state management
 *
 * Replaces the repeated pattern of:
 * - isOpen state
 * - open/close handlers
 * - Edit item state
 * - Reset on close
 *
 * Usage:
 * ```typescript
 * const modal = useModalState<MyItemType>();
 *
 * // Open for create
 * <button onClick={modal.open}>Create</button>
 *
 * // Open for edit
 * <button onClick={() => modal.openWithData(item)}>Edit</button>
 *
 * // In modal component
 * <Modal isOpen={modal.isOpen} onClose={modal.close}>
 *   {modal.data && <div>Editing: {modal.data.name}</div>}
 * </Modal>
 * ```
 */

import { useState, useCallback } from 'react';

export interface UseModalStateOptions<T> {
  /** Callback when modal opens */
  onOpen?: (data?: T) => void;
  /** Callback when modal closes */
  onClose?: () => void;
  /** Initial open state */
  initialOpen?: boolean;
  /** Initial data */
  initialData?: T;
}

export interface UseModalStateReturn<T> {
  /** Whether modal is open */
  isOpen: boolean;
  /** Open modal (for create mode) */
  open: () => void;
  /** Open modal with data (for edit mode) */
  openWithData: (data: T) => void;
  /** Close modal and reset data */
  close: () => void;
  /** Toggle modal */
  toggle: () => void;
  /** Current modal data (null if create mode, data if edit mode) */
  data: T | null;
  /** Set modal data without opening */
  setData: (data: T | null) => void;
  /** Whether modal is in edit mode (has data) */
  isEditMode: boolean;
  /** Whether modal is in create mode (no data) */
  isCreateMode: boolean;
}

export function useModalState<T = any>(
  options: UseModalStateOptions<T> = {}
): UseModalStateReturn<T> {
  const { onOpen, onClose, initialOpen = false, initialData = null } = options;

  const [isOpen, setIsOpen] = useState(initialOpen);
  const [data, setData] = useState<T | null>(initialData);

  /**
   * Open modal (create mode - no data)
   */
  const open = useCallback(() => {
    setIsOpen(true);
    setData(null);
    onOpen?.(undefined);
  }, [onOpen]);

  /**
   * Open modal with data (edit mode)
   */
  const openWithData = useCallback(
    (itemData: T) => {
      setIsOpen(true);
      setData(itemData);
      onOpen?.(itemData);
    },
    [onOpen]
  );

  /**
   * Close modal and reset data
   */
  const close = useCallback(() => {
    setIsOpen(false);
    setData(null);
    onClose?.();
  }, [onClose]);

  /**
   * Toggle modal
   */
  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [isOpen, open, close]);

  const isEditMode = data !== null;
  const isCreateMode = !isEditMode;

  return {
    isOpen,
    open,
    openWithData,
    close,
    toggle,
    data,
    setData,
    isEditMode,
    isCreateMode,
  };
}

/**
 * useMultiModalState - Manage multiple modals in a single component
 *
 * Usage:
 * ```typescript
 * const modals = useMultiModalState(['create', 'edit', 'delete']);
 *
 * <button onClick={() => modals.open('create')}>Create</button>
 * <Modal isOpen={modals.isOpen('create')} onClose={() => modals.close('create')}>
 *   ...
 * </Modal>
 * ```
 */
export function useMultiModalState<K extends string>(
  modalKeys: readonly K[]
): {
  isOpen: (key: K) => boolean;
  open: (key: K) => void;
  close: (key: K) => void;
  closeAll: () => void;
  toggle: (key: K) => void;
} {
  const [openModals, setOpenModals] = useState<Set<K>>(new Set());

  const isOpen = useCallback((key: K) => openModals.has(key), [openModals]);

  const open = useCallback((key: K) => {
    setOpenModals((prev) => new Set(prev).add(key));
  }, []);

  const close = useCallback((key: K) => {
    setOpenModals((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const closeAll = useCallback(() => {
    setOpenModals(new Set());
  }, []);

  const toggle = useCallback(
    (key: K) => {
      if (isOpen(key)) {
        close(key);
      } else {
        open(key);
      }
    },
    [isOpen, open, close]
  );

  return {
    isOpen,
    open,
    close,
    closeAll,
    toggle,
  };
}

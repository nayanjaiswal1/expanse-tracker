import { useState, useCallback } from 'react';

/**
 * Reusable hook for managing CRUD modals and their states
 * Handles: Create, Edit, Delete, and other common modals
 */
export function useCrudModals<T = any>() {
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<T | null>(null);
  const [itemToDelete, setItemToDelete] = useState<T | null>(null);

  // Create/Add handlers
  const openAddModal = useCallback(() => {
    setEditingItem(null);
    setShowAddModal(true);
  }, []);

  const closeAddModal = useCallback(() => {
    setShowAddModal(false);
    setEditingItem(null);
  }, []);

  // Edit handlers
  const openEditModal = useCallback((item: T) => {
    setEditingItem(item);
    setShowAddModal(true);
  }, []);

  // Delete handlers
  const openDeleteDialog = useCallback((item: T) => {
    setItemToDelete(item);
    setShowDeleteDialog(true);
  }, []);

  const closeDeleteDialog = useCallback(() => {
    setShowDeleteDialog(false);
    setItemToDelete(null);
  }, []);

  return {
    // States
    showAddModal,
    showDeleteDialog,
    editingItem,
    itemToDelete,

    // Add/Create
    openAddModal,
    closeAddModal,

    // Edit
    openEditModal,

    // Delete
    openDeleteDialog,
    closeDeleteDialog,

    // Helpers
    isEditing: !!editingItem,
  };
}

/**
 * Simple hook for managing a single modal state
 */
export function useModalState(initialState = false) {
  const [isOpen, setIsOpen] = useState(initialState);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return {
    isOpen,
    open,
    close,
    toggle,
  };
}

/**
 * Hook for managing multiple independent modal states
 */
export function useModalStates<T extends Record<string, boolean>>(initialStates: T) {
  const [states, setStates] = useState(initialStates);

  const open = useCallback((key: keyof T) => {
    setStates((prev) => ({ ...prev, [key]: true }));
  }, []);

  const close = useCallback((key: keyof T) => {
    setStates((prev) => ({ ...prev, [key]: false }));
  }, []);

  const toggle = useCallback((key: keyof T) => {
    setStates((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const closeAll = useCallback(() => {
    setStates(initialStates);
  }, [initialStates]);

  return {
    states,
    open,
    close,
    toggle,
    closeAll,
  };
}

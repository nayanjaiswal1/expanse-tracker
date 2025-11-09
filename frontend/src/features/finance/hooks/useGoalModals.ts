import { useState, useCallback } from 'react';
import type { Goal } from '../../../types';

export function useGoalModals() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [showOverviewModal, setShowOverviewModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [progressGoal, setProgressGoal] = useState<Goal | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);
  const [inlineEditGoal, setInlineEditGoal] = useState<number | null>(null);

  const openAddModal = useCallback(() => {
    setEditingGoal(null);
    setShowAddModal(true);
  }, []);

  const openEditModal = useCallback((goal: Goal) => {
    setEditingGoal(goal);
    setShowAddModal(true);
  }, []);

  const closeAddModal = useCallback(() => {
    setShowAddModal(false);
    setEditingGoal(null);
  }, []);

  const openProgressModal = useCallback((goal: Goal) => {
    setProgressGoal(goal);
    setShowProgressModal(true);
  }, []);

  const closeProgressModal = useCallback(() => {
    setShowProgressModal(false);
    setProgressGoal(null);
  }, []);

  const openDeleteDialog = useCallback((goal: Goal) => {
    setGoalToDelete(goal);
    setShowDeleteDialog(true);
  }, []);

  const closeDeleteDialog = useCallback(() => {
    setShowDeleteDialog(false);
    setGoalToDelete(null);
  }, []);

  const toggleFiltersModal = useCallback(() => {
    setShowFiltersModal((prev) => !prev);
  }, []);

  const toggleOverviewModal = useCallback(() => {
    setShowOverviewModal((prev) => !prev);
  }, []);

  const startInlineEdit = useCallback((goalId: number) => {
    setInlineEditGoal(goalId);
  }, []);

  const cancelInlineEdit = useCallback(() => {
    setInlineEditGoal(null);
  }, []);

  return {
    // Modal states
    showAddModal,
    showFiltersModal,
    showOverviewModal,
    showProgressModal,
    showDeleteDialog,

    // Goal states
    editingGoal,
    progressGoal,
    goalToDelete,
    inlineEditGoal,

    // Actions
    openAddModal,
    openEditModal,
    closeAddModal,
    openProgressModal,
    closeProgressModal,
    openDeleteDialog,
    closeDeleteDialog,
    toggleFiltersModal,
    toggleOverviewModal,
    startInlineEdit,
    cancelInlineEdit,
  };
}

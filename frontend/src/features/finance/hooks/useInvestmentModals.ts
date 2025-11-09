import { useState, useCallback } from 'react';
import type { Investment, PendingTransaction } from '../../../hooks/finance';

export function useInvestmentModals() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPendingReviewModal, setShowPendingReviewModal] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [reviewingTransaction, setReviewingTransaction] = useState<PendingTransaction | null>(null);

  const openAddModal = useCallback(() => {
    setEditingInvestment(null);
    setShowAddModal(true);
  }, []);

  const openEditModal = useCallback((investment: Investment) => {
    setEditingInvestment(investment);
    setShowAddModal(true);
  }, []);

  const closeAddModal = useCallback(() => {
    setShowAddModal(false);
    setEditingInvestment(null);
  }, []);

  const openPendingReviewModal = useCallback((transaction: PendingTransaction) => {
    setReviewingTransaction(transaction);
    setShowPendingReviewModal(true);
  }, []);

  const closePendingReviewModal = useCallback(() => {
    setShowPendingReviewModal(false);
    setReviewingTransaction(null);
  }, []);

  return {
    // Modal states
    showAddModal,
    showPendingReviewModal,

    // Investment states
    editingInvestment,
    reviewingTransaction,

    // Actions
    openAddModal,
    openEditModal,
    closeAddModal,
    openPendingReviewModal,
    closePendingReviewModal,
  };
}

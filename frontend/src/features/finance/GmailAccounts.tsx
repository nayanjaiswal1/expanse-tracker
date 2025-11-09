import React, { useState } from 'react';
import { Plus, Mail, Settings, RefreshCw, CheckCircle, XCircle, Clock, Trash2 } from 'lucide-react';
import { apiClient } from '../../api/client';
import { LoadingSpinner } from '../../components/layout/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { checkboxClassName } from '../../components/ui/Checkbox';
import {} from '@tanstack/react-query';
import {
  useGmailAccountsQuery,
  useConnectGmailMutation,
  useSyncAllGmailMutation,
  useSyncGmailAccountMutation,
  useReconnectGmailMutation,
  useDeleteGmailAccountMutation,
  useUpdateGmailAccountMutation,
} from './hooks/queries/useGmail';
import { FlexBetween, HStack } from '../../components/ui/Layout';
import { useCrudModals, useModalState } from '../../hooks/useCrudModals';

// Align with API type but ensure 'connected' is always present for local UI typing
interface GmailAccount {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  transaction_tag: string;
  sender_filters: string[];
  keyword_filters: string[];
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
  connected: boolean;
}

// Removed legacy Account UI usage; account list is not used in this component

interface ExtractedTransaction {
  id: number;
  email_subject: string;
  email_sender: string;
  email_sender_domain: string;
  parsed_amount: number;
  currency: string;
  description: string;
  confidence_level: 'high' | 'medium' | 'low';
  confidence_score: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  days_since_extracted: number;
}

const GmailAccounts: React.FC = () => {
  // no-op
  const [extractedTransactions, setExtractedTransactions] = useState<ExtractedTransaction[]>([]);
  const {
    isOpen: showConfigModal,
    open: openConfigModal,
    close: closeConfigModal,
  } = useModalState();
  const [selectedAccount, setSelectedAccount] = useState<GmailAccount | null>(null);
  const [selectedTransactions, setSelectedTransactions] = useState<number[]>([]);
  const {
    showDeleteDialog,
    itemToDelete: accountToDelete,
    openDeleteDialog,
    closeDeleteDialog,
  } = useCrudModals<number>();
  const { showSuccess, showError } = useToast();
  // Fetch Gmail accounts
  const { data: gmailAccounts = [], isLoading } = useGmailAccountsQuery();
  React.useEffect(() => setExtractedTransactions([]), [gmailAccounts]);

  const connectMutation = useConnectGmailMutation();

  const handleAddGmailAccount = () =>
    connectMutation.mutate(undefined, {
      onSuccess: (response: { authorization_url: string }) => {
        window.location.href = response.authorization_url;
      },
      onError: () => showError('Authentication Error', 'Error starting Gmail authentication'),
    });

  const syncAllMutation = useSyncAllGmailMutation();

  const syncAccountMutation = useSyncGmailAccountMutation();

  const handleSyncAccount = (accountId?: number) => {
    if (accountId)
      syncAccountMutation.mutate(accountId, {
        onSuccess: () => showSuccess('Sync Started', 'Gmail sync started for account'),
        onError: () => showError('Sync Error', 'Error starting sync'),
      });
    else
      syncAllMutation.mutate(undefined, {
        onSuccess: () => showSuccess('Sync Started', 'Gmail sync started for all accounts'),
        onError: () => showError('Sync Error', 'Error starting sync'),
      });
  };

  const reconnectMutation = useReconnectGmailMutation();

  const handleReconnectAccount = (accountId: number) =>
    reconnectMutation.mutate(accountId, {
      onSuccess: (response: { authorization_url: string }) => {
        window.location.href = response.authorization_url;
      },
      onError: () => showError('Reconnection Error', 'Error starting reconnection'),
    });

  const deleteMutation = useDeleteGmailAccountMutation();

  const handleDeleteAccount = () => {
    if (!accountToDelete) return;
    deleteMutation.mutate(accountToDelete, {
      onSuccess: () => {
        showSuccess('Account Disconnected', 'Gmail account disconnected successfully');
        closeDeleteDialog();
      },
      onError: () => {
        showError('Delete Error', 'Error disconnecting Gmail account');
        closeDeleteDialog();
      },
    });
  };

  const updateMutation = useUpdateGmailAccountMutation();

  const handleUpdateConfig = async (config: {
    name?: string;
    transaction_tag?: string;
    sender_filters?: string[];
    keyword_filters?: string[];
    is_active?: boolean;
  }) => {
    if (!selectedAccount) return;
    updateMutation.mutate(
      { id: selectedAccount.id, data: config },
      {
        onSuccess: () => {
          showSuccess('Settings Updated', 'Gmail settings updated successfully');
          closeConfigModal();
        },
        onError: () => showError('Update Error', 'Error updating Gmail settings'),
      }
    );
  };

  const handleBulkApprove = async () => {
    if (selectedTransactions.length === 0) return;

    try {
      await apiClient.performTransactionActions('bulk_approve', {
        transaction_ids: selectedTransactions,
      });
      showSuccess('Transactions Approved', `Approved ${selectedTransactions.length} transactions`);
      setSelectedTransactions([]);
    } catch (error) {
      console.error('Error approving transactions:', error);
      showError('Approval Error', 'Error approving transactions');
    }
  };

  const handleBulkReject = async () => {
    if (selectedTransactions.length === 0) return;

    try {
      await apiClient.performTransactionActions('bulk_reject', {
        transaction_ids: selectedTransactions,
      });
      showSuccess('Transactions Rejected', `Rejected ${selectedTransactions.length} transactions`);
      setSelectedTransactions([]);
    } catch (error) {
      console.error('Error rejecting transactions:', error);
      showError('Rejection Error', 'Error rejecting transactions');
    }
  };

  const getStatusIcon = (isActive: boolean) => {
    return isActive ? (
      <CheckCircle className="w-5 h-5 text-green-500" />
    ) : (
      <Clock className="w-5 h-5 text-gray-500" />
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <>
      {/* Gmail Accounts */}
      <div className="space-y-6">
        <FlexBetween>
          <div>
            <h3 className="text-base font-medium text-gray-900 dark:text-white">
              Connected Accounts
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Manage your Gmail connections
            </p>
          </div>
          <Button onClick={handleAddGmailAccount} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Account
          </Button>
        </FlexBetween>

        {gmailAccounts.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
            <Mail className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h4 className="font-medium text-gray-900 dark:text-white mb-1">
              No accounts connected
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Connect Gmail to extract transactions from receipts
            </p>
            <Button onClick={handleAddGmailAccount} size="sm">
              Connect Gmail
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {gmailAccounts.map((account) => (
              <div
                key={account.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
              >
                <FlexBetween>
                  <HStack gap={3}>
                    {getStatusIcon(account.is_active)}
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {account.name}
                        </h4>
                        <div
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            account.is_active
                              ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          {account.is_active ? 'Active' : 'Inactive'}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {account.email} • Tag: {account.transaction_tag}
                      </p>
                      {account.last_sync_at && (
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          Last sync: {new Date(account.last_sync_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </HStack>
                  <HStack gap={1}>
                    <Button
                      onClick={() => handleSyncAccount(account.id)}
                      size="sm"
                      variant="ghost"
                      title="Sync emails"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => {
                        setSelectedAccount(account);
                        openConfigModal();
                      }}
                      variant="ghost"
                      size="sm"
                      title="Configure account"
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => handleReconnectAccount(account.id)}
                      variant="ghost"
                      size="sm"
                      className="text-blue-600 dark:text-blue-400"
                      title="Reconnect to get refresh token"
                    >
                      🔄
                    </Button>
                    <Button
                      onClick={() => openDeleteDialog(account.id)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 dark:text-red-400"
                      title="Delete account"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </HStack>
                </FlexBetween>
              </div>
            ))}
          </div>
        )}

        {/* Pending Transactions */}
        {extractedTransactions.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <FlexBetween>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Pending Transactions
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {extractedTransactions.length} transactions require review
                  </p>
                </div>
                {selectedTransactions.length > 0 && (
                  <HStack gap={2}>
                    <Button
                      onClick={handleBulkApprove}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Approve ({selectedTransactions.length})
                    </Button>
                    <Button
                      onClick={handleBulkReject}
                      size="sm"
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Reject ({selectedTransactions.length})
                    </Button>
                  </HStack>
                )}
              </FlexBetween>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {extractedTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                  >
                    <HStack gap={4} className="items-start">
                      <input
                        type="checkbox"
                        checked={selectedTransactions.includes(transaction.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTransactions([...selectedTransactions, transaction.id]);
                          } else {
                            setSelectedTransactions(
                              selectedTransactions.filter((id) => id !== transaction.id)
                            );
                          }
                        }}
                        className={`mt-1 ${checkboxClassName}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                              {transaction.description}
                            </h4>
                            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                              <span className="inline-flex items-center">
                                <Mail className="w-3 h-3 mr-1" />
                                {transaction.email_sender_domain}
                              </span>
                              <span>•</span>
                              <span className="font-medium">
                                {transaction.currency} {transaction.parsed_amount}
                              </span>
                              <span>•</span>
                              <span>{transaction.days_since_extracted} days ago</span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-500 truncate">
                              {transaction.email_subject}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span
                              className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                                transaction.confidence_level === 'high'
                                  ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                                  : transaction.confidence_level === 'medium'
                                    ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
                                    : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                              }`}
                            >
                              {transaction.confidence_level} (
                              {Math.round(transaction.confidence_score * 100)}%)
                            </span>
                          </div>
                        </div>
                      </div>
                    </HStack>
                  </div>
                ))}
              </div>
              {extractedTransactions.length === 0 && (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400">
                    All transactions have been reviewed
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Configuration Modal */}
        {showConfigModal && selectedAccount && (
          <ConfigModal
            account={selectedAccount}
            onClose={closeConfigModal}
            onSave={handleUpdateConfig}
          />
        )}

        <ConfirmDialog
          isOpen={showDeleteDialog}
          onClose={closeDeleteDialog}
          onConfirm={handleDeleteAccount}
          title="Disconnect Gmail Account"
          message="Are you sure you want to disconnect this Gmail account? This will not delete your existing transactions."
          confirmText="Disconnect"
          variant="warning"
        />
      </div>
    </>
  );
};

// Configuration Modal Component
const ConfigModal: React.FC<{
  account: GmailAccount;
  onClose: () => void;
  onSave: (config: {
    name?: string;
    transaction_tag?: string;
    sender_filters?: string[];
    keyword_filters?: string[];
    is_active?: boolean;
  }) => void;
}> = ({ account, onClose, onSave }) => {
  const [name, setName] = useState(account.name);
  const [transactionTag, setTransactionTag] = useState(account.transaction_tag);
  const [senderFilters, setSenderFilters] = useState(account.sender_filters.join(', '));
  const [keywordFilters, setKeywordFilters] = useState(account.keyword_filters.join(', '));
  const [isActive, setIsActive] = useState(account.is_active);

  const handleSave = () => {
    const senders = senderFilters
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s);
    const keywords = keywordFilters
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k);

    onSave({
      name,
      transaction_tag: transactionTag,
      sender_filters: senders,
      keyword_filters: keywords,
      is_active: isActive,
    });
  };

  return (
    <div>
      <Modal isOpen={true} onClose={onClose} title={`Configure ${account.email}`}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="My Gmail Account"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Transaction Tag
            </label>
            <input
              type="text"
              value={transactionTag}
              onChange={(e) => setTransactionTag(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="email-import"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Tag to apply to transactions created from this account
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Sender Filters
            </label>
            <input
              type="text"
              value={senderFilters}
              onChange={(e) => setSenderFilters(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="bank@example.com, paypal@paypal.com"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Only process emails from these senders (leave empty for all)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Keyword Filters
            </label>
            <input
              type="text"
              value={keywordFilters}
              onChange={(e) => setKeywordFilters(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="receipt, transaction, payment"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Only process emails containing these keywords
            </p>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              id="is-active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className={checkboxClassName}
            />
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Active (enable email syncing)
            </span>
          </label>

          <FlexBetween className="pt-4 justify-end">
            <div></div>
            <HStack gap={3}>
              <Button onClick={onClose} variant="ghost">
                Cancel
              </Button>
              <Button onClick={handleSave}>Save Configuration</Button>
            </HStack>
          </FlexBetween>
        </div>
      </Modal>
    </div>
  );
};

export default GmailAccounts;

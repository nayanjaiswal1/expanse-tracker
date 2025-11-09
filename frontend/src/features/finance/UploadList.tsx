import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  RotateCcw,
  Trash2,
  Eye,
  Download,
  TrendingUp,
} from 'lucide-react';
import { apiClient } from '../../api';
import { useToast } from '../../components/ui/Toast';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { PasswordDialog } from '../../components/ui/PasswordDialog';
import type { UploadSession, UploadStats } from '../../types';

import { useAuth } from '../../contexts/AuthContext';
import { FlexBetween, HStack } from '../../components/ui/Layout';

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case 'failed':
      return <XCircle className="h-5 w-5 text-red-500" />;
    case 'processing':
      return <Clock className="h-5 w-5 text-blue-500 animate-spin" />;
    case 'cancelled':
      return <XCircle className="h-5 w-5 text-gray-500" />;
    default:
      return <AlertCircle className="h-5 w-5 text-yellow-500" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    case 'failed':
      return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
    case 'processing':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
    case 'cancelled':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
    default:
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
  }
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDuration = (seconds: number) => {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${Math.round(remainingSeconds)}s`;
};

export const UploadList: React.FC = () => {
  const [sessions, setSessions] = useState<UploadSession[]>([]);
  const [stats, setStats] = useState<UploadStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryingSession, setRetryingSession] = useState<number | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    session: UploadSession | null;
  }>({ isOpen: false, session: null });
  const [passwordDialog, setPasswordDialog] = useState<{
    isOpen: boolean;
    session: UploadSession | null;
  }>({ isOpen: false, session: null });
  const { showSuccess, showError } = useToast();
  const { state: authState } = useAuth();

  const loadData = async () => {
    try {
      setLoading(true);
      const [sessionsData, statsData] = await Promise.all([
        apiClient.getUploadSessions(),
        apiClient.getUploadStats(),
      ]);
      setSessions(sessionsData);
      setStats(statsData);
    } catch (error: any) {
      showError(
        'Error loading uploads',
        error.response?.data?.detail || 'Failed to load upload data'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRetry = (session: UploadSession) => {
    if (session.requires_password) {
      setPasswordDialog({ isOpen: true, session });
    } else {
      performRetry(session, '');
    }
  };

  const performRetry = async (session: UploadSession, password: string) => {
    try {
      setRetryingSession(session.id);
      await apiClient.retryUploadSession(session.id, password);
      showSuccess('Retry started', `Retrying upload for ${session.original_filename}`);

      // Reload data after a short delay
      setTimeout(() => {
        loadData();
      }, 1000);
    } catch (error: any) {
      showError('Retry failed', error.response?.data?.detail || 'Failed to retry upload');
    } finally {
      setRetryingSession(null);
    }
  };

  const handlePasswordSubmit = (password: string) => {
    if (passwordDialog.session) {
      performRetry(passwordDialog.session, password);
    }
    setPasswordDialog({ isOpen: false, session: null });
  };

  const handleDelete = (session: UploadSession) => {
    setDeleteConfirmation({ isOpen: true, session });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation.session) return;

    try {
      await apiClient.deleteUploadSession(deleteConfirmation.session.id);
      showSuccess(
        'Upload deleted',
        `Successfully deleted ${deleteConfirmation.session.original_filename}`
      );
      loadData();
    } catch (error: any) {
      showError('Delete failed', error.response?.data?.detail || 'Failed to delete upload');
    } finally {
      setDeleteConfirmation({ isOpen: false, session: null });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 dark:border-white"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <HStack>
              <FileText className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Total Sessions
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stats.total_sessions}
                </p>
              </div>
            </HStack>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <HStack>
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Completed</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stats.completed_sessions}
                </p>
              </div>
            </HStack>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <HStack>
              <TrendingUp className="h-8 w-8 text-emerald-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Transactions
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stats.total_transactions_imported.toLocaleString()}
                </p>
              </div>
            </HStack>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <HStack>
              <Download className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Size</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {formatFileSize(stats.total_files_size)}
                </p>
              </div>
            </HStack>
          </div>
        </div>
      )}

      {/* Upload Sessions List */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <FlexBetween>
            <div>
              <h3 className="text-lg font-medium text-slate-900 dark:text-white">Upload History</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                View and manage your uploaded statement files
              </p>
            </div>
            <Button onClick={loadData} variant="outline-slate">
              <RotateCcw className="h-4 w-4 mr-1.5" />
              Refresh
            </Button>
          </FlexBetween>
        </div>

        {sessions.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-2">
              No uploads yet
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Upload your first bank statement to see it here
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {sessions.map((session) => (
              <div key={session.id} className="px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700">
                <FlexBetween className="items-start">
                  <HStack gap={4} className="flex-1 min-w-0 items-start">
                    <div className="flex-shrink-0 mt-1">{getStatusIcon(session.status)}</div>

                    <div className="flex-1 min-w-0">
                      <HStack gap={3}>
                        <h4 className="text-sm font-medium text-slate-900 dark:text-white truncate">
                          {session.original_filename}
                        </h4>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}
                        >
                          {session.status}
                        </span>
                      </HStack>

                      <HStack gap={4} className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                        <span>{session.file_type.toUpperCase()}</span>
                        <span>{formatFileSize(session.file_size)}</span>
                        {session.account_name && <span>→ {session.account_name}</span>}
                        <span>{new Date(session.created_at).toLocaleDateString()}</span>
                        {session.processing_duration && (
                          <span>({formatDuration(session.processing_duration)})</span>
                        )}
                      </HStack>

                      {/* Results Summary */}
                      {session.total_transactions > 0 && (
                        <HStack gap={4} className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                          <span className="text-green-600 dark:text-green-400">
                            ✓ {session.successful_imports} imported
                          </span>
                          {session.failed_imports > 0 && (
                            <span className="text-red-600 dark:text-red-400">
                              ✗ {session.failed_imports} failed
                            </span>
                          )}
                          {session.duplicate_imports > 0 && (
                            <span className="text-yellow-600 dark:text-yellow-400">
                              ⚠ {session.duplicate_imports} duplicates
                            </span>
                          )}
                          {session.success_rate !== undefined && (
                            <span>{session.success_rate}% success rate</span>
                          )}
                        </HStack>
                      )}

                      {/* Error Message */}
                      {session.error_message && (
                        <div className="mt-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                          {session.error_message}
                        </div>
                      )}
                    </div>
                  </HStack>

                  {/* Actions */}
                  <HStack gap={2} className="ml-4">
                    {session.status === 'failed' && (
                      <Button
                        onClick={() => handleRetry(session)}
                        disabled={retryingSession === session.id}
                        className="inline-flex items-center p-1.5 border border-transparent rounded text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50"
                        title="Retry upload"
                      >
                        <RotateCcw
                          className={`h-4 w-4 ${retryingSession === session.id ? 'animate-spin' : ''}`}
                        />
                      </Button>
                    )}

                    {session.status === 'completed' && session.total_transactions > 0 && (
                      <Button
                        onClick={() => {
                          // Navigate to transaction view filtered by this upload session
                          window.location.href = `/transactions?upload_session=${session.id}`;
                        }}
                        className="inline-flex items-center p-1.5 border border-transparent rounded text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        title="View transactions"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}

                    <Button
                      onClick={() => handleDelete(session)}
                      className="inline-flex items-center p-1.5 border border-transparent rounded text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                      title="Delete upload"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </HStack>
                </FlexBetween>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation({ isOpen: false, session: null })}
        onConfirm={confirmDelete}
        title="Delete Upload Session"
        message={`Are you sure you want to delete the upload "${deleteConfirmation.session?.original_filename}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Password Dialog */}
      <PasswordDialog
        isOpen={passwordDialog.isOpen}
        onClose={() => setPasswordDialog({ isOpen: false, session: null })}
        onSubmit={handlePasswordSubmit}
        title="Password Required"
        message={`The file "${passwordDialog.session?.original_filename}" is password protected. Please enter the password to retry the upload.`}
        placeholder="Enter file password"
      />
    </div>
  );
};

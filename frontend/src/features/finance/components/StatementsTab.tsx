import React, { useState } from 'react';
import { FileText, CheckCircle, XCircle, Clock, AlertCircle, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';
import toast from 'react-hot-toast';
import type { UploadSession } from '../../../types';
import { FlexBetween, HStack } from '../../../components/ui/Layout';

interface StatementsTabProps {
  sessions: UploadSession[];
  isLoading: boolean;
  onStatementClick?: (session: UploadSession) => void;
}

export const StatementsTab: React.FC<StatementsTabProps> = ({
  sessions,
  isLoading,
  onStatementClick,
}) => {
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      await apiClient.deleteUploadSession(sessionId);
    },
    onMutate: async (sessionId) => {
      setDeletingId(sessionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upload-sessions'] });
      toast.success('Statement deleted successfully');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || 'Failed to delete statement';
      toast.error(message);
    },
    onSettled: () => {
      setDeletingId(null);
    },
  });

  const handleDelete = (e: React.MouseEvent, session: UploadSession) => {
    e.stopPropagation();

    if (
      window.confirm(
        `Delete statement "${session.original_filename}"? This action cannot be undone.`
      )
    ) {
      deleteMutation.mutate(session.id);
    }
  };
  if (isLoading) {
    return (
      <FlexBetween className="py-6">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading statements...</span>
      </FlexBetween>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">No uploaded statements yet</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Upload bank statements to track your balances automatically
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sessions.map((session) => (
        <div
          key={session.id}
          className="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer transition-colors group"
          onClick={() => onStatementClick?.(session)}
        >
          <FlexBetween className="items-start">
            <div className="flex-1 min-w-0">
              <HStack className="gap-2 mb-1">
                {session.status === 'completed' ? (
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                ) : session.status === 'failed' ? (
                  <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                ) : session.status === 'processing' ? (
                  <Clock className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                )}
                <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {session.original_filename}
                </span>
              </HStack>
              <HStack className="gap-3 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                <span>{new Date(session.created_at || new Date()).toLocaleDateString()}</span>
                <span>•</span>
                <span>{session.file_type.toUpperCase()}</span>
                {session.account_name && (
                  <>
                    <span>•</span>
                    <span>{session.account_name}</span>
                  </>
                )}
                {session.total_transactions > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-green-600 dark:text-green-400 font-medium">
                      {session.successful_imports} imported
                    </span>
                  </>
                )}
              </HStack>
            </div>
            <HStack className="gap-2 ml-2 flex-shrink-0">
              {session.status === 'completed' && session.total_transactions > 0 && (
                <div className="text-right">
                  <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                    {session.total_transactions} txns
                  </div>
                </div>
              )}
              <button
                onClick={(e) => handleDelete(e, session)}
                disabled={deletingId === session.id}
                className="p-1.5 rounded-md text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                title="Delete statement"
              >
                {deletingId === session.id ? (
                  <div className="w-4 h-4 animate-spin rounded-full border-2 border-gray-300 border-t-red-600"></div>
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            </HStack>
          </FlexBetween>
        </div>
      ))}
    </div>
  );
};

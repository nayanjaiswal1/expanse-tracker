import React from 'react';
import { CheckCircle, XCircle, AlertCircle, Loader2, FileText, User } from 'lucide-react';
import type { ChatMessage as ChatMessageType } from '../../../../api/modules/quickAdd';

interface ChatMessageProps {
  message: ChatMessageType;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.message_type === 'user';
  const isSystem = message.message_type === 'system';

  // Format timestamp
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Get status icon and color
  const getStatusInfo = () => {
    switch (message.status) {
      case 'completed':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          label: 'Completed',
        };
      case 'processing':
        return {
          icon: Loader2,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          label: 'Processing',
          animate: true,
        };
      case 'failed':
        return {
          icon: XCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          label: 'Failed',
        };
      case 'pending':
        return {
          icon: AlertCircle,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          label: 'Pending',
        };
      default:
        return null;
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo?.icon;

  // Check if message has file info
  const fileInfo = message.metadata?.file_info;

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} ${
        isSystem ? 'justify-center' : ''
      }`}
    >
      <div
        className={`max-w-[85%] ${
          isUser
            ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm'
            : isSystem
            ? 'bg-gray-100 text-gray-700 rounded-xl'
            : 'bg-white text-gray-900 rounded-2xl rounded-tl-sm shadow-sm border'
        } px-4 py-2.5`}
      >
        {/* Message Header (for non-user messages) */}
        {!isUser && !isSystem && (
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
              <User size={14} className="text-gray-600" />
            </div>
            <span className="text-xs font-medium text-gray-600">System</span>
          </div>
        )}

        {/* File Info */}
        {fileInfo && (
          <div className="mb-2 p-2 bg-white/10 rounded-lg flex items-center gap-2">
            <FileText size={16} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{fileInfo.filename}</p>
              <p className="text-xs opacity-75">
                {(fileInfo.size_bytes / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
        )}

        {/* Message Content */}
        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>

        {/* Error Message */}
        {message.metadata?.error && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
            <XCircle size={12} className="inline mr-1" />
            {message.metadata.error}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 mt-1">
          {/* Timestamp */}
          <span className={`text-xs ${isUser ? 'text-blue-100' : 'text-gray-500'}`}>
            {formatTime(message.created_at)}
          </span>

          {/* Status Badge */}
          {statusInfo && !isSystem && (
            <div
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                isUser ? 'bg-white/20 text-white' : `${statusInfo.bgColor} ${statusInfo.color}`
              }`}
            >
              {StatusIcon && (
                <StatusIcon
                  size={12}
                  className={statusInfo.animate ? 'animate-spin' : ''}
                />
              )}
              <span className="font-medium">{statusInfo.label}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

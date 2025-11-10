import React, { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { TransactionSuggestion } from './TransactionSuggestion';
import type { ChatMessage as ChatMessageType } from '../../../../api/modules/quickAdd';

interface ChatMessageListProps {
  messages: ChatMessageType[];
  isLoading: boolean;
  onSaveTransaction: (messageId: number, edits?: any) => void;
}

export const ChatMessageList: React.FC<ChatMessageListProps> = ({
  messages,
  isLoading,
  onSaveTransaction,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Group messages by date
  const groupMessagesByDate = (msgs: ChatMessageType[]) => {
    const groups: { [key: string]: ChatMessageType[] } = {};

    msgs.forEach((msg) => {
      const date = new Date(msg.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

      if (!groups[date]) {
        groups[date] = [];
      }

      groups[date].push(msg);
    });

    return groups;
  };

  if (isLoading && messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto mb-2 text-gray-400" size={32} />
          <p className="text-sm text-gray-500">Loading messages...</p>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 p-8">
        <div className="text-center max-w-md">
          <div className="mb-4 text-6xl">💬</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No messages yet</h3>
          <p className="text-sm text-gray-500">
            Start by typing a transaction or uploading a file. Try mentioning someone with @ or
            entering an amount with $.
          </p>
        </div>
      </div>
    );
  }

  const groupedMessages = groupMessagesByDate(messages);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto bg-gray-50 p-4 space-y-4">
      {Object.entries(groupedMessages).map(([date, msgs]) => (
        <div key={date}>
          {/* Date Separator */}
          <div className="flex items-center justify-center my-4">
            <div className="bg-white px-3 py-1 rounded-full text-xs text-gray-500 shadow-sm">
              {date}
            </div>
          </div>

          {/* Messages */}
          <div className="space-y-3">
            {msgs.map((message) => (
              <div key={message.id}>
                {/* Regular Message */}
                {message.message_type !== 'suggestion' && (
                  <ChatMessage message={message} />
                )}

                {/* Transaction Suggestion */}
                {message.message_type === 'suggestion' && message.metadata?.parsed && (
                  <TransactionSuggestion
                    message={message}
                    onSave={(edits) => onSaveTransaction(message.id, edits)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
};

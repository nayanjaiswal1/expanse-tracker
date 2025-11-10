import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../../api/client';
import { ChatHeader } from './ChatHeader';
import { ChatMessageList } from './ChatMessageList';
import { ChatInput } from './ChatInput';

type ChatMode = 'ai' | 'normal' | 'shortcut';

export const QuickAddChat: React.FC = () => {
  const [mode, setMode] = useState<ChatMode>('ai');
  const queryClient = useQueryClient();

  // Fetch chat messages
  const { data: messages, isLoading } = useQuery({
    queryKey: ['quick-add-messages'],
    queryFn: () => apiClient.quickAdd.getMessages('quick-add'),
    refetchInterval: 3000, // Poll every 3 seconds for updates
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: (content: string) =>
      apiClient.quickAdd.sendMessage({ content, mode, conversation_id: 'quick-add' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-add-messages'] });
    },
  });

  // Upload file mutation
  const uploadFile = useMutation({
    mutationFn: (file: File) => apiClient.quickAdd.uploadFile(file, mode, 'quick-add'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-add-messages'] });
    },
  });

  // Save transaction mutation
  const saveTransaction = useMutation({
    mutationFn: ({ messageId, edits }: { messageId: number; edits?: any }) =>
      apiClient.quickAdd.saveTransaction(messageId, edits),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-add-messages'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <ChatHeader mode={mode} onModeChange={setMode} />

      {/* Messages */}
      <ChatMessageList
        messages={messages || []}
        isLoading={isLoading}
        onSaveTransaction={(messageId, edits) => saveTransaction.mutate({ messageId, edits })}
      />

      {/* Input */}
      <ChatInput
        mode={mode}
        onSendMessage={(content) => sendMessage.mutate(content)}
        onUploadFile={(file) => uploadFile.mutate(file)}
        disabled={sendMessage.isPending || uploadFile.isPending}
      />
    </div>
  );
};

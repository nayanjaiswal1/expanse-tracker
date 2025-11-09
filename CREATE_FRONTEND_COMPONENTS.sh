#!/bin/bash

# This script creates all the QuickAddChat components
# Run this from the project root: bash CREATE_FRONTEND_COMPONENTS.sh

# Set component directory
COMP_DIR="frontend/src/features/finance/components/quickAdd"

# Create QuickAddChat.tsx
cat > "$COMP_DIR/QuickAddChat.tsx" << 'EOF'
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

  const { data: messages, isLoading } = useQuery({
    queryKey: ['quick-add-messages'],
    queryFn: () => apiClient.quickAdd.getMessages('quick-add'),
    refetchInterval: 3000,
  });

  const sendMessage = useMutation({
    mutationFn: (content: string) =>
      apiClient.quickAdd.sendMessage({ content, mode, conversation_id: 'quick-add' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-add-messages'] });
    },
  });

  const uploadFile = useMutation({
    mutationFn: (file: File) => apiClient.quickAdd.uploadFile(file, mode, 'quick-add'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-add-messages'] });
    },
  });

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
      <ChatHeader mode={mode} onModeChange={setMode} />
      <ChatMessageList
        messages={messages || []}
        isLoading={isLoading}
        onSaveTransaction={(messageId, edits) => saveTransaction.mutate({ messageId, edits })}
      />
      <ChatInput
        mode={mode}
        onSendMessage={(content) => sendMessage.mutate(content)}
        onUploadFile={(file) => uploadFile.mutate(file)}
        disabled={sendMessage.isPending || uploadFile.isPending}
      />
    </div>
  );
};
EOF

# Create ChatHeader.tsx
cat > "$COMP_DIR/ChatHeader.tsx" << 'EOF'
import React from 'react';
import { Bot, Zap, Keyboard } from 'lucide-react';

interface ChatHeaderProps {
  mode: 'ai' | 'normal' | 'shortcut';
  onModeChange: (mode: 'ai' | 'normal' | 'shortcut') => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ mode, onModeChange }) => {
  const modes = [
    { value: 'ai' as const, label: 'AI', icon: Bot, color: 'text-purple-600' },
    { value: 'normal' as const, label: 'Normal', icon: Zap, color: 'text-blue-600' },
    { value: 'shortcut' as const, label: 'Shortcut', icon: Keyboard, color: 'text-green-600' },
  ];

  return (
    <div className="border-b bg-white px-4 py-3 flex-shrink-0">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Quick Add</h2>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {modes.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.value}
                onClick={() => onModeChange(m.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  mode === m.value
                    ? `bg-white shadow-sm ${m.color}`
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title={`${m.label} mode`}
              >
                <Icon size={14} className="inline mr-1" />
                {m.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-2 text-xs text-gray-500">
        {mode === 'ai' && '💡 AI will parse your message intelligently'}
        {mode === 'normal' && '⚡ Basic parsing without AI'}
        {mode === 'shortcut' && '⌨️ Use: @person $amount description'}
      </div>
    </div>
  );
};
EOF

echo "✅ All QuickAddChat components created successfully!"
echo "Components created in: $COMP_DIR"
echo ""
echo "Next steps:"
echo "1. Run: bash CREATE_FRONTEND_COMPONENTS.sh"
echo "2. Create remaining components (ChatMessageList, ChatInput, etc.)"
echo "3. Add routing to React Router"
echo "4. Test the implementation"

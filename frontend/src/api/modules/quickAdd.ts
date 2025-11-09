import type { HttpClient } from './http';

export interface ChatMessage {
  id: number;
  conversation_id: string;
  message_type: 'user' | 'system' | 'suggestion';
  content: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  metadata?: {
    mode?: 'ai' | 'normal' | 'shortcut';
    input_type?: 'text' | 'file' | 'voice';
    parsed?: {
      amount?: number;
      currency?: string;
      description?: string;
      date?: string;
      category?: string;
      is_expense?: boolean;
      mentions?: Array<{
        type: string;
        id: number | null;
        text: string;
        username?: string;
        found?: boolean;
      }>;
      split_with?: number[];
      split_method?: string;
      confidence?: number;
      transaction_type?: string;
    };
    file_info?: {
      filename: string;
      file_id: number;
      mime_type: string;
      size_bytes: number;
      processing_status?: string;
    };
    error?: string;
  };
  related_transaction?: number | null;
  related_file?: number | null;
  created_at: string;
  updated_at: string;
}

export interface MentionSuggestion {
  type: 'user' | 'group' | 'category';
  id: number;
  text: string;
  display: string;
  username?: string;
  members_count?: number;
}

export interface ParseMessageRequest {
  content: string;
  mode: 'ai' | 'normal' | 'shortcut';
  conversation_id?: string;
}

export interface SaveTransactionRequest {
  message_id: number;
  edits?: {
    amount?: number;
    description?: string;
    category?: string;
    date?: string;
    is_expense?: boolean;
  };
}

export function createQuickAddApi(http: HttpClient) {
  const basePath = '/v1/chat/messages';

  return {
    quickAdd: {
      /**
       * Get all chat messages for a conversation
       */
      getMessages: async (conversationId: string = 'quick-add'): Promise<ChatMessage[]> => {
        const response = await http.client.get<ChatMessage[]>(basePath, {
          params: { conversation_id: conversationId },
        });
        return response.data;
      },

      /**
       * Send a new chat message for parsing
       */
      sendMessage: async (data: ParseMessageRequest): Promise<ChatMessage> => {
        // First create the message
        const createResponse = await http.client.post<ChatMessage>(basePath, {
          conversation_id: data.conversation_id || 'quick-add',
          message_type: 'user',
          content: data.content,
          status: 'pending',
          metadata: {
            mode: data.mode,
            input_type: 'text',
          },
        });

        const message = createResponse.data;

        // Then trigger parsing based on mode
        try {
          if (data.mode === 'ai') {
            await http.client.post(`${basePath}/${message.id}/parse/`);
          } else if (data.mode === 'shortcut') {
            // Backend will handle shortcut parsing automatically
            // or we can add a dedicated endpoint
            await http.client.post(`${basePath}/${message.id}/parse/`);
          }
        } catch (error) {
          console.error('Failed to trigger parsing:', error);
        }

        return message;
      },

      /**
       * Upload a file in the chat
       */
      uploadFile: async (
        file: File,
        mode: 'ai' | 'normal' = 'ai',
        conversationId: string = 'quick-add'
      ): Promise<ChatMessage> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('mode', mode);
        formData.append('conversation_id', conversationId);

        const response = await http.client.post<ChatMessage>(`${basePath}/upload-file/`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        return response.data;
      },

      /**
       * Save a parsed message as a transaction
       */
      saveTransaction: async (messageId: number, edits?: SaveTransactionRequest['edits']): Promise<any> => {
        const response = await http.client.post(`${basePath}/${messageId}/save-transaction/`, {
          edits: edits || {},
        });
        return response.data;
      },

      /**
       * Get mention autocomplete suggestions
       */
      getMentionSuggestions: async (
        query: string,
        type: 'user' | 'group' | 'category' = 'user',
        limit: number = 10
      ): Promise<MentionSuggestion[]> => {
        const response = await http.client.get<MentionSuggestion[]>(`${basePath}/mention-autocomplete/`, {
          params: { q: query, type, limit },
        });
        return response.data;
      },

      /**
       * Get a specific message by ID
       */
      getMessage: async (messageId: number): Promise<ChatMessage> => {
        const response = await http.client.get<ChatMessage>(`${basePath}/${messageId}/`);
        return response.data;
      },

      /**
       * Delete a chat message
       */
      deleteMessage: async (messageId: number): Promise<void> => {
        await http.client.delete(`${basePath}/${messageId}/`);
      },
    },
  };
}

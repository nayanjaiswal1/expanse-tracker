import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { MessageSquare, Send, Check, Loader2 } from 'lucide-react'

interface ChatMessage {
  id: number
  user: number
  conversation_id: string
  message_type: 'user' | 'system' | 'suggestion'
  content: string
  metadata: {
    parsed?: {
      amount?: number
      description?: string
      is_expense?: boolean
      date?: string
      category?: string
      mentions?: string[]
      confidence?: number
    }
  }
  status: 'draft' | 'processing' | 'completed' | 'failed'
  related_transaction?: number
  created_at: string
}

export function ChatInterface() {
  const [message, setMessage] = useState('')
  const queryClient = useQueryClient()

  // Fetch messages
  const { data: messages = [] } = useQuery<ChatMessage[]>({
    queryKey: ['chat-messages'],
    queryFn: async () => {
      const response = await apiClient.get('/v1/chat/messages/', {
        params: { conversation_id: 'main' }
      })
      return response.data.results || response.data
    },
    refetchInterval: 3000, // Auto-refresh every 3s
  })

  // Send message
  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiClient.post('/v1/chat/messages/', {
        content,
        conversation_id: 'main',
        message_type: 'user',
      })
      return response.data
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] })
      setMessage('')

      // Auto-parse the message
      try {
        await apiClient.post(`/v1/chat/messages/${data.id}/parse/`)
        queryClient.invalidateQueries({ queryKey: ['chat-messages'] })
      } catch (error) {
        console.error('Parse failed:', error)
      }
    },
  })

  // Save as transaction
  const saveTransaction = useMutation({
    mutationFn: async (messageId: number) => {
      const response = await apiClient.post(`/v1/chat/messages/${messageId}/save-transaction/`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim()) {
      sendMessage.mutate(message.trim())
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-gray-900">Quick Transaction Entry</h2>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Type naturally: "$50 lunch" or "@john $30 coffee"
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No messages yet. Start typing!</p>
            <p className="text-xs text-gray-400 mt-1">Example: "$50 lunch at pizza place"</p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`p-3 rounded-lg ${
              msg.message_type === 'user'
                ? 'bg-primary text-white ml-auto max-w-[80%]'
                : 'bg-white border border-gray-200 max-w-[90%]'
            }`}
          >
            {/* User message */}
            {msg.message_type === 'user' && (
              <p className="text-sm">{msg.content}</p>
            )}

            {/* System response / Parsing status */}
            {msg.status === 'processing' && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Parsing with AI...</span>
              </div>
            )}

            {/* Parsed transaction suggestion */}
            {msg.status === 'completed' && msg.metadata?.parsed && !msg.related_transaction && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-success text-xs">
                  <Check className="w-4 h-4" />
                  <span>Parsed successfully</span>
                </div>

                <div className="bg-gray-50 p-3 rounded-md space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-semibold text-gray-900">
                      ${msg.metadata.parsed.amount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Description:</span>
                    <span className="text-gray-900">
                      {msg.metadata.parsed.description || msg.content}
                    </span>
                  </div>
                  {msg.metadata.parsed.mentions && msg.metadata.parsed.mentions.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Mentions:</span>
                      <span className="text-gray-900">
                        {msg.metadata.parsed.mentions.join(', ')}
                      </span>
                    </div>
                  )}
                  {msg.metadata.parsed.confidence && (
                    <div className="text-xs text-gray-500 mt-2">
                      Confidence: {Math.round(msg.metadata.parsed.confidence * 100)}%
                    </div>
                  )}
                </div>

                <button
                  onClick={() => saveTransaction.mutate(msg.id)}
                  disabled={saveTransaction.isPending}
                  className="w-full px-3 py-2 bg-success text-white rounded-md text-sm font-medium hover:bg-green-600 transition disabled:opacity-50"
                >
                  {saveTransaction.isPending ? 'Saving...' : 'Save Transaction'}
                </button>
              </div>
            )}

            {/* Transaction saved */}
            {msg.related_transaction && (
              <div className="flex items-center gap-2 text-sm text-success">
                <Check className="w-4 h-4" />
                <span>Transaction saved!</span>
              </div>
            )}

            {/* Failed parsing */}
            {msg.status === 'failed' && (
              <div className="text-sm text-error">
                <p>Failed to parse. Try again with a clearer format.</p>
                <p className="text-xs mt-1">Example: "$50 lunch"</p>
              </div>
            )}

            <div className="text-xs opacity-60 mt-2">
              {new Date(msg.created_at).toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message... (e.g., $50 lunch)"
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            disabled={sendMessage.isPending}
          />
          <button
            type="submit"
            disabled={!message.trim() || sendMessage.isPending}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {sendMessage.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
        <p className="text-xs text-gray-500 mt-2">
          Pro tip: Use @ to mention people (e.g., "@john $50")
        </p>
      </div>
    </div>
  )
}

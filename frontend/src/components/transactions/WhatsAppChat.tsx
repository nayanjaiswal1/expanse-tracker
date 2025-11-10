/**
 * WhatsApp-style Chat Interface for Quick Transaction Entry
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Paperclip,
  Image,
  FileText,
  Check,
  CheckCheck,
  Bot,
  User,
  X,
  Edit2,
} from 'lucide-react';
import clsx from 'clsx';

interface Message {
  id: string;
  type: 'user' | 'system' | 'suggestion';
  content: string;
  timestamp: Date;
  status?: 'draft' | 'processing' | 'saved' | 'cancelled';
  extractedData?: any;
  isEdited?: boolean;
}

interface WhatsAppChatProps {
  onSaveTransaction?: (data: any) => void;
}

export const WhatsAppChat = ({ onSaveTransaction }: WhatsAppChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isAIMode, setIsAIMode] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() && attachments.length === 0) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
      status: 'processing',
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputValue('');

    // Simulate AI processing
    if (isAIMode) {
      setTimeout(() => {
        const suggestion: Message = {
          id: (Date.now() + 1).toString(),
          type: 'suggestion',
          content: 'I detected a transaction! Tap to save:',
          timestamp: new Date(),
          extractedData: {
            amount: 1500,
            description: inputValue,
            date: new Date().toISOString().split('T')[0],
            category: 'Food & Dining',
          },
        };
        setMessages((prev) => [...prev, suggestion]);
      }, 1000);
    }

    // Clear attachments
    setAttachments([]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments((prev) => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveSuggestion = (message: Message) => {
    if (message.extractedData) {
      onSaveTransaction?.(message.extractedData);

      // Update message status
      setMessages((prev) =>
        prev.map((m) =>
          m.id === message.id ? { ...m, status: 'saved' } : m
        )
      );

      // Add confirmation message
      const confirmation: Message = {
        id: Date.now().toString(),
        type: 'system',
        content: 'Transaction saved successfully! 🎉',
        timestamp: new Date(),
        status: 'saved',
      };
      setMessages((prev) => [...prev, confirmation]);
    }
  };

  const handleEditMessage = (messageId: string) => {
    const message = messages.find((m) => m.id === messageId);
    if (message) {
      setInputValue(message.content);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, isEdited: true } : m
        )
      );
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a1f1c] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-[#1f3933] px-4 py-3 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center">
            <Bot size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-white">Quick Add</h3>
            <p className="text-xs text-gray-400">
              {isAIMode ? 'AI Mode • Online' : 'Manual Mode'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAIMode(!isAIMode)}
          className={clsx(
            'px-3 py-1 text-xs rounded-full transition-colors',
            isAIMode
              ? 'bg-emerald-600 text-white'
              : 'bg-gray-700 text-gray-300'
          )}
        >
          {isAIMode ? 'AI' : 'Manual'}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={clsx(
                'flex',
                message.type === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={clsx(
                  'max-w-[80%] rounded-lg px-3 py-2 relative group',
                  message.type === 'user'
                    ? 'bg-[#005c4b] text-white'
                    : message.type === 'suggestion'
                    ? 'bg-[#1f3933] text-white border border-emerald-600'
                    : 'bg-[#1f3933] text-white'
                )}
              >
                <div className="flex items-start gap-2">
                  {message.type !== 'user' && (
                    <Bot size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {message.content}
                    </p>

                    {message.extractedData && (
                      <div className="mt-2 p-2 bg-[#0a1f1c] rounded text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Amount:</span>
                          <span className="text-white font-medium">
                            ₹{message.extractedData.amount}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Category:</span>
                          <span className="text-white">
                            {message.extractedData.category}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Date:</span>
                          <span className="text-white">
                            {message.extractedData.date}
                          </span>
                        </div>

                        {message.status !== 'saved' && (
                          <button
                            onClick={() => handleSaveSuggestion(message)}
                            className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs py-1.5 px-3 rounded transition-colors"
                          >
                            Save Transaction
                          </button>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-[10px] text-gray-400">
                        {message.timestamp.toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {message.isEdited && (
                        <span className="text-[10px] text-gray-400">• edited</span>
                      )}
                      {message.type === 'user' &&
                        (message.status === 'saved' ? (
                          <CheckCheck size={12} className="text-emerald-500" />
                        ) : (
                          <Check size={12} className="text-gray-400" />
                        ))}
                    </div>
                  </div>

                  {message.type === 'user' && (
                    <button
                      onClick={() => handleEditMessage(message.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-[#025144] rounded"
                    >
                      <Edit2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="px-4 py-2 bg-[#1f3933] border-t border-gray-700">
          <div className="flex gap-2 overflow-x-auto">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="relative flex-shrink-0 w-16 h-16 bg-[#0a1f1c] rounded-lg overflow-hidden"
              >
                {file.type.startsWith('image/') ? (
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FileText size={24} className="text-gray-400" />
                  </div>
                )}
                <button
                  onClick={() => removeAttachment(index)}
                  className="absolute top-1 right-1 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center"
                >
                  <X size={12} className="text-white" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 bg-[#1f3933] border-t border-gray-700">
        <div className="flex items-end gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <Paperclip size={20} />
          </button>

          <div className="flex-1 bg-[#2a3f3a] rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-emerald-600">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={
                isAIMode
                  ? 'Spent 500 on lunch with @John...'
                  : 'Type transaction details...'
              }
              className="w-full bg-transparent text-white text-sm resize-none outline-none max-h-24 custom-scrollbar"
              rows={1}
            />
          </div>

          <button
            onClick={handleSend}
            disabled={!inputValue.trim() && attachments.length === 0}
            className="p-2 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={18} />
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.csv"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #374151;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #4b5563;
        }
      `}</style>
    </div>
  );
};

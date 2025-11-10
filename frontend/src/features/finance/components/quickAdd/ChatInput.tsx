import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Paperclip, Send } from 'lucide-react';
import { MentionAutocomplete } from './MentionAutocomplete';

interface ChatInputProps {
  mode: 'ai' | 'normal' | 'shortcut';
  onSendMessage: (content: string) => void;
  onUploadFile: (file: File) => void;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  mode,
  onSendMessage,
  onUploadFile,
  disabled = false,
}) => {
  const [input, setInput] = useState('');
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  // Detect @ mentions
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursor = e.target.selectionStart;
    setInput(value);
    setCursorPosition(cursor);

    // Check for @ mention
    const textBeforeCursor = value.slice(0, cursor);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
    } else {
      setMentionQuery(null);
    }
  };

  // Handle mention selection
  const handleMentionSelect = (mention: { text: string; display: string }) => {
    if (textareaRef.current) {
      const textBeforeCursor = input.slice(0, cursorPosition);
      const textAfterCursor = input.slice(cursorPosition);
      const beforeMention = textBeforeCursor.replace(/@\w*$/, '');
      const newText = `${beforeMention}@${mention.text} ${textAfterCursor}`;

      setInput(newText);
      setMentionQuery(null);

      // Focus and set cursor position
      setTimeout(() => {
        if (textareaRef.current) {
          const newCursor = beforeMention.length + mention.text.length + 2;
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newCursor, newCursor);
        }
      }, 0);
    }
  };

  // Handle send
  const handleSend = () => {
    if (input.trim() && !disabled) {
      onSendMessage(input.trim());
      setInput('');
      setMentionQuery(null);
    }
  };

  // Handle key press
  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = [
        'application/pdf',
        'text/csv',
        'image/jpeg',
        'image/jpg',
        'image/png',
      ];

      if (!validTypes.includes(file.type)) {
        alert('Please upload a PDF, CSV, or image file (JPG, PNG)');
        return;
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }

      onUploadFile(file);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="border-t bg-white px-4 py-3 flex-shrink-0">
      {/* Mention Autocomplete */}
      {mentionQuery !== null && (
        <MentionAutocomplete
          query={mentionQuery}
          onSelect={handleMentionSelect}
          onClose={() => setMentionQuery(null)}
        />
      )}

      {/* Input Area */}
      <div className="flex items-end gap-2">
        {/* File Upload Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Upload file"
        >
          <Paperclip size={20} />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.csv,.jpg,.jpeg,.png"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Text Input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={
              mode === 'shortcut'
                ? 'Type: @person $amount description'
                : mode === 'ai'
                ? 'Describe your transaction...'
                : 'Enter transaction details...'
            }
            disabled={disabled}
            className="w-full px-4 py-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            rows={1}
            style={{ minHeight: '40px', maxHeight: '120px' }}
          />
        </div>

        {/* Send Button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!input.trim() || disabled}
          className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
          title="Send message"
        >
          <Send size={20} />
        </button>
      </div>

      {/* Hint Text */}
      <div className="mt-2 text-xs text-gray-500">
        {mode === 'shortcut' && '💡 Use @ for mentions, $ for amount'}
        {mode === 'ai' && '💡 Press Enter to send, Shift+Enter for new line'}
        {mode === 'normal' && '💡 Press Enter to send'}
      </div>
    </div>
  );
};

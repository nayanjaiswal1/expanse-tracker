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

        {/* Mode Toggle */}
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

      {/* Mode Description */}
      <div className="mt-2 text-xs text-gray-500">
        {mode === 'ai' && '💡 AI will parse your message intelligently'}
        {mode === 'normal' && '⚡ Basic parsing without AI'}
        {mode === 'shortcut' && '⌨️ Use: @person $amount description'}
      </div>
    </div>
  );
};

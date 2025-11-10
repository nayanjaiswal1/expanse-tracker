import React, { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { User, Users, Tag, Loader2 } from 'lucide-react';
import apiClient from '../../../../api/client';
import type { MentionSuggestion } from '../../../../api/modules/quickAdd';

interface MentionAutocompleteProps {
  query: string;
  onSelect: (mention: { text: string; display: string }) => void;
  onClose: () => void;
}

export const MentionAutocomplete: React.FC<MentionAutocompleteProps> = ({
  query,
  onSelect,
  onClose,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeType, setActiveType] = useState<'user' | 'group' | 'category'>('user');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch suggestions
  const { data: suggestions, isLoading } = useQuery({
    queryKey: ['mention-suggestions', query, activeType],
    queryFn: () => apiClient.quickAdd.getMentionSuggestions(query, activeType, 10),
    enabled: query !== null,
  });

  // Reset selected index when suggestions change
  useEffect(() => {
    setSelectedIndex(0);
  }, [suggestions]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (!suggestions || suggestions.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % suggestions.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
          break;
        case 'Enter':
          e.preventDefault();
          if (suggestions[selectedIndex]) {
            handleSelect(suggestions[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        case 'Tab':
          // Switch between types
          e.preventDefault();
          const types: ('user' | 'group' | 'category')[] = ['user', 'group', 'category'];
          const currentIdx = types.indexOf(activeType);
          setActiveType(types[(currentIdx + 1) % types.length]);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [suggestions, selectedIndex, activeType, onClose]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleSelect = (suggestion: MentionSuggestion) => {
    onSelect({
      text: suggestion.text,
      display: suggestion.display,
    });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'user':
        return <User size={16} className="text-blue-600" />;
      case 'group':
        return <Users size={16} className="text-green-600" />;
      case 'category':
        return <Tag size={16} className="text-purple-600" />;
      default:
        return null;
    }
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute bottom-full left-0 right-0 mb-2 bg-white border shadow-lg rounded-lg overflow-hidden z-50"
      style={{ maxHeight: '300px' }}
    >
      {/* Type Tabs */}
      <div className="flex border-b bg-gray-50">
        {(['user', 'group', 'category'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setActiveType(type)}
            className={`flex-1 px-3 py-2 text-xs font-medium capitalize transition-colors ${
              activeType === type
                ? 'bg-white border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {type}s
          </button>
        ))}
      </div>

      {/* Suggestions List */}
      <div className="overflow-y-auto" style={{ maxHeight: '240px' }}>
        {isLoading ? (
          <div className="p-4 text-center text-sm text-gray-500">
            <Loader2 className="animate-spin mx-auto mb-2" size={20} />
            Loading...
          </div>
        ) : !suggestions || suggestions.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">
            No {activeType}s found
          </div>
        ) : (
          <div>
            {suggestions.map((suggestion, idx) => (
              <button
                key={`${suggestion.type}-${suggestion.id}`}
                onClick={() => handleSelect(suggestion)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                  idx === selectedIndex ? 'bg-blue-50' : ''
                }`}
              >
                {/* Icon */}
                <div className="flex-shrink-0">{getIcon(suggestion.type)}</div>

                {/* Content */}
                <div className="flex-1 text-left min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {suggestion.display}
                  </div>
                  {suggestion.username && (
                    <div className="text-xs text-gray-500">@{suggestion.username}</div>
                  )}
                  {suggestion.members_count !== undefined && (
                    <div className="text-xs text-gray-500">
                      {suggestion.members_count} members
                    </div>
                  )}
                </div>

                {/* Keyboard hint */}
                {idx === selectedIndex && (
                  <div className="flex-shrink-0 text-xs text-gray-400">Enter</div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer Hint */}
      <div className="border-t bg-gray-50 px-3 py-2 text-xs text-gray-500 flex items-center justify-between">
        <span>↑↓ Navigate • Tab Switch type</span>
        <span>Enter Select • Esc Close</span>
      </div>
    </div>
  );
};

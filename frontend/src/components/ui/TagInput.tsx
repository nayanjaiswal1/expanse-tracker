import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Tag } from 'lucide-react';

interface TagInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  maxTags?: number;
  disabled?: boolean;
  className?: string;
  onBlur?: () => Promise<void>;
}

export const TagInput: React.FC<TagInputProps> = ({
  tags = [],
  onTagsChange,
  suggestions = [],
  placeholder = 'Add tags...',
  maxTags = 10,
  disabled = false,
  className = '',
  onBlur,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (inputValue.trim()) {
      const filtered = suggestions.filter(
        (suggestion) =>
          suggestion.toLowerCase().includes(inputValue.toLowerCase()) &&
          !tags.includes(suggestion.toLowerCase())
      );
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
      setFilteredSuggestions([]);
    }
    setSelectedSuggestionIndex(-1);
  }, [inputValue, suggestions, tags]);

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < maxTags) {
      onTagsChange([...tags, trimmedTag]);
    }
    setInputValue('');
    setShowSuggestions(false);
  };

  const removeTag = (tagToRemove: string) => {
    onTagsChange(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedSuggestionIndex >= 0 && filteredSuggestions[selectedSuggestionIndex]) {
        addTag(filteredSuggestions[selectedSuggestionIndex]);
      } else if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIndex((prev) =>
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    addTag(suggestion);
    inputRef.current?.focus();
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div
        className={`
          min-h-[40px] border border-gray-300 dark:border-gray-600 rounded p-2 flex flex-wrap gap-1 items-center
          ${disabled ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed' : 'bg-white dark:bg-gray-800 cursor-text'}
          ${showSuggestions ? 'border-blue-500 dark:border-blue-400' : ''}
          focus-within:border-blue-500 dark:focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-500 dark:focus-within:ring-blue-400
        `}
        onClick={() => !disabled && inputRef.current?.focus()}
      >
        {/* Render existing tags */}
        {tags.map((tag, index) => (
          <div
            key={index}
            className="inline-flex items-center bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-sm"
          >
            <Tag size={12} className="mr-1" />
            <span>{tag}</span>
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(tag);
                }}
                className="ml-1 p-0.5 hover:bg-blue-200 dark:hover:bg-blue-800 rounded"
              >
                <X size={12} />
              </button>
            )}
          </div>
        ))}

        {/* Input field */}
        {!disabled && tags.length < maxTags && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleInputKeyDown}
            onBlur={onBlur}
            placeholder={tags.length === 0 ? placeholder : ''}
            className="flex-1 min-w-[120px] outline-none bg-transparent border-none focus:ring-0 theme-text-primary placeholder-gray-400 dark:placeholder-gray-500"
          />
        )}

        {/* Add button */}
        {!disabled && inputValue.trim() && (
          <button
            type="button"
            onClick={() => addTag(inputValue)}
            title="Add tag"
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-blue-600 dark:text-blue-400"
          >
            <Plus size={16} />
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg max-h-48 overflow-y-auto">
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className={`w-full text-left flex items-center px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 theme-text-primary ${
                index === selectedSuggestionIndex
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                  : ''
              }`}
            >
              <Tag size={14} className="mr-2 theme-text-muted" />
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Tag count indicator */}
      {tags.length > 0 && (
        <div className="absolute -top-2 -right-2 bg-blue-500 dark:bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
          {tags.length}
        </div>
      )}
    </div>
  );
};

export default TagInput;

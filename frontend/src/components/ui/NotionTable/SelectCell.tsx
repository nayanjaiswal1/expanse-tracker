import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { HStack } from '../Layout';

interface SelectOption {
  value: string;
  label: string;
  color?: string;
  icon?: string;
}

interface SelectCellProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
}

export const SelectCell = ({
  value: initialValue,
  options,
  onChange,
  onBlur,
  placeholder = 'Select...',
  className = '',
}: SelectCellProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.value === initialValue);

  // Calculate dropdown position when opening
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: Math.max(rect.width, 224), // min 224px (w-56)
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      searchRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedInside =
        (containerRef.current && containerRef.current.contains(target)) ||
        (dropdownRef.current && dropdownRef.current.contains(target));

      if (!clickedInside) {
        setIsOpen(false);
        setSearch('');
        onBlur?.();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onBlur]);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (value: string) => {
    onChange(value);
    setIsOpen(false);
    setSearch('');
    onBlur?.();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearch('');
      onBlur?.();
    }
  };

  const dropdownContent = isOpen && (
    <div
      ref={dropdownRef}
      className="fixed z-[9999] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-72 overflow-hidden flex flex-col"
      style={{
        top: `${dropdownPosition.top}px`,
        left: `${dropdownPosition.left}px`,
        width: `${dropdownPosition.width}px`,
        marginTop: '4px',
      }}
    >
      <div className="p-2 border-b border-gray-100 dark:border-gray-700">
        <input
          ref={searchRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search..."
          className="w-full px-2.5 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 bg-white dark:bg-gray-900 transition-colors"
        />
      </div>
      <div className="overflow-y-auto">
        {filteredOptions.length === 0 ? (
          <div className="px-3 py-6 text-sm text-gray-400 text-center">No options found</div>
        ) : (
          filteredOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <HStack gap={2.5}>
                {option.color && (
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: option.color }}
                  />
                )}
                <span className="text-gray-900 dark:text-gray-100 text-sm">{option.label}</span>
              </HStack>
            </button>
          ))
        )}
      </div>
    </div>
  );

  return (
    <>
      <div ref={containerRef} className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-2 py-1.5 h-8 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
        >
          <HStack className="justify-between">
            <HStack
              gap={1.5}
              className={`truncate ${selectedOption ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'}`}
            >
              {selectedOption ? (
                <>
                  <span className="text-sm truncate">{selectedOption.label}</span>
                </>
              ) : (
                <span className="text-sm">{placeholder}</span>
              )}
            </HStack>
            <ChevronDown className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-50 transition-opacity flex-shrink-0 ml-1" />
          </HStack>
        </button>
      </div>
      {dropdownContent && createPortal(dropdownContent, document.body)}
    </>
  );
};

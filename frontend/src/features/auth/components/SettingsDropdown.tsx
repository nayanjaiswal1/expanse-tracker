import React, { useRef, useState, useEffect } from 'react';

interface DropdownOption {
  value: string;
  label: string;
  icon?: string;
  flag?: string;
}

interface SettingsDropdownProps {
  icon: React.ReactNode;
  selectedValue: string;
  selectedLabel: string;
  selectedIcon?: string;
  options: DropdownOption[];
  onSelect: (value: string) => void;
  title: string;
  dropdownWidth?: string;
}

export const SettingsDropdown: React.FC<SettingsDropdownProps> = ({
  icon,
  selectedValue,
  selectedLabel,
  selectedIcon,
  options,
  onSelect,
  title,
  dropdownWidth = 'w-48',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative group px-2.5 py-1.5 flex items-center gap-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
        title={title}
      >
        {icon}
        {selectedIcon && <span className="text-base leading-none">{selectedIcon}</span>}
        <svg
          className={`w-3 h-3 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div
          className={`absolute right-0 z-50 mt-2 ${dropdownWidth} bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-64 overflow-y-auto`}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onSelect(option.value);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors first:rounded-t-lg last:rounded-b-lg ${
                selectedValue === option.value
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 font-medium'
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {(option.flag || option.icon) && (
                <span className="text-lg">{option.flag || option.icon}</span>
              )}
              <span className="flex-1">{option.label}</span>
              {selectedValue === option.value && (
                <svg
                  className="w-4 h-4 text-blue-600 dark:text-blue-300"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

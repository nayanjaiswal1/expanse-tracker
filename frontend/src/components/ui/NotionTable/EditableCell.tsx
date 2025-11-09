import { useState, useEffect, useRef, KeyboardEvent } from 'react';

interface EditableCellProps {
  value: string;
  type?: 'text' | 'number' | 'date';
  onChange: (value: string) => void;
  onBlur?: () => void;
  className?: string;
}

export const EditableCell = ({
  value: initialValue,
  type = 'text',
  onChange,
  onBlur,
  className = '',
}: EditableCellProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (value !== initialValue) {
      onChange(value);
    }
    setIsEditing(false);
    onBlur?.();
  };

  const handleCancel = () => {
    setValue(initialValue);
    setIsEditing(false);
    onBlur?.();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    } else if (e.key === 'Tab') {
      handleSave();
    }
  };

  if (!isEditing) {
    return (
      <div
        onClick={() => setIsEditing(true)}
        className={`px-3 py-1 h-8 flex items-center cursor-text hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${className}`}
      >
        <span className="text-sm text-gray-900 dark:text-gray-100 truncate">
          {value || <span className="text-gray-400">Empty</span>}
        </span>
      </div>
    );
  }

  return (
    <div className="px-3 py-1 h-8 flex items-center">
      <input
        ref={inputRef}
        type={type}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="w-full text-sm bg-transparent border-none outline-none focus:ring-0 p-0 m-0 text-gray-900 dark:text-gray-100"
        style={{ boxShadow: 'none', height: '20px' }}
      />
    </div>
  );
};

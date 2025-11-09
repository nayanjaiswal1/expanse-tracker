import React from 'react';
import { Button } from './Button';
import { FlexBetween, HStack } from './Layout';
import { Modal } from './Modal';

interface FilterSection<T = string> {
  id: string;
  label: string;
  options: Array<{ value: T; label: string }>;
  selectedValue: T;
  onSelect: (value: T) => void;
}

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  sections: FilterSection[];
  activeSection: string;
  onSectionChange: (section: string) => void;
  onClearAll: () => void;
  onApply?: () => void;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'large';
  density?: 'default' | 'compact' | 'none';
}

export const FilterModal: React.FC<FilterModalProps> = ({
  isOpen,
  onClose,
  title,
  sections,
  activeSection,
  onSectionChange,
  onClearAll,
  onApply,
  size = 'xl',
  density = 'compact',
}) => {
  const currentSection = sections.find((s) => s.id === activeSection);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size={size}
      density={density}
      footer={
        <FlexBetween className="justify-end">
          <div />
          <HStack gap={3}>
            <Button onClick={onClearAll} variant="secondary-muted">
              Clear All
            </Button>
            <Button
              onClick={() => {
                onApply?.();
                onClose();
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors"
            >
              Apply
            </Button>
          </HStack>
        </FlexBetween>
      }
    >
      <HStack className="h-[400px]">
        <div className="w-52 border-r border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40">
          {sections.map((section) => (
            <Button
              key={section.id}
              variant="ghost"
              size="none"
              onClick={() => onSectionChange(section.id)}
              className={`w-full px-4 py-3 text-left text-sm transition-colors ${
                activeSection === section.id
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium border-l-2 border-emerald-500'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 border-l-2 border-transparent'
              }`}
            >
              {section.label}
            </Button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-1">
            {currentSection?.options.map((option) => (
              <label
                key={String(option.value)}
                className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
              >
                <input
                  type="radio"
                  checked={currentSection.selectedValue === option.value}
                  onChange={() => currentSection.onSelect(option.value)}
                  className="w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 focus:ring-emerald-500 dark:focus:ring-emerald-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{option.label}</span>
              </label>
            ))}
          </div>
        </div>
      </HStack>
    </Modal>
  );
};

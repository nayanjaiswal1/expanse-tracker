import React, { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { getCategoryIcon } from '../utils/categoryIcons';
import { checkboxClassName } from '../../../components/ui/Checkbox';
import { Button } from '../../../components/ui/Button';
import { FlexBetween, HStack } from '../../../components/ui/Layout';
import {
  transactionStatusOptions,
  transactionVerificationOptions,
} from '../constants/filterOptions';

type FilterSection = 'account' | 'category' | 'status' | 'verification';

interface TransactionFilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  accountFilter: string[];
  onAccountFilterChange: (value: string[]) => void;
  categoryFilter: string[];
  onCategoryFilterChange: (value: string[]) => void;
  statusFilter: string[];
  onStatusFilterChange: (value: string[]) => void;
  verificationFilter: string[];
  onVerificationFilterChange: (value: string[]) => void;
  accountOptions: Array<{ value: string; label: string }>;
  categoryOptions: Array<{ value: string; label: string }>;
  onClearAll: () => void;
}

export const TransactionFilterPanel: React.FC<TransactionFilterPanelProps> = ({
  isOpen,
  onClose,
  accountFilter,
  onAccountFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  statusFilter,
  onStatusFilterChange,
  verificationFilter,
  onVerificationFilterChange,
  accountOptions,
  categoryOptions,
  onClearAll,
}) => {
  const [activeSection, setActiveSection] = useState<FilterSection>('account');

  const sections = [
    { id: 'account' as FilterSection, label: 'Account', count: accountOptions.length - 1 },
    { id: 'category' as FilterSection, label: 'Category', count: categoryOptions.length - 1 },
    { id: 'status' as FilterSection, label: 'Status', count: transactionStatusOptions.length - 1 },
    {
      id: 'verification' as FilterSection,
      label: 'Verification',
      count: transactionVerificationOptions.length,
    },
  ];

  const getCurrentOptions = () => {
    switch (activeSection) {
      case 'account':
        return accountOptions;
      case 'category':
        return categoryOptions;
      case 'status':
        return transactionStatusOptions;
      case 'verification':
        return transactionVerificationOptions;
      default:
        return [];
    }
  };

  const getCurrentValue = () => {
    switch (activeSection) {
      case 'account':
        return accountFilter;
      case 'category':
        return categoryFilter;
      case 'status':
        return statusFilter;
      case 'verification':
        return verificationFilter;
      default:
        return [];
    }
  };

  const handleOptionToggle = (value: string) => {
    const currentValues = getCurrentValue();
    const isSelected = currentValues.includes(value);

    switch (activeSection) {
      case 'account':
        onAccountFilterChange(
          isSelected ? currentValues.filter((v) => v !== value) : [...currentValues, value]
        );
        break;
      case 'category':
        onCategoryFilterChange(
          isSelected ? currentValues.filter((v) => v !== value) : [...currentValues, value]
        );
        break;
      case 'status':
        onStatusFilterChange(
          isSelected ? currentValues.filter((v) => v !== value) : [...currentValues, value]
        );
        break;
      case 'verification':
        onVerificationFilterChange(
          isSelected ? currentValues.filter((v) => v !== value) : [...currentValues, value]
        );
        break;
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow-xl transition-all">
                {/* Header */}
                <FlexBetween className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                    Filter
                  </Dialog.Title>
                  <Button onClick={onClose} variant="ghost-neutral">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </Button>
                </FlexBetween>

                {/* Content - Side by Side */}
                <div className="flex h-[400px]">
                  {/* Left Sidebar - Categories */}
                  <div className="w-48 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    {sections.map((section) => (
                      <Button
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        className={`w-full px-4 py-3 text-left text-sm transition-colors ${
                          activeSection === section.id
                            ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium border-l-2 border-blue-500'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 border-l-2 border-transparent'
                        }`}
                      >
                        {section.label}
                      </Button>
                    ))}
                  </div>

                  {/* Right Content - Options */}
                  <div className="flex-1 overflow-y-auto p-4">
                    <div className="space-y-1">
                      {getCurrentOptions().map((option) => {
                        const isCategorySection = activeSection === 'category';
                        const icon = isCategorySection ? getCategoryIcon(option.label) : null;

                        return (
                          <label
                            key={option.value}
                            className="px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                          >
                            <HStack gap={3}>
                              <input
                                type="checkbox"
                                checked={getCurrentValue().includes(option.value)}
                                onChange={() => handleOptionToggle(option.value)}
                                className={checkboxClassName}
                              />
                              <HStack gap={2} className="text-sm text-gray-900 dark:text-gray-100">
                                {isCategorySection && (
                                  <span className="text-gray-500 dark:text-gray-400 flex items-center justify-center w-4 h-4">
                                    {icon}
                                  </span>
                                )}
                                <span>{option.label}</span>
                              </HStack>
                            </HStack>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                  <Button onClick={onClearAll} variant="secondary-muted">
                    Clear All
                  </Button>
                  <Button onClick={onClose} variant="primary">
                    Apply
                  </Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

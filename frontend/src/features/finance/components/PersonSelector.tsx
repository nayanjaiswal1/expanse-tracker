import React, { useState, useRef, useEffect } from 'react';
import { Search, User, Check, ChevronDown } from 'lucide-react';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { FlexBetween, HStack } from '../../../components/ui/Layout';

interface Contact {
  id: number;
  name: string;
  email: string;
}

interface PersonSelectorProps {
  contacts: Contact[];
  selectedContactId: string;
  onContactSelect: (contactId: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const PersonSelector: React.FC<PersonSelectorProps> = ({
  contacts,
  selectedContactId,
  onContactSelect,
  placeholder = 'Select person...',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter contacts based on search query
  const filteredContacts = contacts.filter(
    (contact) =>
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get selected contact
  const selectedContact = contacts.find((c) => c.id.toString() === selectedContactId);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleContactSelect = (contact: Contact) => {
    onContactSelect(contact.id.toString());
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleToggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Main Button/Input */}
      <FlexBetween
        as="button"
        type="button"
        onClick={handleToggleDropdown}
        disabled={disabled}
        className={`
          w-full px-3 py-2 border rounded-lg
          transition-colors text-left
          ${
            disabled
              ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 cursor-not-allowed'
              : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
          }
        `}
      >
        <HStack gap={3} className="flex-1 min-w-0">
          {selectedContact ? (
            <>
              <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-bold">
                  {selectedContact.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {selectedContact.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {selectedContact.email}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              </div>
              <span className="text-gray-500 dark:text-gray-400">{placeholder}</span>
            </>
          )}
        </HStack>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </FlexBetween>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-80 overflow-hidden">
          {/* Search Input */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 text-sm"
                autoFocus
              />
            </div>
          </div>

          {/* Contact List */}
          <div className="max-h-60 overflow-y-auto">
            {filteredContacts.length > 0 ? (
              filteredContacts.map((contact) => (
                <Button
                  key={contact.id}
                  type="button"
                  onClick={() => handleContactSelect(contact)}
                  className={`
                    w-full px-3 py-3 hover:bg-gray-50 dark:hover:bg-gray-700
                    transition-colors text-left
                    ${
                      selectedContactId === contact.id.toString()
                        ? 'bg-blue-50 dark:bg-blue-900/20'
                        : ''
                    }
                  `}
                >
                  <HStack gap={3}>
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-sm font-bold">
                        {contact.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {contact.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {contact.email}
                      </p>
                    </div>
                    {selectedContactId === contact.id.toString() && (
                      <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    )}
                  </HStack>
                </Button>
              ))
            ) : (
              <div className="px-3 py-6 text-center">
                <User className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {searchQuery ? 'No contacts found' : 'No contacts available'}
                </p>
                {searchQuery && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Try searching with a different name or email
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Add New Contact Option */}
          {searchQuery && filteredContacts.length === 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 p-3">
              <Button
                type="button"
                variant="menu-accent"
                onClick={() => {
                  // TODO: Implement add new contact functionality
                  console.log('Add new contact:', searchQuery);
                }}
              >
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">Add "{searchQuery}"</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Add as new contact</p>
                </div>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

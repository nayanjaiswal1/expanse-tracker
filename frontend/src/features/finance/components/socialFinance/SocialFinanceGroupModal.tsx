import React from 'react';
import { X, ChevronDown } from 'lucide-react';
import { FormModal } from '../../../../components/ui/FormModal';
import { Input } from '../../../../components/ui/Input';
import { Button } from '../../../../components/ui/Button';
import type { Contact } from '../../../../types';
import { FlexBetween, HStack } from '../../../../components/ui/Layout';

interface SocialFinanceGroupModalProps {
  isOpen: boolean;
  group: {
    name: string;
    description: string;
    members: number[];
  };
  contacts: Contact[];
  selectedContacts: Contact[];
  showMemberDropdown: boolean;
  onToggleMemberDropdown: () => void;
  onMemberSelect: (contactId: number) => void;
  onMemberRemove: (contactId: number) => void;
  onNameChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDescriptionChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}

export const SocialFinanceGroupModal: React.FC<SocialFinanceGroupModalProps> = ({
  isOpen,
  group,
  contacts,
  selectedContacts,
  showMemberDropdown,
  onToggleMemberDropdown,
  onMemberSelect,
  onMemberRemove,
  onNameChange,
  onDescriptionChange,
  onSubmit,
  onClose,
}) => {
  return (
    <FormModal isOpen={isOpen} onClose={onClose} title="Create New Group" size="lg">
      <form onSubmit={onSubmit} className="space-y-5 p-6">
        <Input
          label="Group Name"
          type="text"
          value={group.name}
          onChange={onNameChange}
          placeholder="e.g., Weekend Trip, Office Lunch, Shared Apartment"
          required
        />

        <Input
          label="Description"
          value={group.description}
          onChange={onDescriptionChange}
          placeholder="Optional description of what this group is for"
          multiline
          rows={3}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Add Members</label>

          <div className="relative member-dropdown">
            <FlexBetween
              as="button"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleMemberDropdown();
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white dark:bg-gray-800 text-left focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
            >
              <span className="text-gray-700">
                {selectedContacts.length > 0
                  ? `${selectedContacts.length} member${
                      selectedContacts.length > 1 ? 's' : ''
                    } selected`
                  : 'Select members'}
              </span>
              <ChevronDown className="h-5 w-5 text-gray-500" />
            </FlexBetween>

            {showMemberDropdown && (
              <div className="absolute mt-2 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto z-20">
                {contacts.length === 0 ? (
                  <div className="px-4 py-2 text-sm theme-text-muted italic">
                    No contacts available. Add contacts first to include them in groups.
                  </div>
                ) : (
                  contacts.map((contact) => {
                    const isSelected = group.members.includes(contact.id);
                    return (
                      <FlexBetween
                        as="button"
                        key={contact.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMemberSelect(contact.id);
                        }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-purple-50 ${
                          isSelected ? 'bg-purple-100 font-medium' : ''
                        }`}
                      >
                        <span>{contact.name}</span>
                        {isSelected && <span className="text-purple-600 font-semibold">✓</span>}
                      </FlexBetween>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {selectedContacts.length > 0 && (
            <div className="mt-3">
              <div className="text-sm font-medium text-gray-700 mb-2">Selected Members:</div>
              <HStack className="flex-wrap gap-2">
                {selectedContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-100 text-purple-800 text-sm rounded-full font-medium"
                  >
                    <span>{contact.name}</span>
                    <button
                      type="button"
                      onClick={() => onMemberRemove(contact.id)}
                      className="hover:bg-purple-200 rounded-full p-0.5 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </HStack>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
          <Button type="button" onClick={onClose} variant="ghost">
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Create Group
          </Button>
        </div>
      </form>
    </FormModal>
  );
};

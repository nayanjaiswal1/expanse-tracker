import React from 'react';
import { FormModal } from '../../../../components/ui/FormModal';
import { Input } from '../../../../components/ui/Input';
import { Button } from '../../../../components/ui/Button';

interface SocialFinanceContactModalProps {
  isOpen: boolean;
  contact: {
    name: string;
    email: string;
    phone: string;
  };
  onFieldChange: (field: 'name' | 'email' | 'phone', value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}

export const SocialFinanceContactModal: React.FC<SocialFinanceContactModalProps> = ({
  isOpen,
  contact,
  onFieldChange,
  onSubmit,
  onClose,
}) => {
  return (
    <FormModal isOpen={isOpen} onClose={onClose} title="Add New Contact">
      <form onSubmit={onSubmit} className="space-y-5 p-6">
        <Input
          label="Name"
          type="text"
          value={contact.name}
          onChange={(e) => onFieldChange('name', e.target.value)}
          placeholder="Contact name"
          required
        />

        <Input
          label="Email"
          type="email"
          value={contact.email}
          onChange={(e) => onFieldChange('email', e.target.value)}
          placeholder="contact@example.com"
        />

        <Input
          label="Phone"
          type="tel"
          value={contact.phone}
          onChange={(e) => onFieldChange('phone', e.target.value)}
          placeholder="+1 (555) 123-4567"
        />

        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
          <Button type="button" onClick={onClose} variant="ghost">
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Add Contact
          </Button>
        </div>
      </form>
    </FormModal>
  );
};

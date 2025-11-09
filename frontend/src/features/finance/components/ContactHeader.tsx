import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { FlexBetween, HStack } from '../../../components/ui/Layout';

interface ContactHeaderProps {
  contact: {
    id: number;
    name: string;
    username: string;
    email: string;
  } | null;
  totalTransactions: number;
  onClose: () => void;
}

export const ContactHeader: React.FC<ContactHeaderProps> = ({
  contact,
  totalTransactions,
  onClose,
}) => {
  return (
    <FlexBetween className="p-4 border-b border-gray-200 dark:border-gray-700">
      <HStack gap={3}>
        <Button onClick={onClose} variant="icon-soft-xs">
          <ArrowLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </Button>
        <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full flex items-center justify-center">
          <span className="text-white text-sm font-bold">{contact?.name?.charAt(0) || '?'}</span>
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {contact?.name || 'Unknown Contact'}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {totalTransactions} transaction{totalTransactions !== 1 ? 's' : ''}
          </p>
        </div>
      </HStack>
    </FlexBetween>
  );
};

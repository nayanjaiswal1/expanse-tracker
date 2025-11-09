import React, { useState } from 'react';
import { Lock, X } from 'lucide-react';
import { Button } from './Button';
import { HStack, FlexBetween } from './Layout';

interface PasswordDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (password: string) => void;
  title: string;
  message: string;
  placeholder?: string;
}

export const PasswordDialog: React.FC<PasswordDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  message,
  placeholder = 'Enter password',
}) => {
  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      onSubmit(password);
      setPassword('');
    }
  };

  const handleClose = () => {
    setPassword('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full mx-auto">
        {/* Header */}
        <FlexBetween className="p-6 border-b border-slate-200 dark:border-slate-700">
          <HStack gap={3}>
            <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <Lock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-white">{title}</h3>
          </HStack>
          <Button onClick={handleClose} variant="ghost-cool">
            <X className="h-5 w-5" />
          </Button>
        </FlexBetween>

        {/* Content */}
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
              {message}
            </p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={placeholder}
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 transition-colors"
              autoFocus
              required
            />
          </div>

          {/* Actions */}
          <HStack gap={3} className="justify-end p-6 bg-slate-50 dark:bg-slate-700/50 rounded-b-lg">
            <Button type="button" onClick={handleClose} variant="outline-soft">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!password.trim()}
              variant="ghost-subtle"
              className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit
            </Button>
          </HStack>
        </form>
      </div>
    </div>
  );
};

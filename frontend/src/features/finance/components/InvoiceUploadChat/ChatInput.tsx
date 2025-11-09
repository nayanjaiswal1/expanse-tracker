import React from 'react';
import { Paperclip, UploadCloud, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../../components/ui/Button';
import { FlexBetween, HStack } from '../../../../components/ui/Layout';

interface ChatInputProps {
  messageInput: string;
  setMessageInput: (value: string) => void;
  selectedAccount: string;
  setSelectedAccount: (value: string) => void;
  accounts: Array<{ id: number; name: string; currency?: string }>;
  attachment: File | null;
  handleAttachmentSelect: () => void;
  handleRemoveAttachment: () => void;
  uploadDocument: () => void;
  isUploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleAttachmentChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const ChatInput: React.FC<ChatInputProps> = ({
  messageInput,
  setMessageInput,
  selectedAccount,
  setSelectedAccount,
  accounts,
  attachment,
  handleAttachmentSelect,
  handleRemoveAttachment,
  uploadDocument,
  isUploading,
  fileInputRef,
  handleAttachmentChange,
}) => {
  const { t } = useTranslation('finance');

  return (
    <div className="border-t border-gray-200 bg-white/95 p-4 dark:border-gray-800 dark:bg-gray-900/95">
      <div className="space-y-3 text-sm">
        <div className="grid gap-2">
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            {t('invoiceUploadChat.notesOptional')}
          </label>
          <textarea
            value={messageInput}
            onChange={(event) => setMessageInput(event.target.value)}
            rows={2}
            placeholder={t('invoiceUploadChat.notesPlaceholder')}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
        </div>
        <div className="grid gap-2">
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            {t('invoiceUploadChat.defaultAccount')}
          </label>
          <select
            value={selectedAccount}
            onChange={(event) => setSelectedAccount(event.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          >
            <option value="">{t('invoiceUploadChat.assignLater')}</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </div>
        <FlexBetween className="text-xs text-gray-500 dark:text-gray-400">
          <HStack gap={2}>
            <Button
              type="button"
              onClick={handleAttachmentSelect}
              variant="text-muted"
              className="font-medium text-xs hover:text-emerald-600 dark:hover:text-emerald-300"
            >
              <HStack gap={2}>
                <Paperclip className="h-4 w-4" />
                {t('invoiceUploadChat.attachInvoice')}
              </HStack>
            </Button>
            {attachment && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                {attachment.name}
              </span>
            )}
          </HStack>
          {attachment && (
            <Button
              onClick={handleRemoveAttachment}
              variant="text-danger"
              className="text-xs hover:text-red-500"
            >
              {t('invoiceUploadChat.remove')}
            </Button>
          )}
        </FlexBetween>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.heic"
          className="hidden"
          onChange={handleAttachmentChange}
        />
        <Button
          disabled={isUploading}
          className="w-full bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400"
        >
          <HStack className="w-full justify-center" gap={2}>
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UploadCloud className="h-4 w-4" />
            )}
            {t('invoiceUploadChat.uploadAndParse')}
          </HStack>
        </Button>
      </div>
    </div>
  );
};

export default ChatInput;

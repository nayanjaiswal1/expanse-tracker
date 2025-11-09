import React from 'react';
import { Loader2, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FlexBetween, HStack } from '../../../../components/ui/Layout';
import type { AssistantMessage, Transaction } from '../../../../types';

interface MessageListProps {
  messages: AssistantMessage[];
  isLoadingHistory: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  createdTransactionsFromMessage: (message: AssistantMessage) => Transaction[];
  documentSummaryFromMessage: (message: AssistantMessage) => any;
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  isLoadingHistory,
  messagesEndRef,
  createdTransactionsFromMessage,
  documentSummaryFromMessage,
}) => {
  const { t } = useTranslation('finance');

  return (
    <div className="flex-1 overflow-hidden bg-gray-50/80 dark:bg-gray-900/50">
      <div className="h-full overflow-y-auto px-4 py-4 space-y-4">
        {isLoadingHistory && (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        )}
        {messages.length === 0 && !isLoadingHistory && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-4 text-center text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-400">
            {t('invoiceUploadChat.initialMessage')}
          </div>
        )}

        {messages.map((message) => {
          const createdTransactions = createdTransactionsFromMessage(message);
          const documentSummary = documentSummaryFromMessage(message);
          const isAssistant = message.role !== 'user';
          return (
            <div
              key={message.id}
              className={`flex ${isAssistant ? 'items-start gap-3' : 'items-start justify-end gap-3'}`}
            >
              {isAssistant && (
                <HStack className="mt-1 h-8 w-8 justify-center rounded-full bg-emerald-600 text-white dark:bg-emerald-500">
                  <FileText className="h-4 w-4" />
                </HStack>
              )}
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
                  isAssistant
                    ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-200'
                    : 'bg-emerald-600 text-white dark:bg-emerald-500'
                }`}
              >
                {message.content && <p className="text-sm leading-relaxed">{message.content}</p>}
                {documentSummary && (
                  <div className="mt-3 rounded-xl bg-white/80 p-3 text-xs text-gray-700 dark:bg-gray-900/80 dark:text-gray-100">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {documentSummary.file_name ?? t('invoiceUploadChat.documentParsed')}
                    </p>
                    {documentSummary.document_type && (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {t('invoiceUploadChat.detectedType', {
                          documentType: documentSummary.document_type,
                        })}
                      </p>
                    )}
                  </div>
                )}
                {createdTransactions.length > 0 && (
                  <div className="mt-3 space-y-2 rounded-xl bg-white/90 p-3 text-xs text-gray-700 dark:bg-gray-900/80 dark:text-gray-200">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {t('invoiceUploadChat.transactionsCreated', {
                        count: createdTransactions.length,
                      })}
                    </p>
                    <div className="space-y-1">
                      {createdTransactions.map((tx) => (
                        <FlexBetween key={tx.id}>
                          <span className="truncate">{tx.description}</span>
                          <span className="font-semibold">
                            {Number(tx.amount).toFixed(2)} {tx.currency}
                          </span>
                        </FlexBetween>
                      ))}
                    </div>
                  </div>
                )}
                {message.is_error && (
                  <p className="mt-2 text-xs text-red-500 dark:text-red-300">
                    {(message.payload as Record<string, string>)?.error ||
                      t('invoiceUploadChat.unableToProcessUpload')}
                  </p>
                )}
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default MessageList;

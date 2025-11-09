import React from 'react';
import { Image as ImageIcon, Loader2, MessageCircle, MessageSquare, Sparkles } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { FlexBetween, HStack } from '../../../components/ui/Layout';
import type {
  AugmentedMessage,
  InvoiceAssistantPayload,
  SuggestionPayload,
} from './FinanceAssistantDock.types';
import {
  INVOICE_ASSISTANT,
  extractCreatedTransaction,
  extractInvoicePayload,
  extractSuggestion,
} from './FinanceAssistantDock.utils';

type FinanceAssistantMessagesProps = {
  isLoading: boolean;
  messages: AugmentedMessage[];
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onApplySuggestion: (suggestion: SuggestionPayload) => void;
};

const renderInvoiceDetails = (payload: InvoiceAssistantPayload) => {
  const created = payload.created_transactions ?? [];
  const raw = payload.raw_transactions ?? [];
  const doc = payload.document;

  return (
    <div className="mt-3 space-y-3 rounded-2xl bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200">
      {doc && (
        <div>
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-200">
            {doc.file_name || 'Document processed'}
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-300">
            {doc.document_type ? `Detected as ${doc.document_type}` : 'Classification ready'}
          </p>
          {doc.language && (
            <p className="text-xs text-emerald-500 dark:text-emerald-200">
              Language: {doc.language}
            </p>
          )}
        </div>
      )}
      {payload.translation && (
        <div className="rounded-xl bg-white/60 p-2 text-left text-[11px] text-emerald-700 dark:bg-white/10 dark:text-emerald-200">
          <span className="font-semibold uppercase tracking-wide">Translation</span>
          <p className="mt-1 leading-relaxed">{payload.translation}</p>
        </div>
      )}
      {payload.tags && payload.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {payload.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-white/60 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-white/10 dark:text-emerald-200"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
      {created.length > 0 && (
        <div className="space-y-2 rounded-xl bg-white/70 p-3 text-emerald-700 shadow-sm dark:bg-white/10 dark:text-emerald-200">
          <p className="text-xs font-semibold">
            Added {created.length} transaction{created.length === 1 ? '' : 's'} to your ledger
          </p>
          <div className="space-y-1">
            {created.map((tx) => (
              <FlexBetween key={tx.id} className="text-[11px]">
                <span>{tx.description}</span>
                <span className="font-semibold">
                  {Number(tx.amount).toFixed(2)} {tx.currency}
                </span>
              </FlexBetween>
            ))}
          </div>
        </div>
      )}
      {created.length === 0 && raw.length > 0 && (
        <div className="rounded-xl bg-white/70 p-3 text-emerald-700 shadow-sm dark:bg-white/10 dark:text-emerald-200">
          <p className="text-xs font-semibold">
            Parsed {raw.length} potential transaction entries.
          </p>
          <p className="mt-1 text-[11px] opacity-80">
            Review the summary above and tap "Create transaction" to add it manually.
          </p>
        </div>
      )}
    </div>
  );
};

const FinanceAssistantMessagesComponent: React.FC<FinanceAssistantMessagesProps> = ({
  isLoading,
  messages,
  messagesEndRef,
  onApplySuggestion,
}) => {
  const renderMessage = (message: AugmentedMessage) => {
    const isAssistant = message.role !== 'user';
    const suggestion = extractSuggestion(message);
    const createdTransaction = extractCreatedTransaction(message);
    const invoicePayload =
      message.assistantType === INVOICE_ASSISTANT ? extractInvoicePayload(message) : null;
    const tags = (suggestion?.tags || invoicePayload?.tags) ?? [];
    const translation = suggestion?.translation || invoicePayload?.translation;

    return (
      <div
        key={`${message.assistantType}-${message.id}`}
        className={`flex ${isAssistant ? 'items-start gap-3' : 'items-start justify-end gap-3'}`}
      >
        {isAssistant && (
          <HStack className="mt-1 h-8 w-8 justify-center rounded-full bg-primary-600 text-white dark:bg-primary-500">
            {message.assistantType === INVOICE_ASSISTANT ? (
              <ImageIcon className="h-4 w-4" />
            ) : (
              <MessageCircle className="h-4 w-4" />
            )}
          </HStack>
        )}
        <div
          className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
            isAssistant
              ? 'bg-primary-50 text-primary-900 dark:bg-primary-900/20 dark:text-primary-200'
              : 'bg-blue-600 text-white dark:bg-blue-500'
          }`}
        >
          {message.content && (
            <p className="whitespace-pre-line text-sm leading-relaxed">{message.content}</p>
          )}

          {translation && (
            <div className="mt-3 rounded-xl bg-white/80 p-3 text-xs text-gray-700 dark:bg-gray-900/70 dark:text-gray-100">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Translation
              </p>
              <p className="mt-1 text-sm leading-relaxed">{translation}</p>
            </div>
          )}

          {tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-medium text-primary-700 dark:bg-white/10 dark:text-primary-200"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {suggestion && (
            <div className="mt-3 space-y-2 rounded-xl bg-white/80 p-3 text-xs text-gray-700 dark:bg-gray-900/80 dark:text-gray-100">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Suggested transaction
              </p>
              <FlexBetween className="text-sm">
                <span>
                  {suggestion.description}{' '}
                  <span className="text-gray-500">({suggestion.transaction_type})</span>
                </span>
                {suggestion.amount && (
                  <span
                    className={`font-semibold ${
                      suggestion.transaction_type && suggestion.transaction_type !== 'expense'
                        ? 'text-emerald-600 dark:text-emerald-300'
                        : 'text-rose-600 dark:text-rose-300'
                    }`}
                  >
                    {Number(suggestion.amount).toFixed(2)}
                  </span>
                )}
              </FlexBetween>
              {suggestion.merchant_name && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Merchant: {suggestion.merchant_name}
                </p>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 text-xs"
                onClick={() => onApplySuggestion(suggestion)}
              >
                <HStack gap={2}>
                  <Sparkles className="h-4 w-4" />
                  Apply to form
                </HStack>
              </Button>
            </div>
          )}

          {createdTransaction && (
            <div className="mt-3 space-y-1 rounded-xl bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200">
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-200">
                Transaction created
              </p>
              <p>
                {createdTransaction.description}{' '}
                <span className="font-medium">
                  {Number(createdTransaction.amount).toFixed(2)} {createdTransaction.currency}
                </span>
              </p>
            </div>
          )}

          {invoicePayload && renderInvoiceDetails(invoicePayload)}

          {message.is_error && (
            <p className="mt-2 text-xs text-red-500 dark:text-red-300">
              {(message.payload as Record<string, string>)?.error ||
                'Unable to process this message.'}
            </p>
          )}
        </div>
        {!isAssistant && (
          <HStack className="mt-1 h-8 w-8 justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
            <MessageSquare className="h-4 w-4" />
          </HStack>
        )}
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto space-y-4 px-4 py-4">
      {isLoading && (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      )}
      {!isLoading && messages.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900/70">
          <HStack className="mx-auto h-12 w-12 justify-center rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300">
            <Sparkles className="h-6 w-6" />
          </HStack>
          <h3 className="mt-3 text-sm font-semibold text-gray-900 dark:text-white">
            Start a conversation
          </h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Send a message or drop a receipt. I'll tag it, translate it, and prep the transaction
            for you.
          </p>
        </div>
      )}

      {messages.map(renderMessage)}

      <div ref={messagesEndRef} />
    </div>
  );
};

export const FinanceAssistantMessages = React.memo(FinanceAssistantMessagesComponent);

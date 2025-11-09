import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Bot,
  Check,
  ChevronDown,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  MessageSquare,
  Paperclip,
  Send,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import type {
  AssistantConversation,
  AssistantConversationEnvelope,
  AssistantMessage,
  Transaction,
} from '../../../types';
import { apiClient } from '../../../api/client';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../../components/ui/Toast';
import { Button } from '../../../components/ui/Button';
import { FlexBetween, HStack } from '../../../components/ui/Layout';

type ConversationalTransactionChatProps = {
  accounts: Array<{ id: number; name: string; currency?: string; icon?: string }>;
  categories: Array<{ id: string; name: string }>;
  onTransactionsMutated?: () => void;
};

type SuggestionPayload = {
  amount: string | null;
  description: string;
  transaction_type: Transaction['transaction_type'];
  merchant_name?: string | null;
  date?: string;
  currency?: string;
  suggested_account?: { id: number; name: string; icon?: string } | null;
  suggested_category?: { id: string; name: string } | null;
  confidence?: number;
  tags?: string[];
  translation?: string;
  missing_fields?: string[];
  quick_actions?: Array<{ label: string; action: string; value?: string }>;
  ai_enhanced?: boolean;
  ai_provider?: string;
  credits_used?: number;
  upgrade_prompt?: boolean;
  credits_depleted?: boolean;
  ai_insights?: string[];
};

type InvoicePayload = {
  type: string;
  document?: {
    file_name?: string;
    document_type?: string;
    quality_score?: number;
    detection_confidence?: number;
    language?: string;
  };
  parsed_items?: Array<{
    description: string;
    amount: string;
    quantity?: number;
  }>;
  created_transactions?: Transaction[];
  raw_transactions?: Array<Record<string, unknown>>;
  translation?: string;
  tags?: string[];
  quick_actions?: Array<{ label: string; action: string; value?: string }>;
};

type ChatMessage = AssistantMessage & {
  assistantType: 'quick_add' | 'invoice_upload';
};

const QUICK_ADD_ASSISTANT = 'quick_add';
const INVOICE_ASSISTANT = 'invoice_upload';

const isSuggestionMessage = (message: AssistantMessage) =>
  message.role === 'assistant' &&
  message.payload &&
  typeof message.payload === 'object' &&
  (message.payload as Record<string, unknown>).type === 'quick_add_suggestion';

const isTransactionCreatedMessage = (message: AssistantMessage) =>
  message.role === 'assistant' &&
  message.payload &&
  typeof message.payload === 'object' &&
  (message.payload as Record<string, unknown>).type === 'transaction_created';

const isInvoiceResultMessage = (message: AssistantMessage) =>
  message.role === 'assistant' &&
  message.payload &&
  typeof message.payload === 'object' &&
  (message.payload as Record<string, unknown>).type === 'invoice_upload_result';

const extractSuggestion = (message: AssistantMessage): SuggestionPayload | null => {
  if (!isSuggestionMessage(message)) return null;
  const payload = message.payload as Record<string, unknown>;
  return (payload.suggestion as SuggestionPayload | undefined) ?? null;
};

const extractCreatedTransaction = (message: AssistantMessage): Transaction | null => {
  if (!isTransactionCreatedMessage(message)) return null;
  const payload = message.payload as Record<string, unknown>;
  return (payload.transaction as Transaction | undefined) ?? null;
};

const extractInvoicePayload = (message: AssistantMessage): InvoicePayload | null => {
  if (!isInvoiceResultMessage(message)) return null;
  return message.payload as InvoicePayload;
};

export const ConversationalTransactionChat: React.FC<ConversationalTransactionChatProps> = ({
  accounts,
  categories,
  onTransactionsMutated,
}) => {
  const { t } = useTranslation('finance');
  const { showError, showSuccess } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [quickConversation, setQuickConversation] = useState<AssistantConversation | null>(null);
  const [invoiceConversation, setInvoiceConversation] = useState<AssistantConversation | null>(
    null
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const accountsMap = useMemo(
    () => new Map(accounts.map((account) => [String(account.id), account])),
    [accounts]
  );

  const categoryMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories]
  );

  const mergeConversations = useCallback(
    (quick: AssistantConversation | null, invoice: AssistantConversation | null) => {
      const quickMessages =
        quick?.messages?.map((msg) => ({ ...msg, assistantType: QUICK_ADD_ASSISTANT as const })) ??
        [];
      const invoiceMessages =
        invoice?.messages?.map((msg) => ({ ...msg, assistantType: INVOICE_ASSISTANT as const })) ??
        [];
      const combined = [...quickMessages, ...invoiceMessages].sort((a, b) => {
        const aTime = new Date(a.created_at).getTime();
        const bTime = new Date(b.created_at).getTime();
        return aTime - bTime;
      });
      setMessages(combined);
    },
    []
  );

  const fetchConversation = useCallback(
    async (assistantType: typeof QUICK_ADD_ASSISTANT | typeof INVOICE_ASSISTANT) => {
      const conversations = await apiClient.listAssistantConversations({ assistantType });
      if (conversations.length === 0) return null;
      return await apiClient.getAssistantConversation(conversations[0].id);
    },
    []
  );

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const loadHistory = async () => {
      try {
        setIsLoadingHistory(true);
        const [quick, invoice] = await Promise.all([
          fetchConversation(QUICK_ADD_ASSISTANT),
          fetchConversation(INVOICE_ASSISTANT),
        ]);
        if (cancelled) return;
        setQuickConversation(quick);
        setInvoiceConversation(invoice);
        mergeConversations(quick, invoice);
      } catch (error) {
        console.error('Failed to load assistant history', error);
        showError('Unable to load chat history', 'Please try again later.');
      } finally {
        if (!cancelled) setIsLoadingHistory(false);
      }
    };
    loadHistory();
    return () => {
      cancelled = true;
    };
  }, [isOpen, fetchConversation, mergeConversations, showError]);

  useEffect(() => {
    mergeConversations(quickConversation, invoiceConversation);
  }, [quickConversation, invoiceConversation, mergeConversations]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const handleAttachmentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAttachment(file);
    }
  };

  const handleRemoveAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const updateQuickConversation = useCallback(
    (conversationData: AssistantConversation) => {
      setQuickConversation(conversationData);
      const history = conversationData.messages ?? [];
      const lastAssistantMessage = [...history].reverse().find((msg) => msg.role === 'assistant');

      if (lastAssistantMessage) {
        if (isTransactionCreatedMessage(lastAssistantMessage)) {
          const transaction = extractCreatedTransaction(lastAssistantMessage);
          if (transaction) {
            showSuccess(
              'Transaction created!',
              `${transaction.description} - ${transaction.amount} ${transaction.currency}`
            );
            onTransactionsMutated?.();
          }
        }
      }
    },
    [onTransactionsMutated, showSuccess]
  );

  const updateInvoiceConversation = useCallback(
    (conversationData: AssistantConversation) => {
      setInvoiceConversation(conversationData);
      const latestAssistant = [...(conversationData.messages ?? [])]
        .reverse()
        .find((msg) => msg.role === 'assistant');
      if (latestAssistant) {
        const invoicePayload = extractInvoicePayload(latestAssistant);
        if (invoicePayload?.created_transactions?.length) {
          showSuccess(
            'Transactions created!',
            `Added ${invoicePayload.created_transactions.length} transaction${
              invoicePayload.created_transactions.length === 1 ? '' : 's'
            }`
          );
          onTransactionsMutated?.();
        }
      }
    },
    [onTransactionsMutated, showSuccess]
  );

  const sendQuickAddMessage = useCallback(
    async (messageText: string, additionalData?: Record<string, unknown>) => {
      setIsSending(true);
      try {
        let responseConversation: AssistantConversation | null = null;

        if (!quickConversation) {
          const created = await apiClient.createAssistantConversation({
            assistantType: QUICK_ADD_ASSISTANT,
            message: messageText.trim(),
            ...additionalData,
          });
          responseConversation = created;
        } else {
          const response: AssistantConversationEnvelope = await apiClient.sendAssistantMessage(
            quickConversation.id,
            {
              message: messageText.trim(),
              ...additionalData,
            }
          );
          responseConversation = response.conversation;
        }

        if (responseConversation) {
          updateQuickConversation(responseConversation);
        }

        setInput('');
      } catch (error) {
        console.error('Quick add assistant failed', error);
        showError('Unable to process', 'Try again or rephrase your message.');
      } finally {
        setIsSending(false);
      }
    },
    [quickConversation, showError, updateQuickConversation]
  );

  const sendInvoiceMessage = useCallback(
    async (messageText: string, file: File) => {
      setIsSending(true);
      try {
        let responseConv: AssistantConversation | null = null;
        const defaultAccount = accounts[0];

        if (!invoiceConversation) {
          const created = await apiClient.createAssistantConversation({
            assistantType: INVOICE_ASSISTANT,
            message: messageText.trim(),
            attachment: file,
            accountId: defaultAccount ? defaultAccount.id : undefined,
          });
          responseConv = created;
        } else {
          const response: AssistantConversationEnvelope = await apiClient.sendAssistantMessage(
            invoiceConversation.id,
            {
              message: messageText.trim(),
              attachment: file,
              accountId: defaultAccount ? defaultAccount.id : undefined,
            }
          );
          responseConv = response.conversation;
        }

        if (responseConv) {
          updateInvoiceConversation(responseConv);
        }

        setInput('');
        setAttachment(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error) {
        console.error('Invoice assistant upload failed', error);
        showError('Unable to parse document', 'Try a clearer scan or different format.');
      } finally {
        setIsSending(false);
      }
    },
    [accounts, invoiceConversation, showError, updateInvoiceConversation]
  );

  const handleSend = async () => {
    if (isSending) return;

    if (attachment) {
      await sendInvoiceMessage(input || 'Parse this invoice', attachment);
    } else {
      if (!input.trim()) {
        showError('Empty message', 'Type something to get started.');
        return;
      }
      await sendQuickAddMessage(input);
    }
  };

  const handleQuickAction = async (action: string, value?: string) => {
    if (action === 'confirm_transaction') {
      await sendQuickAddMessage('yes, create it', { intent: 'confirm' });
    } else if (action === 'select_account') {
      await sendQuickAddMessage(`use account ${value}`, { account_id: value });
    } else if (action === 'select_category') {
      await sendQuickAddMessage(`category ${value}`, { category_id: value });
    } else if (action === 'edit_amount') {
      inputRef.current?.focus();
      setInput('');
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const renderQuickActions = (
    actions?: Array<{ label: string; action: string; value?: string }>
  ) => {
    if (!actions || actions.length === 0) return null;

    return (
      <div className="mt-3 flex flex-wrap gap-2">
        {actions.map((actionItem, index) => (
          <Button
            key={index}
            onClick={() => handleQuickAction(actionItem.action, actionItem.value)}
            className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-primary-700 shadow-sm transition hover:bg-white hover:shadow-md dark:bg-white/10 dark:text-primary-200 dark:hover:bg-white/20"
          >
            {actionItem.label}
          </Button>
        ))}
      </div>
    );
  };

  const renderInvoiceDetails = (payload: InvoicePayload) => {
    return (
      <div className="mt-3 space-y-3 rounded-xl bg-emerald-50 p-3 text-xs dark:bg-emerald-900/20">
        {payload.document && (
          <div className="space-y-1">
            <p className="font-semibold text-emerald-900 dark:text-emerald-100">
              {payload.document.file_name || 'Document processed'}
            </p>
            {payload.document.document_type && (
              <p className="text-emerald-700 dark:text-emerald-300">
                Type: {payload.document.document_type}
              </p>
            )}
            {payload.document.language && (
              <p className="text-emerald-600 dark:text-emerald-400">
                Language: {payload.document.language}
              </p>
            )}
          </div>
        )}

        {payload.parsed_items && payload.parsed_items.length > 0 && (
          <div className="space-y-2 rounded-lg bg-white/80 p-3 shadow-sm dark:bg-white/10">
            <p className="font-semibold text-emerald-900 dark:text-emerald-100">
              Found {payload.parsed_items.length} item{payload.parsed_items.length === 1 ? '' : 's'}
              :
            </p>
            {payload.parsed_items.map((item, index) => (
              <FlexBetween key={index} className="text-emerald-800 dark:text-emerald-200">
                <span>
                  {item.quantity && `${item.quantity}x `}
                  {item.description}
                </span>
                <span className="font-semibold">{item.amount}</span>
              </FlexBetween>
            ))}
          </div>
        )}

        {payload.created_transactions && payload.created_transactions.length > 0 && (
          <div className="space-y-2 rounded-lg bg-white/80 p-3 shadow-sm dark:bg-white/10">
            <HStack gap={2} className="font-semibold text-emerald-900 dark:text-emerald-100">
              <Check className="h-4 w-4" />
              <p>
                Created {payload.created_transactions.length} transaction
                {payload.created_transactions.length === 1 ? '' : 's'}
              </p>
            </HStack>
            {payload.created_transactions.map((tx) => (
              <FlexBetween key={tx.id} className="text-emerald-800 dark:text-emerald-200">
                <span>{tx.description}</span>
                <span className="font-semibold">
                  {Number(tx.amount).toFixed(2)} {tx.currency}
                </span>
              </FlexBetween>
            ))}
          </div>
        )}

        {payload.translation && (
          <div className="rounded-lg bg-white/80 p-2 text-emerald-800 dark:bg-white/10 dark:text-emerald-200">
            <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
              Translation
            </p>
            <p className="mt-1 text-xs leading-relaxed">{payload.translation}</p>
          </div>
        )}

        {payload.tags && payload.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {payload.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {renderQuickActions(payload.quick_actions)}
      </div>
    );
  };

  const renderMessage = (message: ChatMessage) => {
    const isUser = message.role === 'user';
    const suggestion = extractSuggestion(message);
    const createdTransaction = extractCreatedTransaction(message);
    const invoicePayload =
      message.assistantType === INVOICE_ASSISTANT ? extractInvoicePayload(message) : null;
    const tags = suggestion?.tags || invoicePayload?.tags;
    const translation = suggestion?.translation || invoicePayload?.translation;

    return (
      <div
        key={`${message.assistantType}-${message.id}`}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} items-start gap-2`}
      >
        {!isUser && (
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-600 text-white dark:bg-primary-500">
            {message.assistantType === INVOICE_ASSISTANT ? (
              <ImageIcon className="h-4 w-4" />
            ) : (
              <Bot className="h-4 w-4" />
            )}
          </div>
        )}

        <div
          className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
            isUser
              ? 'bg-blue-600 text-white dark:bg-blue-500'
              : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
          }`}
        >
          {message.content && (
            <p className="whitespace-pre-line text-sm leading-relaxed">{message.content}</p>
          )}

          {suggestion && (
            <div className="mt-3 space-y-2 rounded-xl bg-white/90 p-3 text-xs dark:bg-gray-900/80">
              {/* AI Enhancement Badge */}
              {suggestion.ai_enhanced && (
                <HStack
                  gap={2}
                  className="mb-2 rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 px-2 py-1 dark:from-purple-900/20 dark:to-blue-900/20"
                >
                  <Sparkles className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                  <span className="text-[10px] font-semibold text-purple-700 dark:text-purple-300">
                    AI Enhanced • {suggestion.ai_provider || 'OpenAI'}
                  </span>
                  {suggestion.credits_used !== undefined && suggestion.credits_used > 0 && (
                    <span className="ml-auto text-[10px] text-purple-600 dark:text-purple-400">
                      {suggestion.credits_used} credit{suggestion.credits_used > 1 ? 's' : ''} used
                    </span>
                  )}
                </HStack>
              )}

              {/* Upgrade Prompt */}
              {suggestion.upgrade_prompt && (
                <div className="mb-2 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 px-3 py-2 dark:from-amber-900/20 dark:to-orange-900/20">
                  <div className="flex items-start gap-2">
                    <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                    <div className="flex-1">
                      <p className="text-[11px] font-semibold text-amber-900 dark:text-amber-100">
                        Premium AI Features Available
                      </p>
                      <p className="mt-1 text-[10px] text-amber-700 dark:text-amber-300">
                        Upgrade to Pro for advanced AI categorization, spending insights, and
                        smarter suggestions
                      </p>
                      <Button variant="chip-gradient" type="button">
                        Upgrade Now
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Credits Depleted Warning */}
              {suggestion.credits_depleted && (
                <div className="mb-2 rounded-lg bg-gradient-to-r from-red-50 to-rose-50 px-3 py-2 dark:from-red-900/20 dark:to-rose-900/20">
                  <div className="flex items-start gap-2">
                    <X className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600 dark:text-red-400" />
                    <div className="flex-1">
                      <p className="text-[11px] font-semibold text-red-900 dark:text-red-100">
                        AI Credits Depleted
                      </p>
                      <p className="mt-1 text-[10px] text-red-700 dark:text-red-300">
                        You've used all your AI credits this month. Upgrade or wait for next month's
                        reset.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Insights */}
              {suggestion.ai_insights && suggestion.ai_insights.length > 0 && (
                <div className="rounded-lg bg-blue-50 px-2 py-2 dark:bg-blue-900/20">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                    AI Insights
                  </p>
                  <ul className="space-y-0.5 text-[11px] text-blue-600 dark:text-blue-400">
                    {suggestion.ai_insights.map((insight, idx) => (
                      <li key={idx}>• {insight}</li>
                    ))}
                  </ul>
                </div>
              )}

              {suggestion.amount && (
                <div className="flex items-baseline justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Amount:</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {suggestion.amount} {suggestion.currency || 'USD'}
                  </span>
                </div>
              )}
              {suggestion.description && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Description: </span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {suggestion.description}
                  </span>
                </div>
              )}
              {suggestion.transaction_type && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Type: </span>
                  <span className="capitalize text-gray-900 dark:text-gray-100">
                    {suggestion.transaction_type}
                  </span>
                </div>
              )}
              {suggestion.merchant_name && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Merchant: </span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {suggestion.merchant_name}
                  </span>
                </div>
              )}
              {suggestion.missing_fields && suggestion.missing_fields.length > 0 && (
                <div className="mt-2 border-t border-gray-200 pt-2 dark:border-gray-700">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Missing fields
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {suggestion.missing_fields.map((field) => (
                      <span
                        key={field}
                        className="rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-200"
                      >
                        {field}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {renderQuickActions(suggestion.quick_actions)}
            </div>
          )}

          {createdTransaction && (
            <div className="mt-3 space-y-1 rounded-xl bg-emerald-50 p-3 text-xs dark:bg-emerald-900/20">
              <HStack gap={2} className="font-semibold text-emerald-900 dark:text-emerald-100">
                <Check className="h-4 w-4" />
                <p>Transaction created!</p>
              </HStack>
              <p className="text-emerald-800 dark:text-emerald-200">
                {createdTransaction.description} ·{' '}
                <span className="font-medium">
                  {Number(createdTransaction.amount).toFixed(2)} {createdTransaction.currency}
                </span>
              </p>
            </div>
          )}

          {invoicePayload && renderInvoiceDetails(invoicePayload)}

          {tags && tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    isUser
                      ? 'bg-blue-500 text-white dark:bg-blue-400'
                      : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {message.is_error && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-300">
              {(message.payload as Record<string, string>)?.error ||
                'Unable to process this message.'}
            </p>
          )}
        </div>

        {isUser && (
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
            <MessageSquare className="h-4 w-4" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen ? (
        <Button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group relative inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary-600 to-primary-700 text-white shadow-lg transition-all hover:scale-110 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2"
          title="Open transaction chat"
          aria-label="Open transaction chat"
        >
          <MessageCircle className="h-6 w-6" />
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
            AI
          </span>
        </Button>
      ) : (
        <div className="flex h-[680px] w-[440px] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
          <FlexBetween className="border-b border-gray-200 bg-gradient-to-r from-primary-600 to-primary-700 px-5 py-4 dark:border-gray-700">
            <HStack gap={3}>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                <Bot className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-base font-semibold text-white">Transaction Assistant</p>
                <p className="text-xs text-white/80">Chat naturally or upload receipts</p>
              </div>
            </HStack>
            <Button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-full p-2 text-white/80 transition hover:bg-white/20 hover:text-white"
              aria-label="Close chat"
            >
              <X className="h-5 w-5" />
            </Button>
          </FlexBetween>

          <div className="flex-1 overflow-hidden bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-900">
            <div className="h-full space-y-4 overflow-y-auto px-4 py-4">
              {isLoadingHistory && (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              )}

              {!isLoadingHistory && messages.length === 0 && (
                <div className="space-y-4 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30">
                    <Sparkles className="h-8 w-8 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Let's add a transaction
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                      Just tell me what you spent, or upload a receipt. I'll ask for anything I need
                      and create the transaction for you.
                    </p>
                  </div>
                  <div className="mx-auto max-w-xs space-y-2 rounded-xl bg-primary-50 p-4 text-left text-xs dark:bg-primary-900/20">
                    <p className="font-semibold text-primary-900 dark:text-primary-100">
                      Try saying:
                    </p>
                    <ul className="space-y-1 text-primary-700 dark:text-primary-300">
                      <li>• "50 for lunch with Sarah"</li>
                      <li>• "Coffee 4.50"</li>
                      <li>• Upload an invoice image</li>
                    </ul>
                  </div>
                </div>
              )}

              {messages.map(renderMessage)}

              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="border-t border-gray-200 bg-white px-4 py-4 dark:border-gray-700 dark:bg-gray-900">
            <div className="space-y-3">
              {attachment && (
                <FlexBetween className="rounded-xl bg-primary-50 px-3 py-2 dark:bg-primary-900/20">
                  <HStack gap={2} className="text-sm text-primary-900 dark:text-primary-100">
                    <Upload className="h-4 w-4" />
                    <span className="truncate font-medium">{attachment.name}</span>
                  </HStack>
                  <Button type="button" onClick={handleRemoveAttachment} variant="link-primary">
                    <X className="h-4 w-4" />
                  </Button>
                </FlexBetween>
              )}

              <div className="relative flex items-end gap-2">
                <Button
                  type="button"
                  onClick={handleAttachmentClick}
                  variant="icon-floating"
                  title="Attach image or PDF"
                >
                  <Paperclip className="h-5 w-5" />
                </Button>

                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  placeholder={attachment ? 'Add notes (optional)' : 'Describe your transaction...'}
                  className="flex-1 resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400 dark:focus:border-primary-400"
                  style={{
                    minHeight: '44px',
                    maxHeight: '120px',
                  }}
                />

                <Button
                  type="button"
                  onClick={handleSend}
                  disabled={isSending || (!input.trim() && !attachment)}
                  variant="assistant-action"
                  className="flex-shrink-0"
                >
                  {isSending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </Button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.heic,.webp"
                className="hidden"
                onChange={handleAttachmentChange}
              />

              <p className="text-center text-[10px] text-gray-500 dark:text-gray-400">
                Press Enter to send • Shift+Enter for new line
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

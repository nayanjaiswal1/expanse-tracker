import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MessageSquarePlus } from 'lucide-react';
import type {
  AssistantConversation,
  AssistantMessage,
  AssistantConversationEnvelope,
  Transaction,
} from '../../../types';
import { apiClient } from '../../../api/client';
import { useToast } from '../../../components/ui/Toast';
import { Header, MessageList, ChatInput, SummaryCards } from './InvoiceUploadChat';
import { useTranslation } from 'react-i18next';

const ASSISTANT_TYPE = 'invoice_upload';

type InvoiceAssistantPayload = {
  type: string;
  document?: {
    file_name?: string;
    document_type?: string;
    quality_score?: number;
    detection_confidence?: number;
  };
  created_transactions?: Transaction[];
  raw_transactions?: Array<Record<string, unknown>>;
};

interface InvoiceUploadChatProps {
  accounts: Array<{ id: number; name: string; currency?: string }>;
  onTransactionsCreated?: (transactions: Transaction[]) => void;
  position?: 'right' | 'left';
}

const InvoiceUploadChat: React.FC<InvoiceUploadChatProps> = ({
  accounts,
  onTransactionsCreated,
  position = 'right',
}) => {
  const { t } = useTranslation('finance');
  const { showError, showSuccess } = useToast();

  const [isExpanded, setIsExpanded] = useState(false);
  const [conversation, setConversation] = useState<AssistantConversation | null>(null);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<string>(
    accounts[0] ? String(accounts[0].id) : ''
  );
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isExpanded) return;
    const fetchHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const conversations = await apiClient.listAssistantConversations({
          assistantType: ASSISTANT_TYPE,
        });
        if (conversations.length > 0) {
          const active = await apiClient.getAssistantConversation(conversations[0].id);
          setConversation(active);
          setMessages(active.messages ?? []);
        } else {
          setConversation(null);
          setMessages([]);
        }
      } catch (error) {
        console.error(t('invoiceUploadChat.failedToLoadHistory'), error);
        showError(t('invoiceUploadChat.unableToLoadChat'), t('invoiceUploadChat.tryAgainLater'));
      } finally {
        setIsLoadingHistory(false);
      }
    };
    fetchHistory();
  }, [isExpanded, showError, t]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const createdTransactionsFromMessage = (message: AssistantMessage): Transaction[] => {
    if (message.role !== 'assistant') return [];
    const payload = message.payload as InvoiceAssistantPayload | undefined;
    if (!payload || payload.type !== 'invoice_upload_result') return [];
    return payload.created_transactions ?? [];
  };

  const documentSummaryFromMessage = (message: AssistantMessage) => {
    if (message.role !== 'assistant') return null;
    const payload = message.payload as InvoiceAssistantPayload | undefined;
    if (!payload || payload.type !== 'invoice_upload_result') return null;
    return payload.document ?? null;
  };

  const updateStateFromConversation = (conv: AssistantConversation) => {
    setConversation(conv);
    setMessages(conv.messages ?? []);
    const latestAssistant = [...(conv.messages ?? [])]
      .reverse()
      .find((msg) => msg.role === 'assistant');
    if (latestAssistant) {
      const created = createdTransactionsFromMessage(latestAssistant);
      if (created.length > 0) {
        showSuccess(
          t('invoiceUploadChat.transactionsAdded'),
          t('invoiceUploadChat.insertedTransactions', {
            count: created.length,
            entry:
              created.length === 1 ? t('invoiceUploadChat.entry') : t('invoiceUploadChat.entries'),
          })
        );
        onTransactionsCreated?.(created);
      }
    }
  };

  const handleAttachmentSelect = () => {
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

  const uploadDocument = async () => {
    if (isUploading) return;
    if (!attachment) {
      showError(t('invoiceUploadChat.selectAFile'), t('invoiceUploadChat.attachInvoiceToParse'));
      return;
    }

    setIsUploading(true);
    try {
      let responseConv: AssistantConversation | null = null;
      if (!conversation) {
        const created = await apiClient.createAssistantConversation({
          assistantType: ASSISTANT_TYPE,
          message: messageInput.trim(),
          attachment,
          accountId: selectedAccount ? Number(selectedAccount) : undefined,
        });
        responseConv = created;
      } else {
        const response: AssistantConversationEnvelope = await apiClient.sendAssistantMessage(
          conversation.id,
          {
            message: messageInput.trim(),
            attachment,
            accountId: selectedAccount ? Number(selectedAccount) : undefined,
          }
        );
        responseConv = response.conversation;
      }

      if (responseConv) {
        updateStateFromConversation(responseConv);
      }

      setMessageInput('');
      setAttachment(null);
    } catch (error) {
      console.error(t('invoiceUploadChat.uploadFailed'), error);
      showError(
        t('invoiceUploadChat.unableToParseDocument'),
        t('invoiceUploadChat.tryWithClearerScan')
      );
    } finally {
      setIsUploading(false);
    }
  };

  const summaryCards = useMemo(() => {
    const latestAssistant = [...messages].reverse().find((msg) => msg.role === 'assistant');
    if (!latestAssistant) return [];
    const doc = documentSummaryFromMessage(latestAssistant);
    const created = createdTransactionsFromMessage(latestAssistant);

    const cards = [];
    if (doc) {
      cards.push({
        title: doc.file_name ?? t('invoiceUploadChat.uploadedDocument'),
        subtitle: doc.document_type
          ? t('invoiceUploadChat.detectedAs', { documentType: doc.document_type })
          : t('invoiceUploadChat.documentProcessed'),
      });
    }
    if (created.length > 0) {
      const total = created.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
      cards.push({
        title: t('invoiceUploadChat.transactionCount', {
          count: created.length,
          plural: created.length === 1 ? '' : 's',
        }),
        subtitle: t('invoiceUploadChat.totalAmount', {
          total: total.toFixed(2),
          currency: created[0]?.currency || '',
        }),
      });
    }
    return cards;
  }, [messages, t]);

  return (
    <div className={`fixed bottom-6 ${position === 'right' ? 'right-[110px]' : 'left-6'} z-50`}>
      {!isExpanded ? (
        <div className="relative group">
          <button
            onClick={() => setIsExpanded(true)}
            className="text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors p-2"
            title={t('invoiceUploadChat.chatTitle')}
          >
            <MessageSquarePlus className="w-6 h-6" />
          </button>
          <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap shadow-lg">
            {t('invoiceUploadChat.uploadTitle')}
          </div>
        </div>
      ) : (
        <div className="flex h-[520px] w-[420px] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
          <Header onClose={() => setIsExpanded(false)} />

          <MessageList
            messages={messages}
            isLoadingHistory={isLoadingHistory}
            messagesEndRef={messagesEndRef}
            createdTransactionsFromMessage={createdTransactionsFromMessage}
            documentSummaryFromMessage={documentSummaryFromMessage}
          />

          <SummaryCards cards={summaryCards} />

          <ChatInput
            messageInput={messageInput}
            setMessageInput={setMessageInput}
            selectedAccount={selectedAccount}
            setSelectedAccount={setSelectedAccount}
            accounts={accounts}
            attachment={attachment}
            handleAttachmentSelect={handleAttachmentSelect}
            handleRemoveAttachment={handleRemoveAttachment}
            uploadDocument={uploadDocument}
            isUploading={isUploading}
            fileInputRef={fileInputRef}
            handleAttachmentChange={handleAttachmentChange}
          />
        </div>
      )}
    </div>
  );
};

export { InvoiceUploadChat };

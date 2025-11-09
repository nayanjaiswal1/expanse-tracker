import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  AssistantConversation,
  AssistantConversationEnvelope,
  Transaction,
} from '../../../types';
import { apiClient } from '../../../api/client';
import { useToast } from '../../../components/ui/Toast';
import { prepareTransactionForSubmit } from '../../../utils/transactionHelpers';
import type {
  AugmentedMessage,
  FinanceAssistantDockProps,
  FinanceAssistantFormState,
  FinanceAssistantTab,
  SuggestionPayload,
} from './FinanceAssistantDock.types';
import {
  QUICK_ADD_ASSISTANT,
  INVOICE_ASSISTANT,
  buildInitialForm,
  defaultDate,
  extractCreatedTransaction,
  extractInvoicePayload,
  extractSuggestion,
  isSuggestionMessage,
  isTransactionCreatedMessage,
} from './FinanceAssistantDock.utils';

type UseFinanceAssistantDockParams = FinanceAssistantDockProps & {
  isOpen: boolean;
  activeTab: FinanceAssistantTab;
};

export const useFinanceAssistantDock = ({
  accounts,
  categories,
  onTransactionsMutated,
  isOpen,
  activeTab,
}: UseFinanceAssistantDockParams) => {
  const { showError, showSuccess } = useToast();

  const [quickConversation, setQuickConversation] = useState<AssistantConversation | null>(null);
  const [invoiceConversation, setInvoiceConversation] = useState<AssistantConversation | null>(
    null
  );
  const [messages, setMessages] = useState<AugmentedMessage[]>([]);
  const [formData, setFormData] = useState<FinanceAssistantFormState>(() =>
    buildInitialForm(accounts[0])
  );
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [invoiceAccount, setInvoiceAccount] = useState<string>(
    accounts[0] ? String(accounts[0].id) : ''
  );
  const [latestSuggestion, setLatestSuggestion] = useState<SuggestionPayload | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const accountsMap = useMemo(
    () => new Map(accounts.map((account) => [String(account.id), account])),
    [accounts]
  );

  const mergeConversations = useCallback(
    (quick: AssistantConversation | null, invoice: AssistantConversation | null) => {
      const quickMessages =
        quick?.messages?.map((msg) => ({ ...msg, assistantType: QUICK_ADD_ASSISTANT })) ?? [];
      const invoiceMessages =
        invoice?.messages?.map((msg) => ({ ...msg, assistantType: INVOICE_ASSISTANT })) ?? [];
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
      if (conversations.length === 0) {
        return null;
      }
      const active = await apiClient.getAssistantConversation(conversations[0].id);
      return active;
    },
    []
  );

  useEffect(() => {
    if (!isOpen || activeTab !== 'assistant') return;

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
        showError('Unable to load assistant history', 'Please try again later.');
      } finally {
        if (!cancelled) setIsLoadingHistory(false);
      }
    };

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [isOpen, activeTab, fetchConversation, mergeConversations, showError]);

  useEffect(() => {
    mergeConversations(quickConversation, invoiceConversation);
  }, [quickConversation, invoiceConversation, mergeConversations]);

  useEffect(() => {
    const defaultAccount = accounts[0];
    if (!formData.account_id && defaultAccount) {
      setFormData((prev) => ({
        ...prev,
        account_id: String(defaultAccount.id),
        currency: defaultAccount.currency || prev.currency,
      }));
    }
  }, [accounts, formData.account_id]);

  useEffect(() => {
    if (formData.account_id) {
      const account = accounts.find((acc) => String(acc.id) === formData.account_id);
      if (account && account.currency && account.currency !== formData.currency) {
        setFormData((prev) => ({ ...prev, currency: account.currency as string }));
      }
    }
  }, [formData.account_id, accounts, formData.currency]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, activeTab]);

  const handleAttachmentClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleAttachmentChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAttachment(file);
    }
  }, []);

  const handleRemoveAttachment = useCallback(() => {
    setAttachment(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleFormChange = useCallback(
    (field: keyof FinanceAssistantFormState) =>
      (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData((prev) => ({ ...prev, [field]: event.target.value }));
      },
    []
  );

  const applySuggestionToForm = useCallback(
    (suggestion: SuggestionPayload) => {
      const accountId = suggestion.suggested_account?.id
        ? String(suggestion.suggested_account.id)
        : formData.account_id;
      const selectedAccount = accountId ? accountsMap.get(accountId) : undefined;
      const categoryId =
        suggestion.suggested_category?.id ||
        formData.category_id ||
        categories.find((category) =>
          category.name.toLowerCase().includes((suggestion.description || '').toLowerCase())
        )?.id ||
        '';

      setFormData((prev) => ({
        ...prev,
        amount: suggestion.amount ? suggestion.amount : prev.amount,
        description: suggestion.description || prev.description || 'Quick transaction',
        transaction_type: suggestion.transaction_type || prev.transaction_type,
        account_id: accountId,
        category_id: categoryId,
        merchant_name: suggestion.merchant_name || prev.merchant_name,
        date: suggestion.date || prev.date || defaultDate(),
        currency: suggestion.currency || selectedAccount?.currency || prev.currency,
      }));
    },
    [accountsMap, categories, formData.account_id]
  );

  const updateQuickConversation = useCallback(
    (conversationData: AssistantConversation) => {
      setQuickConversation(conversationData);
      const history = conversationData.messages ?? [];
      const lastAssistantMessage = [...history].reverse().find((msg) => msg.role === 'assistant');
      if (lastAssistantMessage) {
        if (isSuggestionMessage(lastAssistantMessage)) {
          const suggestion = extractSuggestion(lastAssistantMessage);
          if (suggestion) {
            setLatestSuggestion(suggestion);
            applySuggestionToForm(suggestion);
            showSuccess('Suggestion ready', 'We pre-filled the transaction based on your message.');
          }
        } else if (isTransactionCreatedMessage(lastAssistantMessage)) {
          const transaction = extractCreatedTransaction(lastAssistantMessage);
          if (transaction) {
            showSuccess(
              'Transaction added',
              `Logged ${transaction.transaction_type} for ${transaction.description}.`
            );
            onTransactionsMutated?.();
            setLatestSuggestion(null);
            setFormData((prev) => ({
              ...buildInitialForm(accountsMap.get(formData.account_id) || accounts[0]),
              account_id: prev.account_id,
              transaction_type: prev.transaction_type,
            }));
          }
        }
      }
    },
    [
      accounts,
      accountsMap,
      applySuggestionToForm,
      formData.account_id,
      onTransactionsMutated,
      showSuccess,
    ]
  );

  const updateInvoiceConversation = useCallback(
    (conversationData: AssistantConversation) => {
      setInvoiceConversation(conversationData);
      const latestAssistant = [...(conversationData.messages ?? [])]
        .reverse()
        .find((msg) => msg.role === 'assistant');
      if (latestAssistant) {
        const createdPayload = extractInvoicePayload(latestAssistant);
        if (createdPayload?.created_transactions?.length) {
          showSuccess(
            'Transactions parsed',
            `Detected ${createdPayload.created_transactions.length} transaction${
              createdPayload.created_transactions.length === 1 ? '' : 's'
            } from your document.`
          );
          onTransactionsMutated?.();
        }
      }
    },
    [onTransactionsMutated, showSuccess]
  );

  const sendQuickAddMessage = useCallback(async () => {
    if (!input.trim()) {
      showError('Need more info', 'Add a short description so I can help.');
      return;
    }

    setIsSending(true);
    try {
      let responseConversation: AssistantConversation | null = null;

      if (!quickConversation) {
        const created = await apiClient.createAssistantConversation({
          assistantType: QUICK_ADD_ASSISTANT,
          message: input.trim(),
        });
        responseConversation = created;
      } else {
        const response: AssistantConversationEnvelope = await apiClient.sendAssistantMessage(
          quickConversation.id,
          {
            message: input.trim(),
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
      showError('Unable to analyze', 'Try again or adjust the details manually.');
    } finally {
      setIsSending(false);
    }
  }, [input, quickConversation, showError, updateQuickConversation]);

  const sendInvoiceMessage = useCallback(async () => {
    if (!attachment) {
      showError('Select a file', 'Attach an invoice or receipt to analyze.');
      return;
    }

    setIsSending(true);
    try {
      let responseConv: AssistantConversation | null = null;
      if (!invoiceConversation) {
        const created = await apiClient.createAssistantConversation({
          assistantType: INVOICE_ASSISTANT,
          message: input.trim(),
          attachment,
          accountId: invoiceAccount ? Number(invoiceAccount) : undefined,
        });
        responseConv = created;
      } else {
        const response: AssistantConversationEnvelope = await apiClient.sendAssistantMessage(
          invoiceConversation.id,
          {
            message: input.trim(),
            attachment,
            accountId: invoiceAccount ? Number(invoiceAccount) : undefined,
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
      showError('Unable to parse document', 'Try again with a clearer scan or different format.');
    } finally {
      setIsSending(false);
    }
  }, [
    attachment,
    invoiceAccount,
    invoiceConversation,
    input,
    showError,
    updateInvoiceConversation,
  ]);

  const handleSend = useCallback(async () => {
    if (isSending) return;
    if (attachment) {
      await sendInvoiceMessage();
    } else {
      await sendQuickAddMessage();
    }
  }, [attachment, isSending, sendInvoiceMessage, sendQuickAddMessage]);

  const createTransactionFromForm = useCallback(async () => {
    if (isCreating || !quickConversation) return;

    const { amount, description, transaction_type: type, category_id: categoryId } = formData;

    if (!amount || !description) {
      const parsed = input.trim();
      if (!parsed) {
        showError('Incomplete details', 'Provide amount and description before creating.');
        return;
      }
    }

    if (!amount || Number.isNaN(Number(amount)) || Number(amount) <= 0) {
      showError('Invalid amount', 'Please enter a valid transaction amount.');
      return;
    }

    if (!formData.account_id) {
      showError('Select account', 'Choose the account for this transaction.');
      return;
    }

    const subtype = type || 'expense';
    const isCredit = subtype === 'income';

    const payload = prepareTransactionForSubmit({
      amount: Number(amount),
      description: description || 'Quick transaction',
      transaction_subtype: subtype,
      is_credit: isCredit,
      account_id: parseInt(formData.account_id, 10),
      category_id: categoryId || undefined,
      date: formData.date || defaultDate(),
      currency: formData.currency || 'USD',
      notes: input.trim() || undefined,
      source: 'assistant_quick_add',
      tags: [],
      verified: false,
      metadata: {
        merchant_name: formData.merchant_name || latestSuggestion?.merchant_name || undefined,
      },
    } as Partial<Transaction>);

    setIsCreating(true);
    try {
      const response = await apiClient.sendAssistantMessage(quickConversation.id, {
        intent: 'create_transaction',
        transaction: payload,
      });
      updateQuickConversation(response.conversation);
    } catch (error: any) {
      console.error('Failed to add quick transaction', error);
      showError('Failed to add transaction', error.response?.data?.detail || 'Please try again.');
    } finally {
      setIsCreating(false);
    }
  }, [
    formData,
    input,
    isCreating,
    latestSuggestion,
    quickConversation,
    showError,
    updateQuickConversation,
  ]);

  const resetAssistant = useCallback(() => {
    setInput('');
    setFormData(buildInitialForm(accounts[0]));
    setAttachment(null);
    setLatestSuggestion(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [accounts]);

  return {
    messages,
    isLoadingHistory,
    messagesEndRef,
    fileInputRef,
    input,
    setInput,
    attachment,
    handleAttachmentClick,
    handleAttachmentChange,
    handleRemoveAttachment,
    invoiceAccount,
    setInvoiceAccount,
    formData,
    handleFormChange,
    applySuggestionToForm,
    isSending,
    isCreating,
    handleSend,
    createTransactionFromForm,
    resetAssistant,
  };
};

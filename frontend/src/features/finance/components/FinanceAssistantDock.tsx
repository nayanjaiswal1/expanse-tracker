import React, { useState } from 'react';
import { Bot, MessageSquare, X } from 'lucide-react';
import { AIChat } from '../../ai/AIChat';
import type { FinanceAssistantDockProps, FinanceAssistantTab } from './FinanceAssistantDock.types';
import { FinanceAssistantForm } from './FinanceAssistantForm';
import { FinanceAssistantMessages } from './FinanceAssistantMessages';
import { useFinanceAssistantDock } from './useFinanceAssistantDock';
import { FlexBetween, HStack } from '../../../components/ui/Layout';

export const FinanceAssistantDock: React.FC<FinanceAssistantDockProps> = ({
  accounts,
  categories,
  onTransactionsMutated,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<FinanceAssistantTab>('assistant');

  const {
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
  } = useFinanceAssistantDock({
    accounts,
    categories,
    onTransactionsMutated,
    isOpen,
    activeTab,
  });

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen ? (
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            setActiveTab('assistant');
          }}
          className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-400"
          title="Open finance assistant"
          aria-label="Open finance assistant"
        >
          <MessageSquare className="h-5 w-5" />
        </button>
      ) : (
        <div className="flex h-[640px] w-[430px] flex-col overflow-hidden rounded-xl border border-primary-100 bg-white shadow-2xl dark:border-primary-900/40 dark:bg-gray-900">
          <FlexBetween className="border-b border-primary-100/80 px-5 py-3 dark:border-primary-900/40">
            <HStack gap={3}>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                  Finance Assistant
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Upload receipts, tag expenses, ask quick questions
                </p>
              </div>
            </HStack>
            <HStack gap={2}>
              <div className="flex overflow-hidden rounded-full border border-gray-200 dark:border-gray-700">
                {(['assistant', 'coach'] as FinanceAssistantTab[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1 text-xs font-medium transition ${
                      activeTab === tab
                        ? 'bg-primary-600 text-white'
                        : 'bg-transparent text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                    }`}
                  >
                    {tab === 'assistant' ? 'Chat' : 'Coach'}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setActiveTab('assistant');
                }}
                className="rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
                aria-label="Close finance assistant"
              >
                <X className="h-4 w-4" />
              </button>
            </HStack>
          </FlexBetween>

          {activeTab === 'assistant' ? (
            <>
              <div className="flex-1 overflow-hidden bg-gray-50/80 dark:bg-gray-900/60">
                <FinanceAssistantMessages
                  isLoading={isLoadingHistory}
                  messages={messages}
                  messagesEndRef={messagesEndRef}
                  onApplySuggestion={applySuggestionToForm}
                />
              </div>

              <div className="border-t border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
                <FinanceAssistantForm
                  accounts={accounts}
                  categories={categories}
                  formData={formData}
                  onFormChange={handleFormChange}
                  input={input}
                  onInputChange={(value) => setInput(value)}
                  onSend={handleSend}
                  isSending={isSending}
                  isCreating={isCreating}
                  attachment={attachment}
                  onAttachmentClick={handleAttachmentClick}
                  onAttachmentChange={handleAttachmentChange}
                  onRemoveAttachment={handleRemoveAttachment}
                  invoiceAccount={invoiceAccount}
                  onInvoiceAccountChange={(value) => setInvoiceAccount(value)}
                  fileInputRef={fileInputRef}
                  onCreateTransaction={createTransactionFromForm}
                  onReset={resetAssistant}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 bg-white dark:bg-gray-900">
              <AIChat compact className="h-full" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

import { useMemo, useState } from 'react';
import {
  Send,
  Bot,
  User,
  Loader2,
  Clock,
  BarChart3,
  ListChecks,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { FlexBetween, HStack } from '../../components/ui/Layout';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  timeframe?: string;
};

interface ChatResponse {
  reply: string;
  timeframe: string;
  context?: Record<string, unknown>;
}

type TimeframeOption = {
  value: string;
  label: string;
};

const timeframeOptions: TimeframeOption[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '180d', label: 'Last 180 days' },
  { value: 'year', label: 'Last 12 months' },
];

const formatTimestamp = () =>
  new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

const markdownToHtml = (input: string) => {
  const lines = input.split('\n');
  const html: string[] = [];
  let listBuffer: string[] = [];

  const flushList = () => {
    if (listBuffer.length > 0) {
      html.push(`<ul class="ml-5 list-disc space-y-1">${listBuffer.join('')}</ul>`);
      listBuffer = [];
    }
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      return;
    }

    if (trimmed.startsWith('- ')) {
      listBuffer.push(`<li>${trimmed.slice(2)}</li>`);
    } else {
      flushList();
      html.push(`<p>${trimmed}</p>`);
    }
  });

  flushList();
  return html.join('');
};

interface AIChatProps {
  compact?: boolean;
  className?: string;
}

export const AIChat: React.FC<AIChatProps> = ({ compact = false, className }) => {
  const { showError } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [timeframe, setTimeframe] = useState<string>('90d');
  const [isLoading, setIsLoading] = useState(false);
  const [context, setContext] = useState<Record<string, unknown> | null>(null);
  const [showContext, setShowContext] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!input.trim() || isLoading) return;

    const newMessage: ChatMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: formatTimestamp(),
      timeframe,
    };

    setMessages((prev) => [...prev, newMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { data } = await apiClient.client.post<ChatResponse>('/ai/chat/', {
        message: newMessage.content,
        timeframe,
      });

      setContext(data.context ?? null);
      setShowContext(true);

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.reply,
          timestamp: formatTimestamp(),
          timeframe: data.timeframe,
        },
      ]);
    } catch (error: any) {
      console.error('AI chat failed', error);
      showError('Unable to fetch AI response', error.response?.data?.error || 'Try again later.');
      // Remove the last user message if assistant response fails
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = (message: ChatMessage, index: number) => {
    const isAssistant = message.role === 'assistant';
    const Icon = isAssistant ? Bot : User;

    return (
      <div
        key={`${message.timestamp}-${index}`}
        className={`flex gap-3 ${isAssistant ? 'bg-primary-50/60 dark:bg-primary-900/20' : 'bg-white dark:bg-gray-900'} rounded-xl px-4 py-3 shadow-sm border border-gray-100 dark:border-gray-700`}
      >
        <span
          className={`mt-1 flex h-9 w-9 items-center justify-center rounded-full ${
            isAssistant
              ? 'bg-primary-600 text-white'
              : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
          }`}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="flex-1">
          <HStack gap={2} className="text-xs text-gray-500 dark:text-gray-400">
            <span className="font-semibold uppercase tracking-wide">
              {isAssistant ? 'Budgeton' : 'You'}
            </span>
            <span>{message.timestamp}</span>
            {message.timeframe && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                <Clock className="h-3 w-3" />
                {message.timeframe}
              </span>
            )}
          </HStack>
          <div
            className="mt-2 text-sm text-gray-800 dark:text-gray-200 prose prose-sm dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: markdownToHtml(message.content) }}
          />
        </div>
      </div>
    );
  };

  const contextEntries = useMemo(() => (context ? Object.entries(context) : []), [context]);

  const containerClasses = compact
    ? `w-full space-y-4 px-2 py-3 ${className || ''}`
    : `mx-auto w-full max-w-4xl space-y-6 px-4 sm:px-6 lg:px-10 pb-16 ${className || ''}`;

  const cardClasses = compact
    ? 'rounded-2xl border border-primary-100 bg-gradient-to-br from-white via-primary-50/50 to-white shadow-lg dark:border-primary-900/40 dark:from-gray-900 dark:via-primary-900/10 dark:to-gray-900'
    : 'rounded-xl border border-primary-100 bg-gradient-to-br from-white via-primary-50/50 to-white shadow-xl dark:border-primary-900/40 dark:from-gray-900 dark:via-primary-900/10 dark:to-gray-900';

  return (
    <div className={containerClasses.trim()}>
      <div className={cardClasses}>
        <div className="border-b border-primary-100/60 bg-white/80 px-6 py-5 dark:border-primary-900/30 dark:bg-gray-900/80">
          <FlexBetween className="gap-2">
            <HStack gap={3}>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-600 text-white shadow-md">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                  AI Finance Coach
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Ask questions about your budgets, spending trends, and upcoming targets.
                </p>
              </div>
            </HStack>
            <HStack gap={2}>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Timeframe
              </label>
              <select
                value={timeframe}
                onChange={(event) => setTimeframe(event.target.value)}
                className="rounded-full border border-primary-200 bg-white px-3 py-1 text-xs font-medium text-primary-700 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-400 dark:border-primary-700 dark:bg-gray-900 dark:text-primary-300"
              >
                {timeframeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </HStack>
          </FlexBetween>
        </div>

        <div className="space-y-4 px-4 py-5 sm:px-6">
          {messages.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-primary-200 bg-white/50 px-6 py-10 text-center dark:border-primary-800 dark:bg-gray-900/60">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300">
                <Sparkles className="h-7 w-7" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-gray-800 dark:text-gray-100">
                Start a conversation about your finances
              </h2>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Try “Where did I spend the most this month?” or “Am I on track with my savings
                goals?”
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message, index) => renderMessage(message, index))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex items-end gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-100 dark:border-gray-700 dark:bg-gray-900 dark:focus-within:border-primary-600 dark:focus-within:ring-primary-700/40">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask anything about your spending, budgets, or goals..."
                rows={2}
                className="flex-1 resize-none border-0 bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:ring-0 dark:text-gray-100 dark:placeholder-gray-500"
              />
              <Button
                type="submit"
                disabled={isLoading || !input.trim()}
                variant="primary"
                size="none"
                className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-lg shadow-primary-600/30 hover:bg-primary-700 disabled:shadow-none"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Ask
              </Button>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Budgeton uses only your existing data and never shares it outside your account.
            </p>
          </form>
        </div>
      </div>

      {contextEntries.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <Button
            type="button"
            onClick={() => setShowContext((prev) => !prev)}
            variant="neutral-soft"
            size="none"
            className="flex w-full items-center justify-between bg-transparent px-5 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800/60"
          >
            <HStack gap={2}>
              <BarChart3 className="h-4 w-4 text-primary-600 dark:text-primary-400" />
              Insights used in last answer
            </HStack>
            <span>{showContext ? 'Hide' : 'Show'}</span>
          </Button>
          {showContext && (
            <div className="space-y-4 border-t border-gray-100 px-5 py-4 text-sm dark:border-gray-700">
              {contextEntries.map(([key, value]) => {
                if (value === null || value === undefined) {
                  return null;
                }

                if (Array.isArray(value)) {
                  if (value.length === 0) return null;

                  return (
                    <div key={key} className="space-y-2">
                      <HStack
                        gap={2}
                        className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                      >
                        <ListChecks className="h-3.5 w-3.5" />
                        {key.replace(/_/g, ' ')}
                      </HStack>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {value.map((item, index) => (
                          <div
                            key={`${key}-${index}`}
                            className="rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm dark:border-gray-700 dark:bg-gray-950"
                          >
                            <pre className="whitespace-pre-wrap text-xs text-gray-600 dark:text-gray-300">
                              {typeof item === 'object'
                                ? JSON.stringify(item, null, 2)
                                : String(item)}
                            </pre>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                if (typeof value === 'object') {
                  return (
                    <div
                      key={key}
                      className="rounded-xl border border-gray-200 bg-gray-50/60 px-3 py-2 text-xs text-gray-600 shadow-sm dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-300"
                    >
                      <div className="font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        {key.replace(/_/g, ' ')}
                      </div>
                      <pre className="mt-1 whitespace-pre-wrap">
                        {JSON.stringify(value, null, 2)}
                      </pre>
                    </div>
                  );
                }

                return (
                  <HStack
                    key={key}
                    gap={2}
                    className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500 dark:bg-gray-800/70 dark:text-gray-300"
                  >
                    <AlertCircle className="h-3.5 w-3.5 text-primary-500" />
                    <span className="font-semibold uppercase tracking-wide">
                      {key.replace(/_/g, ' ')}
                    </span>
                    <span className="text-gray-600 dark:text-gray-200">{String(value)}</span>
                  </HStack>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

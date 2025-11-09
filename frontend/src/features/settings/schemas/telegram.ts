// Telegram related type definitions

export interface TelegramBot {
  id: number;
  name: string;
  bot_token: string;
  webhook_url: string;
  status: 'active' | 'inactive' | 'error';
  total_transactions_created: number;
  created_at: string;
  updated_at: string;
}

export interface TelegramUser {
  id: number;
  telegram_user_id: string;
  username: string;
  first_name: string;
  last_name: string;
  status: 'active' | 'pending' | 'blocked';
  verification_code: string;
  created_at: string;
}

export interface BotStatistics {
  total_users: number;
  active_users: number;
  total_messages: number;
  transactions_created: number;
  uptime_days: number;
}

export interface SetupGuide {
  steps?: Array<{ step: number; title: string; description: string; details?: string[] }>;
  commands?: string[];
}

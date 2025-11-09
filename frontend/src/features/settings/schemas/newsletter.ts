// Newsletter related type definitions

export interface NewsletterSubscription {
  id: number;
  email: string;
  is_active: boolean;
  preferences: {
    frequency: 'daily' | 'weekly' | 'monthly';
    topics: string[];
  };
  subscribed_at: string;
  updated_at: string;
}

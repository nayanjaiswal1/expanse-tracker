// Monthly analysis related type definitions

export interface Period {
  year: number;
  month: number;
  month_name: string;
  period_label: string;
  transaction_count: number;
}

export interface FinancialSummary {
  total_income: number;
  total_expenses: number;
  net_income: number;
  transaction_count: number;
  avg_transaction_amount: number;
  savings_rate: number;
}

export interface CategoryBreakdown {
  category: string;
  amount: number;
  percentage: number;
  transaction_count: number;
}

export interface AIAssessment {
  financial_health_score: number;
  summary: string;
  key_strengths: string[];
  areas_for_improvement: string[];
}

export interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  potential_savings?: number;
}

export interface SpendingInsights {
  primary_observation: string;
  category_analysis: string;
  pattern_insights: string;
}

export interface MonthlyReport {
  success: boolean;
  period: { year: number; month: number; month_name: string; generated_at: string };
  financial_summary: {
    summary: FinancialSummary;
    category_breakdown: CategoryBreakdown[];
    previous_month_comparison?: any;
  };
  ai_analysis: {
    overall_assessment: AIAssessment;
    spending_insights: SpendingInsights;
    recommendations: Recommendation[];
    notable_observations: string[];
  };
  tokens_used: number;
}

// Bank statements related type definitions

export interface Account {
  id: string;
  name: string;
  entity_type: string;
  data: { type: string; balance?: number };
}

export interface SupportedBank {
  key: string;
  name: string;
  csv_formats: number;
  indicators: string[];
}

export interface ParsingHistory {
  id: string;
  title: string;
  created_at: string;
  file_size: number;
  bank_format: string;
  success: boolean;
  transactions_parsed: number;
  transactions_created: number;
  confidence: number;
  errors: string[];
}

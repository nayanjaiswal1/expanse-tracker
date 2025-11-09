import { apiClient } from '../../../api';
import type { Account, SupportedBank, ParsingHistory } from '../schemas';

export const bankStatementsApi = {
  async getAccounts(): Promise<{ accounts: Account[] }> {
    const res = await apiClient.get('/bank-statements/accounts/');
    return (res as any).data;
  },
  async getSupportedBanks(): Promise<{ supported_banks: SupportedBank[] }> {
    const res = await apiClient.get('/bank-statements/supported_banks/');
    return (res as any).data;
  },
  async getParsingHistory(): Promise<{ parsing_history: ParsingHistory[] }> {
    const res = await apiClient.get('/bank-statements/parsing_history/');
    return (res as any).data;
  },
  async uploadStatement(form: FormData): Promise<any> {
    const res = await apiClient.post('/bank-statements/upload_statement/', form);
    return (res as any).data;
  },
  async parseText(payload: {
    content: string;
    account_id?: string | null;
    bank_format?: string | null;
  }): Promise<any> {
    const res = await apiClient.post('/bank-statements/parse_text/', payload);
    return (res as any).data;
  },
};

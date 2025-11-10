import { createAccountsApi } from './modules/accounts';
import { createAnalyticsApi } from './modules/analytics';
import { createAuthApi } from './modules/auth';
import { createCategoriesApi } from './modules/categories';
import { createContactsApi } from './modules/contacts';
import { createCurrencyApi } from './modules/currency';
import { createDataExportApi } from './modules/dataExports';
import { createDocumentsApi } from './modules/documents';
import { createEmailTemplatesApi } from './modules/emailTemplates';
import { createExpenseGroupsApi } from './modules/expenseGroups';
import { createExtractedTransactionsApi } from './modules/extractedTransactions';
import { createGenericApi } from './modules/generic';
import { createGmailApi } from './modules/gmail';
import { createGoalsApi } from './modules/goals';
import { createHttpClient } from './modules/http';
import { createMerchantPatternsApi } from './modules/merchantPatterns';
import { createPendingTransactionsApi } from './modules/pendingTransactions';
import { createProcessingRulesApi } from './modules/processingRules';
import { createSplitwiseApi } from './modules/splitwise';
import { createSubscriptionsApi } from './modules/subscriptions';
import { createTransactionsApi } from './modules/transactions';
import { createTransactionGroupsApi } from './modules/transactionGroups';
import { createUploadsApi } from './modules/uploads';
import { createUsersApi } from './modules/users';
import { createAiApi } from './modules/ai';
import { createQuickAddApi } from './modules/quickAdd';
import type {
  Currency,
  CurrencyConversionResponse,
  CurrencyResponse,
  ExchangeRateResponse,
} from './modules/types';

const http = createHttpClient();

const apiClient = {
  client: http.client,
  ...createAuthApi(http),
  ...createUsersApi(http),
  ...createAccountsApi(http),
  ...createAnalyticsApi(http),
  ...createCategoriesApi(http),
  ...createGoalsApi(http),
  ...createMerchantPatternsApi(http),
  ...createPendingTransactionsApi(http),
  ...createTransactionsApi(http),
  ...createTransactionGroupsApi(http),
  ...createUploadsApi(http),
  ...createContactsApi(http),
  ...createExpenseGroupsApi(http),
  ...createSubscriptionsApi(http),
  ...createQuickAddApi(http),
  ...createProcessingRulesApi(http),
  ...createGmailApi(http),
  ...createEmailTemplatesApi(http),
  ...createExtractedTransactionsApi(http),
  ...createCurrencyApi(http),
  ...createSplitwiseApi(http),
  ...createDocumentsApi(http),
  ...createDataExportApi(http),
  ...createGenericApi(http),
  ...createAiApi(http),
};

export type ApiClient = typeof apiClient;

export { apiClient };

export type { Currency, CurrencyResponse, ExchangeRateResponse, CurrencyConversionResponse };

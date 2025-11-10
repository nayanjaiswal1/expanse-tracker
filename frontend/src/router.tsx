import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import App from './App';
import { RouteError, ProtectedRoute } from './components';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Public pages
import ProLandingPage from './pages/ProLandingPage';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import { Login } from './features/auth/Login';
import { GoogleCallback } from './features/auth/GoogleCallback';
import OnboardingFlow from './features/auth/OnboardingFlow';
import UnauthorizedPage from './pages/UnauthorizedPage';
import AdminPage from './pages/AdminPage';

// Protected pages
import { Dashboard } from './features/dashboard/Dashboard';
import { TransactionsPage } from './features/finance/TransactionsPage';
import { AccountsManagement } from './features/finance/AccountsManagement';
import { Goals } from './features/finance/Goals';
import { GoalDetailPage } from './features/finance/GoalDetailPage';
import { Budgets } from './features/finance/Budgets';
import { BudgetDetail } from './features/finance/BudgetDetail';
import { GroupExpenses } from './features/finance/GroupExpenses';
import ExpenseTracker from './features/finance/ExpenseTracker';
import GmailCallback from './features/auth/GmailCallback';
import { Settings } from './features/settings/Settings';
import { BankStatementUploadWrapper } from './features/finance/BankStatementUploadWrapper';
import { TransactionSettings } from './features/finance/TransactionSettings';
import { StatementViewer } from './features/finance/StatementViewer';
import { StatementParser } from './features/finance/components/StatementParser';
import InvoiceOCR from './features/ai/InvoiceOCR';
import MonthlyAnalysis from './features/dashboard/MonthlyAnalysis';
import TelegramIntegration from './features/settings/TelegramIntegration';
import PlanCustomization from './pages/PlanCustomization';
import { DocumentParserPage } from './pages/DocumentParserPage';
import RecurringInvestments from './features/finance/RecurringInvestments';
import { ChatPage } from './pages/ChatPage';
import { StatementPasswordsPage } from './pages/StatementPasswordsPage';

// Layout
import { Layout } from './components/layout';

// Helper function to wrap components with error boundary
const withErrorBoundary = (Component: React.ComponentType) => (
  <ErrorBoundary>
    <Component />
  </ErrorBoundary>
);

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Navigate to="/landing" replace /> },
      { path: 'landing', element: <ProLandingPage /> },
      { path: 'privacy-policy', element: <PrivacyPolicy /> },
      { path: 'terms-of-service', element: <TermsOfService /> },
      { path: 'login', element: <Login /> },
      { path: 'google-callback', element: <GoogleCallback /> },
      { path: 'unauthorized', element: <UnauthorizedPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: 'onboarding', element: <OnboardingFlow /> },
          { path: 'personalization', element: <Navigate to="/onboarding" replace /> },
          {
            element: <Layout />,
            children: [
              { path: 'dashboard', element: withErrorBoundary(Dashboard) },
              { path: 'chat', element: withErrorBoundary(ChatPage) },
              { path: 'transactions', element: withErrorBoundary(ConfigurableTransactionTable) },
              { path: 'accounts', element: withErrorBoundary(AccountsManagement) },
              { path: 'subscriptions', element: <Navigate to="/settings" replace /> },
              { path: 'goals', element: withErrorBoundary(Goals) },
              { path: 'goals/:goalId', element: withErrorBoundary(GoalDetailPage) },
              { path: 'budgets', element: withErrorBoundary(Budgets) },
              { path: 'budgets/:id', element: withErrorBoundary(BudgetDetail) },
              { path: 'expenses', element: withErrorBoundary(ExpenseTracker) },
              { path: 'group-expenses', element: withErrorBoundary(GroupExpenses) },
              { path: 'gmail-callback', element: withErrorBoundary(GmailCallback) },
              { path: 'analytics', element: <Navigate to="/dashboard" replace /> },
              { path: 'settings/*', element: withErrorBoundary(Settings) },
              { path: 'settings/passwords', element: withErrorBoundary(StatementPasswordsPage) },
              { path: 'upload-history', element: withErrorBoundary(BankStatementUploadWrapper) },
              { path: 'uploads', element: withErrorBoundary(BankStatementUploadWrapper) },
              { path: 'profile', element: <Navigate to="/settings" replace /> },
              { path: 'transaction-settings', element: withErrorBoundary(TransactionSettings) },
              { path: 'statement-viewer', element: withErrorBoundary(StatementViewer) },
              { path: 'statement-parser', element: withErrorBoundary(StatementParser) },
              { path: 'invoice-ocr', element: withErrorBoundary(InvoiceOCR) },
              { path: 'monthly-analysis', element: withErrorBoundary(MonthlyAnalysis) },
              { path: 'telegram-integration', element: withErrorBoundary(TelegramIntegration) },
              { path: 'plan-customization', element: withErrorBoundary(PlanCustomization) },
              { path: 'document-parser', element: withErrorBoundary(DocumentParserPage) },
              { path: 'recurring-investments', element: withErrorBoundary(RecurringInvestments) },
            ],
          },
        ],
      },
      {
        element: <ProtectedRoute allowedRoles={['admin']} />,
        children: [
          {
            element: <Layout />,
            children: [{ path: 'admin', element: withErrorBoundary(AdminPage) }],
          },
        ],
      },
      { path: '*', element: <Navigate to="/landing" replace /> },
    ],
  },
]);

export default router;

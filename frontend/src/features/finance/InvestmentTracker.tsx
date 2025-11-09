import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Coins,
  PieChart,
  Plus,
  Eye,
  Mail,
  RefreshCw,
  CheckCircle,
  X,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../utils/preferences';
import { HStack } from '../../components/ui/Layout';
import { useModalState } from '../../hooks/useCrudModals';
import {
  usePortfolio,
  useGmailAccounts,
  usePendingInvestmentTransactions,
  useCreateInvestmentMutation,
  useParseInvestmentEmailsMutation,
  useApproveInvestmentTransactionMutation,
  useRejectInvestmentTransactionMutation,
  type Investment,
  type PortfolioSummary,
  type PendingTransaction,
  type GmailAccount,
} from '../../hooks/finance';

const InvestmentTracker: React.FC = () => {
  const [portfolioSummary, setPortfolioSummary] = useState<PortfolioSummary | null>(null);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [pendingTransactions, setPendingTransactions] = useState<PendingTransaction[]>([]);
  const [gmailAccounts, setGmailAccounts] = useState<GmailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('portfolio');
  const { isOpen: showAddModal, open: openAddModal, close: closeAddModal } = useModalState();
  const [processingEmail, setProcessingEmail] = useState(false);
  const [newInvestment, setNewInvestment] = useState({
    symbol: '',
    name: '',
    type: 'stock',
    current_price: '',
    sector: '',
    broker: '',
  });

  const { showSuccess, showError } = useToast();
  const { state: authState } = useAuth();

  // React Query
  const { data: portfolioData, isLoading: portfolioLoading } = usePortfolio();
  const { data: gmailData, isLoading: gmailLoading } = useGmailAccounts();
  const { data: pendingData, isLoading: pendingLoading } = usePendingInvestmentTransactions();
  const createInvestmentMutation = useCreateInvestmentMutation();
  const parseEmailsMutation = useParseInvestmentEmailsMutation();
  const approveTxMutation = useApproveInvestmentTransactionMutation();
  const rejectTxMutation = useRejectInvestmentTransactionMutation();

  useEffect(() => {
    if (portfolioData) {
      setPortfolioSummary(portfolioData.summary);
      setInvestments(portfolioData.investments);
    }
  }, [portfolioData]);

  useEffect(() => {
    setGmailAccounts(gmailData?.gmail_accounts || []);
  }, [gmailData]);

  useEffect(() => {
    setPendingTransactions(pendingData?.pending_transactions || []);
  }, [pendingData]);

  useEffect(() => {
    setLoading(portfolioLoading || gmailLoading || pendingLoading);
  }, [portfolioLoading, gmailLoading, pendingLoading]);

  const createInvestment = async () => {
    try {
      await createInvestmentMutation.mutateAsync({
        symbol: newInvestment.symbol.toUpperCase(),
        name: newInvestment.name,
        type: newInvestment.type,
        current_price: parseFloat(newInvestment.current_price) || 0,
        sector: newInvestment.sector,
        broker: newInvestment.broker,
      });
      showSuccess(`Investment ${newInvestment.symbol} created successfully`);
      closeAddModal();
      setNewInvestment({
        symbol: '',
        name: '',
        type: 'stock',
        current_price: '',
        sector: '',
        broker: '',
      });
    } catch (error) {
      showError('Error creating investment');
    }
  };

  const parseInvestmentEmails = async (gmailAccountId: string) => {
    setProcessingEmail(true);
    try {
      const data = await parseEmailsMutation.mutateAsync({
        gmail_account_id: gmailAccountId,
        days_back: 30,
      });
      if (data.success) {
        showSuccess('Transactions parsed', `Found ${data.extracted} from ${data.processed} emails`);
      } else {
        showError('Failed to parse emails', data.error);
      }
    } catch (error) {
      showError('Error parsing investment emails');
    } finally {
      setProcessingEmail(false);
    }
  };

  const approveTransaction = async (transactionId: string, overrides: any = {}) => {
    try {
      await approveTxMutation.mutateAsync({ transaction_id: transactionId, overrides });
      showSuccess('Transaction approved and processed');
    } catch (error) {
      showError('Error approving transaction');
    }
  };

  const rejectTransaction = async (transactionId: string) => {
    try {
      await rejectTxMutation.mutateAsync({ transaction_id: transactionId });
      showSuccess('Transaction rejected');
    } catch (error) {
      showError('Error rejecting transaction');
    }
  };

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  const tabs = [
    { id: 'portfolio', label: 'Portfolio', icon: PieChart },
    { id: 'pending', label: 'Pending Review', icon: AlertCircle },
    { id: 'email', label: 'Email Parsing', icon: Mail },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <HStack className="justify-between">
          <div>
            <h1 className="text-3xl font-bold text-secondary-900 dark:text-secondary-100">
              Investment Tracker
            </h1>
            <p className="text-secondary-600 dark:text-secondary-400">
              Track your investment portfolio with automated email parsing
            </p>
          </div>
          <Button onClick={openAddModal}>
            <Plus className="h-4 w-4 mr-2" />
            Add Investment
          </Button>
        </HStack>
      </div>

      {/* Portfolio Summary */}
      {portfolioSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <div className="p-6">
              <HStack>
                <Coins className="h-8 w-8 text-blue-500" />
                <div className="ml-3">
                  <p className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
                    {formatCurrency(portfolioSummary.total_value, authState.user)}
                  </p>
                  <p className="text-sm text-secondary-600 dark:text-secondary-400">Total Value</p>
                </div>
              </HStack>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <HStack>
                {portfolioSummary.total_gain_loss >= 0 ? (
                  <TrendingUp className="h-8 w-8 text-green-500" />
                ) : (
                  <TrendingDown className="h-8 w-8 text-red-500" />
                )}
                <div className="ml-3">
                  <p
                    className={`text-2xl font-bold ${
                      portfolioSummary.total_gain_loss >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {formatCurrency(portfolioSummary.total_gain_loss, authState.user)}
                  </p>
                  <p className="text-sm text-secondary-600 dark:text-secondary-400">Gain/Loss</p>
                </div>
              </HStack>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <HStack>
                <PieChart className="h-8 w-8 text-purple-500" />
                <div className="ml-3">
                  <p
                    className={`text-2xl font-bold ${
                      portfolioSummary.total_return_percent >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {formatPercent(portfolioSummary.total_return_percent)}
                  </p>
                  <p className="text-sm text-secondary-600 dark:text-secondary-400">Total Return</p>
                </div>
              </HStack>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <HStack>
                <Coins className="h-8 w-8 text-orange-500" />
                <div className="ml-3">
                  <p className="text-2xl font-bold text-orange-600">
                    {formatCurrency(portfolioSummary.total_dividends, authState.user)}
                  </p>
                  <p className="text-sm text-secondary-600 dark:text-secondary-400">Dividends</p>
                </div>
              </HStack>
            </div>
          </Card>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-8 bg-secondary-100 dark:bg-secondary-800 rounded-lg p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-secondary-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-secondary-200'
              }`}
            >
              <HStack gap={2}>
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {tab.id === 'pending' && pendingTransactions.length > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                    {pendingTransactions.length}
                  </span>
                )}
              </HStack>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'portfolio' && (
        <div className="space-y-6">
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100 mb-4">
                Your Investments
              </h3>

              {investments.length === 0 ? (
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100 mb-2">
                    No Investments Yet
                  </h3>
                  <p className="text-secondary-600 dark:text-secondary-400 mb-4">
                    Add your first investment to start tracking your portfolio.
                  </p>
                  <Button onClick={openAddModal}>Add Investment</Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-secondary-200 dark:border-secondary-700">
                        <th className="text-left py-3 text-secondary-900 dark:text-secondary-100">
                          Symbol
                        </th>
                        <th className="text-left py-3 text-secondary-900 dark:text-secondary-100">
                          Name
                        </th>
                        <th className="text-right py-3 text-secondary-900 dark:text-secondary-100">
                          Quantity
                        </th>
                        <th className="text-right py-3 text-secondary-900 dark:text-secondary-100">
                          Price
                        </th>
                        <th className="text-right py-3 text-secondary-900 dark:text-secondary-100">
                          Value
                        </th>
                        <th className="text-right py-3 text-secondary-900 dark:text-secondary-100">
                          Gain/Loss
                        </th>
                        <th className="text-right py-3 text-secondary-900 dark:text-secondary-100">
                          Return %
                        </th>
                        <th className="text-center py-3 text-secondary-900 dark:text-secondary-100">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {investments.map((investment) => (
                        <tr
                          key={investment.id}
                          className="border-b border-secondary-100 dark:border-secondary-800"
                        >
                          <td className="py-3 font-medium text-secondary-900 dark:text-secondary-100">
                            {investment.symbol}
                          </td>
                          <td className="py-3 text-secondary-700 dark:text-secondary-300">
                            {investment.name}
                          </td>
                          <td className="py-3 text-right text-secondary-700 dark:text-secondary-300">
                            {investment.quantity.toFixed(2)}
                          </td>
                          <td className="py-3 text-right text-secondary-700 dark:text-secondary-300">
                            {formatCurrency(investment.current_price, authState.user)}
                          </td>
                          <td className="py-3 text-right text-secondary-900 dark:text-secondary-100 font-medium">
                            {formatCurrency(investment.current_value, authState.user)}
                          </td>
                          <td
                            className={`py-3 text-right font-medium ${
                              investment.unrealized_gain >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {formatCurrency(investment.unrealized_gain, authState.user)}
                          </td>
                          <td
                            className={`py-3 text-right font-medium ${
                              investment.unrealized_gain_percent >= 0
                                ? 'text-green-600'
                                : 'text-red-600'
                            }`}
                          >
                            {formatPercent(investment.unrealized_gain_percent)}
                          </td>
                          <td className="py-3 text-center">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'pending' && (
        <div className="space-y-6">
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100 mb-4">
                Pending Investment Transactions
              </h3>

              {pendingTransactions.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100 mb-2">
                    No Pending Transactions
                  </h3>
                  <p className="text-secondary-600 dark:text-secondary-400">
                    All investment transactions have been reviewed.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingTransactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="border border-secondary-200 dark:border-secondary-700 rounded-lg p-4"
                    >
                      <HStack className="items-start justify-between">
                        <div className="flex-1">
                          <HStack gap={2} className="mb-2">
                            <span className="font-medium text-secondary-900 dark:text-secondary-100">
                              {transaction.investment_data.symbol || 'Unknown Symbol'}
                            </span>
                            <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded">
                              {transaction.investment_data.transaction_type}
                            </span>
                            <span
                              className={`px-2 py-1 text-xs rounded ${
                                transaction.confidence_score >= 80
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                                  : transaction.confidence_score >= 60
                                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
                                    : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                              }`}
                            >
                              {transaction.confidence_score.toFixed(0)}% confidence
                            </span>
                          </HStack>

                          <p className="text-sm text-secondary-600 dark:text-secondary-400 mb-2">
                            From: {transaction.email_sender} |{' '}
                            {new Date(transaction.email_date).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-secondary-700 dark:text-secondary-300 mb-2">
                            Subject: {transaction.email_subject}
                          </p>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-secondary-600 dark:text-secondary-400">
                                Amount:
                              </span>
                              <span className="ml-2 font-medium">
                                {formatCurrency(transaction.investment_data.amount, authState.user)}
                              </span>
                            </div>
                            <div>
                              <span className="text-secondary-600 dark:text-secondary-400">
                                Quantity:
                              </span>
                              <span className="ml-2 font-medium">
                                {transaction.investment_data.quantity}
                              </span>
                            </div>
                            <div>
                              <span className="text-secondary-600 dark:text-secondary-400">
                                Price:
                              </span>
                              <span className="ml-2 font-medium">
                                {formatCurrency(
                                  transaction.investment_data.price_per_share,
                                  authState.user
                                )}
                              </span>
                            </div>
                            <div>
                              <span className="text-secondary-600 dark:text-secondary-400">
                                Broker:
                              </span>
                              <span className="ml-2 font-medium">
                                {transaction.investment_data.broker || 'Unknown'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <HStack gap={2} className="ml-4">
                          <Button
                            onClick={() => approveTransaction(transaction.id)}
                            size="sm"
                            variant="success"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            onClick={() => rejectTransaction(transaction.id)}
                            size="sm"
                            variant="danger"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </HStack>
                      </HStack>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'email' && (
        <div className="space-y-6">
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100 mb-4">
                Gmail Email Parsing
              </h3>

              {gmailAccounts.length === 0 ? (
                <div className="text-center py-8">
                  <Mail className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100 mb-2">
                    No Gmail Accounts Connected
                  </h3>
                  <p className="text-secondary-600 dark:text-secondary-400 mb-4">
                    Connect a Gmail account to automatically parse investment emails.
                  </p>
                  <Button onClick={() => (window.location.href = '/settings')}>
                    Connect Gmail Account
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {gmailAccounts.map((account) => (
                    <HStack className="justify-between p-4 border border-secondary-200 dark:border-secondary-700 rounded-lg">
                      <div>
                        <p className="font-medium text-secondary-900 dark:text-secondary-100">
                          {account.email_address}
                        </p>
                        <p className="text-sm text-secondary-600 dark:text-secondary-400">
                          Status: {account.status}
                        </p>
                      </div>
                      <Button
                        onClick={() => parseInvestmentEmails(account.id)}
                        disabled={processingEmail || account.status !== 'active'}
                      >
                        {processingEmail ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Mail className="h-4 w-4 mr-2" />
                        )}
                        Parse Investment Emails
                      </Button>
                    </HStack>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Add Investment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-secondary-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100 mb-4">
              Add New Investment
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Symbol *
                </label>
                <Input
                  type="text"
                  value={newInvestment.symbol}
                  onChange={(e) =>
                    setNewInvestment((prev) => ({ ...prev, symbol: e.target.value.toUpperCase() }))
                  }
                  placeholder="AAPL, TSLA, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Name *
                </label>
                <Input
                  type="text"
                  value={newInvestment.name}
                  onChange={(e) => setNewInvestment((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Apple Inc., Tesla Inc., etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Type
                </label>
                <select
                  value={newInvestment.type}
                  onChange={(e) => setNewInvestment((prev) => ({ ...prev, type: e.target.value }))}
                  className="w-full rounded-md border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-secondary-900 dark:text-secondary-100"
                >
                  <option value="stock">Stock</option>
                  <option value="etf">ETF</option>
                  <option value="mutual_fund">Mutual Fund</option>
                  <option value="bond">Bond</option>
                  <option value="crypto">Cryptocurrency</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Current Price
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={newInvestment.current_price}
                  onChange={(e) =>
                    setNewInvestment((prev) => ({ ...prev, current_price: e.target.value }))
                  }
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Sector
                </label>
                <Input
                  type="text"
                  value={newInvestment.sector}
                  onChange={(e) =>
                    setNewInvestment((prev) => ({ ...prev, sector: e.target.value }))
                  }
                  placeholder="Technology, Healthcare, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Broker
                </label>
                <Input
                  type="text"
                  value={newInvestment.broker}
                  onChange={(e) =>
                    setNewInvestment((prev) => ({ ...prev, broker: e.target.value }))
                  }
                  placeholder="Fidelity, Schwab, etc."
                />
              </div>
            </div>

            <HStack gap={3} className="justify-end mt-6">
              <Button variant="ghost" onClick={closeAddModal}>
                Cancel
              </Button>
              <Button
                onClick={createInvestment}
                disabled={!newInvestment.symbol || !newInvestment.name}
              >
                Add Investment
              </Button>
            </HStack>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvestmentTracker;

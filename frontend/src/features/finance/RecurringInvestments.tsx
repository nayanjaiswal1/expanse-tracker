import { useState, useEffect, useCallback } from 'react';
import { Plus, Play, Square, Clock, TrendingUp, BarChart3, Eye } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { LoadingSpinner } from '../../components/layout/LoadingSpinner';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Badge } from '../../components/ui/Badge';
import { ObjectForm } from '../../components/forms';
import {
  createRecurringTransactionFormConfig,
  createInvestmentAdvancedFormConfig as createInvestmentFormConfig,
  createInvestmentPortfolioFormConfig,
  createBuySellInvestmentFormConfig,
} from '../../shared/forms';
import {
  RecurringTransactionFormData,
  InvestmentAdvancedFormData as InvestmentFormData,
  InvestmentPortfolioFormData,
  BuySellInvestmentFormData,
} from '../../shared/schemas';
import {
  useRecurringTransactionsQuery,
  useInvestments,
  useInvestmentPortfolios,
  useCreateRecurringTransactionMutation,
  useCreateInvestmentMutation,
  useBuySellInvestmentMutation,
  useToggleRecurringMutation,
  useExecuteRecurringMutation,
  useAccounts,
  useCategories,
  type RecurringTransaction,
  type Investment,
  type InvestmentPortfolio,
} from './hooks/queries';
import { formatCurrency } from '../../utils/preferences';
import type { Account } from '../../types';

// TODO: Locate or properly implement formatPercentage utility function
const formatPercentage = (value: number) => {
  return `${(value * 100).toFixed(2)}%`;
};

// TODO: Locate or properly implement getInvestmentTypeColor utility function
const getInvestmentTypeColor = (type: string) => {
  switch (type) {
    case 'stock':
      return 'blue';
    case 'crypto':
      return 'yellow';
    case 'bond':
      return 'green';
    default:
      return 'gray';
  }
};

const RecurringInvestments = () => {
  const [activeTab, setActiveTab] = useState<'recurring' | 'investments' | 'portfolios'>(
    'recurring'
  );
  const { data: recurringData, isLoading: recurringLoading } = useRecurringTransactionsQuery();
  const { data: investmentsData, isLoading: investmentsLoading } = useInvestments();
  const { data: portfoliosData, isLoading: portfoliosLoading } = useInvestmentPortfolios();
  const { data: accountsData } = useAccounts();
  const { data: categoriesData } = useCategories();

  const recurringTransactions = recurringData || [];
  const portfolios = portfoliosData || [];

  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [showCreateRecurringModal, setShowCreateRecurringModal] = useState(false);
  const [showCreateInvestmentModal, setShowCreateInvestmentModal] = useState(false);
  const [showCreatePortfolioModal, setShowCreatePortfolioModal] = useState(false);
  const [showBuySellModal, setShowBuySellModal] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);
  const [buySellType, setBuySellType] = useState<'buy' | 'sell'>('buy');

  const { showSuccess, showError } = useToast();

  const { mutate: createRecurringTransaction, isPending: createRecurringMutationIsPending } =
    useCreateRecurringTransactionMutation();
  const { mutate: createInvestment, isPending: createInvestmentMutationIsPending } =
    useCreateInvestmentMutation();
  const { mutate: buySellInvestment, isPending: buySellMutationIsPending } =
    useBuySellInvestmentMutation();
  const { mutate: createPortfolio } = useCreateInvestmentMutation(); // Assuming a similar mutation for portfolios
  const { mutate: toggleRecurringTransaction } = useToggleRecurringMutation();
  const { mutate: executeRecurringTransaction } = useExecuteRecurringMutation();

  const handleCreateRecurringTransaction = useCallback(
    async (data: RecurringTransactionFormData) => {
      try {
        await createRecurringTransaction(data);
        showSuccess('Recurring transaction created successfully!');
        setShowCreateRecurringModal(false);
      } catch (error) {
        showError('Failed to create recurring transaction.');
      }
    },
    [createRecurringTransaction, showSuccess, showError]
  );

  const handleCreateInvestment = useCallback(
    async (data: InvestmentFormData) => {
      try {
        await createInvestment({
          symbol: data.symbol,
          name: data.name,
          type: data.investment_type, // Map investment_type to type
          current_price: Number(data.current_price), // Convert to number
          sector: data.sector,
          country: data.country,
          exchange: data.exchange,
          currency: data.currency,
          dividend_yield: data.dividend_yield ? Number(data.dividend_yield) : undefined,
          pe_ratio: data.pe_ratio ? Number(data.pe_ratio) : undefined,
          market_cap: data.market_cap ? Number(data.market_cap) : undefined,
          risk_rating: data.risk_rating,
          auto_track: data.auto_track,
          notes: data.notes,
        });
        showSuccess('Investment created successfully!');
        setShowCreateInvestmentModal(false);
      } catch (error) {
        showError('Failed to create investment.');
      }
    },
    [createInvestment, showSuccess, showError]
  );

  const handleBuySell = useCallback(
    async (data: BuySellInvestmentFormData) => {
      if (selectedInvestment) {
        try {
          await buySellInvestment({
            transaction_type: buySellType,
            investment_id: selectedInvestment.id,
            quantity: Number(data.quantity),
            price_per_unit: Number(data.price_per_unit),
            fees: data.fees ? Number(data.fees) : undefined,
            notes: data.notes,
          });
          showSuccess(`${buySellType === 'buy' ? 'Buy' : 'Sell'} successful!`);
          setShowBuySellModal(false);
        } catch (error) {
          showError(`Failed to ${buySellType === 'buy' ? 'buy' : 'sell'} investment.`);
        }
      }
    },
    [buySellInvestment, selectedInvestment, buySellType, showSuccess, showError]
  );

  const handleCreatePortfolio = useCallback(
    async (data: InvestmentPortfolioFormData) => {
      try {
        await createPortfolio(data); // This will need to be a specific portfolio creation mutation
        showSuccess('Portfolio created successfully!');
        setShowCreatePortfolioModal(false);
      } catch (error) {
        showError('Failed to create portfolio.');
      }
    },
    [createPortfolio, showSuccess, showError]
  );

  // Convert API data to form options
  const accounts = (accountsData || []).map((account: Account) => ({
    value: account.id,
    label: account.name,
  }));

  const categories = (categoriesData || []).map((category) => ({
    value: Number(category.id),
    label: category.name,
  }));

  const investments = investmentsData || [];
  const investmentOptions = investments.map((inv) => ({
    value: inv.id,
    label: `${inv.name} (${inv.symbol})`,
  }));

  useEffect(() => {
    setIsLoading(recurringLoading || investmentsLoading || portfoliosLoading);
  }, [recurringLoading, investmentsLoading, portfoliosLoading]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="max-w-7xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100 mb-2">
          Recurring Transactions & Investments
        </h2>
        <p className="text-secondary-600 dark:text-secondary-400">
          Automate your financial transactions and manage your investment portfolio.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-secondary-200 dark:border-secondary-700 mb-8">
        <nav className="-mb-px flex space-x-8">
          {[
            {
              id: 'recurring',
              name: 'Recurring Transactions',
              icon: Clock,
              count: recurringTransactions.length,
            },
            { id: 'investments', name: 'Investments', icon: TrendingUp, count: investments.length },
            { id: 'portfolios', name: 'Portfolios', icon: BarChart3, count: portfolios.length },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-secondary-500 hover:text-secondary-700 dark:text-secondary-400 dark:hover:text-secondary-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.name}</span>
                <Badge variant="outline" className="text-xs">
                  {tab.count}
                </Badge>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Recurring Transactions Tab */}
      {activeTab === 'recurring' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
              Recurring Transactions
            </h3>
            <Button
              onClick={() => setShowCreateRecurringModal(true)}
              className="flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Recurring Transaction</span>
            </Button>
          </div>

          {recurringTransactions.length === 0 ? (
            <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-sm border border-secondary-200 dark:border-secondary-700 p-8 text-center">
              <Clock className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-secondary-900 dark:text-secondary-100 mb-2">
                No Recurring Transactions
              </h4>
              <p className="text-secondary-600 dark:text-secondary-400 mb-4">
                Set up automated transactions to save time and never miss a payment.
              </p>
              <Button onClick={() => setShowCreateRecurringModal(true)}>
                Create Your First Recurring Transaction
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {recurringTransactions.map((transaction: RecurringTransaction) => (
                <div
                  key={transaction.id}
                  className="bg-white dark:bg-secondary-800 rounded-lg shadow-sm border border-secondary-200 dark:border-secondary-700 p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
                        {transaction.name}
                      </h4>
                      <p className="text-sm text-secondary-600 dark:text-secondary-400">
                        {transaction.description}
                      </p>
                    </div>
                    <StatusBadge status={transaction.is_active ? 'active' : 'inactive'} />
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-secondary-600 dark:text-secondary-400">Amount</span>
                      <span
                        className={`font-medium ${transaction.transaction_type === 'income' ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {transaction.transaction_type === 'income' ? '+' : '-'}
                        {formatCurrency(transaction.amount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary-600 dark:text-secondary-400">Frequency</span>
                      <span className="text-secondary-900 dark:text-secondary-100">
                        Every {transaction.frequency_interval} {transaction.frequency}
                        {transaction.frequency_interval > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary-600 dark:text-secondary-400">
                        Next Execution
                      </span>
                      <span className="text-secondary-900 dark:text-secondary-100">
                        {new Date(transaction.next_execution_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary-600 dark:text-secondary-400">Executions</span>
                      <span className="text-secondary-900 dark:text-secondary-100">
                        {transaction.total_executions}
                        {transaction.max_executions ? `/${transaction.max_executions}` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex space-x-2 mt-6">
                    <Button
                      onClick={() => toggleRecurringTransaction(transaction.id)}
                      size="sm"
                      variant={transaction.is_active ? 'outline' : 'primary'}
                      className="flex items-center space-x-1"
                    >
                      {transaction.is_active ? (
                        <Square className="h-3 w-3" />
                      ) : (
                        <Play className="h-3 w-3" />
                      )}
                      <span>{transaction.is_active ? 'Pause' : 'Activate'}</span>
                    </Button>
                    <Button
                      onClick={() => executeRecurringTransaction(transaction.id)}
                      size="sm"
                      variant="outline"
                      disabled={!transaction.is_active}
                      className="flex items-center space-x-1"
                    >
                      <Play className="h-3 w-3" />
                      <span>Execute Now</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Investments Tab */}
      {activeTab === 'investments' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
              Investment Holdings
            </h3>
            <Button
              onClick={() => setShowCreateInvestmentModal(true)}
              className="flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Investment</span>
            </Button>
          </div>

          {investments.length === 0 ? (
            <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-sm border border-secondary-200 dark:border-secondary-700 p-8 text-center">
              <TrendingUp className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-secondary-900 dark:text-secondary-100 mb-2">
                No Investments
              </h4>
              <p className="text-secondary-600 dark:text-secondary-400 mb-4">
                Start tracking your investment portfolio.
              </p>
              <Button onClick={() => setShowCreateInvestmentModal(true)}>
                Add Your First Investment
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {investments.map((investment: Investment) => (
                <div
                  key={investment.id}
                  className="bg-white dark:bg-secondary-800 rounded-lg shadow-sm border border-secondary-200 dark:border-secondary-700 p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
                        {investment.name}
                      </h4>
                      <p className="text-sm text-secondary-600 dark:text-secondary-400">
                        {investment.symbol}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`bg-${getInvestmentTypeColor(investment.type)}-50 text-${getInvestmentTypeColor(investment.type)}-700`}
                    >
                      {investment.type.replace('_', ' ')}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-secondary-600 dark:text-secondary-400">
                        Current Price
                      </span>
                      <span className="font-medium text-secondary-900 dark:text-secondary-100">
                        {formatCurrency(investment.current_price)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary-600 dark:text-secondary-400">Quantity</span>
                      <span className="text-secondary-900 dark:text-secondary-100">
                        {investment.quantity}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary-600 dark:text-secondary-400">
                        Current Value
                      </span>
                      <span className="font-medium text-secondary-900 dark:text-secondary-100">
                        {formatCurrency(investment.current_value)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary-600 dark:text-secondary-400">Gain/Loss</span>
                      <span
                        className={`font-medium ${investment.unrealized_gain >= 0 ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {formatCurrency(investment.unrealized_gain)} (
                        {formatPercentage(investment.unrealized_gain_percent)})
                      </span>
                    </div>
                  </div>

                  <div className="flex space-x-2 mt-6">
                    <Button
                      onClick={() => {
                        setSelectedInvestment(investment);
                        setBuySellType('buy');
                        setShowBuySellModal(true);
                      }}
                      size="sm"
                      variant="primary"
                      className="flex-1"
                    >
                      Buy
                    </Button>
                    <Button
                      onClick={() => {
                        setSelectedInvestment(investment);
                        setBuySellType('sell');
                        setShowBuySellModal(true);
                      }}
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      disabled={investment.quantity === 0}
                    >
                      Sell
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Portfolios Tab */}
      {activeTab === 'portfolios' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
              Investment Portfolios
            </h3>
            <Button
              onClick={() => setShowCreatePortfolioModal(true)}
              className="flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Create Portfolio</span>
            </Button>
          </div>

          {portfolios.length === 0 ? (
            <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-sm border border-secondary-200 dark:border-secondary-700 p-8 text-center">
              <BarChart3 className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-secondary-900 dark:text-secondary-100 mb-2">
                No Portfolios
              </h4>
              <p className="text-secondary-600 dark:text-secondary-400 mb-4">
                Create portfolios to organize and track your investments.
              </p>
              <Button onClick={() => setShowCreatePortfolioModal(true)}>
                Create Your First Portfolio
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {portfolios.map((portfolio: InvestmentPortfolio) => (
                <div
                  key={portfolio.id}
                  className="bg-white dark:bg-secondary-800 rounded-lg shadow-sm border border-secondary-200 dark:border-secondary-700 p-6"
                >
                  <div className="mb-4">
                    <h4 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
                      {portfolio.name}
                    </h4>
                    <p className="text-sm text-secondary-600 dark:text-secondary-400">
                      {portfolio.description}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-secondary-600 dark:text-secondary-400">
                        Total Value
                      </span>
                      <span className="font-bold text-secondary-900 dark:text-secondary-100">
                        {formatCurrency(portfolio.total_value)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary-600 dark:text-secondary-400">
                        Total Invested
                      </span>
                      <span className="text-secondary-900 dark:text-secondary-100">
                        {formatCurrency(portfolio.total_invested)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary-600 dark:text-secondary-400">Gain/Loss</span>
                      <span
                        className={`font-medium ${portfolio.total_gain_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {formatCurrency(portfolio.total_gain_loss)} (
                        {formatPercentage(portfolio.total_gain_loss_percentage)})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary-600 dark:text-secondary-400">
                        Investments
                      </span>
                      <span className="text-secondary-900 dark:text-secondary-100">
                        {portfolio.investments.length}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full flex items-center justify-center space-x-2"
                    >
                      <Eye className="h-4 w-4" />
                      <span>View Details</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Recurring Transaction Modal */}
      <Modal
        isOpen={showCreateRecurringModal}
        onClose={() => setShowCreateRecurringModal(false)}
        title="Create Recurring Transaction"
        size="large"
      >
        <ObjectForm
          config={createRecurringTransactionFormConfig(
            handleCreateRecurringTransaction,
            accounts,
            categories,
            createRecurringMutationIsPending
          )}
        />
      </Modal>

      {/* Create Investment Modal */}
      <Modal
        isOpen={showCreateInvestmentModal}
        onClose={() => setShowCreateInvestmentModal(false)}
        title="Add Investment"
        size="large"
      >
        <ObjectForm
          config={createInvestmentFormConfig(
            handleCreateInvestment,
            createInvestmentMutationIsPending
          )}
        />
      </Modal>

      {/* Buy/Sell Modal */}
      <Modal
        isOpen={showBuySellModal}
        onClose={() => setShowBuySellModal(false)}
        title={`${buySellType === 'buy' ? 'Buy' : 'Sell'} ${selectedInvestment?.name}`}
      >
        {selectedInvestment && (
          <ObjectForm
            config={createBuySellInvestmentFormConfig(
              handleBuySell,
              selectedInvestment.name,
              buySellType,
              buySellMutationIsPending
            )}
          />
        )}
      </Modal>

      {/* Create Portfolio Modal */}
      <Modal
        isOpen={showCreatePortfolioModal}
        onClose={() => setShowCreatePortfolioModal(false)}
        title="Create Portfolio"
      >
        <ObjectForm
          config={createInvestmentPortfolioFormConfig(
            handleCreatePortfolio,
            investmentOptions,
            false
          )}
        />
      </Modal>
    </div>
  );
};

export default RecurringInvestments;

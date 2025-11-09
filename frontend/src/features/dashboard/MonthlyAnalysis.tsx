import React, { useState, useEffect } from 'react';

import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Coins,
  Target,
  Brain,
  FileText,
  RefreshCw,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { FlexBetween, HStack } from '../../components/ui/Layout';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../utils/preferences';
import {
  useAvailablePeriods,
  useReportHistory,
  useCurrentMonthSummary,
  useGenerateReport,
} from '../../hooks/dashboard';
import { monthlyAnalysisApi, type CurrentMonthSummaryResponse } from './api/monthlyAnalysis';
import type { Period, MonthlyReport } from './schemas';

interface ReportHistoryItem {
  id: string;
  title: string;
  created_at: string;
  period: {
    year: number;
    month: number;
    month_name: string;
  };
  file_size: number;
  has_file: boolean;
}

const MonthlyAnalysis: React.FC = () => {
  const [availablePeriods, setAvailablePeriods] = useState<Period[]>([]);
  const [reportHistory, setReportHistory] = useState<ReportHistoryItem[]>([]);
  const [currentReport, setCurrentReport] = useState<MonthlyReport | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<Period | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('generate');

  const { showSuccess, showError } = useToast();
  const { state } = useAuth();
  const { data: availablePeriodsData, isLoading: loadingPeriods } = useAvailablePeriods();
  const {
    data: reportHistoryData,
    isLoading: loadingHistory,
    refetch: refetchHistory,
  } = useReportHistory();
  const { data: currentSummaryData, isLoading: loadingSummary } = useCurrentMonthSummary();
  const generateReportMutation = useGenerateReport();

  useEffect(() => {
    setLoading(loadingPeriods || loadingHistory || loadingSummary);
  }, [loadingPeriods, loadingHistory, loadingSummary]);

  useEffect(() => {
    const periods = availablePeriodsData?.periods || [];
    setAvailablePeriods(periods);
    if (periods.length > 0) {
      setSelectedPeriod(periods[0]);
    }
  }, [availablePeriodsData]);

  useEffect(() => {
    const reports = reportHistoryData?.reports || [];
    setReportHistory(reports);
  }, [reportHistoryData]);

  useEffect(() => {
    const data: CurrentMonthSummaryResponse = currentSummaryData;
    if (data?.success) {
      setCurrentReport({
        success: true,
        period: data.period,
        financial_summary: {
          summary: data.summary,
          category_breakdown: data.category_breakdown || [],
          previous_month_comparison: data.previous_month_comparison,
        },
        ai_analysis: {
          overall_assessment: {
            financial_health_score: 0,
            summary: 'Generate AI analysis for detailed insights',
            key_strengths: [],
            areas_for_improvement: [],
          },
          spending_insights: {
            primary_observation: 'AI analysis required',
            category_analysis: 'Generate report for detailed analysis',
            pattern_insights: 'Generate report for pattern insights',
          },
          recommendations: [],
          notable_observations: [],
        },
        tokens_used: 0,
      });
    }
  }, [currentSummaryData]);

  const generateReport = async () => {
    if (!selectedPeriod) {
      showError('Please select a period to analyze');
      return;
    }

    setGenerating(true);
    try {
      const data: MonthlyReport = await generateReportMutation.mutateAsync({
        year: selectedPeriod.year,
        month: selectedPeriod.month,
      });
      if (data?.success) {
        setCurrentReport(data);
        showSuccess(
          'Analysis generated',
          `${selectedPeriod.month_name} ${selectedPeriod.year} • AI tokens used: ${data.tokens_used}`
        );
        await refetchHistory();
        setActiveTab('results');
      } else {
        showError('Failed to generate report', data?.error);
      }
    } catch (error: unknown) {
      showError('Error generating report', error instanceof Error ? error.message : undefined);
    } finally {
      setGenerating(false);
    }
  };

  const viewStoredReport = async (reportId: string) => {
    try {
      const data = await monthlyAnalysisApi.getStoredReport(reportId);
      if (data.success) {
        setCurrentReport(data.report as any);
        setActiveTab('results');
        showSuccess('Report loaded successfully');
      } else {
        showError('Failed to load report');
      }
    } catch (error: unknown) {
      showError('Error loading report', error instanceof Error ? error.message : undefined);
    }
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const tabs = [
    { id: 'generate', label: 'Generate Analysis', icon: Brain },
    { id: 'results', label: 'Current Report', icon: FileText },
    { id: 'history', label: 'Report History', icon: Calendar },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-secondary-900 dark:text-secondary-100 mb-2">
          Monthly Analysis
        </h1>
        <p className="text-secondary-600 dark:text-secondary-400">
          AI-powered comprehensive financial analysis and insights
        </p>
      </div>

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
              </HStack>
            </button>
          );
        })}
      </div>

      {/* Generate Analysis Tab */}
      {activeTab === 'generate' && (
        <div className="space-y-6">
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100 mb-4">
                Generate New Analysis
              </h3>

              {availablePeriods.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100 mb-2">
                    No Data Available
                  </h3>
                  <p className="text-secondary-600 dark:text-secondary-400">
                    You need transaction data to generate monthly analysis reports.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                      Select Period to Analyze
                    </label>
                    <select
                      value={selectedPeriod ? `${selectedPeriod.year}-${selectedPeriod.month}` : ''}
                      onChange={(e) => {
                        const [year, month] = e.target.value.split('-').map(Number);
                        const period = availablePeriods.find(
                          (p) => p.year === year && p.month === month
                        );
                        setSelectedPeriod(period || null);
                      }}
                      className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-md bg-white dark:bg-secondary-700 text-secondary-900 dark:text-secondary-100"
                    >
                      {availablePeriods.map((period) => (
                        <option
                          key={`${period.year}-${period.month}`}
                          value={`${period.year}-${period.month}`}
                        >
                          {period.period_label} ({period.transaction_count} transactions)
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedPeriod && (
                    <div className="bg-secondary-50 dark:bg-secondary-800 p-4 rounded-lg mb-6">
                      <h4 className="font-medium text-secondary-900 dark:text-secondary-100 mb-2">
                        Analysis Preview - {selectedPeriod.period_label}
                      </h4>
                      <p className="text-secondary-600 dark:text-secondary-400">
                        • {selectedPeriod.transaction_count} transactions to analyze
                        <br />
                        • AI will provide spending insights and recommendations
                        <br />• Financial health score and pattern analysis included
                      </p>
                    </div>
                  )}

                  <Button
                    onClick={generateReport}
                    disabled={generating || !selectedPeriod}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    {generating ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Generating AI Analysis...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate AI Analysis
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Current Report Tab */}
      {activeTab === 'results' && currentReport && (
        <div className="space-y-6">
          {/* Report Header */}
          <Card>
            <div className="p-6">
              <FlexBetween className="mb-4">
                <div>
                  <h3 className="text-xl font-bold text-secondary-900 dark:text-secondary-100">
                    {currentReport.period.month_name} {currentReport.period.year} Analysis
                  </h3>
                  <p className="text-secondary-600 dark:text-secondary-400">
                    Generated {new Date(currentReport.period.generated_at).toLocaleDateString()}
                  </p>
                </div>
                {currentReport.ai_analysis.overall_assessment.financial_health_score > 0 && (
                  <div className="text-center">
                    <div
                      className={`text-3xl font-bold ${getHealthScoreColor(currentReport.ai_analysis.overall_assessment.financial_health_score)}`}
                    >
                      {currentReport.ai_analysis.overall_assessment.financial_health_score}/100
                    </div>
                    <div className="text-sm text-secondary-600 dark:text-secondary-400">
                      Health Score
                    </div>
                  </div>
                )}
              </FlexBetween>

              {currentReport.ai_analysis.overall_assessment.summary && (
                <div className="bg-secondary-50 dark:bg-secondary-800 p-4 rounded-lg">
                  <p className="text-secondary-900 dark:text-secondary-100">
                    {currentReport.ai_analysis.overall_assessment.summary}
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Financial Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <div className="p-6">
                <HStack>
                  <TrendingUp className="h-8 w-8 text-green-500" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-secondary-600 dark:text-secondary-400">
                      Total Income
                    </p>
                    <p className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
                      {formatCurrency(
                        currentReport.financial_summary.summary.total_income,
                        authState.user
                      )}
                    </p>
                  </div>
                </HStack>
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <HStack>
                  <TrendingDown className="h-8 w-8 text-red-500" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-secondary-600 dark:text-secondary-400">
                      Total Expenses
                    </p>
                    <p className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
                      {formatCurrency(
                        currentReport.financial_summary.summary.total_expenses,
                        authState.user
                      )}
                    </p>
                  </div>
                </HStack>
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <HStack>
                  <Coins className="h-8 w-8 text-blue-500" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-secondary-600 dark:text-secondary-400">
                      Net Income
                    </p>
                    <p
                      className={`text-2xl font-bold ${currentReport.financial_summary.summary.net_income >= 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {formatCurrency(
                        currentReport.financial_summary.summary.net_income,
                        authState.user
                      )}
                    </p>
                  </div>
                </HStack>
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <HStack>
                  <Target className="h-8 w-8 text-purple-500" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-secondary-600 dark:text-secondary-400">
                      Savings Rate
                    </p>
                    <p className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
                      {currentReport.financial_summary.summary.savings_rate.toFixed(1)}%
                    </p>
                  </div>
                </HStack>
              </div>
            </Card>
          </div>

          {/* AI Analysis Sections */}
          {currentReport.ai_analysis.overall_assessment.financial_health_score > 0 && (
            <>
              {/* Strengths and Areas for Improvement */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <div className="p-6">
                    <HStack className="text-lg font-medium text-secondary-900 dark:text-secondary-100 mb-4">
                      <TrendingUp className="h-5 w-5 text-green-500 mr-2" />
                      Key Strengths
                    </HStack>
                    <ul className="space-y-2">
                      {currentReport.ai_analysis.overall_assessment.key_strengths.map(
                        (strength, index) => (
                          <li key={index} className="flex items-start">
                            <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                            <span className="text-secondary-700 dark:text-secondary-300">
                              {strength}
                            </span>
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                </Card>

                <Card>
                  <div className="p-6">
                    <HStack className="text-lg font-medium text-secondary-900 dark:text-secondary-100 mb-4">
                      <AlertCircle className="h-5 w-5 text-yellow-500 mr-2" />
                      Areas for Improvement
                    </HStack>
                    <ul className="space-y-2">
                      {currentReport.ai_analysis.overall_assessment.areas_for_improvement.map(
                        (area, index) => (
                          <li key={index} className="flex items-start">
                            <span className="w-2 h-2 bg-yellow-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                            <span className="text-secondary-700 dark:text-secondary-300">
                              {area}
                            </span>
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                </Card>
              </div>

              {/* Spending Insights */}
              <Card>
                <div className="p-6">
                  <h4 className="text-lg font-medium text-secondary-900 dark:text-secondary-100 mb-4">
                    Spending Insights
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <h5 className="font-medium text-secondary-900 dark:text-secondary-100">
                        Primary Observation
                      </h5>
                      <p className="text-secondary-700 dark:text-secondary-300 mt-1">
                        {currentReport.ai_analysis.spending_insights.primary_observation}
                      </p>
                    </div>
                    <div>
                      <h5 className="font-medium text-secondary-900 dark:text-secondary-100">
                        Category Analysis
                      </h5>
                      <p className="text-secondary-700 dark:text-secondary-300 mt-1">
                        {currentReport.ai_analysis.spending_insights.category_analysis}
                      </p>
                    </div>
                    <div>
                      <h5 className="font-medium text-secondary-900 dark:text-secondary-100">
                        Pattern Insights
                      </h5>
                      <p className="text-secondary-700 dark:text-secondary-300 mt-1">
                        {currentReport.ai_analysis.spending_insights.pattern_insights}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Recommendations */}
              {currentReport.ai_analysis.recommendations.length > 0 && (
                <Card>
                  <div className="p-6">
                    <h4 className="text-lg font-medium text-secondary-900 dark:text-secondary-100 mb-4">
                      AI Recommendations
                    </h4>
                    <div className="space-y-4">
                      {currentReport.ai_analysis.recommendations.map((rec, index) => (
                        <div
                          key={index}
                          className={`border rounded-lg p-4 ${getPriorityColor(rec.priority)}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <HStack gap={2} className="mb-2">
                                <h5 className="font-medium">{rec.title}</h5>
                                <span className="text-xs px-2 py-1 bg-white bg-opacity-50 rounded-full uppercase">
                                  {rec.priority} priority
                                </span>
                              </HStack>
                              <p className="text-sm">{rec.description}</p>
                            </div>
                            {rec.potential_savings && (
                              <div className="text-right ml-4">
                                <div className="text-sm font-medium">Potential Savings</div>
                                <div className="text-lg font-bold">
                                  {formatCurrency(rec.potential_savings, authState.user)}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              )}
            </>
          )}

          {/* Category Breakdown */}
          {currentReport.financial_summary.category_breakdown.length > 0 && (
            <Card>
              <div className="p-6">
                <h4 className="text-lg font-medium text-secondary-900 dark:text-secondary-100 mb-4">
                  Expense Categories
                </h4>
                <div className="space-y-3">
                  {currentReport.financial_summary.category_breakdown
                    .slice(0, 10)
                    .map((category, index) => (
                      <FlexBetween key={index}>
                        <div className="flex-1">
                          <FlexBetween className="mb-1">
                            <span className="text-sm font-medium text-secondary-900 dark:text-secondary-100">
                              {category.category}
                            </span>
                            <span className="text-sm text-secondary-600 dark:text-secondary-400">
                              {formatCurrency(category.amount, authState.user)} (
                              {category.percentage.toFixed(1)}%)
                            </span>
                          </FlexBetween>
                          <div className="w-full bg-secondary-200 dark:bg-secondary-700 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(category.percentage, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </FlexBetween>
                    ))}
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Report History Tab */}
      {activeTab === 'history' && (
        <Card>
          <div className="p-6">
            <FlexBetween className="mb-4">
              <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100">
                Report History
              </h3>
              <Button variant="ghost" size="sm" onClick={fetchReportHistory}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </FlexBetween>

            {reportHistory.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100 mb-2">
                  No Reports Generated
                </h3>
                <p className="text-secondary-600 dark:text-secondary-400">
                  Generate your first monthly analysis report to see it here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {reportHistory.map((report) => (
                  <div
                    key={report.id}
                    className="border border-secondary-200 dark:border-secondary-700 rounded-lg p-4"
                  >
                    <FlexBetween>
                      <div className="flex-1">
                        <h4 className="font-medium text-secondary-900 dark:text-secondary-100">
                          {report.title}
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-secondary-600 dark:text-secondary-400 mt-2">
                          <div>
                            <span className="font-medium">Period:</span>
                            <span className="ml-2">
                              {report.period.month_name} {report.period.year}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium">Generated:</span>
                            <span className="ml-2">
                              {new Date(report.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium">Size:</span>
                            <span className="ml-2">{(report.file_size / 1024).toFixed(1)} KB</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex space-x-2 ml-4">
                        <Button
                          onClick={() => viewStoredReport(report.id)}
                          variant="ghost"
                          size="sm"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      </div>
                    </FlexBetween>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default MonthlyAnalysis;

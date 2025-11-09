import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { monthlyAnalysisApi } from '../../api/monthlyAnalysis';
import type { MonthlyReport } from '../../schemas';

const keys = {
  available: ['monthly-analysis', 'available-periods'] as const,
  history: ['monthly-analysis', 'history'] as const,
  currentSummary: ['monthly-analysis', 'current-summary'] as const,
  report: (id: string) => ['monthly-analysis', 'report', id] as const,
};

export function useAvailablePeriods() {
  return useQuery({
    queryKey: keys.available,
    queryFn: () => monthlyAnalysisApi.getAvailablePeriods(),
  });
}

export function useReportHistory() {
  return useQuery({
    queryKey: keys.history,
    queryFn: () => monthlyAnalysisApi.getReportHistory(),
  });
}

export function useCurrentMonthSummary() {
  return useQuery({
    queryKey: keys.currentSummary,
    queryFn: () => monthlyAnalysisApi.getCurrentMonthSummary(),
  });
}

export function useGenerateReport() {
  const qc = useQueryClient();
  return useMutation<MonthlyReport, unknown, { year: number; month: number }>({
    mutationFn: monthlyAnalysisApi.generateReport,
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: keys.history }),
        qc.invalidateQueries({ queryKey: keys.currentSummary }),
      ]);
    },
  });
}

export function useStoredReport(reportId?: string, enabled: boolean = false) {
  return useQuery<{ success: boolean; report: MonthlyReport }>({
    queryKey: reportId ? keys.report(reportId) : ['monthly-analysis', 'report', 'none'],
    queryFn: () => monthlyAnalysisApi.getStoredReport(reportId as string),
    enabled: Boolean(reportId && enabled),
  });
}

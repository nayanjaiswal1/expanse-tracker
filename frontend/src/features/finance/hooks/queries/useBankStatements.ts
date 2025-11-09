import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bankStatementsApi } from '../../api/bankStatements';

const keys = {
  accounts: ['bank-statements', 'accounts'] as const,
  banks: ['bank-statements', 'supported-banks'] as const,
  history: ['bank-statements', 'parsing-history'] as const,
};

export function useBankAccounts() {
  return useQuery({
    queryKey: keys.accounts,
    queryFn: () => bankStatementsApi.getAccounts(),
  });
}

export function useSupportedBanks() {
  return useQuery({
    queryKey: keys.banks,
    queryFn: () => bankStatementsApi.getSupportedBanks(),
  });
}

export function useParsingHistory() {
  return useQuery({
    queryKey: keys.history,
    queryFn: () => bankStatementsApi.getParsingHistory(),
  });
}

export function useUploadStatement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: bankStatementsApi.uploadStatement,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: keys.history });
    },
  });
}

export function useParseTextStatement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: bankStatementsApi.parseText,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: keys.history });
    },
  });
}

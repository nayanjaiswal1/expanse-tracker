import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../../api/client';
import type { GmailAccount as ApiGmailAccount } from '../../../../api/modules/gmail';

export interface GmailAccountUI extends Omit<ApiGmailAccount, 'connected'> {
  connected: boolean;
}

const normalizeAccounts = (accounts: ApiGmailAccount[]): GmailAccountUI[] =>
  accounts.map((a) => ({
    ...(a as unknown as Omit<GmailAccountUI, 'connected'>),
    connected: Boolean((a as { connected?: boolean }).connected),
  }));

export const useGmailAccountsQuery = () =>
  useQuery<GmailAccountUI[], Error>({
    queryKey: ['gmail-accounts'],
    queryFn: async () => normalizeAccounts(await apiClient.listGmailAccounts()),
    staleTime: 60_000,
  });

export const useConnectGmailMutation = () =>
  useMutation({
    mutationFn: apiClient.connectGmail,
  });

export const useSyncAllGmailMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: apiClient.syncAllGmail,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['gmail-accounts'] }),
  });
};

export const useSyncGmailAccountMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.syncGmailAccount(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['gmail-accounts'] }),
  });
};

export const useReconnectGmailMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (accountId: number) => {
      await apiClient.deleteGmailAccount(accountId);
      return apiClient.connectGmail();
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['gmail-accounts'] }),
  });
};

export const useDeleteGmailAccountMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.deleteGmailAccount(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['gmail-accounts'] }),
  });
};

export const useUpdateGmailAccountMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: Partial<
        Pick<
          ApiGmailAccount,
          'name' | 'transaction_tag' | 'sender_filters' | 'keyword_filters' | 'is_active'
        >
      >;
    }) => apiClient.updateGmailAccount(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['gmail-accounts'] }),
  });
};

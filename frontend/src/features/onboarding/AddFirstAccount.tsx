import React from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { apiClient } from '../../api/client';
import type { Account } from '../../types';
import { FormField } from '../../components/ui/FormField';
import { AccountTypeSelector } from './AccountTypeSelector';
import { CurrencySelector } from './CurrencySelector';
import { useCurrencies } from './hooks/useCurrencies';

const accountSchema = (t: (key: string) => string) =>
  z.object({
    name: z.string().min(1, t('addFirstAccount.errors.nameRequired')),
    account_type: z.enum(['checking', 'savings', 'credit', 'investment', 'loan', 'cash', 'other']),
    balance: z.string().optional(),
    currency: z.string().default('USD'),
    institution: z.string().optional(),
    account_number: z.string().optional(),
  });

type AccountFormData = z.infer<ReturnType<typeof accountSchema>>;

interface AddFirstAccountProps {
  suggestedAccountTypes?: string[];
  defaultCurrency?: string;
  onAccountCreated: (account: Account) => void;
  onSkip: () => void;
}

export const AddFirstAccount: React.FC<AddFirstAccountProps> = ({
  suggestedAccountTypes = [],
  defaultCurrency = 'USD',
  onAccountCreated,
  onSkip,
}) => {
  const { t } = useTranslation('common');
  const { showSuccess, showError } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema(t)),
    defaultValues: {
      currency: defaultCurrency,
      account_type: (suggestedAccountTypes[0] as AccountFormData['account_type']) || 'checking',
    },
  });

  const selectedType = watch('account_type');
  const selectedCurrency = watch('currency');
  const { data: availableCurrencies = [], isLoading: isLoadingCurrencies } = useCurrencies();

  const accountTypeDescriptions: Record<AccountFormData['account_type'], string> = {
    checking: t('accountTypes.descriptions.checking'),
    savings: t('accountTypes.descriptions.savings'),
    credit: t('accountTypes.descriptions.credit'),
    investment: t('accountTypes.descriptions.investment'),
    loan: t('accountTypes.descriptions.loan'),
    cash: t('accountTypes.descriptions.cash'),
    other: t('accountTypes.descriptions.other'),
  };

  const createAccountMutation = useMutation({
    mutationFn: async (data: AccountFormData) => {
      const response = await apiClient.createAccount({
        ...data,
        balance: data.balance || '0.00',
        minimum_balance: '0.00',
        is_active: true,
        include_in_budget: true,
        track_balance: true,
        status: 'active',
        priority: 'high',
        tags: [],
        metadata: {},
      } as any);
      return response;
    },
    onSuccess: (account) => {
      showSuccess(
        t('addFirstAccount.accountCreatedSuccess'),
        t('addFirstAccount.accountCreatedSuccessMessage', { accountName: account.name })
      );
      onAccountCreated(account);
    },
    onError: (error: any) => {
      showError(
        t('addFirstAccount.accountCreationError'),
        error?.response?.data?.error || t('addFirstAccount.accountCreationErrorMessage')
      );
    },
  });

  const onSubmit = (data: AccountFormData) => {
    createAccountMutation.mutate(data);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <header>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {t('addFirstAccount.title')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {t('addFirstAccount.subtitle')}
        </p>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          {...register('name')}
          label={t('addFirstAccount.accountNickname')}
          type="text"
          placeholder={t('addFirstAccount.accountNicknamePlaceholder')}
          required
          error={errors.name?.message}
        />

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
            {t('addFirstAccount.accountType')}
            <span className="text-red-500 ml-1">*</span>
          </label>
          <AccountTypeSelector
            selectedType={selectedType}
            onSelectType={(type) =>
              setValue('account_type', type as AccountFormData['account_type'])
            }
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {accountTypeDescriptions[selectedType]}
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
            {t('addFirstAccount.currency')}
          </label>
          {isLoadingCurrencies ? (
            <div className="h-10 w-full animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
          ) : (
            <CurrencySelector
              selectedCurrency={selectedCurrency}
              onSelectCurrency={(currency) => setValue('currency', currency)}
              currencies={availableCurrencies}
            />
          )}
        </div>

        <FormField
          {...register('balance')}
          label={t('addFirstAccount.currentBalance')}
          type="number"
          step="0.01"
          placeholder="0.00"
        />

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button type="button" variant="outline-neutral-lg" onClick={onSkip} className="flex-1">
            {t('addFirstAccount.skip')}
          </Button>
          <Button
            type="submit"
            variant="primary-elevated-lg"
            disabled={createAccountMutation.isPending}
            className="flex-1"
          >
            {createAccountMutation.isPending
              ? t('addFirstAccount.addingAccount')
              : t('addFirstAccount.addAccount')}
          </Button>
        </div>
      </form>
    </motion.div>
  );
};

export default AddFirstAccount;

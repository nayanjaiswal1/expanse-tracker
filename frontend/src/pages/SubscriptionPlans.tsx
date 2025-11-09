import React, { useMemo } from 'react';
import { Check, Crown, CreditCard, Shield, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { apiClient } from '../api/client';
import { useToast } from '../components/ui/Toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FlexCenter, HStack, InlineFlex } from '../components/ui/Layout';

interface SubscriptionPlan {
  id: number;
  name: string;
  plan_type: string;
  price: string;
  ai_credits_per_month: number;
  max_transactions_per_month: number;
  max_accounts: number;
  features: Record<string, boolean>;
  is_active: boolean;
}

interface UserSubscription {
  id: number;
  plan: SubscriptionPlan;
  status: string;
  ai_credits_remaining: number;
  ai_credits_used_this_month: number;
  transactions_this_month: number;
}

const FALLBACK_PLANS: SubscriptionPlan[] = [
  {
    id: 1,
    name: 'Free',
    plan_type: 'free',
    price: '0',
    ai_credits_per_month: 10,
    max_transactions_per_month: 100,
    max_accounts: 1,
    features: { basic_reports: true },
    is_active: true,
  },
  {
    id: 2,
    name: 'Basic',
    plan_type: 'basic',
    price: '9.99',
    ai_credits_per_month: 100,
    max_transactions_per_month: 1000,
    max_accounts: 3,
    features: { basic_reports: true, categorization: true },
    is_active: true,
  },
  {
    id: 3,
    name: 'Premium',
    plan_type: 'premium',
    price: '19.99',
    ai_credits_per_month: 500,
    max_transactions_per_month: 10000,
    max_accounts: 10,
    features: {
      basic_reports: true,
      categorization: true,
      advanced_analytics: true,
      custom_ai: true,
    },
    is_active: true,
  },
  {
    id: 4,
    name: 'Enterprise',
    plan_type: 'enterprise',
    price: '49.99',
    ai_credits_per_month: 2000,
    max_transactions_per_month: 100000,
    max_accounts: 50,
    features: {
      basic_reports: true,
      categorization: true,
      advanced_analytics: true,
      custom_ai: true,
      priority_support: true,
    },
    is_active: true,
  },
];

const capitalizeFeature = (feature: string) =>
  feature
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export const SubscriptionPlans: React.FC = () => {
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useToast();

  // Plans query with fallback
  const { data: plansData, isLoading: isLoadingPlans } = useQuery<SubscriptionPlan[], Error>({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      try {
        const response = (await apiClient.get('/subscription-plans/')) as {
          data: { results: SubscriptionPlan[] } | SubscriptionPlan[];
        };
        const payload =
          (response.data as { results: SubscriptionPlan[] }).results ||
          (response.data as SubscriptionPlan[]);
        return payload;
      } catch (e) {
        console.warn('Falling back to mock plans', e);
        return FALLBACK_PLANS;
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const plans = useMemo(() => plansData ?? FALLBACK_PLANS, [plansData]);

  // Current subscription query with safe fallback
  const { data: currentSubscription, isLoading: isLoadingCurrent } = useQuery<
    UserSubscription | null,
    Error
  >({
    queryKey: ['current-subscription'],
    queryFn: async () => {
      try {
        const response = (await apiClient.get('/subscriptions/current/')) as {
          data: UserSubscription;
        };
        return response.data;
      } catch (e) {
        console.warn('Unable to load current subscription', e);
        return {
          id: 1,
          plan: FALLBACK_PLANS[0],
          status: 'active',
          ai_credits_remaining: 8,
          ai_credits_used_this_month: 2,
          transactions_this_month: 45,
        } as UserSubscription;
      }
    },
    staleTime: 60 * 1000,
  });

  // Upgrade mutation
  type HttpError = { response?: { data?: { error?: string } } };
  const upgradeMutation = useMutation<{ data: UserSubscription }, HttpError, string>({
    mutationFn: async (planType: string) => {
      return (await apiClient.post('/subscriptions/upgrade/', { plan_type: planType })) as {
        data: UserSubscription;
      };
    },
    onSuccess: (resp) => {
      const sub = resp.data;
      showSuccess(`Switched to ${sub.plan.name}`);
      queryClient.setQueryData(['current-subscription'], sub);
    },
    onError: (error) => {
      showError(error?.response?.data?.error || 'Failed to upgrade subscription');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['current-subscription'] });
    },
  });

  const upgrading = upgradeMutation.isPending;
  const upgradePlan = (planType: string) => upgradeMutation.mutate(planType);

  const getPlanIcon = (planType: string) => {
    switch (planType) {
      case 'free':
        return <CreditCard className="h-5 w-5" />;
      case 'basic':
        return <Sparkles className="h-5 w-5" />;
      case 'premium':
        return <Crown className="h-5 w-5" />;
      case 'enterprise':
        return <Shield className="h-5 w-5" />;
      default:
        return <CreditCard className="h-5 w-5" />;
    }
  };

  const isCurrentPlan = (planType: string) => currentSubscription?.plan?.plan_type === planType;

  const canUpgrade = (planType: string) => {
    if (!currentSubscription) return true;
    const order = ['free', 'basic', 'premium', 'enterprise'];
    return order.indexOf(planType) > order.indexOf(currentSubscription.plan.plan_type);
  };

  if (isLoadingPlans || isLoadingCurrent) {
    return (
      <div className="flex h-72 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="text-center">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Choose a plan that fits
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Scaled pricing keeps AI workflows affordable while your usage grows. Switch tiers any
          time.
        </p>
        {currentSubscription && (
          <InlineFlex
            gap={2}
            className="mt-4 rounded-full bg-emerald-100/80 px-4 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
          >
            <Check className="h-4 w-4" />
            <span>
              {currentSubscription.plan.name} • {currentSubscription.ai_credits_remaining} credits
              left
            </span>
          </InlineFlex>
        )}
      </header>

      <section className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => {
          const active = isCurrentPlan(plan.plan_type);
          const highlight = plan.plan_type === 'premium';
          return (
            <div
              key={plan.id}
              className={`relative rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-gray-700 dark:bg-gray-900 ${
                highlight ? 'ring-1 ring-purple-400/50' : ''
              }`}
            >
              {highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-purple-500 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                  Most popular
                </span>
              )}

              <FlexCenter>
                <FlexCenter
                  className={`h-10 w-10 rounded-full ${
                    plan.plan_type === 'free'
                      ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                      : plan.plan_type === 'basic'
                        ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300'
                        : plan.plan_type === 'premium'
                          ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300'
                          : 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-300'
                  }`}
                >
                  {getPlanIcon(plan.plan_type)}
                </FlexCenter>
              </FlexCenter>

              <div className="mt-4 text-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{plan.name}</h3>
                <p className="mt-1 text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  {plan.plan_type} plan
                </p>
                <HStack
                  gap={1}
                  align="baseline"
                  className="mt-3 justify-center text-gray-500 dark:text-gray-400"
                >
                  <span className="text-3xl font-semibold text-gray-900 dark:text-white">
                    ${plan.price}
                  </span>
                  <span>/month</span>
                </HStack>
              </div>

              <ul className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <li>
                  <HStack gap={2}>
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>{plan.ai_credits_per_month} AI credits</span>
                  </HStack>
                </li>
                <li>
                  <HStack gap={2}>
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>{plan.max_transactions_per_month.toLocaleString()} transactions</span>
                  </HStack>
                </li>
                <li>
                  <HStack gap={2}>
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>{plan.max_accounts} accounts</span>
                  </HStack>
                </li>
                {Object.entries(plan.features)
                  .filter(([, enabled]) => enabled)
                  .map(([feature]) => (
                    <li key={feature}>
                      <HStack gap={2}>
                        <Check className="h-4 w-4 text-emerald-500" />
                        <span>{capitalizeFeature(feature)}</span>
                      </HStack>
                    </li>
                  ))}
              </ul>

              <Button
                onClick={() => upgradePlan(plan.plan_type)}
                disabled={upgrading || active || !canUpgrade(plan.plan_type)}
                className="mt-5 w-full text-sm"
                variant={
                  active ? 'secondary' : canUpgrade(plan.plan_type) ? 'primary' : 'secondary'
                }
              >
                {upgrading && active
                  ? 'Updating…'
                  : active
                    ? 'Current plan'
                    : canUpgrade(plan.plan_type)
                      ? plan.plan_type === 'free'
                        ? 'Start for free'
                        : 'Upgrade'
                      : 'Contact sales'}
              </Button>
            </div>
          );
        })}
      </section>

      <section className="mt-12 grid grid-cols-1 gap-6 text-sm text-gray-600 dark:text-gray-300 md:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <h4 className="text-base font-semibold text-gray-900 dark:text-white">
            AI that grows with you
          </h4>
          <p className="mt-2 leading-relaxed">
            Automatic categorization, invoice parsing, and forecasting scale with each tier so you
            only pay for what you automate.
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <h4 className="text-base font-semibold text-gray-900 dark:text-white">
            Security by default
          </h4>
          <p className="mt-2 leading-relaxed">
            Encrypted storage, audit trails, and fine-grained access controls keep sensitive
            financial data protected.
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <h4 className="text-base font-semibold text-gray-900 dark:text-white">
            Switch plans any time
          </h4>
          <p className="mt-2 leading-relaxed">
            Downgrade or upgrade in a click. Unused AI credits roll into the next billing period on
            paid tiers.
          </p>
        </div>
      </section>
    </div>
  );
};

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bot, Calculator, Check, Minus, Plus, ShoppingCart, Star, TrendingUp } from 'lucide-react';
import { apiClient } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/layout/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import { Flex, FlexBetween, HStack, InlineFlex } from '@/components/ui/Layout';

interface PlanAddon {
  id: number;
  name: string;
  addon_type: string;
  description: string;
  price: string;
  billing_cycle: string;
  credits_amount: number;
  transaction_increase: number;
  account_increase: number;
  storage_gb: number;
  feature_flags: Record<string, boolean>;
  is_stackable: boolean;
  max_quantity: number;
}

interface BasePlan {
  id: number;
  name: string;
  price: string;
  ai_credits_per_month: number;
  max_transactions_per_month: number;
}

interface PlanTemplate {
  id: number;
  name: string;
  description: string;
  base_plan: BasePlan;
  template_addons: Array<{ addon: PlanAddon; quantity: number }>;
  total_price: string;
  discount_percentage: string;
  savings_amount: string;
  is_featured: boolean;
  target_user_types: string[];
}

interface CustomizationPreview {
  base_plan: BasePlan;
  addons: Array<{ addon: PlanAddon; quantity: number; monthly_cost: number }>;
  totals: {
    ai_credits: number;
    transactions_limit: number;
    accounts_limit: number;
    monthly_cost: number;
    features: Record<string, boolean>;
  };
}

type TabKey = 'build' | 'templates';

type AddonGroups = Record<string, PlanAddon[]>;

type AddonSelections = Record<number, number>;

type ApplyTemplateHandler = (template: PlanTemplate) => Promise<void>;

type ApplyCustomizationHandler = () => Promise<void>;

function extractError(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const message = (error as { response?: { data?: { error?: string; detail?: string } } })
      .response?.data;
    if (message?.error) return message.error;
    if (message?.detail) return message.detail;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

interface BuildTabProps {
  plans: BasePlan[];
  selectedPlan: BasePlan;
  onSelectPlan: (plan: BasePlan) => void;
  addonGroups: AddonGroups;
  selections: AddonSelections;
  onAdjustQuantity: (addonId: number, delta: number) => void;
  preview: CustomizationPreview | null;
  onApplyCustomization: ApplyCustomizationHandler;
  isSubmitting: boolean;
}

const BuildTab = ({
  plans,
  selectedPlan,
  onSelectPlan,
  addonGroups,
  selections,
  onAdjustQuantity,
  preview,
  onApplyCustomization,
  isSubmitting,
}: BuildTabProps) => {
  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-6">
        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">1. Choose a Base Plan</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {plans.map((plan) => {
              const isSelected = selectedPlan.id === plan.id;
              return (
                <Card
                  key={plan.id}
                  className={`cursor-pointer transition-all ${isSelected ? 'border-blue-500 shadow-md' : 'border-gray-200 hover:border-blue-300'}`}
                  onClick={() => onSelectPlan(plan)}
                >
                  <Flex align="start" justify="between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                      <p className="mt-1 text-sm text-gray-600">
                        {plan.ai_credits_per_month.toLocaleString()} AI credits ·{' '}
                        {plan.max_transactions_per_month.toLocaleString()} transactions
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-blue-600">${plan.price}</div>
                      <p className="text-xs text-gray-500">per month</p>
                    </div>
                  </Flex>
                  {isSelected && (
                    <InlineFlex
                      gap={1}
                      className="mt-3 rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600"
                    >
                      <Check className="h-3 w-3" />
                      Selected
                    </InlineFlex>
                  )}
                </Card>
              );
            })}
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">2. Add Optional Features</h2>
          {Object.entries(addonGroups).map(([category, categoryAddons]) => (
            <div key={category} className="mb-5 last:mb-0">
              <HStack gap={2} className="mb-3 text-sm font-semibold text-gray-700">
                <Bot className="h-4 w-4 text-blue-500" />
                {category.replace(/_/g, ' ')}
              </HStack>
              <div className="space-y-3">
                {categoryAddons.map((addon) => {
                  const quantity = selections[addon.id] ?? 0;
                  return (
                    <Flex
                      key={addon.id}
                      align="start"
                      justify="between"
                      className="rounded-lg border border-gray-200 p-3"
                    >
                      <div className="max-w-[70%]">
                        <p className="font-medium text-gray-900">{addon.name}</p>
                        <p className="text-sm text-gray-600">{addon.description}</p>
                        {addon.max_quantity > 1 && (
                          <p className="mt-1 text-xs text-gray-500">
                            Max quantity: {addon.max_quantity}
                          </p>
                        )}
                      </div>
                      <HStack gap={3}>
                        <div className="text-right text-sm font-semibold text-blue-600">
                          ${addon.price}/{addon.billing_cycle}
                        </div>
                        <HStack gap={2}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onAdjustQuantity(addon.id, -1)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-6 text-center text-sm font-semibold">{quantity}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onAdjustQuantity(addon.id, 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </HStack>
                      </HStack>
                    </Flex>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      </div>

      <aside className="space-y-4">
        <Card>
          <FlexBetween>
            <h3 className="text-lg font-semibold text-gray-900">Plan Summary</h3>
            <TrendingUp className="h-5 w-5 text-blue-500" />
          </FlexBetween>

          {preview ? (
            <Summary preview={preview} />
          ) : (
            <p className="mt-4 text-sm text-gray-500">
              Select a plan and add-ons to see a preview.
            </p>
          )}

          <Button
            onClick={onApplyCustomization}
            loading={isSubmitting}
            className="mt-6 w-full justify-center"
          >
            <HStack gap={2}>
              <ShoppingCart className="h-4 w-4" />
              Apply Customization
            </HStack>
          </Button>
        </Card>
      </aside>
    </div>
  );
};

interface SummaryProps {
  preview: CustomizationPreview;
}

function Summary({ preview }: SummaryProps) {
  return (
    <>
      <div className="mt-4 space-y-3 text-sm text-gray-700">
        <div className="flex justify-between">
          <span>Monthly cost</span>
          <span className="font-semibold">${preview.totals.monthly_cost.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>AI credits</span>
          <span>{preview.totals.ai_credits.toLocaleString()}/month</span>
        </div>
        <div className="flex justify-between">
          <span>Transactions</span>
          <span>{preview.totals.transactions_limit.toLocaleString()}/month</span>
        </div>
        <div className="flex justify-between">
          <span>Accounts</span>
          <span>{preview.totals.accounts_limit}</span>
        </div>
      </div>

      {preview.addons.length > 0 && (
        <div className="mt-4 rounded-lg bg-gray-50 p-3 text-sm">
          <p className="mb-2 font-medium text-gray-800">Selected add-ons</p>
          <ul className="space-y-1">
            {preview.addons.map((item) => (
              <li key={item.addon.id} className="flex justify-between">
                <span>
                  {item.addon.name} ×{item.quantity}
                </span>
                <span>+${item.monthly_cost.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

interface TemplatesTabProps {
  templates: PlanTemplate[];
  onApplyTemplate: ApplyTemplateHandler;
  isSubmitting: boolean;
}

const TemplatesTab = ({ templates, onApplyTemplate, isSubmitting }: TemplatesTabProps) => (
  <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    {templates.map((template) => (
      <Card
        key={template.id}
        className={`flex h-full flex-col justify-between border-2 ${template.is_featured ? 'border-purple-200 bg-purple-50' : 'border-gray-200'}`}
      >
        <div>
          {template.is_featured && (
            <div className="mb-3 inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700">
              <Star className="h-3 w-3" />
              Featured
            </div>
          )}
          <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
          <p className="mt-1 text-sm text-gray-600">{template.description}</p>

          <div className="mt-3 text-sm">
            <HStack gap={2} align="baseline">
              <span className="text-2xl font-bold text-blue-600">${template.total_price}</span>
              <span className="text-xs text-gray-500">/month</span>
            </HStack>
            {parseFloat(template.savings_amount) > 0 && (
              <p className="text-sm text-green-600">Save ${template.savings_amount}</p>
            )}
          </div>

          <div className="mt-4 space-y-1 text-sm text-gray-600">
            <p className="font-medium text-gray-700">Includes:</p>
            <p>• Base plan: {template.base_plan.name}</p>
            {template.template_addons.map((item) => (
              <p key={item.addon.id}>
                • {item.addon.name} ×{item.quantity}
              </p>
            ))}
          </div>
        </div>

        <Button
          onClick={() => onApplyTemplate(template)}
          loading={isSubmitting}
          className="mt-5 w-full"
        >
          Apply Template
        </Button>
      </Card>
    ))}
  </div>
);

export const PlanCustomizer = () => {
  const [plans, setPlans] = useState<BasePlan[]>([]);
  const [addons, setAddons] = useState<PlanAddon[]>([]);
  const [templates, setTemplates] = useState<PlanTemplate[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<BasePlan | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<AddonSelections>({});
  const [preview, setPreview] = useState<CustomizationPreview | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('build');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [plansRes, addonsRes, templatesRes] = await Promise.all([
          apiClient.client.get('/subscription-plans/'),
          apiClient.client.get('/plan-addons/'),
          apiClient.client.get('/plan-templates/'),
        ]);

        const planList = (plansRes.data?.results ?? plansRes.data ?? []) as BasePlan[];
        const addonList = (addonsRes.data?.results ?? addonsRes.data ?? []) as PlanAddon[];
        const templateList = (templatesRes.data?.results ??
          templatesRes.data ??
          []) as PlanTemplate[];

        setPlans(planList);
        setAddons(addonList);
        setTemplates(templateList);

        if (!selectedPlan && planList.length > 0) {
          setSelectedPlan(planList[0]);
        }
      } catch (error) {
        showError('Unable to load plan data', extractError(error, 'Please try again in a moment.'));
      } finally {
        setLoading(false);
      }
    };

    fetchData().catch(() => setLoading(false));
  }, [selectedPlan, showError]);

  useEffect(() => {
    if (!selectedPlan) return;

    const loadPreview = async () => {
      const addonPayload = Object.entries(selectedAddons)
        .filter(([, quantity]) => quantity > 0)
        .map(([addonId, quantity]) => ({ addon_id: Number(addonId), quantity }));

      try {
        const response = await apiClient.client.get('/plan-customization/preview_customization/', {
          params: {
            base_plan_id: selectedPlan.id,
            addons: JSON.stringify(addonPayload),
          },
        });
        setPreview(response.data as CustomizationPreview);
      } catch (error) {
        showError('Failed to refresh preview', extractError(error, 'Preview update failed.'));
      }
    };

    loadPreview().catch(() => null);
  }, [selectedPlan, selectedAddons, showError]);

  const addonGroups = useMemo<AddonGroups>(() => {
    return addons.reduce<AddonGroups>((groups, addon) => {
      if (!groups[addon.addon_type]) {
        groups[addon.addon_type] = [];
      }
      groups[addon.addon_type].push(addon);
      return groups;
    }, {});
  }, [addons]);

  const adjustQuantity = useCallback(
    (addonId: number, delta: number) => {
      setSelectedAddons((prev) => {
        const addon = addons.find((item) => item.id === addonId);
        if (!addon) return prev;

        const current = prev[addonId] ?? 0;
        const nextQuantity = Math.max(0, Math.min(addon.max_quantity, current + delta));
        if (nextQuantity === current) return prev;

        const next = { ...prev, [addonId]: nextQuantity } as AddonSelections;
        if (nextQuantity === 0) {
          delete next[addonId];
        }
        return next;
      });
    },
    [addons]
  );

  const applyCustomization = useCallback<ApplyCustomizationHandler>(async () => {
    if (!selectedPlan) return;

    setSubmitting(true);
    const addonPayload = Object.entries(selectedAddons)
      .filter(([, quantity]) => quantity > 0)
      .map(([addonId, quantity]) => ({ addon_id: Number(addonId), quantity }));

    try {
      await apiClient.client.post('/plan-customization/customize_plan/', {
        base_plan_id: selectedPlan.id,
        addons: addonPayload,
      });
      showSuccess('Plan customization applied');
    } catch (error) {
      showError('Failed to customize plan', extractError(error, 'Unable to save customization.'));
    } finally {
      setSubmitting(false);
    }
  }, [selectedPlan, selectedAddons, showError, showSuccess]);

  const applyTemplate = useCallback<ApplyTemplateHandler>(
    async (template) => {
      setSubmitting(true);
      try {
        await apiClient.client.post('/plan-customization/apply_template/', {
          template_id: template.id,
        });
        showSuccess(`Applied template: ${template.name}`);
      } catch (error) {
        showError('Failed to apply template', extractError(error, 'Template application failed.'));
      } finally {
        setSubmitting(false);
      }
    },
    [showError, showSuccess]
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900">Customize Your Plan</h1>
        <p className="mt-2 text-gray-600">
          Pick a base plan, add extra features, or start from a curated template.
        </p>
      </header>

      <HStack gap={3} className="mb-6 justify-center">
        <Button
          variant={activeTab === 'build' ? 'primary' : 'outline'}
          onClick={() => setActiveTab('build')}
        >
          <HStack gap={2}>
            <Calculator className="h-4 w-4" />
            Build Custom Plan
          </HStack>
        </Button>
        <Button
          variant={activeTab === 'templates' ? 'primary' : 'outline'}
          onClick={() => setActiveTab('templates')}
        >
          <HStack gap={2}>
            <Star className="h-4 w-4" />
            Explore Templates
          </HStack>
        </Button>
      </HStack>

      {activeTab === 'build' ? (
        selectedPlan ? (
          <BuildTab
            plans={plans}
            selectedPlan={selectedPlan}
            onSelectPlan={setSelectedPlan}
            addonGroups={addonGroups}
            selections={selectedAddons}
            onAdjustQuantity={adjustQuantity}
            preview={preview}
            onApplyCustomization={applyCustomization}
            isSubmitting={submitting}
          />
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm">
            <p className="text-gray-600">No base plans available. Please contact support.</p>
          </div>
        )
      ) : (
        <TemplatesTab
          templates={templates}
          onApplyTemplate={applyTemplate}
          isSubmitting={submitting}
        />
      )}
    </div>
  );
};

export default PlanCustomizer;

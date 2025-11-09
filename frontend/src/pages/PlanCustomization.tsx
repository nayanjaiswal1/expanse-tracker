import { useMemo, useState } from 'react';
import { Plus, Minus, Star, Package, CreditCard, Zap, Users, FileText, Shield } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { LoadingSpinner } from '../components/layout/LoadingSpinner';
import { Badge } from '../components/ui/Badge';
import { Flex, FlexBetween, HStack } from '../components/ui/Layout';
import {
  usePlanAddons,
  usePlanTemplates,
  useUserCustomization,
  usePreviewCustomization,
  useApplyCustomizationMutation,
  useApplyTemplateMutation,
  useRemoveAddonMutation,
} from '../hooks/users';

const PlanCustomization = () => {
  const [selectedAddons, setSelectedAddons] = useState<Record<number, number>>({});
  const [activeTab, setActiveTab] = useState<'customize' | 'templates'>('customize');

  const { addToast } = useToast();

  // React Query: Load addons, templates, and current customization
  const { data: addonsQuery, isLoading: addonsLoading } = usePlanAddons();
  const { data: templatesQuery, isLoading: templatesLoading } = usePlanTemplates();
  const { data: customizationQuery, isLoading: customizationLoading } = useUserCustomization();

  const addons = addonsQuery ?? [];
  const templates = templatesQuery ?? [];
  const currentCustomization = customizationQuery ?? null;
  const isLoading = addonsLoading || templatesLoading || customizationLoading;

  const updateAddonQuantity = (addonId: number, quantity: number) => {
    setSelectedAddons((prev) => ({
      ...prev,
      [addonId]: quantity,
    }));
  };

  // Compute preview using React Query
  const basePlanId = currentCustomization?.base_plan?.id ?? null;
  const addonsPayload = useMemo(
    () =>
      Object.entries(selectedAddons)
        .filter(([_, quantity]) => quantity > 0)
        .map(([addonId, quantity]) => ({ addon_id: parseInt(addonId), quantity })),
    [selectedAddons]
  );
  const { data: previewData } = usePreviewCustomization(basePlanId, addonsPayload);
  const preview = previewData ?? null;

  const applyCustomizationMutation = useApplyCustomizationMutation();
  const applyCustomization = async () => {
    if (!currentCustomization) return;
    const addonsData = Object.entries(selectedAddons)
      .filter(([_, quantity]) => quantity > 0)
      .map(([addonId, quantity]) => ({ addon_id: parseInt(addonId), quantity }));
    try {
      await applyCustomizationMutation.mutateAsync({
        base_plan_id: currentCustomization.base_plan.id,
        addons: addonsData,
      });
      setSelectedAddons({});
      addToast({ type: 'success', title: 'Plan customization applied successfully' });
    } catch (error) {
      console.error('Error applying customization:', error);
      addToast({ type: 'error', title: 'Failed to apply customization' });
    }
  };

  const applyTemplateMutation = useApplyTemplateMutation();
  const applyTemplate = async (templateId: number) => {
    try {
      await applyTemplateMutation.mutateAsync(templateId);
      addToast({ type: 'success', title: 'Plan template applied successfully' });
    } catch (error) {
      console.error('Error applying template:', error);
      addToast({ type: 'error', title: 'Failed to apply template' });
    }
  };

  const removeAddonMutation = useRemoveAddonMutation();
  const removeAddon = async (addonInstanceId: number) => {
    try {
      await removeAddonMutation.mutateAsync(addonInstanceId);
      addToast({ type: 'success', title: 'Add-on removed successfully' });
    } catch (error) {
      console.error('Error removing add-on:', error);
      addToast({ type: 'error', title: 'Failed to remove add-on' });
    }
  };

  const getAddonIcon = (addonType: string) => {
    switch (addonType) {
      case 'credits':
        return CreditCard;
      case 'features':
        return Zap;
      case 'limits':
        return Users;
      case 'support':
        return Shield;
      default:
        return Package;
    }
  };

  const formatPrice = (price: number, cycle: string) => {
    const formatted = `$${price.toFixed(2)}`;
    if (cycle === 'yearly') return `${formatted}/year`;
    if (cycle === 'monthly') return `${formatted}/month`;
    return formatted;
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="max-w-7xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100 mb-2">
          Plan Customization
        </h2>
        <p className="text-secondary-600 dark:text-secondary-400">
          Customize your subscription with add-ons and templates tailored to your needs.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-secondary-200 dark:border-secondary-700 mb-8">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'customize', name: 'Custom Plan', icon: Package },
            { id: 'templates', name: 'Plan Templates', icon: FileText },
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
              </button>
            );
          })}
        </nav>
      </div>

      {activeTab === 'customize' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Current Plan & Add-ons */}
          <div className="xl:col-span-2 space-y-6">
            {/* Current Plan */}
            {currentCustomization && (
              <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
                <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 mb-4">
                  Current Plan
                </h3>
                <FlexBetween className="mb-4">
                  <div>
                    <h4 className="text-xl font-bold text-secondary-900 dark:text-secondary-100">
                      {currentCustomization.base_plan.name}
                    </h4>
                    <p className="text-secondary-600 dark:text-secondary-400">
                      {currentCustomization.base_plan.ai_credits_per_month} AI credits/month
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
                      ${currentCustomization.base_plan.price}
                    </div>
                    <div className="text-sm text-secondary-500">/month</div>
                  </div>
                </FlexBetween>

                {/* Active Add-ons */}
                {currentCustomization.addon_instances.filter((instance) => instance.is_active)
                  .length > 0 && (
                  <div>
                    <h5 className="font-medium text-secondary-900 dark:text-secondary-100 mb-2">
                      Active Add-ons
                    </h5>
                    <div className="space-y-2">
                      {currentCustomization.addon_instances
                        .filter((instance) => instance.is_active)
                        .map((instance) => (
                          <FlexBetween
                            key={instance.id}
                            className="p-3 bg-secondary-50 dark:bg-secondary-700 rounded-lg"
                          >
                            <div>
                              <span className="font-medium text-secondary-900 dark:text-secondary-100">
                                {instance.addon.name}
                              </span>
                              <span className="text-secondary-500 dark:text-secondary-400">
                                {' '}
                                x{instance.quantity}
                              </span>
                            </div>
                            <HStack gap={2}>
                              <span className="text-secondary-900 dark:text-secondary-100">
                                ${instance.monthly_cost.toFixed(2)}/mo
                              </span>
                              <Button
                                onClick={() => removeAddon(instance.id)}
                                size="sm"
                                variant="secondary"
                                className="text-red-600 hover:text-red-700"
                              >
                                Remove
                              </Button>
                            </HStack>
                          </FlexBetween>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Available Add-ons */}
            <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
              <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 mb-4">
                Available Add-ons
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {addons.map((addon) => {
                  const Icon = getAddonIcon(addon.addon_type);
                  const quantity = selectedAddons[addon.id] || 0;

                  return (
                    <div
                      key={addon.id}
                      className="border border-secondary-200 dark:border-secondary-600 rounded-lg p-4"
                    >
                      <Flex align="start" justify="between" className="mb-3">
                        <HStack gap={2}>
                          <Icon className="h-5 w-5 text-blue-500" />
                          <h4 className="font-medium text-secondary-900 dark:text-secondary-100">
                            {addon.name}
                          </h4>
                        </HStack>
                        <Badge variant="default" className="text-xs">
                          {addon.addon_type}
                        </Badge>
                      </Flex>

                      <p className="text-sm text-secondary-600 dark:text-secondary-400 mb-3">
                        {addon.description}
                      </p>

                      <FlexBetween className="mb-3">
                        <div className="text-sm">
                          <div className="font-medium text-secondary-900 dark:text-secondary-100">
                            {formatPrice(addon.price, addon.billing_cycle)}
                          </div>
                          {addon.credits_amount > 0 && (
                            <div className="text-secondary-500">{addon.credits_amount} credits</div>
                          )}
                        </div>

                        <HStack gap={2}>
                          <Button
                            onClick={() => updateAddonQuantity(addon.id, Math.max(0, quantity - 1))}
                            size="sm"
                            variant="secondary"
                            disabled={quantity === 0}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-secondary-900 dark:text-secondary-100">
                            {quantity}
                          </span>
                          <Button
                            onClick={() =>
                              updateAddonQuantity(
                                addon.id,
                                Math.min(addon.max_quantity, quantity + 1)
                              )
                            }
                            size="sm"
                            variant="secondary"
                            disabled={quantity >= addon.max_quantity}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </HStack>
                      </FlexBetween>

                      {!addon.is_stackable && quantity > 0 && (
                        <p className="text-xs text-yellow-600 dark:text-yellow-400">
                          Not stackable
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="xl:col-span-1">
            <div className="sticky top-6">
              <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
                <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 mb-4">
                  Customization Preview
                </h3>

                {preview ? (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-secondary-900 dark:text-secondary-100 mb-2">
                        Monthly Totals
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-secondary-600 dark:text-secondary-400">
                            AI Credits
                          </span>
                          <span className="text-secondary-900 dark:text-secondary-100">
                            {preview.totals.ai_credits.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-secondary-600 dark:text-secondary-400">
                            Transactions
                          </span>
                          <span className="text-secondary-900 dark:text-secondary-100">
                            {preview.totals.transactions_limit === -1
                              ? 'Unlimited'
                              : preview.totals.transactions_limit.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-secondary-600 dark:text-secondary-400">
                            Accounts
                          </span>
                          <span className="text-secondary-900 dark:text-secondary-100">
                            {preview.totals.accounts_limit === -1
                              ? 'Unlimited'
                              : preview.totals.accounts_limit}
                          </span>
                        </div>
                      </div>
                    </div>

                    {preview.addons.length > 0 && (
                      <div>
                        <h4 className="font-medium text-secondary-900 dark:text-secondary-100 mb-2">
                          Selected Add-ons
                        </h4>
                        <div className="space-y-1 text-sm">
                          {preview.addons.map((addonData, index) => (
                            <div key={index} className="flex justify-between">
                              <span className="text-secondary-600 dark:text-secondary-400">
                                {addonData.addon.name} x{addonData.quantity}
                              </span>
                              <span className="text-secondary-900 dark:text-secondary-100">
                                ${addonData.monthly_cost.toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="border-t pt-4">
                      <FlexBetween>
                        <span className="font-medium text-secondary-900 dark:text-secondary-100">
                          Total Monthly Cost
                        </span>
                        <span className="text-xl font-bold text-secondary-900 dark:text-secondary-100">
                          ${preview.totals.monthly_cost.toFixed(2)}
                        </span>
                      </FlexBetween>
                    </div>

                    <Button
                      onClick={applyCustomization}
                      className="w-full"
                      disabled={Object.values(selectedAddons).every((q) => q === 0)}
                    >
                      Apply Customization
                    </Button>
                  </div>
                ) : (
                  <p className="text-secondary-500 dark:text-secondary-400 text-center py-8">
                    Select add-ons to see preview
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div
              key={template.id}
              className={`bg-white dark:bg-secondary-800 rounded-lg shadow-sm border border-secondary-200 dark:border-secondary-700 p-6 relative ${
                template.is_featured ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              {template.is_featured && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-blue-500 text-white">
                    <Star className="h-3 w-3 mr-1" />
                    Featured
                  </Badge>
                </div>
              )}

              <div className="mb-4">
                <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
                  {template.name}
                </h3>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">
                  {template.description}
                </p>
              </div>

              <div className="mb-4">
                <div className="text-xs text-secondary-500 dark:text-secondary-500 mb-1">
                  Base Plan: {template.base_plan.name}
                </div>
                <div className="text-xs text-secondary-500 dark:text-secondary-500">
                  {template.template_addons.length} add-ons included
                </div>
              </div>

              <FlexBetween className="mb-4">
                <div>
                  {template.discount_percentage > 0 && (
                    <div className="text-lg font-bold text-green-600 dark:text-green-400">
                      {template.discount_percentage}% OFF
                    </div>
                  )}
                  <div className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
                    ${template.total_price.toFixed(2)}
                  </div>
                  <div className="text-xs text-secondary-500">/month</div>
                </div>
              </FlexBetween>

              <div className="space-y-2 mb-4">
                {template.template_addons.slice(0, 3).map((ta, index) => (
                  <HStack
                    key={index}
                    className="text-xs text-secondary-600 dark:text-secondary-400"
                  >
                    <span className="text-green-500">✓</span>
                    {ta.addon.name} x{ta.quantity}
                  </HStack>
                ))}
                {template.template_addons.length > 3 && (
                  <div className="text-xs text-secondary-500">
                    +{template.template_addons.length - 3} more add-ons
                  </div>
                )}
              </div>

              <Button
                onClick={() => applyTemplate(template.id)}
                className="w-full"
                variant={template.is_featured ? 'primary' : 'secondary'}
              >
                Apply Template
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PlanCustomization;

import { apiClient } from '../../../api';

export const onboardingApi = {
  async completeStep(
    payload: Record<string, unknown> & { onboarding_step: number }
  ): Promise<{ success?: boolean }> {
    const res = await apiClient.post('/onboarding/complete_step/', payload);
    return res.data as { success?: boolean };
  },
};

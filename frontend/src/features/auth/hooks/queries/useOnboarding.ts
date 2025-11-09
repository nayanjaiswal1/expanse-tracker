import { useMutation } from '@tanstack/react-query';
import { onboardingApi } from '../../api/onboarding';

export function useCompleteOnboardingStep() {
  return useMutation({
    mutationFn: (payload: Record<string, unknown> & { onboarding_step: number }) =>
      onboardingApi.completeStep(payload),
  });
}

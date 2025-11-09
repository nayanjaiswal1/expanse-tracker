import { useMutation } from '@tanstack/react-query';
import { newsletterApi } from '../../api/newsletter';

export function useSubscribeNewsletter() {
  return useMutation({
    mutationFn: (email: string) => newsletterApi.subscribe(email),
  });
}

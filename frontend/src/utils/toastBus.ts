export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastBusPayload {
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

type ToastListener = (payload: ToastBusPayload) => void;

class ToastBus {
  private listeners = new Set<ToastListener>();

  subscribe(listener: ToastListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  publish(payload: ToastBusPayload): void {
    this.listeners.forEach((listener) => listener(payload));
  }
}

export const toastBus = new ToastBus();

export const publishToast = (payload: ToastBusPayload): void => {
  toastBus.publish(payload);
};

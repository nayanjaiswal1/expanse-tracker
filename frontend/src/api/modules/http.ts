import axios, { AxiosHeaders, type AxiosInstance, type AxiosRequestConfig } from 'axios';
import { publishToast, type ToastType } from '../../utils/toastBus';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

interface RefreshAwareRequestConfig extends AxiosRequestConfig {
  _retry?: boolean;
}

type BackendToastPayload = {
  show?: boolean;
  type?: ToastType;
  variant?: ToastType;
  title?: string;
  message?: string;
  duration?: number;
};

const extractToastPayload = (data: unknown): BackendToastPayload | null => {
  if (!data || typeof data !== 'object') return null;
  const payload = data as Record<string, unknown>;

  const toastCandidate = payload.toast;
  if (toastCandidate && typeof toastCandidate === 'object') {
    return toastCandidate as BackendToastPayload;
  }

  const errorObject = payload.error;
  if (errorObject && typeof errorObject === 'object' && 'toast' in (errorObject as object)) {
    const errorToast = (errorObject as Record<string, unknown>).toast;
    if (errorToast && typeof errorToast === 'object') {
      return errorToast as BackendToastPayload;
    }
  }

  return null;
};

const handleToastPayload = (payload: BackendToastPayload | null | undefined): void => {
  if (!payload?.show) {
    return;
  }

  publishToast({
    type: payload.variant ?? payload.type ?? 'info',
    title: payload.title ?? '',
    message: payload.message,
    duration: payload.duration,
  });
};

export interface HttpClient {
  client: AxiosInstance;
  getCSRFToken: () => string | null;
  getRefreshToken: () => string | null;
  setTokens: () => void;
  clearTokens: () => void;
  performTokenRefresh: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

export function createHttpClient(): HttpClient {
  const client = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
    withCredentials: true,
  });

  let isRefreshing = false;
  let refreshPromise: Promise<void> | null = null;

  const getRefreshToken = (): string | null => {
    // httpOnly cookies are not accessible via JavaScript
    return null;
  };

  const getCSRFToken = (): string | null => {
    const cookieValue = document.cookie
      .split('; ')
      .find((row) => row.startsWith('csrftoken='))
      ?.split('=')[1];

    if (cookieValue) return cookieValue;

    const metaTag = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null;
    return metaTag?.content ?? null;
  };

  const setTokens = (): void => {
    // Tokens are stored as httpOnly cookies by the backend, nothing to do client-side.
  };

  const clearTokens = (): void => {
    localStorage.removeItem('user');
  };

  const performTokenRefresh = async (): Promise<void> => {
    try {
      const refreshClient = axios.create({
        baseURL: API_BASE_URL,
        withCredentials: true,
        timeout: 10000,
      });

      const response = await refreshClient.post('/auth/refresh/');
      const { user } = response.data ?? {};

      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      }
    } catch (error) {
      clearTokens();
      throw error;
    }
  };

  const ensureRefresh = (): Promise<void> => {
    if (!refreshPromise) {
      isRefreshing = true;
      refreshPromise = performTokenRefresh().finally(() => {
        isRefreshing = false;
        refreshPromise = null;
      });
    }

    return refreshPromise;
  };

  const refreshToken = async (): Promise<void> => {
    if (isRefreshing && refreshPromise) {
      return refreshPromise;
    }

    return ensureRefresh();
  };

  client.interceptors.request.use((config) => {
    if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase() ?? '')) {
      const csrfToken = getCSRFToken();
      if (csrfToken) {
        const headers = AxiosHeaders.from(config.headers ?? {});
        headers.set('X-CSRFToken', csrfToken);
        config.headers = headers;
      }
    }

    return config;
  });

  client.interceptors.response.use(
    (response) => {
      handleToastPayload(extractToastPayload(response.data));
      return response;
    },
    async (error) => {
      const originalRequest = error.config as RefreshAwareRequestConfig | undefined;

      if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
        originalRequest._retry = true;

        if (originalRequest.url?.includes('/auth/refresh/')) {
          clearTokens();
          window.dispatchEvent(new CustomEvent('auth-token-expired'));
          return Promise.reject(error);
        }

        try {
          await ensureRefresh();
          return client(originalRequest);
        } catch {
          clearTokens();
          window.dispatchEvent(new CustomEvent('auth-token-expired'));
        }
      }

      handleToastPayload(extractToastPayload(error.response?.data));

      return Promise.reject(error);
    }
  );

  return {
    client,
    getCSRFToken,
    getRefreshToken,
    setTokens,
    clearTokens,
    performTokenRefresh,
    refreshToken,
  };
}

export { API_BASE_URL };

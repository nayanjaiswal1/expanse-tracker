import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import type { HttpClient } from './http';

export function createGenericApi(http: HttpClient) {
  return {
    get(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse> {
      return http.client.get(url, config);
    },

    post(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse> {
      return http.client.post(url, data, config);
    },

    patch(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse> {
      return http.client.patch(url, data, config);
    },

    delete(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse> {
      return http.client.delete(url, config);
    },
  };
}

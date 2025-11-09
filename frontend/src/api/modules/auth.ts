import type { User } from '../../types';
import type { HttpClient } from './http';

export function createAuthApi(http: HttpClient) {
  return {
    async login(
      username: string,
      password: string
    ): Promise<{ user: User; access?: string; refresh?: string }> {
      const response = await http.client.post('/auth/login/', { username, password });
      const { user, access, refresh } = response.data ?? {};

      if (access && refresh) {
        http.setTokens();
      }

      localStorage.setItem('user', JSON.stringify(user));
      return response.data;
    },

    async register(
      email: string,
      password: string,
      fullName: string
    ): Promise<{ user: User; access?: string; refresh?: string }> {
      const response = await http.client.post('/auth/register/', {
        email,
        password,
        password_confirm: password,
        full_name: fullName,
      });

      const { user, access, refresh } = response.data ?? {};

      if (access && refresh) {
        http.setTokens();
      }

      localStorage.setItem('user', JSON.stringify(user));
      return response.data;
    },

    async getGoogleAuthUrl(): Promise<{ auth_url: string }> {
      const response = await http.client.get('/auth/google_auth_url/');
      return response.data;
    },

    async googleLogin(
      code: string,
      state: string
    ): Promise<{ user: User; access: string; refresh: string; created: boolean }> {
      const response = await http.client.post('/auth/google_login/', { code, state });
      const { user } = response.data ?? {};

      http.setTokens();
      localStorage.setItem('user', JSON.stringify(user));

      return response.data;
    },

    refreshToken(): Promise<void> {
      return http.refreshToken();
    },

    async logout(): Promise<void> {
      try {
        const refreshToken = http.getRefreshToken();
        if (refreshToken) {
          await http.client.post('/auth/logout/', { refresh: refreshToken });
        }
      } catch (error) {
        console.error('Logout error:', error);
      } finally {
        http.clearTokens();
      }
    },

    async deleteUserAccount(): Promise<void> {
      await http.client.delete('/auth/user/');
      http.clearTokens();
    },

    async changePassword(data: { current_password: string; new_password: string }): Promise<void> {
      await http.client.post('/auth/change-password/', data);
    },
  };
}

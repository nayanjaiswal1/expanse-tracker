import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { PersonalizationData, User } from '../types';
import { apiClient } from '../api/client';
import type { UserDataSection } from '../api/modules/users';
import { safeLog } from '../utils/logger';
import { extractErrorMessage } from '../utils/errorHandling';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  loadedSections: Record<string, boolean>;
}

type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: User }
  | { type: 'HYDRATE_USER'; payload: User }
  | { type: 'LOGIN_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'CLEAR_ERROR' }
  | { type: 'UPDATE_USER'; payload: User }
  | { type: 'MARK_SECTIONS_LOADED'; payload: string[] };

const initialState: AuthState = {
  user: null,
  isLoading: true,
  error: null,
  loadedSections: {},
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, isLoading: true, error: null };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isLoading: false,
        error: null,
        loadedSections: { ...state.loadedSections, base: true },
      };
    case 'HYDRATE_USER':
      return {
        ...state,
        user: action.payload,
        error: null,
        loadedSections: { ...state.loadedSections, base: true },
      };
    case 'LOGIN_FAILURE':
      return { ...state, user: null, isLoading: false, error: action.payload, loadedSections: {} };
    case 'LOGOUT':
      return { ...state, user: null, isLoading: false, error: null, loadedSections: {} };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'UPDATE_USER':
      return { ...state, user: action.payload, error: null };
    case 'MARK_SECTIONS_LOADED': {
      if (!action.payload.length) {
        return state;
      }
      const nextSections = { ...state.loadedSections };
      action.payload.forEach((section) => {
        nextSections[section] = true;
      });
      return { ...state, loadedSections: nextSections };
    }
    default:
      return state;
  }
}

interface AuthContextType {
  state: AuthState;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<{ success: boolean; error?: string }>;
  googleLogin: () => Promise<{ success: boolean; error?: string }>;
  handleGoogleCallback: (
    code: string,
    state: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  clearError: () => void;
  updateUser: (user: User) => void;
  refreshAuth: () => Promise<void>;
  loadUserSections: (
    sections: UserDataSection | UserDataSection[],
    options?: { force?: boolean }
  ) => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    // Check for existing user on mount
    const initializeAuth = async () => {
      const storedUser = localStorage.getItem('user');

      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser) as User;
          dispatch({ type: 'HYDRATE_USER', payload: parsedUser });
        } catch (error) {
          safeLog.warn('Failed to parse stored user', error);
          localStorage.removeItem('user');
        }
      }

      try {
        // Try to get current user (cookies will be sent automatically)
        const user = await apiClient.getCurrentUser();
        dispatch({ type: 'LOGIN_SUCCESS', payload: user });
        localStorage.setItem('user', JSON.stringify(user));
        return;
      } catch (_error) {
        // If current user fails, try to refresh token first
        try {
          await apiClient.refreshToken();
          const user = await apiClient.getCurrentUser();
          dispatch({ type: 'LOGIN_SUCCESS', payload: user });
          localStorage.setItem('user', JSON.stringify(user));
          return;
        } catch (_refreshError) {
          // Both current user and refresh failed, clear storage
          localStorage.removeItem('user');
          dispatch({ type: 'LOGOUT' });
        }
      }
    };

    // Listen for token expiration events from API client
    const handleTokenExpired = () => {
      dispatch({ type: 'LOGOUT' });
    };

    // Check token validity when page becomes visible again
    const handleVisibilityChange = async () => {
      if (!document.hidden) {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const user = await apiClient.getCurrentUser();
            dispatch({ type: 'UPDATE_USER', payload: user });
            dispatch({ type: 'MARK_SECTIONS_LOADED', payload: ['base'] });
            localStorage.setItem('user', JSON.stringify(user));
          } catch (_error) {
            // Try to refresh token first
            try {
              await apiClient.refreshToken();
              const user = await apiClient.getCurrentUser();
              dispatch({ type: 'UPDATE_USER', payload: user });
              dispatch({ type: 'MARK_SECTIONS_LOADED', payload: ['base'] });
              localStorage.setItem('user', JSON.stringify(user));
            } catch (_refreshError) {
              // Token refresh failed, trigger logout
              dispatch({ type: 'LOGOUT' });
              localStorage.removeItem('user');
            }
          }
        }
      }
    };

    window.addEventListener('auth-token-expired', handleTokenExpired);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    initializeAuth();

    // Cleanup event listeners
    return () => {
      window.removeEventListener('auth-token-expired', handleTokenExpired);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const login = async (username: string, password: string) => {
    dispatch({ type: 'LOGIN_START' });

    try {
      const response = await apiClient.login(username, password);

      // With httpOnly cookies, tokens are automatically stored securely by the server
      localStorage.setItem('user', JSON.stringify(response.user));
      dispatch({ type: 'LOGIN_SUCCESS', payload: response.user });
      return { success: true };
    } catch (error: unknown) {
      const errorMessage = extractErrorMessage(error);
      dispatch({ type: 'LOGIN_FAILURE', payload: errorMessage });
      localStorage.removeItem('user');
      return { success: false, error: errorMessage };
    }
  };

  const register = async (email: string, password: string, fullName: string) => {
    dispatch({ type: 'LOGIN_START' });

    try {
      const { user } = await apiClient.register(email, password, fullName);
      dispatch({ type: 'LOGIN_SUCCESS', payload: user });
      return { success: true };
    } catch (error: unknown) {
      const errorMessage = extractErrorMessage(error);
      dispatch({ type: 'LOGIN_FAILURE', payload: errorMessage });
      localStorage.removeItem('user');
      return { success: false, error: errorMessage };
    }
  };

  const googleLogin = async () => {
    dispatch({ type: 'LOGIN_START' });

    try {
      const { auth_url } = await apiClient.getGoogleAuthUrl();
      // Redirect to Google OAuth
      window.location.href = auth_url;
      return { success: true };
    } catch (error: unknown) {
      const errorMessage = extractErrorMessage(error);
      dispatch({ type: 'LOGIN_FAILURE', payload: errorMessage });
      localStorage.removeItem('user');
      return { success: false, error: errorMessage };
    }
  };

  const handleGoogleCallback = async (code: string, state: string) => {
    dispatch({ type: 'LOGIN_START' });

    try {
      const { user } = await apiClient.googleLogin(code, state);
      dispatch({ type: 'LOGIN_SUCCESS', payload: user });
      return { success: true };
    } catch (error: unknown) {
      const errorMessage = extractErrorMessage(error);
      dispatch({ type: 'LOGIN_FAILURE', payload: errorMessage });
      localStorage.removeItem('user');
      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    try {
      await apiClient.logout();
    } catch (error) {
      safeLog.error('Logout error:', error);
    } finally {
      dispatch({ type: 'LOGOUT' });
      localStorage.removeItem('user');
    }
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const updateUser = (user: User) => {
    dispatch({ type: 'UPDATE_USER', payload: user });
    dispatch({ type: 'MARK_SECTIONS_LOADED', payload: ['base'] });
    localStorage.setItem('user', JSON.stringify(user));
  };

  const loadUserSections = useCallback(
    async (
      sections: UserDataSection | UserDataSection[],
      options?: { force?: boolean }
    ): Promise<User | null> => {
      const requestedSections = Array.isArray(sections) ? sections : [sections];
      const normalized = (requestedSections.length ? requestedSections : ['base']).map((section) =>
        section.toString().replace(/-/g, '_').toLowerCase()
      );

      const uniqueSections = Array.from(new Set(normalized));
      const wantsBase = uniqueSections.includes('base') || !state.user;
      const includes = uniqueSections.filter((section) => section !== 'base');

      const sectionsAlreadyLoaded = includes.every((section) => state.loadedSections[section]);

      if (!options?.force && !wantsBase && sectionsAlreadyLoaded) {
        return state.user;
      }

      const sectionLoaders: Record<string, () => Promise<Partial<User>>> = {
        profile: () => apiClient.getUserProfile(),
        preferences: () => apiClient.getUserPreferences(),
        subscription: () => apiClient.getUserSubscription(),
        ai_settings: () => apiClient.getUserAiSettings(),
        personalization: async () => {
          const personalizationData = await apiClient.getPersonalization();
          return {
            personalization: personalizationData,
            personalization_data: personalizationData.preferences as PersonalizationData,
            has_completed_personalization: personalizationData.questionnaire_completed,
            is_onboarded: personalizationData.is_onboarded,
            onboarding_step: personalizationData.onboarding_step,
          } as Partial<User>;
        },
      };

      let workingUser = state.user ? { ...state.user } : null;

      if (wantsBase) {
        const baseUser = await apiClient.getCurrentUser();
        workingUser = baseUser;
        dispatch({ type: 'MARK_SECTIONS_LOADED', payload: ['base'] });
      }

      const loadersToRun = includes
        .map((section) => sectionLoaders[section])
        .filter((loader): loader is () => Promise<Partial<User>> => Boolean(loader));

      if (loadersToRun.length) {
        const results = await Promise.all(loadersToRun.map((loader) => loader()));
        const mergedSections = results.reduce<Partial<User>>(
          (acc, data) => ({ ...acc, ...data }),
          {}
        );
        workingUser = { ...(workingUser ?? state.user ?? {}), ...mergedSections } as User;
      }

      if (workingUser) {
        if (state.user) {
          dispatch({ type: 'UPDATE_USER', payload: workingUser });
        } else {
          dispatch({ type: 'LOGIN_SUCCESS', payload: workingUser });
        }

        const sectionsToMark = new Set<string>();
        if (wantsBase) sectionsToMark.add('base');
        includes.forEach((section) => sectionsToMark.add(section));
        dispatch({ type: 'MARK_SECTIONS_LOADED', payload: Array.from(sectionsToMark) });
        localStorage.setItem('user', JSON.stringify(workingUser));
      }

      return workingUser;
    },
    [state.loadedSections, state.user]
  );

  const refreshAuth = async () => {
    try {
      // First try to refresh tokens, then get current user
      await apiClient.refreshToken();
      const sectionsToInclude = Object.entries(state.loadedSections)
        .filter(([section, loaded]) => loaded && section !== 'base')
        .map(([section]) => section as UserDataSection);
      const user = await apiClient.getCurrentUser({
        include: sectionsToInclude,
      });
      const mergedUser = state.user ? { ...state.user, ...user } : user;
      if (state.user) {
        dispatch({ type: 'UPDATE_USER', payload: mergedUser });
      } else {
        dispatch({ type: 'LOGIN_SUCCESS', payload: mergedUser });
      }
      dispatch({ type: 'MARK_SECTIONS_LOADED', payload: ['base', ...sectionsToInclude] });
      localStorage.setItem('user', JSON.stringify(mergedUser));
    } catch (error) {
      // If refresh fails, logout the user
      dispatch({ type: 'LOGOUT' });
      localStorage.removeItem('user');
      throw error;
    }
  };

  const value = {
    state,
    login,
    register,
    googleLogin,
    handleGoogleCallback,
    logout,
    clearError,
    updateUser,
    refreshAuth,
    loadUserSections,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

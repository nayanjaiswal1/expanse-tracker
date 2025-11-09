// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Other application configuration can go here
export const APP_CONFIG = {
  // Default settings
  defaultLocale: 'en-US',
  // Add other config values as needed
};

// Make sure Vite environment variables are properly typed
declare global {
  interface ImportMetaEnv {
    VITE_API_BASE_URL?: string;
    // Add other environment variables as needed
  }
}

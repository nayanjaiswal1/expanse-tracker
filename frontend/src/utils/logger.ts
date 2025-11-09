// Utility function to safely log errors without object-to-primitive conversion issues
export const safeLog = {
  error: (message: string, error?: unknown) => {
    if (error) {
      // Safely extract error information
      const errorInfo =
        error instanceof Error
          ? error.message
          : (error as { message?: string })?.message || String(error);
      console.error(message, errorInfo);
    } else {
      console.error(message);
    }
  },

  warn: (message: string, data?: unknown) => {
    if (data) {
      const safeData = typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data);
      console.warn(message, safeData);
    } else {
      console.warn(message);
    }
  },

  info: (message: string, data?: unknown) => {
    if (data) {
      const safeData = typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data);
      console.info(message, safeData);
    } else {
      console.info(message);
    }
  },
};

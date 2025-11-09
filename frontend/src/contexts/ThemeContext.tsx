import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  actualTheme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Check localStorage first, then user preference, then default to system
    const saved = localStorage.getItem('theme') as Theme;
    if (saved) return saved;

    // Check if user has a theme preference
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        if (user?.theme) return user.theme;
      } catch (_e) {
        // Ignore parsing errors
      }
    }

    return 'system';
  });

  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';

    const saved = localStorage.getItem('theme') as Theme;
    const themeToCheck = saved || 'system';

    if (themeToCheck === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return themeToCheck as 'light' | 'dark';
  });

  useEffect(() => {
    const updateTheme = () => {
      let newActualTheme: 'light' | 'dark' = 'light';

      if (theme === 'system') {
        newActualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
      } else {
        newActualTheme = theme;
      }

      setActualTheme(newActualTheme);

      // Update document class
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(newActualTheme);

      // Update data attribute for better compatibility
      document.documentElement.setAttribute('data-theme', newActualTheme);

      // Save to localStorage
      localStorage.setItem('theme', theme);
    };

    updateTheme();

    // Listen for system theme changes when in system mode
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', updateTheme);
      return () => mediaQuery.removeEventListener('change', updateTheme);
    }
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const isDark = actualTheme === 'dark';

  return (
    <ThemeContext.Provider
      value={{
        theme,
        actualTheme,
        toggleTheme,
        setTheme,
        isDark,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

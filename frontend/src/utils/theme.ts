type Theme = 'light' | 'dark' | 'system';

// Theme utility functions
export const getThemeClasses = (theme: Theme) => ({
  // Backgrounds
  primaryBg:
    theme === 'light'
      ? 'bg-gradient-to-br from-blue-50 via-white to-purple-50'
      : 'bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800',

  leftPanel:
    theme === 'light'
      ? 'bg-gradient-to-br from-blue-50 via-indigo-100 to-purple-100'
      : 'bg-gradient-to-br from-slate-800 via-gray-900 to-slate-900',

  card:
    theme === 'light'
      ? 'bg-white/80 backdrop-blur-sm border-0'
      : 'bg-gray-800/90 backdrop-blur-sm border border-gray-700',

  // Text colors
  primaryText: theme === 'light' ? 'text-gray-800' : 'text-white',
  secondaryText: theme === 'light' ? 'text-gray-600' : 'text-gray-300',
  mutedText: theme === 'light' ? 'text-gray-500' : 'text-gray-400',

  // Form elements
  input:
    theme === 'light'
      ? 'bg-gray-50 border-gray-200 focus:bg-white focus:border-blue-500 text-gray-900'
      : 'bg-gray-700 border-gray-600 focus:bg-gray-600 focus:border-blue-400 text-white',

  // Animated background elements
  blob1: theme === 'light' ? 'bg-blue-200/20' : 'bg-blue-500/10',
  blob2: theme === 'light' ? 'bg-purple-200/15' : 'bg-purple-500/10',
  blob3: theme === 'light' ? 'bg-indigo-200/20' : 'bg-indigo-500/10',

  // Stats card
  statsCard:
    theme === 'light'
      ? 'bg-white/60 backdrop-blur-md border-gray-200'
      : 'bg-gray-800/60 backdrop-blur-md border-gray-600',
});

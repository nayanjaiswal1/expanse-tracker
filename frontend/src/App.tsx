import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { CurrencyProvider } from './contexts/CurrencyContext';
import { ToastProvider } from './components/ui/Toast';
import { CookieConsent } from './pages/CookieConsent';

function App() {
  useEffect(() => {
    const handleAuthTokenExpired = () => {
      console.log('Auth token expired, redirecting to login...');
      localStorage.removeItem('user'); // Ensure user data is cleared
      window.location.href = '/login'; // Redirect to your login route
    };

    window.addEventListener('auth-token-expired', handleAuthTokenExpired);

    return () => {
      window.removeEventListener('auth-token-expired', handleAuthTokenExpired);
    };
  }, []);

  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <CurrencyProvider>
            <Outlet />
            <CookieConsent />
          </CurrencyProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;

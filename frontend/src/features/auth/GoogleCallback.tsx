import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export const GoogleCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleGoogleCallback } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    const handleCallback = async () => {
      if (hasProcessed.current) return; // Prevent multiple calls
      hasProcessed.current = true;

      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      if (error) {
        console.error('Google OAuth error:', error);
        navigate('/login', {
          state: { error: 'Google authentication was cancelled or failed' },
        });
        return;
      }

      if (!code || !state) {
        console.error('Missing OAuth parameters:', { code: !!code, state: !!state });
        navigate('/login', {
          state: { error: 'Invalid OAuth response - missing required parameters' },
        });
        return;
      }

      try {
        console.log('Attempting Google callback with:', {
          code: code.substring(0, 10) + '...',
          state,
        });
        const result = await handleGoogleCallback(code, state);
        console.log('Google callback result:', { success: result.success, error: result.error });

        if (result.success) {
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/login', {
            state: { error: result.error || 'Google login failed' },
          });
        }
      } catch (error) {
        console.error('Google callback error:', error);
        navigate('/login', {
          state: { error: 'Google login failed' },
        });
      }
    };

    handleCallback();
  }, [searchParams, navigate, handleGoogleCallback]);

  return (
    <div className="min-h-screen flex items-center justify-center theme-bg-primary">
      <div className="text-center max-w-md px-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 theme-text-primary" />
        <h2 className="text-xl font-semibold theme-text-primary mb-2">Completing Google Sign In</h2>
        <p className="theme-text-secondary mb-4">Securely authenticating with Google...</p>
        <div className="text-xs theme-text-secondary opacity-75">
          This usually takes just a few seconds
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { LoadingSpinner } from '../../components/layout/LoadingSpinner';
import { CheckCircle, XCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';

const GmailCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleCallback = () => {
      const success = searchParams.get('success');
      const email = searchParams.get('email');
      const error = searchParams.get('error');

      if (error) {
        setStatus('error');
        setMessage('Authorization was denied or an error occurred.');
        setTimeout(() => navigate('/settings?tab=integrations'), 3000);
        return;
      }

      if (success === 'true' && email) {
        setStatus('success');
        setMessage(`Successfully connected ${email}!`);
        setTimeout(() => navigate('/settings?tab=integrations'), 1500);
      } else {
        setStatus('error');
        setMessage('Failed to connect Gmail account. Please try again.');
        setTimeout(() => navigate('/settings?tab=integrations'), 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <LoadingSpinner />
            <h2 className="text-xl font-semibold text-gray-900 mt-4">Connecting Gmail Account</h2>
            <p className="text-gray-600 mt-2">
              Please wait while we set up your Gmail integration...
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mt-6">Gmail Connected Successfully!</h2>
            <p className="text-gray-600 mt-3 text-lg">{message}</p>
            <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-800">
                🎉 Your Gmail account is now connected and ready to sync emails for transaction
                import.
              </p>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              Redirecting you to integrations settings in 1.5 seconds...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mt-6">Connection Failed</h2>
            <p className="text-gray-600 mt-3">{message}</p>
            <div className="mt-6 p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-red-800">
                ❌ Unable to connect your Gmail account. Please try again or check your Google
                account permissions.
              </p>
            </div>
            <div className="mt-6 flex gap-3">
              <Button
                onClick={() => navigate('/settings?tab=integrations')}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Go Back to Settings
              </Button>
            </div>
            <p className="text-sm text-gray-500 mt-4">Auto-redirecting in 3 seconds...</p>
          </>
        )}
      </div>
    </div>
  );
};

export default GmailCallback;

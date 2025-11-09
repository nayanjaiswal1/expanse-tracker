import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';
import { safeLog } from '../../utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    safeLog.error('Error boundary caught an error:', error);
    safeLog.info('Error component stack:', errorInfo?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center p-6 min-h-[400px] bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-center max-w-md">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Component Error
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
              This component encountered an error and couldn&apos;t load.
            </p>
            <Button
              onClick={() => this.setState({ hasError: false, error: undefined })}
              size="sm"
              variant="primary"
            >
              Try Again
            </Button>
            {this.state.error && process.env.NODE_ENV === 'development' && (
              <details className="mt-4 text-left">
                <summary className="text-xs text-gray-500 cursor-pointer">
                  Show Error Details
                </summary>
                <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-700 rounded text-xs text-red-600 dark:text-red-400 overflow-auto max-h-32">
                  <p className="font-mono break-all">{this.state.error.message}</p>
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

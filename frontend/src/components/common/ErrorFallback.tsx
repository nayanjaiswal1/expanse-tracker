import { FallbackProps } from 'react-error-boundary';
import { Button } from '../ui/Button';

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-red-500">Something went wrong.</h1>
        <pre className="mt-4 text-sm text-gray-700 whitespace-pre-wrap">{error.message}</pre>
        <Button
          onClick={resetErrorBoundary}
          variant="primary"
          size="none"
          className="mt-6 rounded-md px-4 py-2 text-sm font-medium shadow-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Try again
        </Button>
      </div>
    </div>
  );
}

export default ErrorFallback;

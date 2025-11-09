import { useRouteError, isRouteErrorResponse } from 'react-router-dom';

export default function RouteError() {
  const error = useRouteError();
  let errorMessage: string;

  if (isRouteErrorResponse(error)) {
    // error is type `ErrorResponse`
    errorMessage = error.data?.message || error.statusText;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else {
    console.error(error);
    errorMessage = 'Unknown error';
  }

  return (
    <div role="alert" className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-red-500">Oops!</h1>
        <p className="mt-4 text-lg text-gray-700">Sorry, an unexpected error has occurred.</p>
        <pre className="mt-4 text-sm text-gray-700 whitespace-pre-wrap">{errorMessage}</pre>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Reload Page
        </button>
      </div>
    </div>
  );
}

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingSpinner } from '../layout';

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

export const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const { state: authState } = useAuth();
  const location = useLocation();

  // Emergency escape hatch: allows bypassing onboarding/personalization checks
  // Usage: navigate to /dashboard?force_skip=true
  const searchParams = new URLSearchParams(location.search);
  const forceSkip = searchParams.get('force_skip') === 'true';

  // Show loading spinner while authentication is being checked and we don't have cached data yet
  if (authState.isLoading && !authState.user) {
    return <LoadingSpinner />;
  }

  // Redirect to login if not authenticated
  if (!authState.user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based access
  if (allowedRoles && authState.user.role && !allowedRoles.includes(authState.user.role)) {
    return <Navigate to="/unauthorized" state={{ from: location }} replace />;
  }

  // Check onboarding status - check both root level and nested personalization fields
  const isOnboarded =
    authState.user.is_onboarded === true || authState.user.personalization?.is_onboarded === true;

  const hasCompletedPersonalization =
    authState.user.has_completed_personalization === true ||
    authState.user.personalization?.questionnaire_completed === true;

  // Prevent accessing onboarding if already completed
  if (isOnboarded && hasCompletedPersonalization && location.pathname === '/onboarding') {
    return <Navigate to="/dashboard" replace />;
  }

  // Only redirect to onboarding if user is not onboarded AND not already on the onboarding page
  if (
    (!isOnboarded || !hasCompletedPersonalization) &&
    location.pathname !== '/onboarding' &&
    !location.pathname.startsWith('/onboarding') &&
    !forceSkip
  ) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;

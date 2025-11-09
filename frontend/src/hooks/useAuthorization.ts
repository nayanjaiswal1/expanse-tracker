import { useAuth } from '../contexts/AuthContext';

type UserRole = 'admin' | 'staff' | 'user';

export const useAuthorization = (): { role: UserRole } => {
  const { state } = useAuth();
  const { user } = state;

  let role: UserRole = 'user';

  if (user?.is_superuser) {
    role = 'admin';
  } else if (user?.is_staff) {
    role = 'staff';
  }

  return { role };
};

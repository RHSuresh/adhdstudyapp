import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

type AppRole = 'student' | 'parent' | 'teacher';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole: AppRole;
}

const roleToPath: Record<AppRole, string> = {
  student: '/student',
  parent: '/parent',
  teacher: '/teacher',
};

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();

  // Still loading auth state — show spinner, never redirect yet
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Not logged in — send to the appropriate auth page
  if (!user) {
    return <Navigate to={`/auth/${requiredRole}`} replace />;
  }

  // Role not loaded yet — keep showing spinner rather than redirecting
  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Wrong role — redirect to their actual dashboard
  if (role !== requiredRole) {
    return <Navigate to={roleToPath[role] || '/'} replace />;
  }

  return <>{children}</>;
}